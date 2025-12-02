#!/bin/bash
# CrustaScope - Raspberry Pi 5 launcher

cd "$(dirname "$0")"

echo "[INFO] Activating environment..."
source crustascope-env/bin/activate

# Replace with your real MongoDB Atlas URI
export MONGODB_URI="mongodb+srv://nivedanv14_db_user:hRnGjINUfRvIXgLn@cluster0.hsieonu.mongodb.net/?appName=Cluster0"

echo "[INFO] Starting sensor reader..."
python sensor_reader.py &
SENSOR_PID=$!
echo "[INFO] Sensor reader running at PID $SENSOR_PID"

echo "[INFO] Starting CrustaScope backend..."
python app.py

echo ""
echo "[INFO] Backend stopped, killing sensor reader..."
kill "$SENSOR_PID" 2>/dev/null
echo "[INFO] Done."
