#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

#define SERVICE_UUID        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

BLECharacteristic *pTxCharacteristic;
bool deviceConnected = false;

bool wifiConnected = false;
bool bluetoothEnabled = false;
String receivedData = "";

String getValue(String data, char separator, int index) {
    int found = 0;
    int strIndex[] = { 0, -1 };
    int maxIndex = data.length() - 1;

    for (int i = 0; i <= maxIndex && found <= index; i++) {
        if (data.charAt(i) == separator || i == maxIndex) {
            found++;
            strIndex[0] = strIndex[1] + 1;
            strIndex[1] = (i == maxIndex) ? i + 1 : i;
        }
    }

    return data.substring(strIndex[0], strIndex[1]);
}
void connectAppBluetooth(String receivedData){
  Serial.println(receivedData);
  String cmt = getValue(receivedData, '/', 0);
  if(cmt == "onboard"){
    ssid_home = getValue(receivedData, '/', 1);
    pass_home = getValue(receivedData, '/', 2);
    user = getValue(receivedData, '/', 3);
    ip = getValue(receivedData, '/', 4);
    port = getValue(receivedData, '/', 5);
  }   
  
  if(ssid_home != "" && pass_home != "" && user != "" && ip != "" && port != ""){
    writeUserToEEPROM(user);
    writeSsidPassToEEPROM(ssid_home, pass_home);
    writeIpPortToEEPROM(ip, port);
    writeRunSystem();
    pTxCharacteristic->setValue(device_id);
    pTxCharacteristic->notify();
    Serial.println("Connect bluetooth done!");
    delay(3000);
    ESP.restart();;
  }
  
}

void bluetoothSendData(String data){
    if (deviceConnected) {
        Serial.println("Sending data...");
        pTxCharacteristic->setValue(data.c_str());
        pTxCharacteristic->notify();
    }
}

void handleReceivedData(String data) {
    Serial.println(data);
    String uid = getValue(data, '/', 0);
    String id = getValue(data, '/', 1);
    String command = getValue(data, '/', 2);
    String value = getValue(data, '/', 3);
    command.trim();
    if (uid == user && id == device_id) {
        if (command == "action") {
          value.trim();
          bluetoothSendData(uid + "/" + id + "/action/" + value + "/OK");
            if (value == "1" || value == "13") {
                Serial.println("Action: BAT O CAM");
                ocam.BAT();
            }
            else if (value == "3") {
                Serial.println("Action: DUNG");
                ocam.dung();
            }
            else if (value == "14") {
                Serial.println("Action: TAT O CAM");
                ocam.TAT();
            }
        }
        else if (command == "isonline") {
            bluetoothSendData(uid + "/" + id + "/isonline/1"); 
        }
        else if (command == "mocua") {
            int position = value.toInt();
            bluetoothSendData(uid + "/" + id + "/mocua/" + value + "/OK");
            ocam.mocua = position;
            Serial.println("Mocua to position: " + String(position));
        }
        else if (command == "getdata") {
            Serial.println("Send data");
            bluetoothSendData(uid + "/" + id + "/action/" + String(ocam.action));
            bluetoothSendData(uid + "/" + id + "/mocua/" + String(ocam.mocua));
        }
    }
    else {
        Serial.println("Invalid UID or Device ID");
    }
}

class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) { 
        deviceConnected = true; 
        Serial.println("Device Connected"); 
    }

    void onDisconnect(BLEServer* pServer) { 
        deviceConnected = false; 
        Serial.println("Device Disconnected");
        pServer->startAdvertising(); // Restart advertising
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string rxValue = pCharacteristic->getValue().c_str();
        String rx = String(rxValue.c_str());
        if (rxValue.length() > 0) {
            if(runSystem){
              Serial.println("Received via BLE:");
              Serial.println(rx);
              handleReceivedData(rx);
            }else{
              connectAppBluetooth(rx);
            }
        }
    }
};



void disableBluetooth() {
    if (bluetoothEnabled) {
        BLEDevice::deinit();
        bluetoothEnabled = false;
        wifiConnected = true;
        Serial.printf("\nBluetooth Off!\nWiFi is connected\n");
    }
}



void enableBluetooth() {
    if (!bluetoothEnabled) {
        BLEDevice::init(device_id);
        BLEServer *pServer = BLEDevice::createServer();
        pServer->setCallbacks(new MyServerCallbacks());
    
        BLEService *pService = pServer->createService(SERVICE_UUID);
    
        pTxCharacteristic = pService->createCharacteristic(
                              CHARACTERISTIC_UUID_TX,
                              BLECharacteristic::PROPERTY_NOTIFY
                            );
        pTxCharacteristic->addDescriptor(new BLE2902());
    
        BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
                              CHARACTERISTIC_UUID_RX,
                              BLECharacteristic::PROPERTY_WRITE
                            );
        pRxCharacteristic->setCallbacks(new MyCallbacks());
    
        pService->start();
    
        BLEAdvertising *pAdvertising = pServer->getAdvertising();
        pAdvertising->addServiceUUID(SERVICE_UUID);
        pAdvertising->setScanResponse(true);
        pAdvertising->setMinPreferred(0x06); // Quan trọng cho thiết bị iOS
        pAdvertising->start();
        bluetoothEnabled = true;
        wifiConnected = false;
        Serial.printf("\nBluetooth On!\n");
    }
}


