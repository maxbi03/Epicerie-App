// ─── Configuration Epico-Door ───

// Mode test : true = LED D2, false = relais
#define TEST_MODE true

// ─── WiFi ───
#define WIFI_SSID "Sunrise_3431837"
#define WIFI_PASSWORD "fa7zpWsjdtcgXbey"

// ─── MQTT (broker cloud) ───
#define MQTT_BROKER "broker.hivemq.com"
#define MQTT_PORT 1883
#define MQTT_TOPIC "epico/door/command"
#define MQTT_STATUS_TOPIC "epico/door/status"
#define MQTT_CLIENT_ID "epico-door-esp32"

// ─── Secret partagé (doit correspondre au .env.local de l'app) ───
#define UNLOCK_SECRET "secret-de-ouf"

// ─── Hardware ───
#define RELAY_PIN 5        // GPIO du relais (mode normal)
#define LED_PIN 2          // GPIO de la LED D2 (mode test)
#define UNLOCK_DURATION 5000  // Durée d'ouverture en ms (5 secondes)

// Pin active selon le mode
#define OUTPUT_PIN (TEST_MODE ? LED_PIN : RELAY_PIN)
