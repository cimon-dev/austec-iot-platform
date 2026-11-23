#include "bluetooth.h"
#include "WifiStatus.h"
#include <PubSubClient.h>
#include "Topic.h"
WiFiClient espClient;
PubSubClient client(espClient);
void callback(char* topic, byte* message, unsigned int length);
//PubSubClient client(mqtt_server, 1883, callback, espClient);

bool bluetoothMode = false;
WifiStatus wifi;

Topic topic;

bool publish(String topic, String Data) {
    if(bluetoothEnabled)return 0;
    //topic = topic +"/"+Data;
    Serial.print("Publish: ");
    Serial.print(topic);
    Serial.print("/");
    Serial.println(Data);
    
    return client.publish((const char*)topic.c_str(), (const char*)Data.c_str());
}

void subscribe(String _data){
  Serial.println(_data);
  client.subscribe((const char*)_data.c_str());  
}

void callback(char* _topic, byte* message, unsigned int length) {
    Serial.printf("Message arrived on topic: %s. Message: ", _topic);
    String messageTemp;
    for (int i = 0; i < length; i++) {
        Serial.print((char)message[i]);
        messageTemp += (char)message[i];
    }
    Serial.println();

    // Check if a message is received on the topic "rpi/broadcast"
    if (String(_topic) == topic.sub.action) {
        int ACTION = messageTemp.toInt();
        //publish(topic.pub.action, String (ACTION));
        switch (ACTION) 
        {
            case 13:
                ocam.BAT();
                publish(topic.pub.action, String (ACTION));
                break;
            case 14:
                ocam.TAT();
                publish(topic.pub.action, String (ACTION));
                break;
            case 3:
                ocam.dung();
                publish(topic.pub.action, String (ACTION));
                break;
            case 11:
                ocam.RF_setup();
                delay(7000);
                publish(topic.pub.action, String (ACTION));
                break;
            case 12:
                ocam.RF_clear();
                delay(2000);
                publish(topic.pub.action, String (ACTION));
                break;
        }
    }
    if (String(_topic) == topic.sub.isOnline) {
        Serial.println(_topic);
        publish(topic.pub.isOnline, "1");
    }
    if (String(_topic) == topic.sub.getDatas) {
        publish(topic.pub.action, String(ocam.action));
        publish(topic.pub.mocua, String(ocam.mocua));
    }


      //Similarly add more if statements to check for other subscribed topics 
}

unsigned long timeConnectOld = millis();
unsigned int x=0;
void connect_mqttServer() {
    // Loop until we're reconnected
    if (!client.connected()) {
        //first check if connected to wifi
        if (!wifi.connected) {
            enableBluetooth();
        }
        else {
            //now attemt to connect to MQTT server
            //disableBluetooth();
            if(millis() - timeConnectOld > 2000){
                Serial.printf("\nAttempting MQTT connection...");
                //disableBluetooth();
                // Attempt to connect
                if (client.connect(device_id)) { // Change the name of client here if multiple ESP32 are connected
                    //attempt successful
                    Serial.println("connected");
                    disableBluetooth();
                    delay(500);
                    // Subscribe to topics here
                    subscribe(topic.sub.isOnline);
                    subscribe(topic.sub.action);
                    subscribe(topic.sub.mocua);
                    subscribe(topic.sub.getDatas);
                }
                else {
                    //attempt not successful
                    //Serial.print("failed, rc=");
                    //Serial.print(client.state());
                    //Serial.println(" trying again in 2 seconds");
                    x++;
                    if(x==30)
                    {
                        ESP.restart();
                        x=0;
                    }
                    
                }
                timeConnectOld = millis();
            }
            
        }
    }
}

void initMqtt() {
    topic.begin(user, device_id);
    wifi.begin(ssid_home, pass_home);
    client.setServer(ip.c_str(), port.toInt());
    client.setCallback(callback);
    timeConnectOld = millis();
    ocam.begin();
}

unsigned long countLoop = 0;
int send_up=0;  // dung de check gui 1 lan
int send_down=0;  // dung de check gui 1 lan
void loopMqtt() {
    wifi.loop();
    if (!client.connected()) {
        connect_mqttServer();
        return;
    }
    client.loop();
    if(!sendOnboard){
          publish(topic.TOPIC + "/onboard", "1");
          writeSendOnboard();
    }
    ocam.action = ocam.loop();
    switch (ocam.action) {
    case 0:
        countLoop = 0;
        break;
    case 4:
        if (send_up == 0) {
          if(bluetoothEnabled) {
            bluetoothSendData(user + "/" + device_id + "/action/4");
          }else{
            publish(topic.pub.action, "4");
          }
          send_down = 0;
          send_up = 1;
          Serial.println("Mo hoan toan");
        }
        break;
    case 5:
        if (send_down == 0) {
          if(bluetoothEnabled) {
            bluetoothSendData(user + "/" + device_id + "/action/4");
          }else{
            publish(topic.pub.action, "5");
          }
          Serial.println("Dong hoan toan");
          send_down = 1;
          send_up = 0;
        }
        break;
    default:
        //countLoop = 0;
        break;
    }
}


