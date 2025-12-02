import os
import time
import json
from datetime import datetime

import board
import busio
import pymongo
from w1thermsensor import W1ThermSensor

from adafruit_ads1x15.ads1115 import ADS1115
from adafruit_ads1x15.analog_in import AnalogIn

# ─────────────────────────────────────────────
# Configurable intervals
# ─────────────────────────────────────────────
# How often to log a sensor reading into MongoDB (seconds)
SENSOR_DB_INTERVAL_SECONDS = float(os.getenv("SENSOR_DB_INTERVAL_SECONDS", "300"))
# How often to update latest_sensor.json + print live to console (seconds)
LOOP_INTERVAL_SECONDS = float(os.getenv("SENSOR_LOOP_INTERVAL_SECONDS", "2"))

LATEST_JSON = "latest_sensor.json"

# ─────────────────────────────────────────────
# MongoDB setup
# ─────────────────────────────────────────────
MONGO_URI = os.getenv("MONGODB_URI")
client = None
db = None
sensor_collection = None

if MONGO_URI:
    try:
        client = pymongo.MongoClient(MONGO_URI)
        db = client["crustascope"]
        sensor_collection = db["sensor_results"]
        print("[INFO] Connected to MongoDB for sensor logging.")
    except Exception as e:
        print("[WARN] MongoDB connection failed:", e)
else:
    print("[WARN] MONGODB_URI not set. Sensor data will not be stored to DB.")

# ─────────────────────────────────────────────
# Sensor initialization
# ─────────────────────────────────────────────
print("[INFO] Initializing DS18B20 temperature sensor...")
try:
    temp_sensor = W1ThermSensor()
    print("[INFO] DS18B20 detected.")
except Exception as e:
    print("[WARN] DS18B20 not available:", e)
    temp_sensor = None

print("[INFO] Initializing I2C + ADS1115...")
i2c = busio.I2C(board.SCL, board.SDA)
ads = ADS1115(i2c)
ads.gain = 1
ads.data_rate = 860

# A0 → TDS, A1 → pH, A3 → Turbidity
ch_tds  = AnalogIn(ads, 0)
ch_ph   = AnalogIn(ads, 1)
ch_turb = AnalogIn(ads, 3)

# ─────────────────────────────────────────────
# Conversion formulas
# ─────────────────────────────────────────────
def convert_ph(v):
    if v is None:
        return None
    ph = 7 + ((2.5 - v) / 0.18)   # from your working test
    return round(ph, 2)

def convert_turbidity(v):
    if v is None:
        return None
    if v >= 4.2:
        return 0.0
    ntu = (4.2 - v) * 1000.0
    if ntu < 0:
        ntu = 0.0
    return round(ntu, 2)

def convert_tds(v, temp_c):
    if v is None or temp_c is None:
        return None
    if v < 0.01:
        return 0.0
    ec = (133.42 * v**3 - 255.86 * v**2 + 857.39 * v)
    tds = ec / 2.0
    if tds < 0:
        tds = 0.0
    return round(tds, 2)

# ─────────────────────────────────────────────
# Main loop
# ─────────────────────────────────────────────
last_db_save = 0.0

print(f"[INFO] Sensor reader loop started (every {LOOP_INTERVAL_SECONDS}s, "
      f"DB logging every {SENSOR_DB_INTERVAL_SECONDS}s).")

while True:
    try:
        if temp_sensor:
            try:
                temp_c = round(temp_sensor.get_temperature(), 2)
            except Exception as e:
                print("[WARN] Temp read failed:", e)
                temp_c = None
        else:
            temp_c = None

        v_tds  = ch_tds.voltage
        v_ph   = ch_ph.voltage
        v_turb = ch_turb.voltage

        ph_val   = convert_ph(v_ph)
        turb_val = convert_turbidity(v_turb)
        tds_val  = convert_tds(v_tds, temp_c)

        now_iso = datetime.now().isoformat()

        sensor_doc = {
            "timestamp": now_iso,
            "temperature_c": temp_c,
            "ph": ph_val,
            "turbidity": turb_val,
            "tds": tds_val,
            "raw_voltages": {
                "tds_v": v_tds,
                "ph_v": v_ph,
                "turb_v": v_turb,
            },
        }

        # Update live JSON (for /sensor_live)
        try:
            with open(LATEST_JSON, "w") as f:
                json.dump(sensor_doc, f, indent=2)
        except Exception as e:
            print("[WARN] Could not write latest_sensor.json:", e)

        print(
            "[LIVE]",
            f"T={temp_c}°C",
            f"pH={ph_val} (v={v_ph:.4f}V)",
            f"NTU={turb_val} (v={v_turb:.4f}V)",
            f"TDS={tds_val}ppm (v={v_tds:.4f}V)",
        )

        now_ts = time.time()
        if sensor_collection is not None and (now_ts - last_db_save) >= SENSOR_DB_INTERVAL_SECONDS:
            try:
                sensor_collection.insert_one(sensor_doc)
                last_db_save = now_ts
                print("[INFO] Sensor reading saved to MongoDB.")
            except Exception as e:
                print("[WARN] MongoDB insert failed:", e)

    except KeyboardInterrupt:
        print("[INFO] Sensor reader stopped by user.")
        break
    except Exception as e:
        print("[ERROR] Unexpected sensor loop error:", e)

    time.sleep(LOOP_INTERVAL_SECONDS)
