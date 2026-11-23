#include <EEPROM.h>

#define EEPROM_SIZE 512
String ssid_home = "";
String pass_home = "";
String user = "";
String ip = "";
String port = "";
String user_mqtt = "";
String pass_mqtt = "";
char count_reset = 0;    // dem so lan khoi dong lai ESP
bool runSystem;
bool sendOnboard;


void writeSsidPassToEEPROM(String _ssid, String _pass) {
    for (int i = 0; i < 96; ++i) {
        EEPROM.write(i, 0);
        delay(10);
    }
    for (int i = 0; i < _ssid.length(); ++i) {
        EEPROM.write(i, _ssid[i]);
    }
    for (int i = 0; i < _pass.length(); ++i) {
        EEPROM.write(32 + i, _pass[i]);
    }
    EEPROM.commit();
}

void writeCountReset(char count) {
    EEPROM.write(500, count);
    EEPROM.commit();
    count_reset = count;
    Serial.print("Reset: ");
    Serial.println((int)count);
}

void readCountReset() {
    count_reset = EEPROM.read(500);
}

boolean readSsidPassEEPROM() {
    if (EEPROM.read(0) != 0) {
        ssid_home = "";
        pass_home = "";
        for (int i = 0; i < 32; ++i) {
            ssid_home += char(EEPROM.read(i));
        }
        Serial.print("SSID: ");
        Serial.println(ssid_home);
        for (int i = 32; i < 96; ++i) {
            pass_home += char(EEPROM.read(i));
        }
        Serial.print("PASSWORD: ");
        Serial.println(pass_home);
        ssid_home = ssid_home.c_str();
        pass_home = pass_home.c_str();
        return true;
    }
    else {
        Serial.println("Data wifi not found!");
        return false;
    }
}

void writeUserToEEPROM(String _user) {
    for (int i = 100; i < 148; ++i) {
        EEPROM.write(i, 0);
        delay(5);
    }
    for (int i = 0; i < _user.length() && i < 47; ++i) {
        EEPROM.write(100 + i, _user[i]);
    }
    EEPROM.commit();
    Serial.print("Writed User: ");
    Serial.println(_user);
}

void readUserEEPROM() {
    user = "";
    for (int i = 100; i < 148; ++i) {
        char c = char(EEPROM.read(i));
        if (c != 0) user += c;
    }
    user = user.c_str();
    Serial.print("User: ");
    Serial.println(user);
}

void writeIpPortToEEPROM(String _ip, String _port) {
    for (int i = 200; i < 264; ++i) {
        EEPROM.write(i, 0);
        delay(10);
    }
    for (int i = 0; i < _ip.length(); ++i) {
        EEPROM.write(200 + i, _ip[i]);
    }
    for (int i = 0; i < _port.length(); ++i) {
        EEPROM.write(232 + i, _port[i]);
    }
    EEPROM.commit();
}

void readIpPortEEPROM() {
    ip = "";
    port = "";
    for (int i = 200; i < 232; ++i) {
        ip += char(EEPROM.read(i));
    }
    Serial.print("IP: ");
    Serial.println(ip);
    for (int i = 232; i < 264; ++i) {
        port += char(EEPROM.read(i));
    }
    Serial.print("Port: ");
    Serial.println(port);
    ip = ip.c_str();
    port = port.c_str();
}

void writeMqttToEEPROM(String _user_mqtt, String _pass_mqtt) {
    for (int i = 300; i < 364; ++i) {
        EEPROM.write(i, 0);
        delay(10);
    }
    for (int i = 0; i < _user_mqtt.length(); ++i) {
        EEPROM.write(300 + i, _user_mqtt[i]);
    }
    for (int i = 0; i < _pass_mqtt.length(); ++i) {
        EEPROM.write(332 + i, _pass_mqtt[i]);
    }
    EEPROM.commit();
}

void readMqttEEPROM() {
    user_mqtt = "";
    pass_mqtt = "";
    for (int i = 300; i < 332; ++i) {
        user_mqtt += char(EEPROM.read(i));
    }
    Serial.print("User MQTT: ");
    Serial.println(user_mqtt);
    for (int i = 332; i < 364; ++i) {
        pass_mqtt += char(EEPROM.read(i));
    }
    Serial.print("Pass MQTT: ");
    Serial.println(pass_mqtt);
    user_mqtt = user_mqtt.c_str();
    pass_mqtt = pass_mqtt.c_str();
}

void readRunSystem() {
    runSystem = EEPROM.read(99) == 1 ? true : false;
}

void writeRunSystem() {
    EEPROM.write(99, 1);
    EEPROM.commit();
}

void readSendOnboard() {
    sendOnboard = EEPROM.read(98) == 1 ? true : false;
}

void writeSendOnboard() {
    sendOnboard = 1;
    EEPROM.write(98, 1);
    EEPROM.commit();
}

void clear_EEPROM() {
    Serial.println("Clear EEPROM!");
    for (int i = 0; i < 512; ++i) {
        EEPROM.write(i, 0);
        delay(30);
    }
    EEPROM.commit();
}

void readEEPROM() {
    readSsidPassEEPROM();
    readUserEEPROM();
    readIpPortEEPROM();
    readMqttEEPROM();
    readRunSystem();
    readCountReset();
    readSendOnboard();
}

void init_eeprom() {
    Serial.println("Create eeprom");
    if (!EEPROM.begin(EEPROM_SIZE)) {
        Serial.println("Failed to initialize EEPROM");
        return;
    }
    delay(10);
    readEEPROM();
}
