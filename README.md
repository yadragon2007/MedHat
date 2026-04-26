# MEDhat 🫀

> **Continuous cardiac monitoring, wherever the patient goes.**

MediGuard is a smart medical IoT system that monitors a patient's heart rate in real time using an ECG sensor, responds to voice commands, and instantly alerts caregivers and emergency contacts when a critical condition is detected.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Hardware Components](#hardware-components)
- [Communication Flow](#communication-flow)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Design](#database-design)
- [ECG Condition Classification](#ecg-condition-classification)
- [Alert System](#alert-system)
- [Voice Interaction](#voice-interaction)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [LED Indicators](#led-indicators)
- [Wiring Reference](#wiring-reference)

---

## Overview

MediGuard is built around three layers:

| Layer | Description |
|---|---|
| **Wearable Sensor Unit** | ESP32 + AD8232 ECG sensor worn by the patient |
| **Hub (Raspberry Pi 3)** | Central brain — processes ECG data, handles voice, manages alerts |
| **Cloud (Web Server + Database)** | Stores data permanently and serves the caregiver dashboard |

The system is designed to operate **continuously and autonomously** — if the internet goes down, readings are buffered locally and synced automatically when the connection is restored.

---

## System Architecture

```
Patient (voice)
     │
     ▼
 Microphone
     │  STT (Vosk — offline)
     ▼
Raspberry Pi  ◄──── MQTT ──── ESP32 + AD8232
     │
     │  Socket.IO (WebSocket)
     ▼
 Web Server (Node.js / Express)
     │                    │
     ▼                    ▼
  MongoDB              SQLite
(cloud records)    (offline buffer)
     │
     ▼
React Dashboard  ──►  Caregiver / Doctor
```

---

## Hardware Components

| Component | Role |
|---|---|
| **ESP32** | Sensor node — reads ECG data and publishes via MQTT over WiFi |
| **AD8232 ECG Sensor** | Captures the patient's electrocardiogram signal |
| **Raspberry Pi 3** | Hub — runs all Python services and coordinates the system |
| **USB Microphone** | Captures patient voice commands |
| **Speaker** | Plays TTS voice responses back to the patient |
| **LEDs (x3)** | Visual status indicators (see [LED Indicators](#led-indicators)) |
| **Stepper Motor Driver** | Physical actuation (e.g. medication dispensing) |
| **SIM800L (GSM)** | Fallback SMS/call alerts when internet is unavailable |

---

## Communication Flow

```
1. Patient wears ECG sensor (AD8232 on ESP32)
2. ESP32 samples ECG at 200 Hz, detects R-peaks, calculates BPM
3. ESP32 publishes JSON payload to MQTT topic: mediguard/ecg
4. Raspberry Pi receives reading and classifies the condition
   a. Normal  → forward to Web Server + store locally
   b. Anomaly → trigger alert (Twilio / SIM800L / web-push)
5. Web Server receives data via Socket.IO
6. Data is stored in MongoDB
7. React dashboard displays live data to caregivers
8. Patient speaks a command:
   Mic → STT (Vosk) → Pi processes → TTS (espeak/ElevenLabs) → Speaker
```

### MQTT Payload Format

```json
{
  "heart_rate": 76,
  "condition": "normal"
}
```

Topic: `mediguard/ecg`

---

## Features

### Real-Time ECG Monitoring
- Continuous heart rate measurement at 200 Hz sampling rate
- Live ECG waveform streamed to the web dashboard
- BPM calculation using R-R interval detection with hysteresis

### Voice Interaction
- Wake word detection: **"Hey Medhat"**
- Offline speech-to-text using **Vosk**
- Patient can ask: *"What is my heart rate?"*, *"Am I okay?"*, etc.
- Voice responses via **espeak** (offline) or **ElevenLabs** (online)

### Smart Alerts
- Automatic SMS and phone calls to family and emergency contacts on critical readings
- Three alert channels: **Twilio**, **SIM800L (GSM fallback)**, **Web Push**

### Medical Reports
- Full historical ECG data stored in MongoDB
- Condition summaries, alert history, and trend analysis
- Viewable and filterable by date range on the web dashboard

### Emergency Contact System
- Calls and SMS sent automatically to registered family members
- Escalates based on severity of detected condition
- Works even without internet via SIM800L GSM module

### Offline Resilience
- Local SQLite buffer on the Pi stores readings during internet outages
- Automatic sync to MongoDB on reconnection
- All readings flagged with `synced_from_local: true` after sync

---

## Tech Stack

| Layer | Technology |
|---|---|
| Sensor Node | ESP32, AD8232, Arduino (C++) |
| Hub OS | Raspberry Pi OS (headless) |
| Hub Language | Python 3 |
| Sensor Communication | MQTT (topic: `mediguard/ecg`) |
| Pi → Web Communication | Socket.IO (WebSocket) |
| Web Server | Node.js + Express |
| Frontend | React + EJS |
| Cloud Database | MongoDB |
| Local Buffer | SQLite |
| Voice STT | Vosk (offline) |
| Voice TTS | espeak (offline) / ElevenLabs (online) |
| Alerts | Twilio, SIM800L, web-push |
| AI Integration | OpenRouter API |
| Version Control | GitHub (SSH auth) |

---

## Project Structure

### Raspberry Pi (Python)

```
mediguard-pi/
├── main.py                        # Entry point
├── config/
│   ├── __init__.py
│   └── settings.py                # IP addresses, thresholds, API keys
├── controllers/
│   ├── __init__.py
│   └── hub_controller.py          # Main logic coordinator
├── models/
│   ├── __init__.py
│   └── reading.py                 # ECG reading data model
├── services/
│   ├── __init__.py
│   ├── mqtt_service.py            # MQTT subscriber
│   ├── ecg_service.py             # ECG parsing, validation, batching
│   ├── voice_service.py           # Wake word, STT, TTS
│   └── alert_service.py           # Twilio / SIM800L alerts
└── vosk-models/                   # Offline STT model files
```

### Web Server (Node.js)

```
mediguard-server/
├── index.js                       # Entry point
├── config/
│   └── db.js                      # MongoDB connection
├── controllers/
│   └── readingController.js       # Handle incoming ECG data
├── models/
│   └── Reading.js                 # MongoDB schema
├── routes/
│   └── api.js                     # REST API routes
├── views/
│   └── index.ejs                  # Dashboard template
├── websocket/
│   └── piSocket.js                # Socket.IO handler for Pi connection
└── services/
    └── alertService.js            # Twilio / web-push notifications
```

---

## Database Design

### Collections (MongoDB)

#### `ecg_readings`
One document inserted every 5 seconds, containing 300 ADC samples at 60 Hz.

```json
{
  "_id": "ObjectId",
  "ecg_values": [2048, 2103, 2187, "...297 more"],
  "bpm_avg": 76,
  "bpm_min": 72,
  "bpm_max": 81,
  "condition": "normal",
  "sample_rate": 300,
  "synced_from_local": false,
  "timestamp": "ISODate"
}
```

#### `alerts`
Created on every anomalous reading.

```json
{
  "_id": "ObjectId",
  "reading_id": "ObjectId",
  "condition": "critical_tachy",
  "heart_rate_at_alert": 158,
  "triggered_at": "ISODate",
  "resolved": false,
  "resolved_at": null,
  "notes": ""
}
```

#### `patients`
Single document — the monitored patient's profile.

```json
{
  "_id": "ObjectId",
  "name": "Ahmed Hassan",
  "age": 67,
  "blood_type": "A+",
  "emergency_contact": {
    "name": "Sara Hassan",
    "relation": "daughter",
    "phone": "+201009876543"
  }
}
```

### Offline Buffer (SQLite on Pi)

```sql
CREATE TABLE ecg_buffer (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  heart_rate  INTEGER NOT NULL,
  condition   TEXT NOT NULL,
  timestamp   TEXT NOT NULL,
  synced      INTEGER DEFAULT 0
);
```

---

## ECG Condition Classification

| Condition | Trigger |
|---|---|
| `normal` | BPM within 60–100, regular rhythm |
| `tachycardia` | BPM > 100 |
| `critical_tachy` | BPM > 150 |
| `bradycardia` | BPM < 60 |
| `critical_brady` | BPM < 40 |
| `arrhythmia` | Irregular R-R interval detected |
| `cardiac_arrest` | No cardiac activity detected |
| `leads_off` | ECG leads disconnected from patient |
| `initializing` | System startup — calibrating baseline |

BPM is calculated using:

```
BPM = 60000 / RR_interval_ms
```

---

## Alert System

| Channel | Condition | Notes |
|---|---|---|
| **Twilio SMS** | Any anomaly — internet available | Sends to caregiver and family |
| **Twilio Call** | Critical conditions | Automated voice call |
| **Web Push** | Any anomaly — internet available | Browser/phone notification |
| **SIM800L GSM** | Any anomaly — internet down | Mobile network fallback |

Alerts are triggered for: `tachycardia`, `critical_tachy`, `bradycardia`, `critical_brady`, `arrhythmia`, `cardiac_arrest`, `leads_off`.

---

## Voice Interaction

| Step | Technology |
|---|---|
| Wake word detection | Vosk keyword spotting |
| Wake word | **"Hey Medhat"** |
| Speech-to-Text | Vosk (offline) |
| Command processing | Python — hub_controller.py |
| Text-to-Speech | espeak (offline) / ElevenLabs (online) |
| Audio input | USB microphone (resampled 44100 Hz → 16000 Hz) |

### Voice Service API

```python
voice_service.start_wake_word_mode()         # blocking
voice_service.start_wake_word_mode_async()   # non-blocking
voice_service.start_listening_directly()     # skip wake word
voice_service.start_listening_directly_async()
voice_service.return_to_wake_word()
voice_service.stop()
```

**Command timeout:** 10 seconds after wake word detection.

---

## Setup & Installation

### Prerequisites

- Raspberry Pi 3 running Raspberry Pi OS
- Python 3.10+
- Node.js 18+
- MongoDB instance (local or Atlas)
- Arduino IDE (for flashing the ESP32)

### 1. Clone the repository

```bash
git clone git@github.com:yadragon2007/SDG_3_Project.git
cd SDG_3_Project
```

### 2. Raspberry Pi setup

```bash
cd mediguard-pi
pip install -r requirements.txt --break-system-packages
```

Download the Vosk model and place it in `vosk-models/`:
```bash
# Example: small English model
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip -d vosk-models/
```

Run the hub:
```bash
python main.py
```

### 3. Web server setup

```bash
cd mediguard-server
npm install
node index.js
```

### 4. Flash the ESP32

- Open `esp32_sketch/esp32_sketch.ino` in Arduino IDE
- Set your WiFi credentials and Pi IP in the sketch constants
- Select board: **ESP32 Dev Module**
- Upload (hold BOOT button if needed)

---

## Environment Variables

Create a `.env` file in both `mediguard-pi/` and `mediguard-server/`:

### mediguard-pi (`config/settings.py`)

```python
MQTT_BROKER_IP    = "192.168.x.x"     # Pi's local IP
WEB_SERVER_IP     = "192.168.x.x"
WEB_SERVER_PORT   = 3000

TWILIO_SID        = "your_account_sid"
TWILIO_TOKEN      = "your_auth_token"
TWILIO_FROM       = "+1xxxxxxxxxx"
CAREGIVER_PHONE   = "+201xxxxxxxxx"

OPENROUTER_API_KEY = "your_key"
ELEVENLABS_API_KEY = "your_key"       # optional

BPM_HIGH_THRESHOLD = 100
BPM_LOW_THRESHOLD  = 60
BPM_CRITICAL_HIGH  = 150
BPM_CRITICAL_LOW   = 40
```

### mediguard-server (`.env`)

```env
MONGODB_URI=mongodb+srv://...
PORT=3000
TWILIO_SID=your_account_sid
TWILIO_TOKEN=your_auth_token
WEBPUSH_PUBLIC_KEY=your_vapid_public_key
WEBPUSH_PRIVATE_KEY=your_vapid_private_key
```

---

## LED Indicators

| LED | GPIO Pin | State | Meaning |
|---|---|---|---|
| Left | 17 | Blinking (1 Hz) | Pi disconnected from web server |
| Left | 17 | Solid ON | Pi connected to web server |
| Middle | 27 | ON | Voice listening mode active |
| Right | — | ON | ECG sensor properly connected to patient |

---

## Wiring Reference

### AD8232 → ESP32

```
AD8232 Pin    ESP32 Pin     Notes
----------    ---------     ------
OUTPUT        GPIO34        ADC1 — direct 0-3.3V, no voltage divider needed
LO+           GPIO32        Leads-off detection
LO-           GPIO33        Leads-off detection
SDN           3.3V          Tie HIGH to keep sensor active
3.3V          3.3V          Power
GND           GND           Common ground
```

> **Important:** Only use ADC1 pins (GPIO32–GPIO39) for analog ECG reads.
> ADC2 pins conflict with the WiFi driver and will produce corrupted readings.

---

## Important Notes

- **ESP32 ADC:** ADC2 is blocked during WiFi activity. Always use ADC1 (GPIO32–GPIO39) for the ECG signal.
- **Vosk resampling:** Python 3.13 removed `audioop`. USB mic input at 44100 Hz is resampled to 16000 Hz using `numpy`.
- **Flask-SocketIO:** Uses `sio.start_background_task` with `sio.sleep()` for stable background streaming. Avoid `eventlet`/`gevent` for this project.
- **Timestamps:** Python `time.time()` timestamps must be multiplied by 1000 before passing to JavaScript's `Date` object.
- **GPIO cleanup:** Always wrap GPIO usage in `try/finally` blocks. Use `GPIO.setwarnings(False)` to suppress pin reuse warnings.
- **Git auth:** Remote URL must use SSH format. If pushes fail, run:
  ```bash
  git remote set-url origin git@github.com:yadragon2007/SDG_3_Project.git
  ```

---

*MediGuard — Continuous care, wherever the patient goes.*
