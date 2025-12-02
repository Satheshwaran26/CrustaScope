import os
import io
import time
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import (
    StreamingResponse,
    Response,
)
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import pymongo
from bson import ObjectId

import tensorflow as tf

app = FastAPI()

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files removed - using React frontend only
# app.mount("/static", StaticFiles(directory="static"), name="static")
# templates = Jinja2Templates(directory="static")

# ─────────────────────────────────────────────
# Configurable cooldowns
# ─────────────────────────────────────────────
# Cooldown between saving shrimp snapshots (WSSV / Healthy) to MongoDB
SNAP_COOLDOWN_SECONDS = float(os.getenv("SNAP_COOLDOWN_SECONDS", "10.0"))

LATEST_SENSOR_JSON = "latest_sensor.json"

# ─────────────────────────────────────────────
# MongoDB
# ─────────────────────────────────────────────
MONGO_URI = os.getenv("MONGODB_URI")
client = None
db = None
snaps_wssv = None
snaps_healthy = None
sensor_collection = None

if MONGO_URI:
    try:
        client = pymongo.MongoClient(MONGO_URI)
        db = client["crustascope"]
        # Use your requested collection names:
        snaps_wssv = db["wssv_snaps"]
        snaps_healthy = db["healthy_snaps"]
        sensor_collection = db["sensor_results"]
        print("[INFO] Connected to MongoDB Atlas.")
    except Exception as e:
        print("[WARN] MongoDB connection failed:", e)
else:
    print("[WARN] MONGODB_URI not set. DB features disabled.")

# ─────────────────────────────────────────────
# TFLite model
# ─────────────────────────────────────────────
MODEL_PATH = "CrustaScope_model_float32.tflite"

interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

def predict_image(img_bgr: np.ndarray) -> float:
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(img_rgb, (224, 224))
    resized = resized.astype(np.float32) / 255.0
    resized = np.expand_dims(resized, axis=0)

    interpreter.set_tensor(input_details[0]["index"], resized)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]["index"])
    conf = float(output[0][0])
    return conf

def classify_label(conf: float) -> str:
    if conf >= 0.7:
        return "WSSV DETECTED"
    elif conf <= 0.3:
        return "Healthy Shrimp"
    else:
        return "No Shrimp"

# ─────────────────────────────────────────────
# Camera & state
# ─────────────────────────────────────────────
camera = None
monitoring = False
current_camera_index = None

last_result = {
    "label": None,
    "confidence": None,
    "timestamp": None,
    "snapshot_saved": False,
}

last_snap_time = 0.0

# ─────────────────────────────────────────────
# Helpers: sensor + snapshots
# ─────────────────────────────────────────────
def read_latest_sensor():
    if not os.path.exists(LATEST_SENSOR_JSON):
        return None
    try:
        with open(LATEST_SENSOR_JSON, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        print("[WARN] Could not read latest_sensor.json:", e)
        return None

def get_snap_collection(kind: str):
    if kind == "wssv":
        return snaps_wssv
    elif kind == "healthy":
        return snaps_healthy
    else:
        return None

def save_snapshot(label: str, confidence: float, frame_bgr: np.ndarray):
    """
    Save snapshot to MongoDB (WSSV or Healthy only),
    along with current sensor data, with cooldown control.
    """
    global last_snap_time

    now_ts = time.time()
    if now_ts - last_snap_time < SNAP_COOLDOWN_SECONDS:
        return  # cooldown active

    if client is None or db is None or snaps_wssv is None or snaps_healthy is None:
        print("[WARN] MongoDB not available. Snapshot not saved.")
        return

    if label == "WSSV DETECTED":
        col = snaps_wssv
        kind = "wssv"
    elif label == "Healthy Shrimp":
        col = snaps_healthy
        kind = "healthy"
    else:
        return

    ok, buf = cv2.imencode(".jpg", frame_bgr)
    if not ok:
        print("[WARN] Could not encode frame as JPEG.")
        return

    img_bytes = buf.tobytes()
    sensor_doc = read_latest_sensor()

    doc = {
        "kind": kind,
        "label": label,
        "confidence": float(confidence),
        "created_at": datetime.utcnow().isoformat(),
        "image_bytes": img_bytes,
        "image_format": "jpg",
        "sensor_at_capture": sensor_doc,
    }

    try:
        col.insert_one(doc)
        last_snap_time = now_ts
        print(f"[INFO] Saved {label} snapshot with sensor data.")
    except Exception as e:
        print("[WARN] Error saving snapshot:", e)

# ─────────────────────────────────────────────
# MJPEG generator
# ─────────────────────────────────────────────
def gen_frames():
    global camera, monitoring, last_result

    if camera is None:
        print("[WARN] gen_frames called but camera is None.")
        return

    print("[INFO] Starting frame generator loop...")
    while monitoring:
        success, frame = camera.read()
        if not success:
            print("[WARN] Camera read failed.")
            break

        conf = predict_image(frame)
        label = classify_label(conf)
        now_iso = datetime.now().isoformat()

        snapshot_saved = False
        if label in ("WSSV DETECTED", "Healthy Shrimp"):
            save_snapshot(label, conf, frame)
            snapshot_saved = True

        last_result = {
            "label": label,
            "confidence": conf,
            "timestamp": now_iso,
            "snapshot_saved": snapshot_saved,
        }

        if label == "WSSV DETECTED":
            color = (0, 0, 255)
        elif label == "Healthy Shrimp":
            color = (0, 255, 0)
        else:
            color = (255, 255, 0)

        text = f"{label} ({conf*100:.1f}%)"
        cv2.putText(
            frame,
            text,
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            color,
            2,
        )

        ok, buffer = cv2.imencode(".jpg", frame)
        if not ok:
            continue
        frame_bytes = buffer.tobytes()

        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"

    if camera is not None:
        camera.release()
        print("[INFO] Camera released in gen_frames().")

# ─────────────────────────────────────────────
# Page routes - removed (using React frontend only)
# ─────────────────────────────────────────────

# ─────────────────────────────────────────────
# Camera & ML routes
# ─────────────────────────────────────────────
@app.get("/cameras")
async def list_cameras():
    available = []
    for idx in range(5):
        cap = cv2.VideoCapture(idx)
        if cap is not None and cap.isOpened():
            available.append(idx)
            cap.release()
    return {"cameras": available}

@app.post("/start")
async def start_monitor(payload: dict):
    global camera, monitoring, current_camera_index

    cam_index = payload.get("camera_index")
    if cam_index is None:
        raise HTTPException(status_code=400, detail="camera_index is required")

    if monitoring and camera is not None:
        return {"status": "already_running", "camera_index": current_camera_index}

    cam = cv2.VideoCapture(cam_index)
    if not cam.isOpened():
        raise HTTPException(status_code=500, detail="Unable to open camera index")

    camera = cam
    monitoring = True    # <– starts ML loop
    current_camera_index = cam_index
    print(f"[INFO] Monitoring started on camera {cam_index}")
    return {"status": "started", "camera_index": cam_index}

@app.post("/stop")
async def stop_monitor():
    global monitoring, camera, current_camera_index
    monitoring = False
    if camera is not None:
        camera.release()
        print("[INFO] Camera released in /stop.")
        camera = None
    current_camera_index = None
    return {"status": "stopped"}

@app.get("/video_feed")
async def video_feed():
    if camera is None:
        raise HTTPException(status_code=400, detail="Camera not started")
    return StreamingResponse(
        gen_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )

@app.get("/status")
async def status():
    return last_result

# ─────────────────────────────────────────────
# Sensor live data route
# ─────────────────────────────────────────────
@app.get("/sensor_live")
async def sensor_live():
    data = read_latest_sensor()
    if not data:
        return {
            "timestamp": None,
            "temperature_c": None,
            "ph": None,
            "turbidity": None,
            "tds": None,
        }
    return {
        "timestamp": data.get("timestamp"),
        "temperature_c": data.get("temperature_c"),
        "ph": data.get("ph"),
        "turbidity": data.get("turbidity"),
        "tds": data.get("tds"),
    }

# ─────────────────────────────────────────────
# Gallery APIs
# ─────────────────────────────────────────────
@app.get("/snaps")
async def list_snaps(kind: str):
    if client is None or db is None:
        return {"items": []}

    col = get_snap_collection(kind)
    if col is None:
        raise HTTPException(status_code=400, detail="Invalid kind")

    docs = col.find().sort("created_at", -1)
    items = []
    for d in docs:
        sensor = d.get("sensor_at_capture", {}) or {}
        items.append(
            {
                "id": str(d["_id"]),
                "label": d.get("label"),
                "confidence": d.get("confidence"),
                "camera_index": d.get("camera_index"),
                "timestamp": d.get("timestamp") or d.get("created_at"),  # Support both old and new format
                "created_at": d.get("created_at") or d.get("timestamp"),
                "sensor": {
                    "temperature_c": sensor.get("temperature_c"),
                    "ph": sensor.get("ph"),
                    "turbidity": sensor.get("turbidity"),
                    "tds": sensor.get("tds"),
                },
            }
        )
    return {"items": items}

@app.delete("/snap/{kind}/{snap_id}")
async def delete_snap(kind: str, snap_id: str):
    if client is None or db is None:
        raise HTTPException(status_code=500, detail="DB not available")

    col = get_snap_collection(kind)
    if col is None:
        raise HTTPException(status_code=400, detail="Invalid kind")

    try:
        oid = ObjectId(snap_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid snap id")

    res = col.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")

    return {"status": "deleted"}

@app.get("/snap_image/{kind}/{snap_id}")
async def snap_image(kind: str, snap_id: str):
    if client is None or db is None:
        raise HTTPException(status_code=500, detail="DB not available")

    col = get_snap_collection(kind)
    if col is None:
        raise HTTPException(status_code=400, detail="Invalid kind")

    try:
        oid = ObjectId(snap_id)
    except Exception as e:
        print(f"[ERROR] Invalid ObjectId: {snap_id}, error: {e}")
        raise HTTPException(status_code=400, detail="Invalid snap id")

    doc = col.find_one({"_id": oid})
    if not doc:
        print(f"[ERROR] Document not found for ID: {snap_id}")
        raise HTTPException(status_code=404, detail="Not found")

    # Check for different possible image field names (support both old and new format)
    img_data = doc.get("image_bytes") or doc.get("image_base64") or doc.get("image") or doc.get("img")
    
    if not img_data:
        print(f"[ERROR] Image data missing for snap {snap_id}. Document keys: {list(doc.keys())}")
        raise HTTPException(status_code=500, detail="Image missing")

    # Handle both binary and base64 encoded images
    if isinstance(img_data, str):
        import base64
        try:
            img_bytes = base64.b64decode(img_data)
        except Exception as e:
            print(f"[ERROR] Failed to decode base64 image: {e}")
            raise HTTPException(status_code=500, detail="Image decoding failed")
    else:
        img_bytes = img_data

    return Response(content=img_bytes, media_type="image/jpeg")

@app.get("/download/{kind}/{snap_id}")
async def download_snap(kind: str, snap_id: str, fmt: str = "jpg"):
    if client is None or db is None:
        raise HTTPException(status_code=500, detail="DB not available")

    col = get_snap_collection(kind)
    if col is None:
        raise HTTPException(status_code=400, detail="Invalid kind")

    try:
        oid = ObjectId(snap_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid snap id")

    doc = col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    img_bytes = doc.get("image_bytes")
    if not img_bytes:
        raise HTTPException(status_code=500, detail="Image missing")

    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    fmt = fmt.lower()
    if fmt not in ("jpg", "jpeg", "png"):
        fmt = "jpg"

    buf = io.BytesIO()
    pil_fmt = "JPEG" if fmt in ("jpg", "jpeg") else "PNG"
    img.save(buf, format=pil_fmt)
    buf.seek(0)

    media_type = "image/jpeg" if pil_fmt == "JPEG" else "image/png"
    filename = f"snapshot_{snap_id}.{fmt}"
    headers = {
        "Content-Disposition": f'attachment; filename=\"{filename}\"'
    }
    return Response(content=buf.read(), media_type=media_type, headers=headers)

# ─────────────────────────────────────────────
# Upload test
# ─────────────────────────────────────────────
@app.post("/upload_test")
async def upload_test(file: UploadFile = File(...)):
    contents = await file.read()
    img_array = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    conf = predict_image(img)
    label = classify_label(conf)

    if label in ("WSSV DETECTED", "Healthy Shrimp"):
        save_snapshot(label, conf, img)

    return {
        "label": label,
        "confidence": conf,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000)
