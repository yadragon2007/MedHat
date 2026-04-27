# services/tts_service.py

import subprocess


def speak(text):
    subprocess.run(["espeak", "-v", "en", "-s", "120", text])


def speak_heart_rate(bpm):
    if bpm == 0:
        speak("Heart rate is unavailable. Please check the sensor.")
        return
    speak(f"Your current heart rate is {bpm} beats per minute.")


def speak_alert(condition):
    messages = {
        "critical_tachy": "Warning. Critical tachycardia detected. Heart rate is dangerously high. Please seek medical attention immediately.",
        "tachycardia":    "Caution. Tachycardia detected. Heart rate is above normal range.",
        "critical_brady": "Warning. Critical bradycardia detected. Heart rate is dangerously low. Please seek medical attention immediately.",
        "bradycardia":    "Caution. Bradycardia detected. Heart rate is below normal range.",
        "arrhythmia":     "Warning. Irregular heart rhythm detected. Please consult a doctor.",
        "cardiac_arrest": "Emergency. Cardiac arrest detected. Call for emergency help immediately.",
        "leads_off":      "Warning. ECG sensor is disconnected. Please reattach the leads to the patient.",
    }

    message = messages.get(condition)
    if message:
        speak(message)
    else:
        speak(f"Unknown condition detected: {condition}")
