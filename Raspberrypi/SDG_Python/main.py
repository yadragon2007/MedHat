import serial
import socketio
import eventlet
import json
import time
import requests
import socket
import RPi.GPIO as GPIO
import signal
import sys
from services.voice_service import start_wake_word_mode_async
from services.tts_service import speak_heart_rate, speak_alert ,speak

# GPIO setup
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(17, GPIO.OUT)
GPIO.setup(27, GPIO.OUT)
GPIO.setup(22, GPIO.OUT)

# Socket.io server
sio = socketio.Server(cors_allowed_origins='*')
app = socketio.WSGIApp(sio)

# shared latest ECG reading
latest_ecg = {
    "bpm": 0,
    "condition": "initializing",
    "leads_off": False
}

# condition alert tracker
last_spoken_condition = None
last_spoken_time = 0
REPEAT_INTERVAL = 60  # seconds before repeating same condition alert

# Arduino serial connection
try:
    ser = serial.Serial('/dev/ttyACM0', 9600, timeout=1)
    ser.reset_input_buffer()
except Exception as e:
    print(f"Error connecting to Arduino: {e}")
    exit()


# register Pi with web server so you can find its IP remotely
def register_with_server():
    payload = {
        "secret": "your_shared_secret",
        "hostname": socket.gethostname(),
        "local_ip": socket.gethostbyname(socket.gethostname())
    }
    try:
        requests.post("https://your-server.com/api/pi/register", json=payload, timeout=5)
        print("Registered with server")
    except Exception as e:
        print(f"Registration failed: {e}")


@sio.event
def connect(sid, environ):
    print(f"Client connected: {sid}")
    GPIO.output(17, GPIO.HIGH)


@sio.event
def disconnect(sid):
    print(f"Client disconnected: {sid}")
    GPIO.output(17, GPIO.LOW)


def read_arduino_and_emit():
    global latest_ecg
    while True:
        if ser.in_waiting > 0:
            try:
                line = ser.readline().decode('utf-8', errors='ignore').rstrip()

                # skip empty or malformed lines
                if not line or not line.startswith('{') or not line.endswith('}'):
                    continue

                ecg_bpm = json.loads(line)
                latest_ecg = ecg_bpm

                if ecg_bpm.get('leads_off') == True:
                    GPIO.output(22, GPIO.LOW)
                else:
                    GPIO.output(22, GPIO.HIGH)

                sio.emit('arduino_data', {'data': line})

            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"Loop Error: {e}")

        eventlet.sleep(0.01)



def monitor_and_speak():
    global last_spoken_condition, last_spoken_time

    while True:
        condition = latest_ecg.get('condition', 'initializing')
        now = time.time()

        should_speak = (
            condition != 'normal' and
            condition != 'initializing' and
            (
                condition != last_spoken_condition or
                now - last_spoken_time >= REPEAT_INTERVAL
            )
        )

        if should_speak:
            last_spoken_condition = condition
            last_spoken_time = now
            speak_alert(condition)

        eventlet.sleep(1)


def listen_voice_command(data):
    bpm = latest_ecg.get('bpm', 0)
    condition = latest_ecg.get('condition', 'unknown')
    leads_off = latest_ecg.get('leads_off', False)

    
    if (data == "what is my heart rate"):
        if leads_off:
         speak_alert("leads_off")
         return
        else:
         speak_heart_rate(bpm)
    elif (data == "call my doctor" or data == "call emergency"):
        speak("I sent a notification to your doctor and your family")
    elif (data == "what is my status"):
        speak("Now your condition is " + condition)

def shutdown(sig=None, frame=None):
    print("Cleaning up GPIO...")
    GPIO.cleanup()
    sys.exit(0)


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

start_wake_word_mode_async(listen_voice_command)

if __name__ == '__main__':
    print("Starting Socket.io server on port 3000...")
    register_with_server()
    eventlet.spawn(read_arduino_and_emit)
    eventlet.spawn(monitor_and_speak)

    try:
        eventlet.wsgi.server(eventlet.listen(('', 3000)), app)
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        shutdown()
        shutdown()
