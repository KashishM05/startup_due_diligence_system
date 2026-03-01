import requests
import time
import subprocess

# Start FastAPI server
proc = subprocess.Popen(["python3", "main.py"])
time.sleep(2)

try:
    response = requests.get('http://localhost:8000/')
    print(f"Status: {response.status_code}")
    print("Content preview:")
    print(response.text[:200])
finally:
    proc.terminate()
