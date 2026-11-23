#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>
#include <time.h>

// =========================================================================
// 1. CÔNG TẮC GỠ LỖI & CẤU HÌNH PHẦN CỨNG ESP32-WROOM-32D
// =========================================================================
#define DEBUG_SCREEN_ENABLE 1        // Đổi thành 0 khi xuất xưởng thương mại
#define WINSTAR_BAUD        115200   // UART0 (TXD0 = GPIO 1, RXD0 = GPIO 3)

// Giao tiếp RS485 Modbus RTU (IC SN65HVD75)
#define MODBUS_SLAVE_ID     1
#define RS485_BAUD          9600
#define RS485_TX_PIN        5
#define RS485_RX_PIN        18
#define RS485_RE_PIN        16
#define RS485_DE_PIN        17

// Giao tiếp I2C với IC BQ76952
#define I2C_SDA_PIN         21
#define I2C_SCL_PIN         22
#define BQ_ALERT_PIN        34       // Chân DALERT (Open-Drain Active Low, kéo lên 3.3V qua R26 10K)
#define BQ76952_ADDR        0x08
#define SHUNT_MOHM          0.25f    // 2 con 0.50 mOhm mắc song song = 0.25 mOhm

// Nút nhấn chức năng & Đèn LED báo trạng thái
#define BTN_WAKE_PIN        35       // Chân BTN_LOW (S1: Mức LOW = Turnoff, HIGH = Wakeup)
#define BTN_IO19_PIN        19       // Nút IO19 (Nhấn 1 lần: Khôi phục lỗi | Giữ 5s: Ghép nối)
#define LED_GREEN_PIN       32       // Tích cực mức LOW
#define LED_RED_PIN         33       // Tích cực mức LOW
#define LED_YELLOW_PIN      27       // Tích cực mức LOW

// Cấu hình MQTT Server
const char* MQTT_SERVER = "broker.emqx.io";
const int   MQTT_PORT   = 1883;
String deviceMacId      = "";        // Định dạng Mục 5: BMS + 12 ký tự MAC
String mqttTopicData    = "";
String mqttTopicCmd     = "";
String mqttTopicAlert   = "";
String mqttTopicAck     = "";

HardwareSerial RS485Serial(1);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
Preferences bmsPrefs;

// =========================================================================
// 2. MÁY TRẠNG THÁI VẬN HÀNH BMS & GHÉP NỐI MẠNG
// =========================================================================
enum BmsSystemState {
  BMS_STATE_TURNOFF,   // 1. Chưa có tín hiệu BTN (GPIO 35 = LOW), khóa BQ76952
  BMS_STATE_WAKEUP,    // 2. Đã nhận BTN HIGH -> Cài đặt BQ76952 & hoạt động
  BMS_STATE_FAULT      // 5. Có lỗi từ ALERT hoặc ngưỡng -> Đã dừng BQ76952, chờ IO19
};

enum NetworkState {
  NET_OFFLINE,
  NET_PAIRING_WAIT,
  NET_ONLINE
};

BmsSystemState bmsState   = BMS_STATE_TURNOFF;
NetworkState netState     = NET_OFFLINE;
String activeFaultText    = "";

bool bqConnected          = false;
bool bleActive            = false;
bool bleClientJoined      = false;
bool pairingSuccessFlag   = false;
bool pairingFailFlag      = false;

uint8_t currentPage       = 1;
uint8_t transmissionPhase = 0;
bool hasNewFaultEvent     = false;

unsigned long lastUiMillis     = 0;
unsigned long lastBqMillis     = 0;
unsigned long lastMqttMillis   = 0;
unsigned long pairingStartTime = 0;
const unsigned long PAIRING_TIMEOUT_MS = 180000UL;

// Biến chống nhiễu nút nhấn IO35 và IO19
int lastWakeBtnState = LOW;
int lastIo19State    = HIGH;
unsigned long io19PressStart = 0;
bool io19LongPressHandled    = false;

// Dữ liệu đo lường BMS 16S - 150A
float packVoltage = 52.81f, packCurrent = 0.0f, packPower = 0.0f;
float mosTemp = 34.5f, cellTempAvg = 32.5f;
float ntcTemps[] = {28.5f, 29.0f, 28.2f};
int   socPercent = 92;

float cellVoltages[] = {
  3.308f, 3.305f, 3.300f, 3.309f, 3.305f, 3.310f, 3.308f, 3.315f,
  3.312f, 3.309f, 3.311f, 3.314f, 3.305f, 3.309f, 3.313f, 3.309f
};
bool cellBalancing[] = {
  false, false, false, false, false, false, false, true,
  false, false, false, true,  false, false, false, false
};

const uint8_t p2CellIndex[] = {22, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21};
const uint8_t p3BalCells[]  = {0, 1, 2, 3, 4, 6, 8, 9, 11, 12, 14, 15};

float cfgCOV = 3.650f, cfgCUV = 2.500f, cfgMaxChg = 150.0f, cfgMaxDsg = 150.0f;
String wifiSsid = "AUSTEC_WIFI";
String wifiPass = "12345678";

struct LogEntry { String timeStr, code, desc, level, status; };
LogEntry datalogList[] = {
  {"00:00:05", "SYS_OK", "Khoi dong he thong BMS", "Thong tin", "Da xu ly"},
  {"", "", "", "", ""}, {"", "", "", "", ""}, {"", "", "", "", ""}
};
int logCount = 1;

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_TELEMETRY_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_COMMAND_UUID   "8258380b-1039-4733-9b81-22f431886882"
BLECharacteristic *pTelemetryChar = nullptr;
// =========================================================================
// 3. HÀM ĐỒ HỌA WINSTAR, DEBUG 1 DÒNG & LƯU TRỮ FLASH
// =========================================================================
void drawFillRectWinstar(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
  uint8_t cmd[] = {
    0xAA, 0x55, 0x07, (uint8_t)(x >> 8), (uint8_t)(x & 0xFF), (uint8_t)(y >> 8), (uint8_t)(y & 0xFF),
    (uint8_t)(w >> 8), (uint8_t)(w & 0xFF), (uint8_t)(h >> 8), (uint8_t)(h & 0xFF),
    (uint8_t)(color >> 8), (uint8_t)(color & 0xFF), 0x0D
  };
  Serial.write(cmd, 14);
}

void drawTextCoordWinstar(uint16_t x, uint16_t y, uint16_t color, String text) {
  uint8_t hdr[] = {
    0xAA, 0x55, 0x08, (uint8_t)(x >> 8), (uint8_t)(x & 0xFF),
    (uint8_t)(y >> 8), (uint8_t)(y & 0xFF), (uint8_t)(color >> 8), (uint8_t)(color & 0xFF)
  };
  Serial.write(hdr, 9);
  Serial.print(text);
  Serial.write(0x0D);
}

void printDebugScreen(String msg) {
#if DEBUG_SCREEN_ENABLE
  if (netState == NET_PAIRING_WAIT) return;
  drawFillRectWinstar(0, 0, 480, 14, 0x0000);
  drawTextCoordWinstar(4, 1, 0x07E0, "[DBG] " + msg);
#endif
}

void loadBmsSettings() {
  bmsPrefs.begin("bms_cfg", true);
  cfgCOV    = bmsPrefs.getFloat("cov", 3.650f);
  cfgCUV    = bmsPrefs.getFloat("cuv", 2.500f);
  cfgMaxChg = bmsPrefs.getFloat("chg", 150.0f);
  cfgMaxDsg = bmsPrefs.getFloat("dsg", 150.0f);
  wifiSsid  = bmsPrefs.getString("ssid", "AUSTEC_WIFI");
  wifiPass  = bmsPrefs.getString("pass", "12345678");
  bool wasPaired = bmsPrefs.getBool("paired", false);
  bmsPrefs.end();
  netState = wasPaired ? NET_ONLINE : NET_OFFLINE;
}

void saveBmsSettings(bool isPaired) {
  bmsPrefs.begin("bms_cfg", false);
  bmsPrefs.putFloat("cov", cfgCOV);
  bmsPrefs.putFloat("cuv", cfgCUV);
  bmsPrefs.putFloat("chg", cfgMaxChg);
  bmsPrefs.putFloat("dsg", cfgMaxDsg);
  bmsPrefs.putString("ssid", wifiSsid);
  bmsPrefs.putString("pass", wifiPass);
  bmsPrefs.putBool("paired", isPaired);
  bmsPrefs.end();
}

void pushFaultLog(String code, String desc, String level) {
  if (logCount > 0 && (*(datalogList)).code == code && (*(datalogList)).status == "Dang loi") return;
  for (int i = 3; i > 0; i--) *(datalogList + i) = *(datalogList + i - 1);

  struct tm timeinfo;
  String timeFormatted = "";
  if (getLocalTime(&timeinfo, 10)) {
    char tBuf[16];
    strftime(tBuf, sizeof(tBuf), "%H:%M:%S", &timeinfo);
    timeFormatted = String(tBuf);
  } else {
    unsigned long sec = millis() / 1000;
    char tBuf[16];
    snprintf(tBuf, sizeof(tBuf), "%02lu:%02lu:%02lu", (sec / 3600) % 24, (sec / 60) % 60, sec % 60);
    timeFormatted = String(tBuf);
  }

  (*(datalogList)).timeStr = timeFormatted;
  (*(datalogList)).code    = code;
  (*(datalogList)).desc    = desc;
  (*(datalogList)).level   = level;
  (*(datalogList)).status  = "Dang loi";

  if (logCount < 4) logCount++;
  hasNewFaultEvent = true;
}

// =========================================================================
// 4. HÀM TRUY XUẤT I2C CẤP THẤP VỚI IC BQ76952
// =========================================================================
bool readBQ76952Direct(uint8_t regAddr, int16_t &val) {
  Wire.beginTransmission(BQ76952_ADDR);
  Wire.write(regAddr);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((uint8_t)BQ76952_ADDR, (uint8_t)2) != 2) return false;
  uint8_t lsb = Wire.read();
  uint8_t msb = Wire.read();
  val = (int16_t)((msb << 8) | lsb);
  return true;
}

bool readBQ76952Byte(uint8_t regAddr, uint8_t &val) {
  Wire.beginTransmission(BQ76952_ADDR);
  Wire.write(regAddr);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((uint8_t)BQ76952_ADDR, (uint8_t)1) != 1) return false;
  val = Wire.read();
  return true;
}

void writeBQ76952DirectWord(uint8_t regAddr, uint16_t wordVal) {
  Wire.beginTransmission(BQ76952_ADDR);
  Wire.write(regAddr);
  Wire.write(wordVal & 0xFF);
  Wire.write((wordVal >> 8) & 0xFF);
  Wire.endTransmission();
}

void writeBQ76952Subcommand(uint16_t subCmd) {
  Wire.beginTransmission(BQ76952_ADDR);
  Wire.write(0x3E);
  Wire.write(subCmd & 0xFF);
  Wire.write((subCmd >> 8) & 0xFF);
  Wire.endTransmission();
  delay(2);
}

// Hàm phụ trợ ghi 1 byte vào Data Memory (RAM) của BQ76952 kèm Checksum
void writeBQ76952DataMem1Byte(uint16_t addr, uint8_t dataVal) {
  uint8_t addrL = addr & 0xFF;
  uint8_t addrH = (addr >> 8) & 0xFF;
  Wire.beginTransmission(BQ76952_ADDR);
  Wire.write(0x3E); Wire.write(addrL); Wire.write(addrH); Wire.write(dataVal);
  Wire.endTransmission();
  uint8_t cs = ~(addrL + addrH + dataVal);
  Wire.beginTransmission(BQ76952_ADDR);
  Wire.write(0x60); Wire.write(cs); Wire.write(0x05);
  Wire.endTransmission();
  delay(2);
}

// Hàm phụ trợ ghi 2 byte vào Data Memory (RAM) của BQ76952 kèm Checksum
void writeBQ76952DataMem2Bytes(uint16_t addr, uint16_t dataVal) {
  uint8_t addrL = addr & 0xFF;
  uint8_t addrH = (addr >> 8) & 0xFF;
  uint8_t dL = dataVal & 0xFF;
  uint8_t dH = (dataVal >> 8) & 0xFF;
  Wire.beginTransmission(BQ76952_ADDR);
  Wire.write(0x3E); Wire.write(addrL); Wire.write(addrH); Wire.write(dL); Wire.write(dH);
  Wire.endTransmission();
  uint8_t cs = ~(addrL + addrH + dL + dH);
  Wire.beginTransmission(BQ76952_ADDR);
  Wire.write(0x60); Wire.write(cs); Wire.write(0x06);
  Wire.endTransmission();
  delay(2);
}
// =========================================================================
// 5. CẤU HÌNH BẢO VỆ BQ76952, XỬ LÝ ALERT MỨC THẤP & MODBUS RTU
// =========================================================================
void emergencyStopBQ76952(String faultCode, String faultDisplay) {
  writeBQ76952Subcommand(0x0095); // ALL_FETS_OFF (Khóa ngay lập tức FET Sạc/Xả)
  bmsState = BMS_STATE_FAULT;
  activeFaultText = faultDisplay;
  digitalWrite(LED_GREEN_PIN, HIGH); // Tắt đèn xanh
  digitalWrite(LED_RED_PIN, LOW);    // Bật sáng đèn đỏ báo lỗi
  pushFaultLog(faultCode, faultDisplay, "Nghiem trong");
  printDebugScreen("DUNG KHAN CAP BQ76952: " + faultDisplay);
}

// Kiểm tra nguyên nhân lỗi từ BQ76952 khi chân DALERT (GPIO 34) xuống mức LOW
void inspectBQ76952AlertRegisters() {
  uint8_t safetyA = 0, safetyB = 0, safetyC = 0;
  readBQ76952Byte(0x03, safetyA); // Safety Status A (CUV, COV, OCC, OCD1, OCD2, SCD)
  readBQ76952Byte(0x05, safetyB); // Safety Status B (Nhiệt độ OTC, OTD, OTF...)
  readBQ76952Byte(0x07, safetyC); // Safety Status C

  String reason = "Canh bao phan cung";
  String code   = "ALT_HW";

  if (safetyA & 0x08)      { reason = "Qua ap cell";      code = "ERR_COV"; }
  else if (safetyA & 0x04) { reason = "Thap ap cell";     code = "ERR_CUV"; }
  else if (safetyA & 0x10) { reason = "Qua dong sac";     code = "ERR_OCC"; }
  else if (safetyA & 0x60) { reason = "Qua dong xa";      code = "ERR_OCD"; }
  else if (safetyA & 0x80) { reason = "Ngan mach tai";    code = "ERR_SCD"; }
  else if (safetyB != 0)   { reason = "Qua nhiet do";     code = "ERR_TMP"; }

  emergencyStopBQ76952(code, reason);
}

// Cấu hình toàn bộ BQ76952 và mở FET (Chỉ gọi khi BTN GPIO 35 = HIGH hoặc nhấn IO19)
bool configureAndStartBQ76952() {
  int16_t testVal;
  if (!readBQ76952Direct(0x14, testVal)) return false;

  writeBQ76952Subcommand(0x0090); // Vào chế độ CONFIG_UPDATE
  delay(5);

  // 1. Kích hoạt đủ 16 cells nối tiếp (Vcell Mode 0x9304 = 0xFFFF)
  writeBQ76952DataMem2Bytes(0x9304, 0xFFFF);

  // 2. Cấu hình chân ALERT: Open-Drain, Tích cực mức THẤP (Active Low) với trở kéo 10K (0x92FC = 0x2A)
  writeBQ76952DataMem1Byte(0x92FC, 0x2A);

  // 3. Cấu hình Default Alarm Mask (0x926D = 0xF800): CHỈ xuất tín hiệu ALERT khi có lỗi/cảnh báo an toàn
  writeBQ76952DataMem2Bytes(0x926D, 0xF800);

  // 4. Nạp ngưỡng Quá áp COV (0x9278) và Thấp áp CUV (0x9275)
  writeBQ76952DataMem1Byte(0x9278, (uint8_t)((cfgCOV * 1000.0f) / 50.6f));
  writeBQ76952DataMem1Byte(0x9275, (uint8_t)((cfgCUV * 1000.0f) / 50.6f));

  // 5. Nạp ngưỡng quá dòng xả OCD1 150A qua Shunt 0.25mOhm (0x9282) & Ngắn mạch SCD 320A (0x9286)
  writeBQ76952DataMem1Byte(0x9282, (uint8_t)((cfgMaxDsg * SHUNT_MOHM) / 2.0f));
  writeBQ76952DataMem1Byte(0x9286, 0x04);

  // 6. Nạp hệ số hiệu chuẩn dòng CC Gain cho Shunt 0.25mOhm (29.9072f -> 0x41EF41F2 tại 0x91A8)
  uint8_t ccGainCmd[] = {0x3E, 0xA8, 0x91, 0xF2, 0x41, 0xEF, 0x41};
  Wire.beginTransmission(BQ76952_ADDR); Wire.write(ccGainCmd, 7); Wire.endTransmission();
  uint8_t csGain = ~(0xA8 + 0x91 + 0xF2 + 0x41 + 0xEF + 0x41);
  Wire.beginTransmission(BQ76952_ADDR); Wire.write(0x60); Wire.write(csGain); Wire.write(0x08); Wire.endTransmission();
  delay(2);

  writeBQ76952Subcommand(0x0092); // Thoát CONFIG_UPDATE
  delay(5);

  // Xóa sạch cờ Alarm Status (0x62) trước khi mở FET để chân ALERT ở mức HIGH ổn định
  writeBQ76952DirectWord(0x62, 0xFFFF);
  writeBQ76952Subcommand(0x0096); // ALL_FETS_ON
  printDebugScreen("BQ76952: WAKEUP & ALERT ACTIVE-LOW SAN SANG");
  return true;
}

void updateSystemTelemetry() {
  int16_t rawVal = 0;
  if (readBQ76952Direct(0x14, rawVal)) {
    bqConnected = true;
    float sumV = 0;
    for (uint8_t i = 0; i < 16; i++) {
      if (readBQ76952Direct(0x14 + (i * 2), rawVal)) {
        *(cellVoltages + i) = rawVal / 1000.0f;
        sumV += *(cellVoltages + i);
      }
    }
    packVoltage = sumV;
    if (readBQ76952Direct(0x3A, rawVal)) packCurrent = rawVal * 0.01f;
    if (readBQ76952Direct(0x68, rawVal)) mosTemp = (rawVal * 0.1f) - 273.15f;
    if (readBQ76952Direct(0x70, rawVal)) *(ntcTemps + 0) = (rawVal * 0.1f) - 273.15f;
    if (readBQ76952Direct(0x72, rawVal)) *(ntcTemps + 1) = (rawVal * 0.1f) - 273.15f;
    if (readBQ76952Direct(0x74, rawVal)) *(ntcTemps + 2) = (rawVal * 0.1f) - 273.15f;
    cellTempAvg = (*(ntcTemps + 0) + *(ntcTemps + 1) + *(ntcTemps + 2)) / 3.0f;

    writeBQ76952Subcommand(0x0083);
    Wire.beginTransmission(BQ76952_ADDR); Wire.write(0x40);
    if (Wire.endTransmission(false) == 0 && Wire.requestFrom((uint8_t)BQ76952_ADDR, (uint8_t)2) == 2) {
      uint16_t balMask = Wire.read() | (Wire.read() << 8);
      for (int b = 0; b < 16; b++) *(cellBalancing + b) = (balMask >> b) & 0x01;
    }
  } else {
    bqConnected = false;
    static float simStep = 0.002f;
    *(cellVoltages + 7) += simStep;
    if (*(cellVoltages + 7) >= 3.340f || *(cellVoltages + 7) <= 3.305f) simStep = -simStep;
    float sumSim = 0;
    for (int i = 0; i < 16; i++) sumSim += *(cellVoltages + i);
    packVoltage = sumSim;
    packCurrent = (bmsState == BMS_STATE_WAKEUP) ? (-45.3f + (sin(millis() / 2000.0f) * 12.5f)) : 0.0f;
  }

  packPower = abs(packVoltage * packCurrent) / 1000.0f;
  socPercent = constrain((int)((((packVoltage / 16.0f) - cfgCUV) / (cfgCOV - cfgCUV)) * 100.0f), 0, 100);

  if (bmsState == BMS_STATE_WAKEUP) {
    if (packCurrent > cfgMaxChg) { emergencyStopBQ76952("ERR_OCC", "Qua dong sac"); return; }
    if (packCurrent < -cfgMaxDsg) { emergencyStopBQ76952("ERR_OCD", "Qua dong xa"); return; }
    for (int i = 0; i < 16; i++) {
      if (*(cellVoltages + i) > cfgCOV) { emergencyStopBQ76952("ERR_COV", "Qua ap cell " + String(i + 1)); return; }
      if (*(cellVoltages + i) < cfgCUV) { emergencyStopBQ76952("ERR_CUV", "Thap ap cell " + String(i + 1)); return; }
    }
  }
}

uint16_t calcModbusCRC(uint8_t *buf, uint8_t len) {
  uint16_t crc = 0xFFFF;
  for (uint8_t pos = 0; pos < len; pos++) {
    crc ^= (uint16_t)buf[pos];
    for (uint8_t i = 8; i != 0; i--) {
      if ((crc & 0x0001) != 0) { crc >>= 1; crc ^= 0xA001; }
      else crc >>= 1;
    }
  }
  return crc;
}

void pollModbusRS485() {
  if (RS485Serial.available() < 8) return;
  uint8_t req[8];
  RS485Serial.readBytes(req, 8);
  if (*(req + 0) != MODBUS_SLAVE_ID) return;
  uint16_t rxCrc = (*(req + 7) << 8) | *(req + 6);
  if (rxCrc != calcModbusCRC(req, 6)) return;

  uint8_t funcCode  = *(req + 1);
  uint16_t startReg = (*(req + 2) << 8) | *(req + 3);
  uint16_t regCount = (*(req + 4) << 8) | *(req + 5);

  if ((funcCode == 0x03 || funcCode == 0x04) && (startReg + regCount <= 24)) {
    uint16_t regs[24];
    *(regs + 0) = (uint16_t)(packVoltage * 100.0f);
    *(regs + 1) = (uint16_t)((int16_t)(packCurrent * 10.0f));
    *(regs + 2) = (uint16_t)socPercent;
    *(regs + 3) = (uint16_t)((int16_t)(mosTemp * 10.0f));
    *(regs + 4) = (uint16_t)((int16_t)(cellTempAvg * 10.0f));
    *(regs + 5) = (uint16_t)(packPower * 100.0f);
    *(regs + 6) = (uint16_t)bmsState;
    *(regs + 7) = (bmsState == BMS_STATE_FAULT) ? 1 : 0;
    for (int i = 0; i < 16; i++) *(regs + 8 + i) = (uint16_t)(*(cellVoltages + i) * 1000.0f);

    uint8_t resp[64];
    *(resp + 0) = MODBUS_SLAVE_ID;
    *(resp + 1) = funcCode;
    *(resp + 2) = regCount * 2;
    for (uint16_t i = 0; i < regCount; i++) {
      *(resp + 3 + i * 2) = (*(regs + startReg + i) >> 8) & 0xFF;
      *(resp + 4 + i * 2) = *(regs + startReg + i) & 0xFF;
    }
    uint8_t respLen = 3 + (regCount * 2);
    uint16_t txCrc = calcModbusCRC(resp, respLen);
    *(resp + respLen)     = txCrc & 0xFF;
    *(resp + respLen + 1) = (txCrc >> 8) & 0xFF;

    digitalWrite(RS485_RE_PIN, HIGH); digitalWrite(RS485_DE_PIN, HIGH);
    delayMicroseconds(50); RS485Serial.write(resp, respLen + 2); RS485Serial.flush();
    delayMicroseconds(50); digitalWrite(RS485_DE_PIN, LOW); digitalWrite(RS485_RE_PIN, LOW);
  }
}
// =========================================================================
// 6. QUẢN LÝ WI-FI, BLE, MQTT & ĐỒNG BỘ THAM SỐ CÀI ĐẶT TỪ APP / SERVER
// =========================================================================
void updatePage5_Settings();

String getMainStatusString() {
  if (bmsState == BMS_STATE_TURNOFF) return "BMS turnoff";
  if (bmsState == BMS_STATE_FAULT)   return "Loi: " + activeFaultText;
  if (packCurrent > 0.3f)            return "Dang sac";
  if (packCurrent < -0.3f)           return "Dang xa";
  return "BMS Wakeup";
}

String buildBmsJsonPayload() {
  String json = "{";
  json += "\"id\":\"" + deviceMacId + "\",";
  json += "\"status\":\"" + getMainStatusString() + "\",";
  json += "\"v_pack\":" + String(packVoltage, 2) + ",";
  json += "\"i_pack\":" + String(packCurrent, 1) + ",";
  json += "\"p_kw\":" + String(packPower, 2) + ",";
  json += "\"soc\":" + String(socPercent) + ",";
  json += "\"t_mos\":" + String(mosTemp, 1) + ",";
  json += "\"t_ntc\":[" + String(ntcTemps[0], 1) + "," + String(ntcTemps[1], 1) + "," + String(ntcTemps[2], 1) + "],";
  json += "\"cells\":[";
  for (int i = 0; i < 16; i++) json += String(cellVoltages[i], 3) + (i < 15 ? "," : "");
  json += "],\"cfg\":{\"cov\":" + String(cfgCOV, 3) + ",\"cuv\":" + String(cfgCUV, 3) + ",";
  json += "\"chg\":" + String(cfgMaxChg, 1) + ",\"dsg\":" + String(cfgMaxDsg, 1) + "}}";
  return json;
}

void applyRemoteSettingsCommand(String cmdStr) {
  cmdStr.trim();
  bool cfgChanged = false;

  if (cmdStr.startsWith("PAIR:")) {
    int commaIdx = cmdStr.indexOf(',');
    if (commaIdx > 5) {
      wifiSsid = cmdStr.substring(5, commaIdx);
      wifiPass = cmdStr.substring(commaIdx + 1);
      WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
      unsigned long waitStart = millis();
      while (WiFi.status() != WL_CONNECTED && (millis() - waitStart < 10000)) delay(200);
      if (WiFi.status() == WL_CONNECTED) pairingSuccessFlag = true;
      else pairingFailFlag = true;
      return;
    }
  }
  else if (cmdStr == "295") {
    if (mqttClient.connected()) mqttClient.publish(mqttTopicAck.c_str(), "295");
    return;
  }
  else if (cmdStr == "SET_LFP")   { cfgCOV = 3.650f; cfgCUV = 2.500f; cfgChanged = true; }
  else if (cmdStr == "SET_LIION") { cfgCOV = 4.200f; cfgCUV = 3.000f; cfgChanged = true; }
  else if (cmdStr == "SET_LTO")   { cfgCOV = 2.800f; cfgCUV = 1.800f; cfgChanged = true; }
  else if (cmdStr.startsWith("CFG:")) {
    int iCov = cmdStr.indexOf("COV="), iCuv = cmdStr.indexOf("CUV=");
    int iChg = cmdStr.indexOf("CHG="), iDsg = cmdStr.indexOf("DSG=");
    if (iCov > 0) cfgCOV    = cmdStr.substring(iCov + 4).toFloat();
    if (iCuv > 0) cfgCUV    = cmdStr.substring(iCuv + 4).toFloat();
    if (iChg > 0) cfgMaxChg = cmdStr.substring(iChg + 4).toFloat();
    if (iDsg > 0) cfgMaxDsg = cmdStr.substring(iDsg + 4).toFloat();
    cfgChanged = true;
  }
  else if (cmdStr == "CLEAR_LOG") {
    logCount = 0;
    if (mqttClient.connected()) mqttClient.publish(mqttTopicAck.c_str(), "CLEAR_LOG");
    return;
  }

  if (cfgChanged) {
    saveBmsSettings(netState == NET_ONLINE);
    if (bmsState == BMS_STATE_WAKEUP) configureAndStartBQ76952();
    if (currentPage == 5) updatePage5_Settings();
    if (mqttClient.connected()) {
      mqttClient.publish(mqttTopicAck.c_str(), cmdStr.c_str());
    }
  }
}

class MyBLEServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) { bleClientJoined = true; }
  void onDisconnect(BLEServer* pServer) { bleClientJoined = false; if (bleActive) pServer->getAdvertising()->start(); }
};

class MyBLECharCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pChar) {
    String rxVal = pChar->getValue().c_str();
    if (rxVal.length() > 0) applyRemoteSettingsCommand(rxVal);
  }
};

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  applyRemoteSettingsCommand(msg);
}

void enableWifiAndBle() {
  WiFi.mode(WIFI_STA);
  if (wifiSsid.length() > 0) WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);

  if (!bleActive) {
    BLEDevice::init(deviceMacId.c_str());
    BLEServer *pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyBLEServerCallbacks());
    BLEService *pService = pServer->createService(SERVICE_UUID);
    pTelemetryChar = pService->createCharacteristic(CHAR_TELEMETRY_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
    pTelemetryChar->addDescriptor(new BLE2902());
    BLECharacteristic *pCmdChar = pService->createCharacteristic(CHAR_COMMAND_UUID, BLECharacteristic::PROPERTY_WRITE);
    pCmdChar->setCallbacks(new MyBLECharCallbacks());
    pService->start();
    pServer->getAdvertising()->start();
    bleActive = true;
  }
}

void disableWifiAndBleCompletely() {
  if (mqttClient.connected()) mqttClient.disconnect();
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  if (bleActive) { BLEDevice::deinit(true); bleActive = false; bleClientJoined = false; pTelemetryChar = nullptr; }
}

void showPairingScreenOnWinstar() {
  uint8_t page0Cmd[] = {0xAA, 0x55, 0x01, 0x00, 0x0D};
  Serial.write(page0Cmd, 5);
  delay(30);
  drawFillRectWinstar(40, 12, 400, 86, 0x0842);
  drawTextCoordWinstar(75, 18, 0x07F1, "THIET BI DA SAN SANG GHEP NOI");
  drawTextCoordWinstar(52, 38, 0xFFFF, "Ten thiet bi: " + deviceMacId);
  drawTextCoordWinstar(52, 56, 0xFD20, "Wi-Fi: " + wifiSsid + " | Pass: " + wifiPass);
  drawTextCoordWinstar(52, 74, 0x05FF, "Trang thai BLE: DANG BAT - Cho ket noi App...");
}
// =========================================================================
// 7. CẬP NHẬT 5 TRANG GIAO DIỆN WINSTAR & XỬ LÝ CẢM ỨNG
// =========================================================================
void sendTextToWinstar(uint8_t idx, String txt) {
  uint8_t hdr[] = {0xAA, 0x55, 0x02, idx};
  Serial.write(hdr, 4); Serial.print(txt); Serial.write(0x0D);
}

void setWinstarWidgetColor(uint8_t idx, uint16_t color, bool isBg) {
  uint8_t cmd[] = {0xAA, 0x55, (uint8_t)(isBg ? 0x06 : 0x05), idx, (uint8_t)(color >> 8), (uint8_t)(color & 0xFF), 0x0D};
  Serial.write(cmd, 7);
}

void updatePage1_MainScreen() {
  float minV = cellVoltages[0], maxV = cellVoltages[0];
  for (int i = 1; i < 16; i++) {
    if (cellVoltages[i] < minV) minV = cellVoltages[i];
    if (cellVoltages[i] > maxV) maxV = cellVoltages[i];
  }
  if (transmissionPhase == 0) {
    String statusTxt = getMainStatusString();
    sendTextToWinstar(0, statusTxt);
    uint16_t stColor = (bmsState == BMS_STATE_FAULT) ? 0xF800 : ((bmsState == BMS_STATE_TURNOFF) ? 0xFD20 : 0x07F1);
    setWinstarWidgetColor(0, stColor, false);

    sendTextToWinstar(1, String(packVoltage, 1) + " V");
    sendTextToWinstar(2, String(packVoltage / 16.0f, 2) + "V");
    sendTextToWinstar(3, String(packCurrent, 1) + " A");
    transmissionPhase = 1;
  } else {
    sendTextToWinstar(4, String(packPower, 2) + " kW");
    sendTextToWinstar(5, String(mosTemp, 1) + " C");
    sendTextToWinstar(6, String(maxV - minV, 3) + "V");
    sendTextToWinstar(7, String(socPercent));
    transmissionPhase = 0;
  }
}

void updatePage2_16Cells() {
  if (transmissionPhase == 0) {
    sendTextToWinstar(0, getMainStatusString());
    sendTextToWinstar(1, String(packVoltage, 2) + "V");
    sendTextToWinstar(2, String(packCurrent, 1) + "A");
    sendTextToWinstar(3, String(mosTemp, 1) + "C");
    sendTextToWinstar(4, String(socPercent) + "%");
    sendTextToWinstar(5, String(packPower, 2) + "kW");
    sendTextToWinstar(6, String(cellTempAvg, 1) + "C");
    uint16_t socColor = (socPercent < 20) ? 0xF800 : ((socPercent <= 50) ? 0xFD20 : 0x07F1);
    setWinstarWidgetColor(4, socColor, false);
    transmissionPhase = 1;
  } else if (transmissionPhase == 1) {
    for (int i = 0; i < 8; i++) sendTextToWinstar(p2CellIndex[i], String(cellVoltages[i], 3) + "V");
    transmissionPhase = 2;
  } else {
    for (int i = 8; i < 16; i++) sendTextToWinstar(p2CellIndex[i], String(cellVoltages[i], 3) + "V");
    transmissionPhase = 0;
  }
}

void updatePage3_CellDetail() {
  if (transmissionPhase == 0) {
    int maxIdx = 0, minIdx = 0;
    for (int i = 1; i < 16; i++) {
      if (cellVoltages[i] > cellVoltages[maxIdx]) maxIdx = i;
      if (cellVoltages[i] < cellVoltages[minIdx]) minIdx = i;
    }
    sendTextToWinstar(0, "C" + String(maxIdx + 1) + ":" + String(cellVoltages[maxIdx], 3) + "V");
    sendTextToWinstar(1, String(ntcTemps[0], 1) + "C");
    sendTextToWinstar(2, "C" + String(minIdx + 1) + ":" + String(cellVoltages[minIdx], 3) + "V");
    sendTextToWinstar(3, String(cellVoltages[maxIdx] - cellVoltages[minIdx], 3) + "V");
    sendTextToWinstar(4, String(ntcTemps[1], 1) + "C");
    sendTextToWinstar(5, String(ntcTemps[2], 1) + "C");
    sendTextToWinstar(6, String(mosTemp, 1) + "C");
    for (int k = 0; k < 12; k++) {
      bool isBal = cellBalancing[p3BalCells[k]];
      sendTextToWinstar(7 + k, isBal ? "ON" : "Off");
      setWinstarWidgetColor(7 + k, isBal ? 0x05FF : 0x4208, true);
    }
    transmissionPhase = 1;
  } else {
    for (int i = 0; i < 16; i++) {
      uint16_t colX = 69 + (i * 15);
      float v = constrain(cellVoltages[i], 0.0f, 4.50f);
      uint16_t barH = (uint16_t)((v / 4.50f) * 88.0f);
      if (barH < 88) drawFillRectWinstar(colX, 78, 10, 88 - barH, 0x0842);
      uint16_t colColor = (v >= cfgCOV || v <= cfgCUV) ? 0xF800 : (cellBalancing[i] ? 0x05FF : 0x07F1);
      if (barH > 0) drawFillRectWinstar(colX, 166 - barH, 10, barH, colColor);
    }
    transmissionPhase = 0;
  }
}

void updatePage4_Datalog() {
  int errCnt = 0, warnCnt = 0;
  for (int i = 0; i < logCount; i++) {
    if (datalogList[i].status == "Dang loi") {
      if (datalogList[i].level == "Nghiem trong") errCnt++;
      else if (datalogList[i].level == "Canh bao") warnCnt++;
    }
  }
  sendTextToWinstar(0, String(errCnt));
  sendTextToWinstar(1, String(warnCnt));
  sendTextToWinstar(2, (bmsState == BMS_STATE_FAULT) ? "NGAT BAO VE" : "BINH THUONG");
  for (int r = 0; r < 4; r++) {
    bool valid = (r < logCount);
    sendTextToWinstar(3 + r,  valid ? datalogList[r].timeStr : "");
    sendTextToWinstar(7 + r,  valid ? datalogList[r].code    : "");
    sendTextToWinstar(11 + r, valid ? datalogList[r].desc    : "");
    sendTextToWinstar(15 + r, valid ? datalogList[r].level   : "");
    sendTextToWinstar(19 + r, valid ? datalogList[r].status  : "");
  }
}

void updatePage5_Settings() {
  sendTextToWinstar(9,  String(cfgCOV, 3) + " V");
  sendTextToWinstar(10, String(cfgCUV, 3) + " V");
  sendTextToWinstar(11, String(cfgMaxChg, 1) + " A");
  sendTextToWinstar(12, String(cfgMaxDsg, 1) + " A");
}

void goToWinstarPage(uint8_t pageNum) {
  currentPage = pageNum;
  transmissionPhase = 0;
  uint8_t cmd[] = {0xAA, 0x55, 0x01, pageNum, 0x0D};
  Serial.write(cmd, 5);
  delay(20);
  switch (pageNum) {
    case 1: updatePage1_MainScreen(); break;
    case 2: updatePage2_16Cells();    break;
    case 3: updatePage3_CellDetail(); break;
    case 4: updatePage4_Datalog();    break;
    case 5: updatePage5_Settings();   break;
  }
}

void handleWinstarTouchEvent(uint8_t page, uint8_t btnIdx) {
  if (page == 1) {
    if (btnIdx == 9) goToWinstarPage(2);
    else if (btnIdx == 10) goToWinstarPage(3);
    else if (btnIdx == 11) goToWinstarPage(4);
    else if (btnIdx == 12) goToWinstarPage(5);
  } else if (page == 2) {
    if (btnIdx == 24) goToWinstarPage(1);
    else if (btnIdx == 26) goToWinstarPage(3);
    else if (btnIdx == 27) goToWinstarPage(4);
    else if (btnIdx == 28) goToWinstarPage(5);
  } else if (page == 3) {
    if (btnIdx == 19) goToWinstarPage(1);
    else if (btnIdx == 20) goToWinstarPage(2);
    else if (btnIdx == 22) goToWinstarPage(4);
    else if (btnIdx == 23) goToWinstarPage(5);
  } else if (page == 4) {
    if (btnIdx == 23) { for (int i = 0; i < logCount; i++) datalogList[i].status = "Da xu ly"; updatePage4_Datalog(); }
    else if (btnIdx == 24) { logCount = 0; updatePage4_Datalog(); }
    else if (btnIdx == 25) goToWinstarPage(1);
    else if (btnIdx == 26) goToWinstarPage(2);
    else if (btnIdx == 27) goToWinstarPage(3);
    else if (btnIdx == 29) goToWinstarPage(5);
  } else if (page == 5) {
    if (btnIdx == 0)      { cfgCOV = 3.650f; cfgCUV = 2.500f; updatePage5_Settings(); }
    else if (btnIdx == 1) { cfgCOV = 4.200f; cfgCUV = 3.000f; updatePage5_Settings(); }
    else if (btnIdx == 2) { cfgCOV = 2.800f; cfgCUV = 1.800f; updatePage5_Settings(); }
    else if (btnIdx == 3) goToWinstarPage(1);
    else if (btnIdx == 4) goToWinstarPage(2);
    else if (btnIdx == 5) goToWinstarPage(3);
    else if (btnIdx == 6) goToWinstarPage(4);
    else if (btnIdx == 8) {
      saveBmsSettings(netState == NET_ONLINE);
      if (bmsState == BMS_STATE_WAKEUP) configureAndStartBQ76952();
      for (uint8_t idx = 9; idx <= 12; idx++) setWinstarWidgetColor(idx, 0x07E0, false);
    }
  }
}

void pollWinstarSerial() {
  while (Serial.available() >= 6) {
    if (Serial.peek() == 0xAA) {
      uint8_t buf[6];
      Serial.readBytes(buf, 6);
      if (buf[1] == 0x55 && buf[2] == 0x03 && buf[5] == 0x0D) handleWinstarTouchEvent(buf[3], buf[4]);
    } else Serial.read();
  }
}
// =========================================================================
// 8. XỬ LÝ TÍN HIỆU ALERT (GPIO 34), NÚT BTN (GPIO 35) & KHÔI PHỤC IO19
// =========================================================================
void handleHardwareSignalsAndButtons() {
  unsigned long now = millis();

  // --- A. KIỂM TRA CHÂN ALERT TỪ BQ76952 (GPIO 34 TÍCH CỰC MỨC LOW) ---
  if (bmsState == BMS_STATE_WAKEUP && bqConnected && digitalRead(BQ_ALERT_PIN) == LOW) {
    inspectBQ76952AlertRegisters(); // Tạm dừng ngay BQ76952, đọc lỗi qua I2C & báo lên Status
  }

  // --- B. KIỂM TRA NÚT IO19 (NHẤN 1 LẦN: KHÔI PHỤC LỖI | GIỮ 5S: GHÉP NỐI) ---
  int io19Reading = digitalRead(BTN_IO19_PIN);
  if (io19Reading == LOW && lastIo19State == HIGH) {
    io19PressStart = now;
    io19LongPressHandled = false;
  }

  // Nhấn giữ IO19 đủ 5 giây -> Vào chế độ ghép nối Server/App
  if (io19Reading == LOW && !io19LongPressHandled && (now - io19PressStart >= 5000)) {
    io19LongPressHandled = true;
    netState = NET_PAIRING_WAIT;
    pairingSuccessFlag = false;
    pairingFailFlag = false;
    pairingStartTime = now;
    digitalWrite(LED_YELLOW_PIN, LOW);
    enableWifiAndBle();
    showPairingScreenOnWinstar();
  }

  // Nhấn nhả IO19 1 lần (50ms -> 1500ms) -> Xác nhận khôi phục lỗi BQ76952
  if (io19Reading == HIGH && lastIo19State == LOW && !io19LongPressHandled) {
    unsigned long pressDur = now - io19PressStart;
    if (pressDur >= 50 && pressDur < 1500 && bmsState == BMS_STATE_FAULT) {
      // Xóa cờ báo động Alarm Status (0x62) & Safety Status để chân ALERT nhả về mức HIGH
      writeBQ76952DirectWord(0x62, 0xFFFF);
      writeBQ76952Subcommand(0x0002);
      delay(5);

      // Cấu hình lại và mở FET hoạt động trở lại
      configureAndStartBQ76952();
      bmsState = BMS_STATE_WAKEUP;
      activeFaultText = "";
      digitalWrite(LED_RED_PIN, HIGH);
      digitalWrite(LED_GREEN_PIN, LOW);

      for (int i = 0; i < logCount; i++) datalogList[i].status = "Da xu ly";
      printDebugScreen("DA KHOI PHUC LOI QUA NUT IO19");
      if (currentPage == 1) updatePage1_MainScreen();
      else if (currentPage == 4) updatePage4_Datalog();
    }
  }
  lastIo19State = io19Reading;

  if (netState == NET_PAIRING_WAIT) return;

  // --- C. KIỂM TRA CHÂN BTN_LOW (GPIO 35: MỨC THẤP = TURNOFF, MỨC CAO = WAKEUP) ---
  int wakeBtnReading = digitalRead(BTN_WAKE_PIN);
  if (wakeBtnReading == HIGH && lastWakeBtnState == LOW) {
    delay(30); // Chống dội phím cơ học S1
    if (digitalRead(BTN_WAKE_PIN) == HIGH && bmsState == BMS_STATE_TURNOFF) {
      // Chỉ khi nhận mức cao từ BTN mới bắt đầu cài đặt và mở FET BQ76952
      configureAndStartBQ76952();
      bmsState = BMS_STATE_WAKEUP;
      digitalWrite(LED_RED_PIN, HIGH);
      digitalWrite(LED_GREEN_PIN, LOW);
      if (currentPage == 1) updatePage1_MainScreen();
    }
  }
  lastWakeBtnState = wakeBtnReading;
}

// =========================================================================
// 9. KHỞI TẠO & VÒNG LẶP VẬN HÀNH CHÍNH
// =========================================================================
void setup() {
  Serial.begin(WINSTAR_BAUD);
  RS485Serial.begin(RS485_BAUD, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);

  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  digitalWrite(LED_GREEN_PIN, HIGH); // Tắt đèn xanh ban đầu
  digitalWrite(LED_RED_PIN, LOW);    // Sáng đèn đỏ báo BMS turnoff (FET khóa an toàn)
  digitalWrite(LED_YELLOW_PIN, HIGH);

  pinMode(RS485_RE_PIN, OUTPUT);
  pinMode(RS485_DE_PIN, OUTPUT);
  digitalWrite(RS485_RE_PIN, LOW);
  digitalWrite(RS485_DE_PIN, LOW);

  pinMode(BQ_ALERT_PIN, INPUT);
  pinMode(BTN_WAKE_PIN, INPUT);
  pinMode(BTN_IO19_PIN, INPUT_PULLUP);

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(100000);

  // Khóa cứng toàn bộ FET ngay khi cấp nguồn, KHÔNG tự ý cài đặt hay mở BQ76952
  writeBQ76952Subcommand(0x0095); // ALL_FETS_OFF
  bmsState = BMS_STATE_TURNOFF;

  // Tạo định danh thiết bị theo Mục 5 tài liệu: Tên sẽ là BMS + mã MAC của phần cứng
  uint64_t chipMac = ESP.getEfuseMac();
  uint8_t mac[6];
  for (int i = 0; i < 6; i++) mac[i] = (chipMac >> (i * 8)) & 0xFF;
  char macBuf[32];
  snprintf(macBuf, sizeof(macBuf), "BMS%02X%02X%02X%02X%02X%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  deviceMacId    = String(macBuf);
  mqttTopicData  = "austec/" + deviceMacId + "/telemetry";
  mqttTopicCmd   = "austec/" + deviceMacId + "/command";
  mqttTopicAlert = "austec/" + deviceMacId + "/alert";
  mqttTopicAck   = "austec/" + deviceMacId + "/ack";

  loadBmsSettings();
  if (netState == NET_ONLINE) enableWifiAndBle();
  else disableWifiAndBleCompletely();

  // Hiệu ứng khởi động 3 giây tại Page 0
  goToWinstarPage(0);
  printDebugScreen("ID: " + deviceMacId + " | CHO NUT BTN WAKEUP");
  for (int i = 0; i < 30; i++) {
    uint8_t scaleCmd[] = {0xAA, 0x55, 0x06, 0x00, (uint8_t)(i * 4), 0x0D};
    Serial.write(scaleCmd, 6);
    delay(100);
  }
  goToWinstarPage(1);
}

void loop() {
  handleHardwareSignalsAndButtons();

  // TRẠNG THÁI CHẾ ĐỘ GHÉP NỐI SERVER/APP
  if (netState == NET_PAIRING_WAIT) {
    if (pairingSuccessFlag) {
      drawFillRectWinstar(40, 72, 400, 24, 0x0842);
      drawTextCoordWinstar(52, 74, 0x07E0, "GHEP NOI THANH CONG! DANG VAO MAN HINH CHINH...");
      netState = NET_ONLINE;
      digitalWrite(LED_YELLOW_PIN, HIGH);
      saveBmsSettings(true);
      configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
      if (mqttClient.connect(deviceMacId.c_str())) {
        mqttClient.subscribe(mqttTopicCmd.c_str());
        mqttClient.publish(mqttTopicData.c_str(), buildBmsJsonPayload().c_str());
      }
      delay(1500);
      goToWinstarPage(1); // Tự động chuyển về màn hình chính
    } 
    else if (pairingFailFlag || (millis() - pairingStartTime >= PAIRING_TIMEOUT_MS)) {
      drawFillRectWinstar(40, 72, 400, 24, 0x0842);
      drawTextCoordWinstar(52, 74, 0xF800, "GHEP NOI THAT BAI! QUAY VE CHE DO OFFLINE...");
      netState = NET_OFFLINE;
      digitalWrite(LED_YELLOW_PIN, HIGH);
      saveBmsSettings(false);
      disableWifiAndBleCompletely();
      delay(1500);
      goToWinstarPage(1); // Tự động chuyển về màn hình chính
    }
    return;
  }

  // VẬN HÀNH BÌNH THƯỜNG
  pollWinstarSerial();
  pollModbusRS485();

  unsigned long now = millis();
  if (now - lastBqMillis >= 250) {
    lastBqMillis = now;
    updateSystemTelemetry();
  }

  if (netState == NET_ONLINE) {
    if (WiFi.status() == WL_CONNECTED) {
      if (!mqttClient.connected()) {
        if (mqttClient.connect(deviceMacId.c_str())) mqttClient.subscribe(mqttTopicCmd.c_str());
      } else mqttClient.loop();
    }
    if (now - lastMqttMillis >= 1000) {
      lastMqttMillis = now;
      String payload = buildBmsJsonPayload();
      if (mqttClient.connected()) mqttClient.publish(mqttTopicData.c_str(), payload.c_str());
      if (bleActive && bleClientJoined && pTelemetryChar != nullptr) {
        pTelemetryChar->setValue(payload.c_str());
        pTelemetryChar->notify();
      }
    }
  }

  if (currentPage == 4 && hasNewFaultEvent) {
    hasNewFaultEvent = false;
    updatePage4_Datalog();
  }
  if (now - lastUiMillis >= 300) {
    lastUiMillis = now;
    switch (currentPage) {
      case 1: updatePage1_MainScreen(); break;
      case 2: updatePage2_16Cells();    break;
      case 3: updatePage3_CellDetail(); break;
    }
  }
}