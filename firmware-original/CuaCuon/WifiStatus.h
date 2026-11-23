#include <WiFi.h>

class WifiStatus{
private: 
	unsigned long previousMillis = 0;
	String ssid;
	String pass;

public:
	bool connected = false;
	const long intervalCheck = 5000;
	void begin(String _ssid, String _pass) {
		ssid = _ssid;
		pass = _pass;
		connect();
	}

	void connect() {
		Serial.printf("Connecting to %s\n", ssid);
		WiFi.begin(ssid, pass);
		int c = 0;
		for (int i = 0; i < 10; i++) {
			if(WiFi.status() != WL_CONNECTED) {
				delay(500); 
				Serial.print(".");
			}
			else {
        connected = (WiFi.status() == WL_CONNECTED);
        delay(1000); 
				Serial.printf("\nWiFi connected\nIP address: ");
        Serial.println(WiFi.localIP());
				break;
			}
		}
		connected = (WiFi.status() == WL_CONNECTED);
	}

	void loop() {
		unsigned long currentMillis = millis();
		if (currentMillis - previousMillis >= intervalCheck) {
			previousMillis = currentMillis;
			connected = WiFi.status() == WL_CONNECTED;
		}
	}

//	void connectToWiFi() {
//		Serial.printf("Connecting to %s\n", ssid);
//		WiFi.begin(ssid, pass);
//		int c = 0;
//		while (WiFi.status() != WL_CONNECTED) {
//			delay(500);
//			Serial.print(".");
//			if (c > 10) ESP.restart(); 
//			c++;
//		}
//    Serial.printf("\nWiFi connected\nIP address: ");
//    Serial.println(WiFi.localIP());
//	}

};
