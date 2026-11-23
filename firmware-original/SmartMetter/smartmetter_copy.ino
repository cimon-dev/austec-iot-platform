#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WebServer.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Preferences.h>

// ==========================================
// CẤU HÌNH DEBUG SERIAL MONITOR (CHỌN 4800 BAUD)
// Đặt 1 để bật thông báo gỡ lỗi, đặt 0 khi chạy thực tế
// ==========================================
#define ENABLE_DEBUG 1
#if ENABLE_DEBUG
  #define DBG_PRINT(x)    Serial.print(x)
  #define DBG_PRINTLN(x)  Serial.println(x)
#else
  #define DBG_PRINT(x)
  #define DBG_PRINTLN(x)
#endif

// ==========================================
// ĐỊNH NGHĨA CHÂN CỨNG THEO SƠ ĐỒ NGUYÊN LÝ
// ==========================================
#define PIN_RSF_BTN       0   // Nút ghép nối Mạng (RSF) -> IO0
#define PIN_OK_BTN        1   // Phím chuyển Menu / Xóa lỗi (OK) -> IO1
#define PIN_OUTA          3   // OUTA -> IO3 (Kích ĐÓNG Rơ-le qua TC118S)
#define PIN_OUTB          4   // OUTB -> IO4 (Kích NGẮT Rơ-le qua TC118S)
#define PIN_UP_BTN        5   // Phím tăng thông số (UP) -> IO5
#define PIN_DOWN_BTN      6   // Phím giảm thông số (DOWN) -> IO6
#define PIN_I2C_SDA       7   // Màn hình OLED SDA -> IO7
#define PIN_LED          10   // Đèn LED trạng thái -> IO10
#define PIN_LEAK_INT     18   // Ngắt ngoài báo dòng rò (LM358) -> IO18
#define PIN_I2C_SCL      19   // Màn hình OLED SCL -> IO19

#define BL0942_SERIAL    Serial  
#define PULSE_DURATION   50      
#define SCREEN_WIDTH     128
#define SCREEN_HEIGHT    64

// HỆ SỐ QUY ĐỔI PHẦN CỨNG BL0942
#define BL0942_I_COEFF   305978.0   
#define BL0942_V_COEFF   73989.0    
#define BL0942_P_COEFF   3537.0     
#define BL0942_CF_COEFF  1638.4     

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

const char* ap_pass = "12345678";
String wifi_ssid    = "";
String wifi_pass    = "";
String mqtt_server  = ""; 
int    mqtt_port    = 1883;
String deviceName   = ""; 
String deviceMacID  = "";

String topic_telemetry = "";
String topic_alarm     = "";
String topic_command   = ""; 
String topic_daily_rpt = ""; 

WiFiClient espClient;
PubSubClient mqttClient(espClient);
WebServer server(80); 
Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
Preferences pref;

// Tham số đo lường thực tế
float voltage = 0.0;
float current = 0.0;
float power   = 0.0;
bool relayState = true;          
float p_max_warn, i_warn, i_trip;

// Biến quản lý điện năng tích lũy
uint32_t last_cf_cnt   = 0;
bool is_first_cf_read  = true;
double total_kwh       = 0.0;       
double daily_kwh       = 0.0;       
double last_saved_kwh  = 0.0;  
float weeklyEnergy[7]  = {0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0}; 

enum ScreenState { 
  SCREEN_WELCOME,
  SCREEN_MAIN, 
  SCREEN_VIEW_PARAMS, 
  SCREEN_GRAPH, 
  SCREEN_EDIT_PARAMS, 
  SCREEN_ALERT_LOCK,
  SCREEN_PAIRING_WAIT,
  SCREEN_PAIRING_CONNECTING,
  SCREEN_STATUS_MSG
};
ScreenState currentScreen = SCREEN_WELCOME;
String statusMsgLine1     = "";
String statusMsgLine2     = "";
unsigned long statusMsgStartTime = 0;
unsigned long statusMsgDuration  = 0;

volatile bool isLeakageActive = false;   
bool isOvercurrentActive      = false;        
bool isPowerAbnormal          = false;            
String activeOledAlertStr     = ""; 

bool relayPulseActive         = false;
int  activeRelayPin           = -1;
unsigned long relayPulseStart = 0;

enum PairingPhase {
  PAIR_IDLE,
  PAIR_WAITING_APP,
  PAIR_TESTING_WIFI,
  PAIR_TESTING_MQTT
};
PairingPhase pairingPhase       = PAIR_IDLE;
bool receivedNewConfig          = false; 
bool isServerPaired             = false; 
unsigned long pairingPhaseStart = 0;
uint8_t mqttRetryCount          = 0;
const uint8_t MAX_MQTT_RETRIES  = 5;

bool bleActive          = false;
bool bleClientConnected = false;
unsigned long lastWifiRetryTime = 0;
const unsigned long WIFI_RETRY_INTERVAL = 300000; 

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
uint8_t editIndex = 0;
void initDeviceName() {
  WiFi.mode(WIFI_MODE_STA); // Bật chế độ STA trước để nạp đúng địa chỉ MAC thật từ phần cứng
  uint8_t mac[6];
  WiFi.macAddress(mac); 
  char macStr[13];
  snprintf(macStr, sizeof(macStr), "%02X%02X%02X%02X%02X%02X", 
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  
  deviceMacID     = String(macStr);
  deviceName      = "smartmetter" + deviceMacID;
  topic_telemetry = "austec/" + deviceName + "/telemetry";
  topic_alarm     = "austec/" + deviceName + "/alarm";
  topic_command   = "austec/" + deviceName + "/command";
  topic_daily_rpt = "austec/" + deviceName + "/daily_report";

  DBG_PRINT("[BOOT] Ten thiet bi : "); DBG_PRINTLN(deviceName);
  DBG_PRINT("[BOOT] Ma ID (MAC)  : "); DBG_PRINTLN(deviceMacID);
}

void triggerStatusMessage(String line1, String line2, unsigned long durationMs) {
  statusMsgLine1     = line1;
  statusMsgLine2     = line2;
  statusMsgDuration  = durationMs;
  statusMsgStartTime = millis();
  currentScreen      = SCREEN_STATUS_MSG;
}

void drawWelcomeScreen() {
  oled.clearDisplay(); 
  oled.setTextColor(SSD1306_WHITE); 
  oled.setTextSize(2);
  oled.setCursor(12, 10); oled.println("AUSTEC");
  oled.setCursor(3, 28);  oled.println("TECHNOLOGY");
  oled.setTextSize(1); 
  oled.setCursor(2, 52);  oled.println("SMART TECH FOR MODERN SPACE");
  oled.display(); 
}

void drawMainScreen() {
  oled.clearDisplay(); 
  oled.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  oled.setTextColor(SSD1306_BLACK); 
  oled.setTextSize(1); 
  oled.setCursor(4, 2); 
  oled.print("AUSTEC METER");
  
  oled.setCursor(96, 2);
  if (isServerPaired && WiFi.status() == WL_CONNECTED && mqttClient.connected()) {
    oled.print("MQTT");
  } else if (bleActive && bleClientConnected) {
    oled.print("B_CON");
  } else if (bleActive) {
    oled.print("B_ADV");
  } else {
    oled.print("OFFL");
  }

  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(2, 16); 
  oled.print("U:"); oled.print(voltage, 2); oled.print("V ");
  oled.print("I:"); oled.print(current, 2); oled.print("A");
  
  oled.setCursor(2, 29); 
  oled.print("P:"); oled.setTextSize(2); oled.print(power, 2); oled.setTextSize(1); oled.print("W");
  
  oled.drawLine(0, 47, 128, 47, SSD1306_WHITE);
  
  oled.setCursor(2, 52); 
  oled.print("E:"); oled.print(total_kwh, 2); oled.print("kWh");
  
  oled.setCursor(98, 52);
  if (isLeakageActive) {
    oled.print("[ERR]");
  } else {
    oled.print(relayState ? "[ON]" : "[OFF]");
  }
  oled.display();
}

void drawViewParamsScreen() {
  oled.clearDisplay(); 
  oled.setTextSize(1); 
  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(0, 0);   oled.println("--- THAM SO CAI DAT ---");
  oled.setCursor(0, 15);  oled.print("1. CS canh bao: "); oled.print(p_max_warn, 0); oled.println("W");
  oled.setCursor(0, 28);  oled.print("2. Dong c.bao : "); oled.print(i_warn, 1); oled.println("A");
  oled.setCursor(0, 41);  oled.print("3. Dong ngat  : "); oled.print(i_trip, 1); oled.println("A");
  oled.setCursor(0, 54);  oled.print("Hom nay: "); oled.print(daily_kwh, 3); oled.print(" kWh");
  oled.display();
}

void drawGraphScreen() {
  oled.clearDisplay(); 
  oled.setTextSize(1); 
  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(12, 0);  
  oled.println("SAN LUONG 7 NGAY (kWh)");
  oled.drawLine(10, 12, 10, 54, SSD1306_WHITE); 
  oled.drawLine(10, 54, 122, 54, SSD1306_WHITE); 
  
  float maxVal = 0.1; 
  for (int i = 0; i < 7; i++) {
    if (weeklyEnergy[i] > maxVal) maxVal = weeklyEnergy[i];
  }
  
  for (int i = 0; i < 7; i++) {
    int barHeight = (weeklyEnergy[i] / maxVal) * 38; 
    if (weeklyEnergy[i] > 0 && barHeight < 2) barHeight = 2;
    int x = 16 + (i * 15); 
    int y = 54 - barHeight;
    oled.fillRect(x, y, 9, barHeight, SSD1306_WHITE); 
    oled.setCursor(x + 1, 56);
    oled.print(i + 1); 
  }
  oled.display();
}
void drawEditParamsScreen() {
  oled.clearDisplay(); 
  oled.setTextSize(1); 
  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(0, 0);   oled.println("--- CAI DAT THAM SO ---");
  oled.setCursor(0, 18);  oled.print(editIndex == 0 ? "> CS C.Bao: " : "  CS C.Bao: "); oled.print(p_max_warn, 0); oled.println(" W");
  oled.setCursor(0, 32);  oled.print(editIndex == 1 ? "> Dong C.B: " : "  Dong C.B: "); oled.print(i_warn, 1); oled.println(" A");
  oled.setCursor(0, 46);  oled.print(editIndex == 2 ? "> Dong Ngat:" : "  Dong Ngat:"); oled.print(i_trip, 1); oled.println(" A");
  oled.display();
}

void drawAlertLockScreen() {
  oled.clearDisplay(); 
  oled.fillRect(0, 0, 128, 14, SSD1306_WHITE);
  oled.setTextColor(SSD1306_BLACK); 
  oled.setTextSize(1);
  oled.setCursor(12, 3); 
  oled.print("HE THONG CANH BAO");
  oled.setTextColor(SSD1306_WHITE); 
  oled.setCursor(0, 20);
  oled.println(activeOledAlertStr); 
  oled.setCursor(8, 56);
  oled.print("[Nhan OK de quay lai]"); 
  oled.display();
}

void drawPairingWaitScreen() {
  oled.clearDisplay(); 
  oled.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  oled.setTextColor(SSD1306_BLACK); 
  oled.setTextSize(1); 
  oled.setCursor(8, 2); 
  oled.print("SAN SANG GHEP NOI");
  
  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(0, 16); oled.print("Ten: "); oled.println(deviceName);
  oled.setCursor(0, 30); oled.print("ID : "); oled.println(deviceMacID);
  oled.setCursor(0, 44); oled.print("Pass AP: "); oled.println(ap_pass);
  oled.setCursor(0, 56); oled.print("Cho App ket noi...");
  oled.display();
}

void drawStatusMsgScreen() {
  oled.clearDisplay();
  oled.drawRect(4, 12, 120, 40, SSD1306_WHITE);
  oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1);
  oled.setCursor(10, 20); oled.println(statusMsgLine1);
  oled.setCursor(10, 34); oled.println(statusMsgLine2);
  oled.display();
}

void saveEnergyToROM() {
  pref.begin("meter_energy", false);
  pref.putDouble("tot_kwh", total_kwh);
  pref.putDouble("day_kwh", daily_kwh);
  pref.putUInt("last_cf", last_cf_cnt);
  for (int i = 0; i < 7; i++) {
    String key = "d" + String(i);
    pref.putFloat(key.c_str(), weeklyEnergy[i]);
  }
  pref.end();
  last_saved_kwh = total_kwh;
  DBG_PRINT("[ROM] Da luu dien nang: Total="); DBG_PRINT(total_kwh);
  DBG_PRINT(" kWh | Daily="); DBG_PRINTLN(daily_kwh);
}

void executeDailyEnergyClosing() {
  DBG_PRINTLN("[DAILY] Nhan lenh '20' -> Tien hanh chot so kWh cuoi ngay!");
  if (WiFi.status() == WL_CONNECTED && mqttClient.connected()) {
    StaticJsonDocument<256> doc;
    doc["device_id"] = deviceName;
    doc["event"]     = "DAILY_CLOSING";
    doc["daily_kwh"] = round(daily_kwh * 1000.0) / 1000.0;
    doc["total_kwh"] = round(total_kwh * 1000.0) / 1000.0;
    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);
    mqttClient.publish(topic_daily_rpt.c_str(), jsonBuffer, true);
    DBG_PRINT("[MQTT] Da gui bao cao chot ngay: "); DBG_PRINTLN(jsonBuffer);
  }

  for (int i = 0; i < 6; i++) {
    weeklyEnergy[i] = weeklyEnergy[i + 1];
  }
  weeklyEnergy[6] = (float)daily_kwh;

  daily_kwh = 0.0;
  saveEnergyToROM();
  DBG_PRINTLN("[DAILY] Da cap nhat bieu do 7 ngay & reset daily_kwh = 0.");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  msg.trim();
  
  DBG_PRINT("[MQTT RX] Topic: "); DBG_PRINT(topic);
  DBG_PRINT(" | Noi dung: "); DBG_PRINTLN(msg);

  if (String(topic) == topic_command) {
    if (msg == "13" || msg == "2" || msg == "ON" || msg == "METER_POWER_ON") {
      DBG_PRINTLN("[MQTT CMD] Bat cong to (Dong ro-le)...");
      if (!isLeakageActive) {
        esp_CloseRelay();
      }
    } else if (msg == "14" || msg == "1" || msg == "OFF" || msg == "METER_POWER_OFF") {
      DBG_PRINTLN("[MQTT CMD] Tat cong to (Ngat ro-le - Giu OK > 5s)...");
      esp_OpenRelay();
    } else if (msg == "0" || msg == "RESET" || msg == "CLEAR_ALERT") {
      DBG_PRINTLN("[MQTT CMD] Reset bao dong & mo lai nguon...");
      isLeakageActive = false;
      isOvercurrentActive = false;
      isPowerAbnormal = false;
      activeOledAlertStr = "";
      esp_CloseRelay();
      currentScreen = SCREEN_MAIN;
    } else if (msg == "20" || msg == "DAILY_CLOSING") {
      executeDailyEnergyClosing();
    } else if (msg.startsWith("{")) {
      StaticJsonDocument<256> doc;
      if (!deserializeJson(doc, msg)) {
        if (doc.containsKey("power_limit")) {
          p_max_warn = doc["power_limit"].as<float>();
          pref.begin("meter_settings", false);
          pref.putFloat("p_max", p_max_warn);
          pref.end();
        }
        if (doc.containsKey("relay")) {
          bool r = doc["relay"].as<bool>();
          if (r && !isLeakageActive) esp_CloseRelay();
          else if (!r) esp_OpenRelay();
        }
      }
    }
  }
}
bool parseConfigPayload(String rxValue) {
  rxValue.trim();
  if (rxValue.length() == 0) return false;

  if (rxValue.startsWith("{")) {
    StaticJsonDocument<256> doc;
    if (!deserializeJson(doc, rxValue) && doc.containsKey("ssid") && doc.containsKey("pass")) {
      wifi_ssid = doc["ssid"].as<String>();
      wifi_pass = doc["pass"].as<String>();
      if (doc.containsKey("server")) mqtt_server = doc["server"].as<String>();
      if (doc.containsKey("port"))   mqtt_port   = doc["port"].as<int>();
      if (mqtt_port <= 0) mqtt_port = 1883;
      return true;
    }
    return false;
  }

  int firstComma  = rxValue.indexOf(',');
  int secondComma = rxValue.indexOf(',', firstComma + 1);
  if (firstComma > 0 && secondComma > firstComma) {
    wifi_ssid = rxValue.substring(0, firstComma);
    wifi_pass = rxValue.substring(firstComma + 1, secondComma);
    
    int thirdComma = rxValue.indexOf(',', secondComma + 1);
    if (thirdComma > secondComma) {
      mqtt_server = rxValue.substring(secondComma + 1, thirdComma);
      mqtt_port   = rxValue.substring(thirdComma + 1).toInt();
    } else {
      mqtt_server = rxValue.substring(secondComma + 1);
      mqtt_port   = 1883;
    }
    wifi_ssid.trim();
    wifi_pass.trim();
    mqtt_server.trim();
    if (mqtt_port <= 0) mqtt_port = 1883;
    return true;
  }
  return false;
}

void read_BL0942() {
  while (BL0942_SERIAL.available()) BL0942_SERIAL.read(); 
  BL0942_SERIAL.write(0x58);
  BL0942_SERIAL.write(0xAA);
  
  unsigned long waitStart = millis();
  while (BL0942_SERIAL.available() < 23 && millis() - waitStart < 60) {
  }

  bool validData = false;

  if (BL0942_SERIAL.available() >= 23) {
    uint8_t packet[23];
    BL0942_SERIAL.readBytes(packet, 23);
    
    if (packet[0] == 0x55) {
      uint8_t checksum = 0x58; 
      for (int i = 0; i < 22; i++) checksum += packet[i];
      checksum = ~checksum;

      if (checksum == packet[22]) {
        validData = true;
        uint32_t raw_i      = (uint32_t)packet[1]  | ((uint32_t)packet[2]  << 8) | ((uint32_t)packet[3]  << 16);
        uint32_t raw_v      = (uint32_t)packet[4]  | ((uint32_t)packet[5]  << 8) | ((uint32_t)packet[6]  << 16);
        int32_t  raw_p      = (int32_t)packet[10]  | ((int32_t)packet[11]  << 8) | ((int32_t)packet[12]  << 16);
        if (raw_p & 0x800000) raw_p |= 0xFF000000; 
        uint32_t current_cf = (uint32_t)packet[13] | ((uint32_t)packet[14] << 8) | ((uint32_t)packet[15] << 16);

        current = raw_i / BL0942_I_COEFF;
        voltage = raw_v / BL0942_V_COEFF;
        power   = abs(raw_p) / BL0942_P_COEFF;
        if (current < 0.015) { current = 0.0; power = 0.0; }

        if (is_first_cf_read) {
          uint32_t delta_pulses = (current_cf < last_cf_cnt) ? current_cf : (current_cf - last_cf_cnt);
          double delta_kwh = delta_pulses / BL0942_CF_COEFF;
          total_kwh += delta_kwh; daily_kwh += delta_kwh;
          last_cf_cnt = current_cf; is_first_cf_read = false;
          saveEnergyToROM();
        } else {
          uint32_t delta_pulses = (current_cf >= last_cf_cnt) ? (current_cf - last_cf_cnt) : ((0x1000000 - last_cf_cnt) + current_cf);
          if (delta_pulses > 0 && delta_pulses < 50000) { 
            double delta_kwh = delta_pulses / BL0942_CF_COEFF;
            total_kwh += delta_kwh; daily_kwh += delta_kwh;
            last_cf_cnt = current_cf;
            if (total_kwh - last_saved_kwh >= 0.05) saveEnergyToROM();
          }
        }

        DBG_PRINT("[BL0942] U="); DBG_PRINT(voltage); DBG_PRINT("V | I="); DBG_PRINT(current);
        DBG_PRINT("A | P="); DBG_PRINT(power); DBG_PRINT("W | CF="); DBG_PRINT(current_cf);
        DBG_PRINT(" | E_day="); DBG_PRINT(daily_kwh); DBG_PRINT(" | E_tot="); DBG_PRINTLN(total_kwh);
      } else { 
        DBG_PRINTLN("[BL0942 ERR] Sai ma Checksum -> Dat U, I, P = 0.00"); 
      }
    } else { 
      DBG_PRINTLN("[BL0942 ERR] Sai Header byte -> Dat U, I, P = 0.00"); 
    }
  } else { 
    DBG_PRINTLN("[BL0942 WARN] Khong co IC BL0942 -> Dat U, I, P = 0.00"); 
  }

  if (!validData) {
    voltage = 0.00;
    current = 0.00;
    power   = 0.00;
  }
}

class MyCharacteristicCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String rxValue = String(pCharacteristic->getValue().c_str());
      if (rxValue.length() > 0) {
        DBG_PRINT("[BLE RX] Nhan cau hinh tu App: "); DBG_PRINTLN(rxValue);
        if (parseConfigPayload(rxValue)) {
          DBG_PRINT("[PARSE OK] WiFi: "); DBG_PRINT(wifi_ssid);
          DBG_PRINT(" | Server: "); DBG_PRINTLN(mqtt_server);
          receivedNewConfig = true;
        } else {
          DBG_PRINTLN("[PARSE ERR] Sai dinh dang chuoi cau hinh tu App!");
        }
      }
    }
};

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) { bleClientConnected = true; DBG_PRINTLN("[BLE] App da ket noi BLE!"); };
    void onDisconnect(BLEServer* pServer) { bleClientConnected = false; DBG_PRINTLN("[BLE] App da ngat BLE!"); }
};

void handleWifiConfigAPI() {
  if (server.hasArg("ssid") && server.hasArg("pass")) {
    wifi_ssid = server.arg("ssid"); 
    wifi_pass = server.arg("pass");
    if (server.hasArg("server")) mqtt_server = server.arg("server");
    if (server.hasArg("port"))   mqtt_port   = server.arg("port").toInt();
    if (mqtt_port <= 0) mqtt_port = 1883;
    server.send(200, "application/json", "{\"status\":\"PROCESSING\"}");
    receivedNewConfig = true;
  } else if (server.hasArg("plain") && parseConfigPayload(server.arg("plain"))) {
    server.send(200, "application/json", "{\"status\":\"PROCESSING\"}");
    receivedNewConfig = true;
  } else { 
    server.send(400, "text/plain", "Thieu tham so"); 
  }
}
void IRAM_ATTR leakageISR() {
  isLeakageActive = true; 
  relayState = false;
  digitalWrite(PIN_OUTA, LOW); 
  digitalWrite(PIN_OUTB, LOW);
}

void esp_CloseRelay() {
  if (isLeakageActive) return;
  digitalWrite(PIN_OUTB, LOW); 
  digitalWrite(PIN_OUTA, HIGH); 
  activeRelayPin   = PIN_OUTA;
  relayPulseStart  = millis();
  relayPulseActive = true;
  relayState       = true;
  DBG_PRINTLN("[RELAY] Da kich xung DONG ro-le.");
}

void esp_OpenRelay() {
  digitalWrite(PIN_OUTA, LOW); 
  digitalWrite(PIN_OUTB, HIGH); 
  activeRelayPin   = PIN_OUTB;
  relayPulseStart  = millis();
  relayPulseActive = true;
  relayState       = false;
  DBG_PRINTLN("[RELAY] Da kich xung NGAT ro-le bao ve!");
}

void handleRelayPulse() {
  if (relayPulseActive && (millis() - relayPulseStart >= PULSE_DURATION)) {
    digitalWrite(activeRelayPin, LOW);
    relayPulseActive = false;
    activeRelayPin   = -1;
  }
}

void startBLE() {
  if (bleActive) return;
  BLEDevice::init(deviceName.c_str()); 
  pServer = BLEDevice::createServer(); 
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID, 
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_WRITE
  );
  pCharacteristic->setCallbacks(new MyCharacteristicCallbacks()); 
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising(); 
  pAdvertising->addServiceUUID(SERVICE_UUID); 
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising(); 
  bleActive = true;
  DBG_PRINT("[BLE] Da bat BLE: "); DBG_PRINTLN(deviceName);
}

void stopBLE() { 
  if (!bleActive) return; 
  BLEDevice::deinit(true); 
  bleActive = false; 
  bleClientConnected = false; 
  DBG_PRINTLN("[BLE] Da tat BLE.");
}

void sendPairingFeedbackToApp(bool isSuccess, String reason) {
  StaticJsonDocument<256> doc;
  doc["device_id"] = deviceName;
  doc["event"]     = "PAIRING_RESULT";
  doc["status"]    = isSuccess ? "SUCCESS" : "FAILED";
  doc["message"]   = reason;

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);
  DBG_PRINT("[PAIRING RESULT] "); DBG_PRINTLN(jsonBuffer);

  if (bleActive && bleClientConnected) {
    pCharacteristic->setValue(jsonBuffer);
    pCharacteristic->notify();
    unsigned long waitTx = millis();
    while (millis() - waitTx < 300) { } 
  }

  if (isSuccess && WiFi.status() == WL_CONNECTED && mqttClient.connected()) {
    mqttClient.publish(topic_telemetry.c_str(), jsonBuffer);
  }
}

void enterPairingMode() {
  DBG_PRINTLN("\n==========================================");
  DBG_PRINTLN("[PAIRING] TRANG THAI: SAN SANG GHEP NOI");
  DBG_PRINT("[PAIRING] Ten thiet bi : "); DBG_PRINTLN(deviceName);
  DBG_PRINT("[PAIRING] ID (MAC)     : "); DBG_PRINTLN(deviceMacID);
  DBG_PRINT("[PAIRING] WiFi AP Pass : "); DBG_PRINTLN(ap_pass);
  DBG_PRINTLN("[PAIRING] Tam dung moi tac vu khac, chi tap trung ghep noi...");
  DBG_PRINTLN("==========================================\n");

  server.stop();
  WiFi.softAPdisconnect(true);
  WiFi.disconnect(true);
  stopBLE();

  receivedNewConfig = false;
  pairingPhase      = PAIR_WAITING_APP;
  currentScreen     = SCREEN_PAIRING_WAIT;
  drawPairingWaitScreen();

  WiFi.mode(WIFI_AP); 
  WiFi.softAP(deviceName.c_str(), ap_pass);
  server.on("/config", HTTP_POST, handleWifiConfigAPI); 
  server.on("/config", HTTP_GET, handleWifiConfigAPI); 
  server.begin();
  startBLE();
}

void finishPairingAndExit(bool success, String msgLine1, String msgLine2, String appFeedback) {
  sendPairingFeedbackToApp(success, appFeedback);

  server.stop();
  WiFi.softAPdisconnect(true);
  stopBLE();

  if (success) {
    isServerPaired = true;
    pref.begin("meter_settings", false);
    pref.putBool("paired", true);
    pref.putString("w_ssid", wifi_ssid);
    pref.putString("w_pass", wifi_pass);
    pref.putString("m_srv", mqtt_server);
    pref.putInt("m_port", mqtt_port);
    pref.end();
    DBG_PRINTLN("[PAIRING] KET THUC: Ghep noi THANH CONG -> Thoat sang che do Online!");
  } else {
    isServerPaired = false;
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
    pref.begin("meter_settings", false);
    pref.putBool("paired", false);
    pref.end();
    DBG_PRINTLN("[PAIRING] KET THUC: Ghep noi THAT BAI -> Thoat ngay ve che do Offline!");
  }

  pairingPhase = PAIR_IDLE; 
  triggerStatusMessage(msgLine1, msgLine2, 1500);
}

void handlePairingStateMachine() {
  if (pairingPhase == PAIR_IDLE) return;

  if (pairingPhase == PAIR_WAITING_APP) {
    server.handleClient();
    if (receivedNewConfig) {
      DBG_PRINTLN("[PAIRING] Da boc tach cau hinh -> Chuyen sang kiem tra WiFi...");
      WiFi.mode(WIFI_AP_STA);
      WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());

      pairingPhase      = PAIR_TESTING_WIFI;
      pairingPhaseStart = millis();
      currentScreen     = SCREEN_PAIRING_CONNECTING;

      oled.clearDisplay();
      oled.setTextSize(1); oled.setTextColor(SSD1306_WHITE);
      oled.setCursor(0, 20); oled.println("Dang ket noi WiFi...");
      oled.display();
    }
  }
  else if (pairingPhase == PAIR_TESTING_WIFI) {
    if (WiFi.status() == WL_CONNECTED) {
      DBG_PRINT("[WIFI] Ket noi WiFi thanh cong! IP: "); DBG_PRINTLN(WiFi.localIP());
      if (mqtt_server.length() > 0) {
        mqttClient.setServer(mqtt_server.c_str(), mqtt_port);
        mqttClient.setCallback(mqttCallback);
        
        mqttRetryCount    = 0;
        pairingPhase      = PAIR_TESTING_MQTT;
        pairingPhaseStart = 0; 
      } else {
        finishPairingAndExit(false, "GHEP NOI THAT BAI!", "Thieu dia chi Server", "Ghep noi that bai: Thieu dia chi Server");
      }
    } else if (millis() - pairingPhaseStart >= 10000) {
      finishPairingAndExit(false, "GHEP NOI THAT BAI!", "Sai WiFi / Mat mang", "Ghep noi that bai: Khong ket noi duoc WiFi");
    }
  }
  else if (pairingPhase == PAIR_TESTING_MQTT) {
    if (mqttClient.connected()) {
      WiFi.softAPdisconnect(true);
      WiFi.mode(WIFI_MODE_STA);
      finishPairingAndExit(true, "GHEP NOI THANH CONG!", "Che do Online (MQTT)", "Ghep noi Server thanh cong");
      return;
    }

    if (pairingPhaseStart == 0 || (millis() - pairingPhaseStart >= 2000)) {
      pairingPhaseStart = millis();

      if (mqttRetryCount < MAX_MQTT_RETRIES) {
        mqttRetryCount++;
        DBG_PRINT("[MQTT] Dang thu ket noi Server (Lan ");
        DBG_PRINT(mqttRetryCount); DBG_PRINT("/"); DBG_PRINT(MAX_MQTT_RETRIES);
        DBG_PRINT("): "); DBG_PRINTLN(mqtt_server);

        oled.clearDisplay();
        oled.setTextSize(1); oled.setTextColor(SSD1306_WHITE);
        oled.setCursor(0, 16); oled.println("Dang vao Server...");
        oled.setCursor(0, 32); oled.print("Thu lan: "); oled.print(mqttRetryCount); oled.print("/"); oled.println(MAX_MQTT_RETRIES);
        oled.display();

        if (mqttClient.connect(deviceName.c_str())) {
          mqttClient.subscribe(topic_command.c_str());
          WiFi.softAPdisconnect(true);
          WiFi.mode(WIFI_MODE_STA);
          finishPairingAndExit(true, "GHEP NOI THANH CONG!", "Che do Online (MQTT)", "Ghep noi Server thanh cong");
        }
      } else {
        DBG_PRINTLN("[MQTT] Da thu du 5 lan nhung khong vao duoc Server!");
        finishPairingAndExit(false, "GHEP NOI THAT BAI!", "Khong vao duoc Server", "Ghep noi that bai: Khong ket noi duoc Server MQTT");
      }
    }
  }
}

void publishTelemetryData() {
  StaticJsonDocument<320> doc; 
  doc["device_id"]    = deviceName; 
  doc["voltage"]      = round(voltage * 100.0) / 100.0; 
  doc["current"]      = round(current * 100.0) / 100.0; 
  doc["power"]        = round(power * 100.0) / 100.0; 
  doc["total_kwh"]    = round(total_kwh * 1000.0) / 1000.0;
  doc["daily_kwh"]    = round(daily_kwh * 1000.0) / 1000.0;
  doc["cf_pulses"]    = last_cf_cnt;
  doc["p_warn_cfg"]   = p_max_warn; 
  doc["i_warn_cfg"]   = i_warn; 
  doc["relay_status"] = relayState ? "ON" : "OFF";
  
  char jsonBuffer[320]; 
  serializeJson(doc, jsonBuffer);
  
  if (isServerPaired && WiFi.status() == WL_CONNECTED && mqttClient.connected()) {
    mqttClient.publish(topic_telemetry.c_str(), jsonBuffer);
    DBG_PRINT("[MQTT TX] "); DBG_PRINTLN(jsonBuffer);
  }
  if (bleActive && bleClientConnected) { 
    pCharacteristic->setValue(jsonBuffer); 
    pCharacteristic->notify(); 
    DBG_PRINT("[BLE TX] "); DBG_PRINTLN(jsonBuffer);
  }
}

void publishAlarm(String alertMessage) {
  StaticJsonDocument<256> doc; 
  doc["device_id"] = deviceName; 
  doc["event"]     = "CRITICAL_ALARM"; 
  doc["message"]   = alertMessage; 
  doc["timestamp"] = millis();
  
  char jsonBuffer[256]; 
  serializeJson(doc, jsonBuffer);
  DBG_PRINT("[ALARM] Phat canh bao: "); DBG_PRINTLN(alertMessage);
  
  if (isServerPaired && WiFi.status() == WL_CONNECTED && mqttClient.connected()) {
    mqttClient.publish(topic_alarm.c_str(), jsonBuffer, true);
  }
  if (bleActive && bleClientConnected) { 
    pCharacteristic->setValue(jsonBuffer); 
    pCharacteristic->notify(); 
  }
}
bool checkButtonDebounced(int pin) {
  static unsigned long lastDebounceTime[4] = {0, 0, 0, 0}; 
  static bool lastButtonState[4] = {HIGH, HIGH, HIGH, HIGH}; 
  static bool buttonState[4]     = {HIGH, HIGH, HIGH, HIGH};
  
  int idx = (pin == PIN_RSF_BTN) ? 0 : (pin == PIN_OK_BTN) ? 1 : (pin == PIN_UP_BTN) ? 2 : 3;
  bool reading = digitalRead(pin);
  if (reading != lastButtonState[idx]) lastDebounceTime[idx] = millis(); 
  lastButtonState[idx] = reading;
  
  if ((millis() - lastDebounceTime[idx]) > 50) { 
    if (reading != buttonState[idx]) {
      buttonState[idx] = reading;
      if (buttonState[idx] == LOW) return true; 
    }
  }
  return false;
}

void setup() {
  pinMode(PIN_OUTA, OUTPUT); pinMode(PIN_OUTB, OUTPUT); 
  digitalWrite(PIN_OUTA, LOW); digitalWrite(PIN_OUTB, LOW); 
  pinMode(PIN_LED, OUTPUT);
  
  pinMode(PIN_RSF_BTN, INPUT_PULLUP); pinMode(PIN_OK_BTN, INPUT_PULLUP); 
  pinMode(PIN_UP_BTN, INPUT_PULLUP);  pinMode(PIN_DOWN_BTN, INPUT_PULLUP);
  
  pinMode(PIN_LEAK_INT, INPUT_PULLDOWN); 
  attachInterrupt(digitalPinToInterrupt(PIN_LEAK_INT), leakageISR, RISING);
  
  BL0942_SERIAL.begin(4800, SERIAL_8N1); 
  DBG_PRINTLN("\n==========================================");
  DBG_PRINTLN("[BOOT] KHOI DONG CONG TO DIEN TU AUSTEC");
  
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL); 
  oled.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  initDeviceName();
  
  pref.begin("meter_settings", false); 
  isServerPaired = pref.getBool("paired", false);
  p_max_warn     = pref.getFloat("p_max", 3500.0); 
  i_warn         = pref.getFloat("i_warn", 14.0); 
  i_trip         = pref.getFloat("i_trip", 16.0); 
  wifi_ssid      = pref.getString("w_ssid", ""); 
  wifi_pass      = pref.getString("w_pass", ""); 
  mqtt_server    = pref.getString("m_srv", ""); 
  mqtt_port      = pref.getInt("m_port", 1883);
  pref.end();

  pref.begin("meter_energy", false);
  total_kwh   = pref.getDouble("tot_kwh", 0.0); 
  daily_kwh   = pref.getDouble("day_kwh", 0.0); 
  last_cf_cnt = pref.getUInt("last_cf", 0);
  for (int i = 0; i < 7; i++) { 
    String key = "d" + String(i); 
    weeklyEnergy[i] = pref.getFloat(key.c_str(), 0.0); 
  }
  pref.end();
  last_saved_kwh = total_kwh;
  DBG_PRINT("[BOOT] Nap ROM: P_warn="); DBG_PRINT(p_max_warn); DBG_PRINT("W | I_trip="); DBG_PRINT(i_trip); DBG_PRINT("A | Total_kWh="); DBG_PRINTLN(total_kwh);

  currentScreen      = SCREEN_WELCOME;
  statusMsgStartTime = millis();
  drawWelcomeScreen();
  esp_CloseRelay(); 
  
  if (isServerPaired && wifi_ssid.length() > 0) { 
    DBG_PRINT("[WIFI] Ket noi mang da ghep noi: "); DBG_PRINTLN(wifi_ssid);
    WiFi.mode(WIFI_MODE_STA); 
    WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str()); 
    if (mqtt_server.length() > 0) { 
      mqttClient.setServer(mqtt_server.c_str(), mqtt_port); 
      mqttClient.setCallback(mqttCallback); 
    }
  } else { 
    WiFi.mode(WIFI_OFF);
    DBG_PRINTLN("[WIFI] Chua ghep noi Server -> Chay Offline binh thuong (Den nhay 1s)."); 
  }
}

void loop() {
  handleRelayPulse();

  // 1. ƯU TIÊN CAO NHẤT: Nút Reset Factory (RSF) luôn được quét đầu tiên
  if (checkButtonDebounced(PIN_RSF_BTN)) { 
    DBG_PRINTLN("[BTN] Uu tien xu ly nut RSF -> Kich hoat che do ghep noi!"); 
    enterPairingMode(); 
  }

  // 2. Điều khiển nhịp đèn LED1 (IO10) Non-blocking
  static unsigned long lastLedTick = 0;
  static bool ledState = LOW;

  unsigned long onDuration  = 200; // Thời gian sáng cố định 200ms cho cả Online & Offline
  unsigned long offDuration = 800; // Mặc định Offline (chu kỳ 1s): Sáng 200ms + Tắt 800ms

  if (pairingPhase != PAIR_IDLE) {
    // Chế độ Reset Factory / Ghép nối: Giữ nguyên nháy nhanh 100ms sáng / 100ms tắt
    onDuration  = 100;
    offDuration = 100;
  } else if (isServerPaired && WiFi.status() == WL_CONNECTED && mqttClient.connected()) {
    // Chế độ Online thành công (chu kỳ 3s): Sáng 200ms + Tắt 2800ms
    onDuration  = 200;
    offDuration = 2800;
  }

  unsigned long currentInterval = (ledState == HIGH) ? onDuration : offDuration;
  if (millis() - lastLedTick >= currentInterval) {
    lastLedTick = millis();
    ledState = !ledState;
    digitalWrite(PIN_LED, ledState);
  }

  // 3. Khi đang ghép nối: Dừng toàn bộ các tác vụ khác, chỉ tập trung vào ghép nối
  if (pairingPhase != PAIR_IDLE) {
    handlePairingStateMachine();
    return; 
  }

  // 4. Các tác vụ hoạt động bình thường
  if (isServerPaired && wifi_ssid.length() > 0) {
    if (WiFi.status() == WL_CONNECTED) {
      if (bleActive) stopBLE(); 
      if (!mqttClient.connected() && mqtt_server.length() > 0) {
        static unsigned long lastReconnectAttempt = 0;
        if (millis() - lastReconnectAttempt >= 3000) {
          lastReconnectAttempt = millis();
          if (mqttClient.connect(deviceName.c_str())) { 
            DBG_PRINTLN("[MQTT] Ket noi lai Server OK!"); 
            mqttClient.subscribe(topic_command.c_str()); 
          }
        }
      }
      mqttClient.loop();
    } else {
      if (!bleActive) startBLE(); 
      if (millis() - lastWifiRetryTime >= WIFI_RETRY_INTERVAL) { 
        lastWifiRetryTime = millis(); 
        DBG_PRINTLN("[WIFI] Thu ket noi lai WiFi ngam sau 5 phut..."); 
        WiFi.disconnect(); 
        WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str()); 
      }
    }
  }

  if (currentScreen == SCREEN_WELCOME) {
    if (millis() - statusMsgStartTime >= 3000) currentScreen = SCREEN_MAIN;
  } else if (currentScreen == SCREEN_STATUS_MSG) {
    if (millis() - statusMsgStartTime >= statusMsgDuration) currentScreen = SCREEN_MAIN;
  }

  if (currentScreen != SCREEN_WELCOME && currentScreen != SCREEN_STATUS_MSG) {
    if (checkButtonDebounced(PIN_OK_BTN)) {
      DBG_PRINTLN("[BTN] Nhan OK.");
      if (currentScreen == SCREEN_ALERT_LOCK) {
        if (!isLeakageActive && !isOvercurrentActive) esp_CloseRelay();
        isOvercurrentActive = false; 
        isPowerAbnormal = false; 
        currentScreen = SCREEN_MAIN; 
      }
      else if (currentScreen == SCREEN_MAIN) currentScreen = SCREEN_VIEW_PARAMS;
      else if (currentScreen == SCREEN_VIEW_PARAMS) currentScreen = SCREEN_GRAPH;
      else if (currentScreen == SCREEN_GRAPH) { currentScreen = SCREEN_EDIT_PARAMS; editIndex = 0; } 
      else if (currentScreen == SCREEN_EDIT_PARAMS) {
        if (editIndex < 2) {
          editIndex++; 
        } else {
          DBG_PRINTLN("[UI] Luu tham so cai dat moi vao ROM...");
          pref.begin("meter_settings", false); 
          pref.putFloat("p_max", p_max_warn); 
          pref.putFloat("i_warn", i_warn); 
          pref.putFloat("i_trip", i_trip); 
          pref.end();
          if (!isLeakageActive) { 
            isOvercurrentActive = false; 
            esp_CloseRelay(); 
          } 
          triggerStatusMessage("DA LUU DU LIEU!", "Cap nhat thanh cong", 1000);
        }
      }
    }

    if (currentScreen == SCREEN_EDIT_PARAMS) {
      if (checkButtonDebounced(PIN_UP_BTN)) { 
        DBG_PRINTLN("[BTN] Nhan UP."); 
        if (editIndex == 0) p_max_warn += 100; 
        else if (editIndex == 1) i_warn += 0.1; 
        else if (editIndex == 2) i_trip += 0.1; 
      }
      if (checkButtonDebounced(PIN_DOWN_BTN)) { 
        DBG_PRINTLN("[BTN] Nhan DOWN."); 
        if (editIndex == 0 && p_max_warn > 100) p_max_warn -= 100; 
        else if (editIndex == 1 && i_warn > 0.5) i_warn -= 0.1; 
        else if (editIndex == 2 && i_trip > 0.5) i_trip -= 0.1; 
      }
    }
  }

  static unsigned long lastTick = 0; 
  if (millis() - lastTick >= 1000) {
    lastTick = millis();
    read_BL0942();

    if (isLeakageActive) {
      static bool leakLogged = false; 
      if(!leakLogged) { 
        publishAlarm("Canh bao dong ro nguy hiem - da ngat he thong phan cung"); 
        leakLogged = true; 
      }
      if (relayState == true) esp_OpenRelay();
      activeOledAlertStr = "Canh bao dong ro\nnguy hiem!\nSystem cut-off.";
      currentScreen = SCREEN_ALERT_LOCK;
    } else {
      if (current > i_trip) {
        if (!isOvercurrentActive) { 
          isOvercurrentActive = true; 
          esp_OpenRelay(); 
          publishAlarm("Canh bao qua dong - da ngat he thong"); 
        }
        activeOledAlertStr = "Canh bao qua dong!\nDa ngat he thong an\ntoan.";
        currentScreen = SCREEN_ALERT_LOCK;
      } else if (power > p_max_warn) {
        if (!isPowerAbnormal) { 
          isPowerAbnormal = true; 
          currentScreen = SCREEN_ALERT_LOCK; 
        }
        publishAlarm("Canh bao cong suat tieu thu vuot cai dat " + String(power, 1) + "W. Dong hien tai: " + String(current, 2) + "A.");
        activeOledAlertStr = "CS tieu thu vuot\ncai dat: " + String(power, 1) + "W\nDong hien tai: " + String(current, 2) + "A";
      } else if (current > i_warn && current <= i_trip) {
        static bool iWarnActive = false; 
        if (!iWarnActive) { 
          iWarnActive = true; 
          currentScreen = SCREEN_ALERT_LOCK; 
        }
        publishAlarm("Canh bao dong tieu thu o muc cao " + String(current, 2) + "A. Cong suat hien tai: " + String(power, 1) + "W.");
        activeOledAlertStr = "Dong tieu thu o\nmuc cao: " + String(current, 2) + "A\nCS hien tai: " + String(power, 1) + "W";
      } else { 
        isPowerAbnormal = false; 
      }
    }

    switch (currentScreen) {
      case SCREEN_WELCOME:     drawWelcomeScreen();    break;
      case SCREEN_MAIN:        drawMainScreen();       break; 
      case SCREEN_VIEW_PARAMS: drawViewParamsScreen(); break; 
      case SCREEN_GRAPH:       drawGraphScreen();      break; 
      case SCREEN_EDIT_PARAMS: drawEditParamsScreen(); break; 
      case SCREEN_ALERT_LOCK:  drawAlertLockScreen();  break;
      case SCREEN_STATUS_MSG:  drawStatusMsgScreen();  break;
      default: break;
    }
    publishTelemetryData(); 
  }
}