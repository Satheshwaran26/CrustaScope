import os
import glob
import time

# Load 1-wire kernel modules (normally auto after enabling)
os.system('modprobe w1-gpio')
os.system('modprobe w1-therm')

# Find sensor directory
base_dir = '/sys/bus/w1/devices/'
device_folder = glob.glob(base_dir + '28-*')[0]
device_file = device_folder + '/w1_slave'

def read_temp_raw():
    with open(device_file, 'r') as f:
        return f.readlines()

def read_temperature():
    lines = read_temp_raw()
    
    # Wait until temperature is valid
    while lines[0].strip()[-3:] != 'YES':
        time.sleep(0.2)
        lines = read_temp_raw()

    # Read the temperature value
    equals_pos = lines[1].find('t=')
    if equals_pos != -1:
        temp_string = lines[1][equals_pos + 2:]
        temp_c = float(temp_string) / 1000.0
        return temp_c
    return None

print("Reading DS18B20 Temperature Sensor (GPIO4 / Pin 7)...")
print("------------------------------------------------------")

while True:
    temp_c = read_temperature()
    print(f"Temperature: {temp_c:.2f} °C")
    time.sleep(1)
