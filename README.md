# MedHat — Smart ECG Monitor System

A real-time smart patient monitoring system that streams live ECG data from a hardware sensor node to a web dashboard, with voice assistant capabilities, push notifications, and persistent clinical reporting.

---

## Overview

MedHat connects a physical ECG sensor (AD8232) through an Arduino/ESP32 microcontroller to a Raspberry Pi hub, which processes the signal, classifies cardiac conditions, and streams data to a Node.js web server. The dashboard displays a live ECG waveform, current BPM, patient info, emergency contacts, and clinical reports — all backed by MongoDB.

A voice assistant running on the Pi allows the patient to ask for their heart rate or status using a wake word ("Hey Medhat"), and the system can send push notifications to registered browsers when a critical condition is detected.

---

## System Architecture

<!--
```
[AD8232 ECG Sensor]
        |
        v
[Arduino / ESP32]  ──── Serial (USB) / MQTT ────>  [Raspberry Pi 3]
                                                          |
                                          ┌───────────────┼───────────────┐
                                          |               |               |
                                     [MQTT Broker]  [Voice Service]  [GPIO LEDs]
                                          |         (Vosk STT +      (Pin 17, 27)
                                          |          espeak TTS)
                                          v
                                   [Python Server]
                                   (Flask-SocketIO)
                                          |
                                    Socket.IO Client
                                          |
                                          v
                                [Node.js Web Server]
                                (Express + Socket.IO)
                                          |
                              ┌───────────┴───────────┐
                              |                       |
                         [MongoDB Atlas]        [Browser Dashboard]
                         (Reports, Patients,    (EJS Views, Chart.js,
                          Push Subscriptions)    Web Push Notifications)
```
 -->

## ![System Architecture](assets/sysD.png)

## Features

- **Live ECG Waveform** — Scrolling real-time graph via Socket.IO and Chart.js
- **BPM Calculation** — Peak detection with R-R interval averaging on the microcontroller
- **Condition Classification** — 8 cardiac states detected and labeled automatically
- **Voice Assistant** — Wake word detection ("Hey Medhat") with offline Vosk STT and espeak TTS
- **Push Notifications** — Web Push (VAPID) alerts sent to subscribed browsers on critical conditions
- **Emergency SOS** — One-tap button to broadcast an alert to all registered devices
- **Care Circle** — Click-to-call emergency contact cards pulled from the patient profile
- **Clinical Reports** — Create, store, and print patient session reports backed by MongoDB
- **Patient Dashboard** — Name, age, blood type, address, and contact info rendered server-side
- **GPIO Feedback** — LED on Pin 17 indicates Pi–browser connection; LED on Pin 27 tracks voice service state

---

## Technology Stack

| Layer              | Technology                                              |
| ------------------ | ------------------------------------------------------- |
| Sensor Node        | Arduino / ESP32, AD8232 ECG module                      |
| Embedded Firmware  | C++ (Arduino IDE), FreeRTOS (ESP32 dual-core)           |
| Hub                | Raspberry Pi 3 (Python 3)                               |
| Hub Services       | Flask-SocketIO, Paho MQTT, Vosk, PyAudio, NumPy, espeak |
| Web Backend        | Node.js, Express 5, Socket.IO 4                         |
| Templating         | EJS                                                     |
| Database           | MongoDB Atlas via Mongoose                              |
| Push Notifications | Web Push (VAPID), Service Worker                        |
| Frontend           | HTML5, CSS3, JavaScript ES6+, Chart.js, Lucide Icons    |
| Dev Tools          | Nodemon, dotenv, Git / GitHub (SSH)                     |

---

## Project Structure

```
medhat/
├── Arduino/
│   └── ECG/
│       └── ECG.ino                  # ECG sketch: AD8232 → Serial JSON
│
├── Raspberrypi/
│   └── SDG_Python/
│       ├── main.py                  # Pi hub: Socket.IO server, Arduino reader, voice trigger
│       ├── services/
│       │   ├── voice_service.py     # Vosk STT, wake word loop, GPIO LED feedback
│       │   └── tts_service.py       # espeak TTS helpers
│       └── vosk-models/             # Offline Vosk language model (gitignored)
│
├── webServer/
│   ├── app.js                       # Express entry point, Socket.IO bridge, MongoDB connect
│   ├── routes/
│   │   ├── Index.js                 # GET /
│   │   ├── report.js                # GET|POST /report, GET /report/:id
│   │   └── push.js                  # POST /push/subscribe, POST /push/alert
│   ├── controller/
│   │   ├── patientController.js     # Patient default seed, home render
│   │   └── reportController.js      # Report CRUD
│   ├── models/
│   │   ├── Patient.js               # Mongoose patient schema
│   │   ├── Report.js                # Mongoose report schema
│   │   └── PushSubscription.js      # Mongoose push subscription schema
│   ├── lib/
│   │   └── push.js                  # VAPID setup, sendPushToAll, saveSubscription
│   ├── views/
│   │   ├── index.ejs                # Live dashboard
│   │   ├── add_report.ejs           # Report creation form
│   │   ├── report.ejs               # Report detail / print view
│   │   ├── nav.ejs                  # Shared navigation partial
│   │   └── footer.ejs               # Shared footer partial
│   ├── public/
│   │   ├── style.css                # Navigation and footer styles
│   │   └── sw.js                    # Service worker for Web Push
│   └── package.json
│
└── README.md
```

---

## Hardware Setup & Wiring

### AD8232 ECG Sensor → Arduino

| AD8232 Pin | Arduino Pin        |
| ---------- | ------------------ |
| OUTPUT     | A0                 |
| LO+        | D4                 |
| LO-        | D3                 |
| 3.3V       | 3.3V               |
| GND        | GND                |
| SDN        | 3.3V (keep active) |

> If using an **ESP32** instead of Arduino, connect OUTPUT to **GPIO34** (ADC1). Do not use ADC2 pins — they conflict with WiFi.

### Raspberry Pi GPIO

| GPIO Pin | Purpose                                             |
| -------- | --------------------------------------------------- |
| 17       | Browser connection indicator (solid on = connected) |
| 27       | Voice service LED (on during command listening)     |
| 22       | ECG leads status (on = leads attached)              |

---

## Installation & Setup

### 1. Sensor Node (Arduino / ESP32)

Open `Arduino/ECG/ECG.ino` in the Arduino IDE and flash it to your board. The sketch reads the AD8232 and outputs JSON over Serial at 9600 baud:

```json
{ "ecg": 612, "bpm": 74, "condition": "normal", "leads_off": false }
```

If leads are disconnected:

```json
{ "ecg": 0, "bpm": 0, "leads_off": true, "condition": "unknown" }
```

### 2. Raspberry Pi Server

Install Python dependencies:

```bash
pip install flask flask-socketio eventlet pyserial paho-mqtt vosk pyaudio numpy RPi.GPIO requests
```

Download a Vosk model and place it at:

```
Raspberrypi/SDG_Python/vosk-models/vosk-model-small-en-us-0.15/
```

Run the Pi server:

```bash
cd Raspberrypi/SDG_Python
python main.py
```

The Pi server listens on port **3000** and emits `arduino_data` events to connected Socket.IO clients.

### 3. Web Server (Node.js)

```bash
cd webServer
npm install
```

Create a `.env` file in `webServer/`:

```env
WEBPUSH_SUBJECT=mailto:you@example.com
WEBPUSHPUPLIC=your_vapid_public_key
WEBPUSHPRIVATE=your_vapid_private_key
MONGODBUSER=your_mongodb_user
MONGODBPASSWORD=your_mongodb_password
```

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Update the Pi IP in `app.js`:

```javascript
const piSocket = connectToPi("http://<PI_IP>:3000");
```

Start the server:

```bash
npm run dev       # nodemon (development)
node app.js       # production
```

The web server runs on port **8080**.

### 4. MongoDB

The app connects to MongoDB Atlas. Update the connection URI in `app.js`:

```javascript
const uri = `mongodb+srv://${process.env.MONGODBUSER}:${process.env.MONGODBPASSWORD}@cluster0.ivo3yv1.mongodb.net/Medhat?appName=Cluster0`;
```

A default patient record is seeded automatically on first run if the `patients` collection is empty.

---

## ECG Condition Classification

Conditions are classified on the microcontroller based on averaged R-R interval BPM, and re-evaluated on the Pi for voice and push alerts.

| Condition        | Trigger                 | Severity     |
| ---------------- | ----------------------- | ------------ |
| `normal`         | 60–100 BPM              | —            |
| `tachycardia`    | 100–150 BPM             | Caution      |
| `critical_tachy` | > 150 BPM               | Warning      |
| `bradycardia`    | 40–60 BPM               | Caution      |
| `critical_brady` | < 40 BPM                | Warning      |
| `arrhythmia`     | Irregular R-R intervals | Warning      |
| `cardiac_arrest` | No pulse detected       | Emergency    |
| `leads_off`      | LO+ or LO- pin HIGH     | Sensor alert |

Abnormal conditions trigger a spoken alert via espeak on the Pi. The same condition is not repeated for 60 seconds unless it changes.

---

## Real-Time Data Flow

```
Arduino Serial JSON
        |
   main.py (Pi)
   readline() → json.loads()
        |
   sio.emit('arduino_data', data)   ← Flask-SocketIO (port 3000)
        |
   app.js (Node.js)
   piSocket.on('arduinoData') → io.emit('arduinoData', data)
        |
   index.ejs (Browser)
   socket.on('arduinoData') → Chart.js update + BPM display
```

> Note: The Pi emits `arduino_data` (snake_case); the web server re-emits as `arduinoData` (camelCase) to the browser.

---

## Voice Assistant

The voice service runs as a background thread on the Pi using Vosk for fully offline speech recognition.

**Wake word:** `Hey Medhat`

**Supported commands:**

| Command                 | Action                                              |
| ----------------------- | --------------------------------------------------- |
| `what is my heart rate` | Speaks current BPM                                  |
| `what is my status`     | Speaks current condition                            |
| `call my doctor`        | Speaks confirmation message                         |
| `call emergency`        | Speaks confirmation message                         |
| `thanks`                | Ends the command session, returns to wake word mode |

**LED feedback:** GPIO 27 turns on when the system is actively listening for a command and turns off when it returns to wake word standby.

**Mic setup note:** The service resamples audio from 44100 Hz (microphone) down to 16000 Hz (Vosk requirement) using NumPy. `audioop` is not used as it was removed in Python 3.13.

---

## Push Notifications

The system uses the Web Push protocol with VAPID keys for browser push notifications.

**Flow:**

1. User clicks "Enable Notifications" on the dashboard
2. Browser subscribes via `PushManager` and POSTs the subscription to `/push/subscribe`
3. Subscription is stored in MongoDB (`PushSubscription` collection)
4. When the Pi emits an `alert` event, the Node.js server calls `sendPushToAll()` which sends a Web Push message to all stored subscriptions
5. The service worker (`sw.js`) displays the notification and handles click-to-navigate

Expired or invalid subscriptions (HTTP 410/404) are automatically removed from the database.

---

## API & Routes

### Web Server Routes

| Method | Path              | Description                                 |
| ------ | ----------------- | ------------------------------------------- |
| GET    | `/`               | Main patient dashboard                      |
| GET    | `/report`         | New report form                             |
| POST   | `/report`         | Save a new report to MongoDB                |
| GET    | `/report/:id`     | View a single report                        |
| POST   | `/push/subscribe` | Register a browser push subscription        |
| POST   | `/push/alert`     | Send a manual push alert to all subscribers |

### Socket.IO Events (Browser ↔ Web Server)

| Event          | Direction        | Payload                                  |
| -------------- | ---------------- | ---------------------------------------- |
| `arduinoData`  | Server → Browser | Raw JSON string from the Pi              |
| `connected`    | Server → Browser | Pi came online                           |
| `disconnected` | Server → Browser | Pi went offline                          |
| `alert`        | Server → Browser | Alert object `{title, body, url, level}` |

### Socket.IO Events (Pi ↔ Web Server)

| Event          | Direction   | Payload                         |
| -------------- | ----------- | ------------------------------- |
| `arduino_data` | Pi → Server | `{data: "<json string>"}`       |
| `alert`        | Pi → Server | Alert object                    |
| `vice_command` | Pi → Server | Recognized voice command string |

---

## Database Schema

### Patient

```
name, age, gender, blood_type, phone, address,
emergency_contact: [{ name, relation, phone }]
```

### Report

```
title, datetime, maxBpm, minBpm, avgBpm,
condition: EXCELLENT | STABLE | RECOVERING | ELEVATED | BRADYCARDIA | ARRHYTHMIA | CRITICAL,
notes
```

### PushSubscription

```
endpoint (unique), keys: { p256dh, auth }, expirationTime, lastSeen
```

---

## Known Limitations & Roadmap

**Current limitations:**

- The Arduino sketch does not detect arrhythmia — this requires additional R-R variance logic
- The voice command list is fixed at startup via Vosk grammar; dynamic commands are not supported
- OpenRouter (if integrated) is not suitable for production due to free-tier model inconsistency

**Planned features:**

- SIM800L GSM module integration for SMS alerts when there is no internet
- ElevenLabs TTS for higher-quality voice output
- Arrhythmia detection via R-R interval variance on the ESP32
- Patient multi-profile support

---

## License & Contact

© 2026 MedHat. All Rights Reserved.

**LinkedIn** — [Yousef Amr](https://www.linkedin.com/in/yousef-amr-b3a77b373/) — Let's talk engineering.
