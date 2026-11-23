#define ESP32 false
#if ESP32
  #define BUTTON 0  // nut boot esp32
  #define LED 2     // led esp32
#else
  #define BUTTON 0
  #define LED 10
#endif
#define TIME_RESET 10000   // ms
const char* device_id = "ocam01";
#include "OCAM.h"
OCAM ocam;
#include "save.h"
#include "Web_Server.h"
#include "mqtt.h"

unsigned long timeNhay = 1000, oldTimeNhay;
bool isLed = false;

void button();
void resetSystem();
//void RFsetup();

void setup() {
    timeConnectOld = millis();
    Serial.begin(115200);
    pinMode(BUTTON, INPUT);
    pinMode(LED, OUTPUT);
    //pinMode(1, INPUT);
    //digitalWrite(14, LOW);
    digitalWrite(LED, HIGH);
    init_eeprom();
    Serial.print("device_id: ");
    Serial.println(device_id);

    //writeSsidPassToEEPROM("wifi","mat khau");
    //clear_EEPROM();

    if (runSystem) {
        Serial.println("Create MQTT");
        initMqtt();
        digitalWrite(LED, LOW);
    }
    else {
        Serial.println("Create Server");
        createServer();
        enableBluetooth();
    }



}
int countResetDisconnet = 0;
void loop() {
    button();
    if (runSystem) {
        if(wifiConnected){
          timeNhay=1000;
        }
        if(bluetoothEnabled){
          timeNhay=300;
        }

        if(millis()- oldTimeNhay>=timeNhay){
          if(countResetDisconnet++>1000){
              Serial.println("Reconnecting to WiFi...");
              ESP.restart();
            }
            oldTimeNhay = millis();
            if(isLed){
              digitalWrite(LED, 1);
              delay(100);
              digitalWrite(LED, 0);
            }else{
              digitalWrite(LED, 0);
            }
            isLed = !isLed;
        }
//        if(isLed){
//          if(millis()- oldTimeNhay>=300){
//            digitalWrite(LED, 0);
//          }
//        }
        
        loopMqtt();
    }
    else {
        connectApp();
        
    }
}
;

void resetSystem() {
    // reset he thong
    Serial.println("Reset he thong");
    digitalWrite(LED, HIGH);
    delay(500);
    digitalWrite(LED, LOW);
    delay(500);
    digitalWrite(LED, HIGH);
    delay(500);
    digitalWrite(LED, LOW);
    clear_EEPROM();
    ESP.restart();
}

void button() {
    while ((digitalRead(BUTTON) == 0) && dem < TIME_RESET / 10) {
        dem++;
        delay(10);
    }
    if (dem >= 1000) {
        resetSystem();
    }
    else if (dem > 2 && dem < 50) {
        publish(topic.pub.action, "1");
        if(bluetoothEnabled){
          bluetoothSendData(user + "/" + device_id + "/action/1");
        }
    }else if (dem > 100 && dem < 300) {
        publish(topic.pub.action, "4");
        if(bluetoothEnabled){
          bluetoothSendData(user + "/" + device_id + "/action/4");
        }
    }else if (dem > 300 && dem < 1000) {
        publish(topic.pub.action, "5"); 
        if(bluetoothEnabled){
          bluetoothSendData(user + "/" + device_id + "/action/5");
        }
    }
    dem = 0;
}

