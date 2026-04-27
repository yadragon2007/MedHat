// MediGuard — Arduino ECG Sketch
// AD8232 ECG sensor → Serial JSON → Raspberry Pi
//
// Wiring:
//   AD8232 OUTPUT → A0
//   AD8232 LO+    → D10
//   AD8232 LO-    → D11
//   AD8232 3.3V   → 3.3V
//   AD8232 GND    → GND
//   AD8232 SDN    → 3.3V (keep sensor active)

#define ECG_PIN A0
#define LO_PLUS 4
#define LO_MINUS 3

#define RR_BUFFER_SIZE 8
#define MIN_RR_MS 300
#define MAX_RR_MS 2000
#define THRESHOLD 512
#define HYSTERESIS 50

int rrBuffer[RR_BUFFER_SIZE];
int rrIndex = 0;
int rrCount = 0;
long lastPeakTime = 0;
bool peakDetected = false;
int currentBpm = 0;
String condition = "";

#define PUBLISH_INTERVAL_MS 100
long lastPublishTime = 0;

void setup() {
  Serial.begin(9600);
  pinMode(LO_PLUS, INPUT);
  pinMode(LO_MINUS, INPUT);
}

void loop() {
  long now = millis();

  if (digitalRead(LO_PLUS) || digitalRead(LO_MINUS)) {
    if (now - lastPublishTime >= PUBLISH_INTERVAL_MS) {
      Serial.println("{\"ecg\":0,\"bpm\":0,\"leads_off\":true,\"condition\":\"unknown\"}");
      lastPublishTime = now;
    }
    delay(5);
    return;
  }

  int raw = analogRead(ECG_PIN);

  if (raw > THRESHOLD && !peakDetected) {
    peakDetected = true;
    long rr = now - lastPeakTime;

    if (rr > MIN_RR_MS && rr < MAX_RR_MS) {
      rrBuffer[rrIndex % RR_BUFFER_SIZE] = (int)rr;
      rrIndex++;
      if (rrCount < RR_BUFFER_SIZE) rrCount++;

      if (rrCount >= 3) {
        long sum = 0;
        int count = min(rrCount, RR_BUFFER_SIZE);
        for (int i = 0; i < count; i++) {
          sum += rrBuffer[(rrIndex - 1 - i + RR_BUFFER_SIZE) % RR_BUFFER_SIZE];
        }
        float avgRR = (float)sum / count;
        currentBpm = (int)(60000.0 / avgRR);
        if (currentBpm > 150) {
          condition = "critical_tachy";
        } else if (currentBpm > 100) {
          condition = "tachycardia";
        } else if (currentBpm < 40) {
          condition = "critical_brady";
        } else if (currentBpm < 60) {
          condition = "bradycardia";
        } else {
          condition = "normal";
        }
      }
    }

    lastPeakTime = now;

  } else if (raw < THRESHOLD - HYSTERESIS) {
    peakDetected = false;
  }

  if (now - lastPublishTime >= PUBLISH_INTERVAL_MS) {
    Serial.print("{\"ecg\":");
    Serial.print(raw);
    Serial.print(",\"bpm\":");
    Serial.print(currentBpm);
    Serial.print(",\"condition\":\"");
    Serial.print(condition);
    Serial.println("\",\"leads_off\":false}");
    lastPublishTime = now;
  }

  delay(5);
}