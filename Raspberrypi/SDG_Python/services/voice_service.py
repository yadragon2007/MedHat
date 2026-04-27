# After
import os
import json
import numpy as np
import pyaudio
import time
import threading
from vosk import Model, KaldiRecognizer
import RPi.GPIO as GPIO

# GPIO setup
LED_PIN = 27
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup(LED_PIN, GPIO.OUT)

# Vosk setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "vosk-models", "vosk-model-small-en-us-0.15")
MIC_RATE = 44100
VOSK_RATE = 16000
COMMAND_TIMEOUT = 10

WAKE_WORD = "hey medhat"
COMMANDS = '["what is my heart rate", "call my doctor", "i feel dizzy", "my chest hurts", "help", "call emergency", "what is my status", "thanks", "[unk]"]'

model = None
wake_recognizer = None
command_recognizer = None

def _init_recognizers():
    global model, wake_recognizer, command_recognizer
    model = Model(MODEL_PATH)
    wake_recognizer = KaldiRecognizer(model, VOSK_RATE, '["hey medhat", "[unk]"]')
    command_recognizer = KaldiRecognizer(model, VOSK_RATE, COMMANDS)
    print("Recognizers initialized.")

# Internal state
_stream = None
_mic = None
_stop_flag = threading.Event()
_mode = None  # "wake" or "direct"
_background_thread = None

# _init_stream - change frames_per_buffer
def _init_stream():
    global _stream, _mic
    _mic = pyaudio.PyAudio()
    _stream = _mic.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=MIC_RATE,
        input=True,
        frames_per_buffer=8192  # back to 8192
    )
    _stream.start_stream()

def _close_stream():
    global _stream, _mic
    if _stream:
        _stream.stop_stream()
        _stream.close()
        _stream = None
    if _mic:
        _mic.terminate()
        _mic = None
    GPIO.output(LED_PIN, GPIO.LOW)

def resample(data, from_rate, to_rate):
    audio = np.frombuffer(data, dtype=np.int16)
    ratio = to_rate / from_rate
    new_length = int(len(audio) * ratio)
    resampled = np.interp(
        np.linspace(0, len(audio), new_length),
        np.arange(len(audio)),
        audio
    ).astype(np.int16)
    return resampled.tobytes()

def _listen_for_command():
    # Returns recognized command text or None on timeout/thanks/stop
    GPIO.output(LED_PIN, GPIO.HIGH)
    command_recognizer.Reset()
    last_command_time = time.time()

    while not _stop_flag.is_set():
        # _listen_for_command - change read size
        data = _stream.read(4096, exception_on_overflow=False)
        resampled = resample(data, MIC_RATE, VOSK_RATE)

        if time.time() - last_command_time >= COMMAND_TIMEOUT:
            print(f"Timeout - no activity for {COMMAND_TIMEOUT} seconds, going back to sleep...")
            GPIO.output(LED_PIN, GPIO.LOW)
            return None

        if command_recognizer.AcceptWaveform(resampled):
            result = json.loads(command_recognizer.Result())
            text = result.get("text", "")

            if text == "thanks":
                print("Thanks detected - going back to sleep.")
                GPIO.output(LED_PIN, GPIO.LOW)
                return None

            if text and text != "[unk]":
                last_command_time = time.time()
                command_recognizer.Reset()
                return text

    GPIO.output(LED_PIN, GPIO.LOW)
    return None
    
def _wake_word_loop(callback=None, on_timeout=None):
    wake_recognizer.Reset()
    GPIO.output(LED_PIN, GPIO.LOW)
    print("Waiting for wake word: Hey Medhat")

    while not _stop_flag.is_set():
        data = _stream.read(4096, exception_on_overflow=False)
        resampled = resample(data, MIC_RATE, VOSK_RATE)

        if wake_recognizer.AcceptWaveform(resampled):
            result = json.loads(wake_recognizer.Result())
            text = result.get("text", "")

            if WAKE_WORD in text:
                print("Wake word detected!")

                # Keep listening for commands until timeout or thanks
                while not _stop_flag.is_set():
                    command = _listen_for_command()
                    if command:
                        if callback:
                            callback(command)
                        else:
                            return command
                    else:
                        # timeout or thanks - session ended
                        if on_timeout:
                            on_timeout()
                        break  # break inner loop, go back to wake word

                wake_recognizer.Reset()
                GPIO.output(LED_PIN, GPIO.LOW)
                if not _stop_flag.is_set():
                    print("Waiting for wake word: Hey Medhat")

    _close_stream()
  
def _direct_loop(callback=None):
    print("Listening directly...")
    while not _stop_flag.is_set():
        command = _listen_for_command()
        if command:
            if callback:
                callback(command)
            else:
                return command
        if not _stop_flag.is_set():
            print("Listening directly...")
    _close_stream()

# -------------------------------------------------------
# PUBLIC FUNCTIONS - use these in main.py or any file
# -------------------------------------------------------

def start_wake_word_mode():
    global _stop_flag
    _init_recognizers()
    _stop_flag.clear()
    _init_stream()
    return _wake_word_loop()

def start_wake_word_mode_async(callback, on_timeout=None):
    global _background_thread, _stop_flag
    _init_recognizers()
    _stop_flag.clear()
    _init_stream()
    _background_thread = threading.Thread(
        target=_wake_word_loop,
        args=(callback, on_timeout),
        daemon=True
    )
    _background_thread.start()

def start_listening_directly():
    global _stop_flag
    _init_recognizers()
    _stop_flag.clear()
    _init_stream()
    return _direct_loop()

def start_listening_directly_async(callback):
    global _background_thread, _stop_flag
    _init_recognizers()
    _stop_flag.clear()
    _init_stream()
    _background_thread = threading.Thread(
        target=_direct_loop,
        args=(callback,),
        daemon=True
    )
    _background_thread.start()

def return_to_wake_word():
    # Stops current listening and restarts in wake word mode
    global _stop_flag
    _stop_flag.set()
    time.sleep(0.5)
    _stop_flag.clear()
    _init_stream()
    _wake_word_loop()

def stop():
    global _stop_flag
    _stop_flag.set()
    _close_stream()  # this already does GPIO.output(LED_PIN, GPIO.LOW)
    time.sleep(0.3)  # give threads time to finish
    GPIO.cleanup()
    print("Voice service stopped.")
