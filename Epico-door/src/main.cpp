#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "config.h"

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

bool doorOpen = false;
unsigned long doorOpenTime = 0;

void unlock() {
  if (doorOpen) return;

  digitalWrite(OUTPUT_PIN, HIGH);
  doorOpen = true;
  doorOpenTime = millis();

  Serial.println(TEST_MODE ? "LED ON (test mode)" : "RELAY ON (door unlocked)");
  mqtt.publish(MQTT_STATUS_TOPIC, "{\"status\":\"open\"}");
}

void lockBack() {
  digitalWrite(OUTPUT_PIN, LOW);
  doorOpen = false;
  Serial.println(TEST_MODE ? "LED OFF" : "RELAY OFF (door locked)");
  mqtt.publish(MQTT_STATUS_TOPIC, "{\"status\":\"closed\"}");
}

void onMessage(char* topic, byte* payload, unsigned int length) {
  // Lire le message
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("MQTT recu: ");
  Serial.println(message);

  // Vérifier le secret et la commande
  if (message == String("unlock:") + UNLOCK_SECRET) {
    unlock();
  } else if (message == "status") {
    String status = doorOpen ? "{\"status\":\"open\"}" : "{\"status\":\"closed\"}";
    mqtt.publish(MQTT_STATUS_TOPIC, status.c_str());
  } else {
    Serial.println("Commande invalide ou secret incorrect");
  }
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Connexion MQTT...");
    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println(" connecte!");
      mqtt.subscribe(MQTT_TOPIC);
      mqtt.publish(MQTT_STATUS_TOPIC, "{\"status\":\"online\"}");
    } else {
      Serial.print(" echec (rc=");
      Serial.print(mqtt.state());
      Serial.println(") nouvel essai dans 3s...");
      delay(3000);
    }
  }
}

void connectWiFi() {
  Serial.print("Connexion WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connecte!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nEchec WiFi! Redemarrage...");
    ESP.restart();
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Epico-Door ===");
  Serial.println(TEST_MODE ? "Mode: TEST (LED D2)" : "Mode: PRODUCTION (Relais)");

  // Config pin
  pinMode(OUTPUT_PIN, OUTPUT);
  digitalWrite(OUTPUT_PIN, LOW);

  // WiFi
  connectWiFi();

  // MQTT
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessage);
  connectMQTT();

  Serial.println("Pret! En attente de commandes MQTT...");
}

void loop() {
  // Reconnecter si nécessaire
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  if (!mqtt.connected()) {
    connectMQTT();
  }

  mqtt.loop();

  // Auto-fermeture après UNLOCK_DURATION
  if (doorOpen && (millis() - doorOpenTime >= UNLOCK_DURATION)) {
    lockBack();
  }
}
