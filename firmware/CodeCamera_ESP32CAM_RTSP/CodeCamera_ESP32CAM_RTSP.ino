#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <PubSubClient.h> // Duy trì kết nối nhận lệnh pub/sub liên tục trên cổng 1883
#include "FS.h"
#include "SD_MMC.h"
#include "esp_camera.h"
#include <NimBLEDevice.h>  // Thư viện NimBLE siêu nhẹ giải phóng bộ nhớ IRAM
#include <esp_mac.h>
#include <time.h>
#include "esp_log.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

#if !defined(BOARD_HAS_PSRAM)
#define BOARD_HAS_PSRAM
#endif

struct JpegParsedInfo {
    uint16_t width;
    uint16_t height;
    uint8_t type; // 0 = 4:2:2 cho OV2640, 1 = 4:2:0
    const uint8_t* q0;
    const uint8_t* q1;
    const uint8_t* scanData;
    size_t scanLen;
};

// Prototype trước để Arduino preprocessor không phát sinh lỗi forward declaration
bool parseJpegBuffer(const uint8_t* buf, size_t totalLen, JpegParsedInfo* out);

// --- CẤU HÌNH BỘ ĐỆM MQTT CHỐNG TRÀN BUFFER ẢNH MẠNG ---
#define MQTT_MAX_PACKET_SIZE 60000 

// --- CẤU HÌNH UUID CHO BLUETOOTH BLE PROVISIONING ---
#define SERVICE_UUID        "4FAFC201-1FB5-459E-8FCC-C5C9C331914B"
#define CHARACTERISTIC_UUID "BEA5C122-3D83-11ED-A261-0242AC120002"

// --- SƠ ĐỒ CHÂN PHẦN CỨNG BẢN QUYỀN BOARD AI-THINKER ESP32-CAM ---
#define PWDN_GPIO_NUM  32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM   0
#define SIOD_GPIO_NUM  26
#define SIOC_GPIO_NUM  27
#define Y9_GPIO_NUM    35
#define Y8_GPIO_NUM    34
#define Y7_GPIO_NUM    39
#define Y6_GPIO_NUM    36
#define Y5_GPIO_NUM    21
#define Y4_GPIO_NUM    19
#define Y3_GPIO_NUM    18
#define Y2_GPIO_NUM     5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM  23
#define PCLK_GPIO_NUM  22

// --- ĐỊNH NGHĨA NGOẠI VI THEO SƠ ĐỒ CHÂN AN TOÀN TUYỆT ĐỐI ---
#define PIN_LED_STATUS   4  // Đèn Flash mặt trước (GPIO 4) làm đèn báo kết nối Online

// --- CẤU HÌNH ĐỒNG BỘ TỪ FILE .env (Tự cập nhật khi chạy .\scripts\sync-env.ps1) ---
// [LOCAL TEST / VPS]: Giá trị mặc định lúc biên dịch lấy từ austec-iot-platform/.env.
// Khi đổi Wi-Fi hoặc chuyển lên VPS, Backend sẽ tự gửi IP/Domain mới trong .env xuống qua MQTT (không cần nạp lại mạch nếu đã online).
#define MEDIAMTX_HOST        "192.168.100.3"
#define MEDIAMTX_PORT        8554
#define MEDIAMTX_PATH_PREFIX "/raw/" // Đẩy luồng MJPEG RTSP vào /raw/<device_name>, MediaMTX chuyển mã H.264 sang /live/<device_name>
#define DEFAULT_MQTT_HOST    "broker.emqx.io"
#define DEFAULT_MQTT_PORT    1883

// --- KHAI BÁO CÁC ĐỐI TƯỢNG HỆ THỐNG BIẾN TOÀN CỤC ---
Preferences preferences;
WiFiClient espClient;
PubSubClient mqttClient(espClient); // Đối tượng duy trì cổng lệnh 1883
WebServer webServer(80);
WiFiClient rtspClient;              // Kết nối TCP Client chủ động đẩy RTSP PUSH lên MediaMTX

NimBLEServer *pServer = NULL;
bool ble_running = false;
bool isConfigured = false;
bool hardwareInitialized = false;
bool rtspStarted = false;
bool sd_card_available = false; 

// Biến cờ chuyển mạch: Kiểm soát việc đóng mở cổng phát mạng 8554 động từ xa
bool allow_rtsp = false; 

String wifi_ssid = "", wifi_pass = "", mqtt_server = "";
String rtsp_host = MEDIAMTX_HOST;
int rtsp_port = MEDIAMTX_PORT;
String device_name = "";

String mqtt_topic_photo = "";
String mqtt_topic_cmd = "";

unsigned long lastWifiReconnectAttempt = 0;
const unsigned long WIFI_RECONNECT_INTERVAL = 5 * 60 * 1000; 
uint32_t lastSDFrame = 0;

void setLedStatus(bool turnOn) {
    digitalWrite(PIN_LED_STATUS, turnOn ? HIGH : LOW);
}

// Hàm khởi tạo Driver cảm biến Camera OV2640 chuẩn mã nguồn mở
bool initCameraHardware() {
    if (hardwareInitialized) return true;

    static camera_config_t config;
    memset(&config, 0, sizeof(config));
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;   config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;   config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;   config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;   config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM; config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM; config.pin_href = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM; config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM; config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 10000000; // 10MHz: Triệt tiêu hoàn toàn nhiễu RF bức xạ vào anten Wi-Fi AI-Thinker và chống tràn DMA
    config.frame_size = FRAMESIZE_VGA; // Đúng chuẩn VGA 640x480 đồng bộ kích thước DMA
    config.pixel_format = PIXFORMAT_JPEG;
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY; // Ổn định tuyệt đối theo chuẩn driver esp32-camera
    config.fb_location = CAMERA_FB_IN_PSRAM;
    config.jpeg_quality = 18; // Nén nhẹ ~10-14KB/frame để Wi-Fi truyền cực nhanh không nghẽn TCP
    config.fb_count = 2; // Double buffer chuẩn của esp32-camera
    config.jpeg_buffer_size = 0;
    
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf(" - LỖI: Không thể khởi tạo Camera! Mã lỗi: 0x%x\n", err);
        return false;
    }

    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        s->set_quality(s, 18);
    }

    // Chờ cảm biến ổn định xung VSYNC sau khi chuyển sang độ phân giải VGA
    delay(200);
    // Xả sạch các khung hình chuyển tiếp ban đầu
    for (int i = 0; i < 3; i++) {
        delay(30);
        camera_fb_t *f = esp_camera_fb_get();
        if (f) esp_camera_fb_return(f);
    }

    hardwareInitialized = true;
    Serial.println(F("-> [PHẦN CỨNG]: Khởi tạo phần cứng cảm biến Camera OV2640 THÀNH CÔNG."));
    delay(50);
    camera_fb_t *testFb = esp_camera_fb_get();
    if (testFb) {
        Serial.printf("-> [TEST CAM]: LẤY KHUNG HÌNH THÀNH CÔNG! Dung lượng=%d bytes, w=%d, h=%d\n",
                      testFb->len, testFb->width, testFb->height);
        esp_camera_fb_return(testFb);
    } else {
        Serial.println(F("-> [TEST CAM]: testFb trả về NULL!"));
    }
    return true;
}
// Helper SFINAE gắn callback tương thích cả NimBLE 2.x (con trỏ) và NimBLE 3.0.0-dev (tham chiếu)
template <typename Chr, typename Cb>
auto attachBleCallbacks(Chr* chr, Cb* cb, int) -> decltype(chr->setCallbacks(*cb), void()) {
    chr->setCallbacks(*cb);
}
template <typename Chr, typename Cb>
void attachBleCallbacks(Chr* chr, Cb* cb, long) {
    chr->setCallbacks(cb);
}

class MyBLECallbacks: public NimBLECharacteristicCallbacks {
    void handleBleConfigWrite(NimBLECharacteristic *pCharacteristic, const String& rxValue) {
        if (rxValue.length() > 0) {
            int firstComma = rxValue.indexOf(','); 
            int secondComma = rxValue.indexOf(',', firstComma + 1);
            if(firstComma != -1 && secondComma != -1) {
                pCharacteristic->setValue("SUCCESS"); pCharacteristic->notify(); delay(500);
                String s = rxValue.substring(0, firstComma);
                String p = rxValue.substring(firstComma + 1, secondComma);
                String m = rxValue.substring(secondComma + 1);
                
                preferences.begin("iot-config", false);
                preferences.putString("ssid", s); preferences.putString("pass", p); preferences.putString("mqtt", m);
                preferences.end();
                
                Serial.println(F("Đã nhận cấu hình từ BLE. Thiết bị đang khởi động lại..."));
                delay(1000); ESP.restart();
            }
        }
    }
public:
    // NimBLE 2.x
    void onWrite(NimBLECharacteristic *pCharacteristic, NimBLEConnInfo& connInfo) {
        handleBleConfigWrite(pCharacteristic, String(pCharacteristic->getValue().c_str()));
    }
    // NimBLE 3.0.0-dev (lấy dữ liệu qua tham số value trước khi m_value được cập nhật)
    uint8_t onWrite(NimBLECharacteristic *pCharacteristic, NimBLEAttValue& value, NimBLEConnInfo& connInfo) {
        handleBleConfigWrite(pCharacteristic, String(value.c_str()));
        return 0;
    }
};

void thietlap_BLE() {
    if (ble_running) return;
    NimBLEDevice::init(device_name.c_str());
    pServer = NimBLEDevice::createServer();
    pServer->advertiseOnDisconnect(true); // NimBLE 3.0 mặc định false: tự phát lại nếu app ngắt kết nối thử lại
    NimBLEService *pService = pServer->createService(SERVICE_UUID);
    NimBLECharacteristic *pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
    );
    static MyBLECallbacks bleCallbacks;
    attachBleCallbacks(pCharacteristic, &bleCallbacks, 0);
    pService->start();

    // NimBLE 3.0: phải gắn rõ Service UUID vào Advertising và Tên thiết bị vào Scan Response
    NimBLEAdvertising *pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->reset();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->enableScanResponse(true);
    pAdvertising->setName(device_name.c_str());
    pAdvertising->setPreferredParams(0x06, 0x12);
    pAdvertising->start();

    ble_running = true;
    Serial.printf("-> Đã BẬT mạng Bluetooth NimBLE thích ứng [%s] (Chờ ghép nối).\n", device_name.c_str());
}

void tat_BLE() {
    if (!ble_running) return;
    NimBLEDevice::deinit(true); ble_running = false; pServer = NULL;
    Serial.println(F("-> Đã TẮT VĨNH VIỄN mạng Bluetooth BLE để tối ưu RAM cho hệ thống."));
}

void startDualProvisioning() {
    WiFi.mode(WIFI_AP);
    WiFi.softAP(device_name.c_str(), "12345678");
    webServer.on("/save", []() {
        if (webServer.hasArg("ssid") && webServer.hasArg("pass") && webServer.hasArg("mqtt")) {
            preferences.begin("iot-config", false);
            preferences.putString("ssid", webServer.arg("ssid"));
            preferences.putString("pass", webServer.arg("pass"));
            preferences.putString("mqtt", webServer.arg("mqtt"));
            preferences.end();
            webServer.send(200, "text/plain", "OK");
            delay(1000);
            ESP.restart();
        } else {
            webServer.send(400, "text/plain", "ERR");
        }
    });
    webServer.begin();
    thietlap_BLE();
}

void startHardwareAndRTSP() {
    if (!hardwareInitialized) {
        initCameraHardware();
    }

    static bool sd_checked = false;
    if (!sd_checked) {
        sd_checked = true;
        Serial.println(F("-> [PHẦN CỨNG] Đang khởi tạo kết nối mạch Thẻ SD ở chế độ 1-BIT BUS..."));
        if (!SD_MMC.begin("/sdcard", true)) { // Chạy 1-bit bus giải phóng chân 13 độc lập hoàn toàn làm nút bấm
            Serial.println(F(" - Mạch khe cắm thẻ SD: KHÔNG TÌM THẤY THẺ VẬT LÝ TRONG KHE CẮM."));
            sd_card_available = false;
            SD_MMC.end(); // Giải phóng bus SDMMC để không xung đột với các chân khác
        } else {
            Serial.println(F(" - Mạch khe cắm thẻ SD: ĐÃ SẴN SÀNG Ở CHẾ ĐỘ 1-BIT BUS THƯƠNG MẠI."));
            sd_card_available = true;
        }
    }
}
// --- TRẠNG THÁI PHIÊN ĐẨY LUỒNG RTSP PUSH LÊN MEDIAMTX (KHÔNG FALLBACK) ---
String rtspSessionId = "";
int rtspCseq = 0;
uint16_t rtspRtpSeq = 0;
uint32_t rtspRtpTimestamp = 0;
uint32_t lastRtspConnectAttempt = 0;
bool firstFrameLogged = false;

String getRtspStreamUrl() {
    return "rtsp://" + rtsp_host + ":" + String(rtsp_port) + String(MEDIAMTX_PATH_PREFIX) + device_name;
}

// Đọc phản hồi RTSP từ MediaMTX: trả true CHỈ KHI nhận đúng "200 OK" (không fallback khi lỗi)
bool sendRtspRequestAndWait200(const String& reqRaw) {
    if (!rtspClient.connected()) return false;
    rtspClient.print(reqRaw);

    unsigned long startWait = millis();
    String resp = "";
    while (millis() - startWait < 3000) {
        while (rtspClient.available()) {
            resp += (char)rtspClient.read();
            if (resp.endsWith("\r\n\r\n") || resp.indexOf("\r\n\r\n") >= 0) {
                int firstLineEnd = resp.indexOf('\n');
                String statusLine = (firstLineEnd > 0) ? resp.substring(0, firstLineEnd) : resp;
                statusLine.trim();

                // Trích xuất Session ID nếu MediaMTX cấp phát ở bước SETUP
                int sessIdx = resp.indexOf("Session:");
                if (sessIdx < 0) sessIdx = resp.indexOf("session:");
                if (sessIdx >= 0) {
                    int lineEnd = resp.indexOf('\n', sessIdx);
                    String sessVal = (lineEnd > 0) ? resp.substring(sessIdx + 8, lineEnd) : resp.substring(sessIdx + 8);
                    int semiIdx = sessVal.indexOf(';');
                    if (semiIdx >= 0) sessVal = sessVal.substring(0, semiIdx);
                    sessVal.trim();
                    if (sessVal.length() > 0) rtspSessionId = sessVal;
                }

                if (statusLine.indexOf("200 OK") >= 0) {
                    Serial.printf("<- [RTSP PHẢN HỒI]: %s\n", statusLine.c_str());
                    return true;
                }
                Serial.printf("[RTSP ERROR]: MediaMTX từ chối -> %s\n", statusLine.c_str());
                return false;
            }
        }
        if (!rtspClient.connected()) break;
        delay(5);
    }
    Serial.println(F("[RTSP ERROR]: Quá thời gian chờ phản hồi RTSP 200 OK từ MediaMTX."));
    return false;
}

void stopRtspPushSession() {
    if (rtspClient.connected()) {
        if (rtspSessionId.length() > 0) {
            String teardown = "TEARDOWN " + getRtspStreamUrl() + " RTSP/1.0\r\nCSeq: " + String(++rtspCseq) + "\r\nSession: " + rtspSessionId + "\r\n\r\n";
            rtspClient.print(teardown);
        }
        rtspClient.stop();
    }
    rtspStarted = false;
    rtspSessionId = "";
    firstFrameLogged = false;
    setLedStatus(false); // Tắt đèn Flash mặt trước
}

// Mở kết nối RTSP Client PUSH (OPTIONS -> ANNOUNCE -> SETUP -> RECORD) tới MediaMTX
bool startRtspPushSession() {
    rtspClient.stop();
    rtspSessionId = "";
    rtspCseq = 0;

    Serial.printf("-> [RTSP PUSH]: Đang kết nối tới MediaMTX %s:%d (%s%s)...\n",
                  rtsp_host.c_str(), rtsp_port, MEDIAMTX_PATH_PREFIX, device_name.c_str());

    if (!rtspClient.connect(rtsp_host.c_str(), rtsp_port, 2500)) {
        Serial.printf("[RTSP ERROR]: Không thể mở TCP tới MediaMTX %s:%d (Kiểm tra Docker/Firewall/.env, KHÔNG fallback).\n",
                      rtsp_host.c_str(), rtsp_port);
        return false;
    }
    rtspClient.setNoDelay(true);

    String streamUrl = getRtspStreamUrl();

    // 1. OPTIONS
    String reqOptions = "OPTIONS " + streamUrl + " RTSP/1.0\r\nCSeq: " + String(++rtspCseq) + "\r\nUser-Agent: Austec-ESP32CAM\r\n\r\n";
    if (!sendRtspRequestAndWait200(reqOptions)) { stopRtspPushSession(); return false; }

    // 2. ANNOUNCE (Khai báo luồng video JPEG chuẩn RFC 2435 kèm framesize chuẩn RFC 6064)
    String sdp = "v=0\r\no=- 1 1 IN IP4 " + WiFi.localIP().toString() +
                 "\r\ns=Austec AI Camera\r\nt=0 0\r\n" +
                 "m=video 0 RTP/AVP 26\r\nc=IN IP4 0.0.0.0\r\n" +
                 "a=rtpmap:26 JPEG/90000\r\n" +
                 "a=control:trackID=0\r\n" +
                 "a=framesize:26 640-480\r\n";
    String reqAnnounce = "ANNOUNCE " + streamUrl + " RTSP/1.0\r\nCSeq: " + String(++rtspCseq) +
                         "\r\nContent-Type: application/sdp\r\nContent-Length: " + String(sdp.length()) + "\r\n\r\n" + sdp;
    if (!sendRtspRequestAndWait200(reqAnnounce)) { stopRtspPushSession(); return false; }

    // 3. SETUP (Chế độ đẩy PUSH RECORD qua RTP/AVP/TCP Interleaved kênh 0-1)
    String reqSetup = "SETUP " + streamUrl + "/trackID=0 RTSP/1.0\r\nCSeq: " + String(++rtspCseq) +
                      "\r\nTransport: RTP/AVP/TCP;unicast;interleaved=0-1;mode=record\r\n\r\n";
    if (!sendRtspRequestAndWait200(reqSetup)) { stopRtspPushSession(); return false; }

    // 4. RECORD (Chính thức kích hoạt phiên đẩy luồng)
    String reqRecord = "RECORD " + streamUrl + " RTSP/1.0\r\nCSeq: " + String(++rtspCseq) +
                       "\r\nSession: " + rtspSessionId + "\r\nRange: npt=0.000-\r\n\r\n";
    if (!sendRtspRequestAndWait200(reqRecord)) { stopRtspPushSession(); return false; }

    Serial.printf("-> [RTSP PUSH]: Bắt tay 200 OK THÀNH CÔNG! Đang phát luồng về: %s\n", streamUrl.c_str());
    rtspStarted = true;
    setLedStatus(true); // 🟢 SÁNG ĐÈN FLASH MẶT TRƯỚC
    return true;
}

// Ghi socket TCP tin cậy tuyệt đối có cơ chế chờ giải phóng TX buffer
bool safeWriteRtsp(const uint8_t* data, size_t len) {
    if (!rtspClient.connected()) return false;
    size_t sent = 0;
    unsigned long start = millis();
    while (sent < len) {
        int n = rtspClient.write(data + sent, len - sent);
        if (n > 0) {
            sent += n;
            start = millis(); // Reset mốc timeout khi luồng dữ liệu đang truyền đi trơn tru
        } else {
            if (!rtspClient.connected() || millis() - start > 2000) {
                return false;
            }
            delay(1);
        }
    }
    return true;
}

// Phân tách khung hình JPEG: lấy DQT qtables và dải dữ liệu entropy scan theo chuẩn RFC 2435
bool parseJpegBuffer(const uint8_t* buf, size_t totalLen, JpegParsedInfo* out) {
    if (!buf || totalLen < 64) return false;
    out->width = 640;
    out->height = 480;
    out->type = 0; // 0 = 4:2:2 cho OV2640
    out->q0 = nullptr;
    out->q1 = nullptr;
    out->scanData = nullptr;
    out->scanLen = 0;

    size_t scanStart = 0;
    size_t scanEnd = totalLen;

    for (size_t i = 0; i < totalLen - 1; ) {
        if (buf[i] != 0xFF) { i++; continue; }
        while (i + 1 < totalLen && buf[i + 1] == 0xFF) i++;
        uint8_t marker = buf[i + 1];
        if (marker == 0xD8) { i += 2; continue; } // SOI
        if (marker == 0xD9) { scanEnd = i; break; } // EOI
        if (marker == 0x00 || (marker >= 0xD0 && marker <= 0xD7)) { i += 2; continue; }
        if (i + 3 >= totalLen) break;

        uint16_t segLen = ((uint16_t)buf[i + 2] << 8) | buf[i + 3];
        size_t segDataStart = i + 4;
        size_t segEnd = i + 2 + segLen;
        if (segEnd > totalLen) break;

        if (marker == 0xDB) { // DQT (Quantization Tables)
            size_t p = segDataStart;
            while (p < segEnd) {
                uint8_t pqTq = buf[p++];
                uint8_t pq = (pqTq >> 4) & 0x0F;
                uint8_t tq = pqTq & 0x0F;
                size_t tableSize = (pq == 0) ? 64 : 128;
                if (p + tableSize <= segEnd) {
                    if (tq == 0) out->q0 = &buf[p];
                    else if (tq == 1) out->q1 = &buf[p];
                }
                p += tableSize;
            }
        } else if (marker == 0xC0) { // SOF0 (Baseline Frame info)
            out->height = ((uint16_t)buf[segDataStart + 1] << 8) | buf[segDataStart + 2];
            out->width = ((uint16_t)buf[segDataStart + 3] << 8) | buf[segDataStart + 4];
            uint8_t hvY = buf[segDataStart + 7]; // Y component sampling factor
            out->type = (hvY == 0x21) ? 0 : 1; // 0 = 4:2:2, 1 = 4:2:0
        } else if (marker == 0xDA) { // SOS (Start of Scan)
            scanStart = segEnd;
            scanEnd = totalLen;
            if (totalLen >= 2 && buf[totalLen - 2] == 0xFF && buf[totalLen - 1] == 0xD9) {
                scanEnd = totalLen - 2;
            } else {
                for (int k = (int)totalLen - 2; k >= (int)scanStart; k--) {
                    if (buf[k] == 0xFF && buf[k + 1] == 0xD9) {
                        scanEnd = (size_t)k;
                        break;
                    }
                }
            }
            break;
        }
        i = segEnd;
    }

    if (scanStart == 0 || scanEnd <= scanStart) {
        Serial.printf("[PARSE ERR]: scanStart=%d, scanEnd=%d, totalLen=%d\n", scanStart, scanEnd, totalLen);
        return false;
    }
    if (!out->q0) {
        Serial.println(F("[PARSE ERR]: q0 is NULL"));
        return false;
    }
    if (!out->q1) out->q1 = out->q0; // Fallback nếu chỉ có 1 bảng DQT chung

    out->scanData = &buf[scanStart];
    out->scanLen = scanEnd - scanStart;
    return true;
}

// Đóng gói 1 frame JPEG từ OV2640 chuẩn xác 100% theo RFC 2435 và đẩy toàn bộ qua TCP Interleaved tới MediaMTX trong 1 burst duy nhất
bool sendRtspJpegFrame(camera_fb_t *fb) {
    if (!fb || !fb->buf || fb->len < 64 || !rtspClient.connected()) return false;

    JpegParsedInfo info;
    if (!parseJpegBuffer(fb->buf, fb->len, &info)) {
        return false;
    }

    static uint32_t rtpTimestampCounter = 0;
    rtspRtpTimestamp = rtpTimestampCounter;
    rtpTimestampCounter += 6000; // Chuẩn đồng hồ RTP 90kHz (90000 / 15 FPS = 6000 ticks/frame) theo RFC 2435

    const size_t maxPayload = 1360;
    size_t offset = 0;
    const uint8_t* scan = info.scanData;
    size_t scanTotal = info.scanLen;

    // Cấp phát 1 buffer gom toàn bộ các mảnh RTP của 1 frame trong PSRAM để gửi 1 lần (TCP Streaming Burst)
    static uint8_t* rtpFrameBuffer = nullptr;
    if (!rtpFrameBuffer) {
        if (psramFound()) {
            rtpFrameBuffer = (uint8_t*)ps_malloc(65536);
        } else {
            rtpFrameBuffer = (uint8_t*)malloc(32768);
        }
    }
    if (!rtpFrameBuffer) return false;

    size_t bufWriteIdx = 0;

    while (offset < scanTotal) {
        bool isFirst = (offset == 0);
        size_t qtLen = isFirst ? (64 + 64) : 0;
        size_t maxChunk = maxPayload - (isFirst ? (4 + qtLen) : 0);
        size_t chunkSize = scanTotal - offset;
        bool isLast = false;
        if (chunkSize > maxChunk) {
            chunkSize = maxChunk;
        } else {
            isLast = true;
        }

        size_t rtpBodyLen = 12 + 8 + (isFirst ? (4 + 128) : 0) + chunkSize;

        if (bufWriteIdx + 4 + rtpBodyLen > 65530) {
            break; // Bảo vệ chống tràn buffer
        }

        // 1. TCP Interleaved Header ($ <channel 0> <length 2 bytes>)
        rtpFrameBuffer[bufWriteIdx++] = '$';
        rtpFrameBuffer[bufWriteIdx++] = 0;
        rtpFrameBuffer[bufWriteIdx++] = (rtpBodyLen >> 8) & 0xFF;
        rtpFrameBuffer[bufWriteIdx++] = rtpBodyLen & 0xFF;

        // 2. RTP Header (12 bytes - RFC 3550)
        rtpFrameBuffer[bufWriteIdx++] = 0x80; // Version 2
        rtpFrameBuffer[bufWriteIdx++] = (isLast ? 0x80 : 0x00) | 26; // Marker bit 1 ở mảnh cuối + PT=26 (JPEG)
        rtpFrameBuffer[bufWriteIdx++] = (rtspRtpSeq >> 8) & 0xFF;
        rtpFrameBuffer[bufWriteIdx++] = rtspRtpSeq & 0xFF;
        rtspRtpSeq++;

        rtpFrameBuffer[bufWriteIdx++] = (rtspRtpTimestamp >> 24) & 0xFF;
        rtpFrameBuffer[bufWriteIdx++] = (rtspRtpTimestamp >> 16) & 0xFF;
        rtpFrameBuffer[bufWriteIdx++] = (rtspRtpTimestamp >> 8) & 0xFF;
        rtpFrameBuffer[bufWriteIdx++] = rtspRtpTimestamp & 0xFF;

        rtpFrameBuffer[bufWriteIdx++] = 0x12; rtpFrameBuffer[bufWriteIdx++] = 0x34; 
        rtpFrameBuffer[bufWriteIdx++] = 0x56; rtpFrameBuffer[bufWriteIdx++] = 0x78; // SSRC

        // 3. RFC 2435 JPEG Header (8 bytes)
        rtpFrameBuffer[bufWriteIdx++] = 0; // Type-specific
        rtpFrameBuffer[bufWriteIdx++] = (offset >> 16) & 0xFF; // Fragment offset (24-bit)
        rtpFrameBuffer[bufWriteIdx++] = (offset >> 8) & 0xFF;
        rtpFrameBuffer[bufWriteIdx++] = offset & 0xFF;
        rtpFrameBuffer[bufWriteIdx++] = info.type; // 0 = 4:2:2, 1 = 4:2:0
        rtpFrameBuffer[bufWriteIdx++] = 255;       // Q=255: custom quantization table header follows
        rtpFrameBuffer[bufWriteIdx++] = (uint8_t)(info.width / 8);
        rtpFrameBuffer[bufWriteIdx++] = (uint8_t)(info.height / 8);

        if (isFirst) {
            // 4. Quantization Table Header (4 bytes RFC 2435 Section 3.1.8)
            rtpFrameBuffer[bufWriteIdx++] = 0;   // MBZ
            rtpFrameBuffer[bufWriteIdx++] = 0;   // 8-bit precision
            rtpFrameBuffer[bufWriteIdx++] = 0;   // MSB length
            rtpFrameBuffer[bufWriteIdx++] = 128; // LSB length (2 * 64 bytes)
            memcpy(&rtpFrameBuffer[bufWriteIdx], info.q0, 64);
            bufWriteIdx += 64;
            memcpy(&rtpFrameBuffer[bufWriteIdx], info.q1, 64);
            bufWriteIdx += 64;
        }

        // 5. Payload scan data
        memcpy(&rtpFrameBuffer[bufWriteIdx], &scan[offset], chunkSize);
        bufWriteIdx += chunkSize;

        offset += chunkSize;
    }

    // Đẩy toàn bộ khung hình trong 1 lần gọi socket duy nhất, lwIP tự gom streaming burst tốc độ cao
    return safeWriteRtsp(rtpFrameBuffer, bufWriteIdx);
}

void handleRTSPAndSDLogging() {
    if (!hardwareInitialized) return;
    
    // TRƯỜNG HỢP 1: KHI NHẬN ĐƯỢC LỆNH 13 TỪ MQTT -> CHỦ ĐỘNG ĐẨY RTSP PUSH LÊN MEDIAMTX
    if (allow_rtsp == true) {
        uint32_t now = millis();

        if (!rtspStarted) {
            if (now - lastRtspConnectAttempt >= 3000 || lastRtspConnectAttempt == 0) {
                lastRtspConnectAttempt = now;
                if (startRtspPushSession()) {
                    // Xả sạch frame cũ để bắt đầu luồng thời gian thực mới nhất
                    for (int d = 0; d < 2; d++) {
                        camera_fb_t *drainFb = esp_camera_fb_get();
                        if (drainFb) esp_camera_fb_return(drainFb);
                    }
                }
            }
            delay(10);
            return;
        }

        // Xả buffer phản hồi/keepalive nếu MediaMTX có gửi về và kiểm tra đứt kết nối thật
        while (rtspClient.available()) { rtspClient.read(); }
        if (!rtspClient.connected()) {
            Serial.println(F("[RTSP ERROR]: Kết nối tới MediaMTX bị đóng."));
            stopRtspPushSession();
            return;
        }

        static uint32_t lastFpsLog = 0;
        static uint32_t rtpFrameCount = 0;
        static int consecutiveNullCount = 0;

        uint32_t t0 = millis();
        camera_fb_t *fb = esp_camera_fb_get();
        uint32_t t_cam = millis() - t0;
        if (!fb) {
            consecutiveNullCount++;
            static uint32_t lastFbNullLog = 0;
            if (now - lastFbNullLog >= 2000) {
                Serial.printf("[CAM WARN]: esp_camera_fb_get() trả về NULL! (Lần %d)\n", consecutiveNullCount);
                lastFbNullLog = now;
            }
            if (consecutiveNullCount > 15) {
                Serial.println(F("[CAM RECOVERY]: Tự động khởi động lại cảm biến camera..."));
                esp_camera_deinit();
                delay(100);
                hardwareInitialized = false;
                initCameraHardware();
                consecutiveNullCount = 0;
            }
            delay(10);
            return;
        }
        consecutiveNullCount = 0;

        size_t currentFrameBytes = fb->len;
        uint32_t t1 = millis();
        bool pushed = sendRtspJpegFrame(fb);
        uint32_t t_send = millis() - t1;
        esp_camera_fb_return(fb);

        static uint32_t lastTimingLog = 0;
        if (now - lastTimingLog >= 2000) {
            Serial.printf("[PERF]: CamGet=%d ms, RtspSend=%d ms, Size=%d bytes\n", t_cam, t_send, (int)currentFrameBytes);
            lastTimingLog = now;
        }

        static int pushFailCount = 0;
        if (!pushed) {
            pushFailCount++;
            if (!rtspClient.connected() || pushFailCount >= 5) {
                Serial.printf("[RTSP ERROR]: Mất kết nối MediaMTX (lỗi %d lần liên tiếp). Đóng phiên để kết nối lại...\n", pushFailCount);
                stopRtspPushSession();
                pushFailCount = 0;
                return;
            }
            delay(10);
            return;
        }
        pushFailCount = 0;

        if (!firstFrameLogged && pushed) {
            firstFrameLogged = true;
            Serial.printf("-> [RTSP PUSH]: BẮT ĐẦU ĐẨY LUỒNG KHUNG HÌNH THỰC TẾ LÊN MEDIAMTX THÀNH CÔNG! (Kích thước: %d bytes)\n", currentFrameBytes);
        }

        if (pushed) {
            rtpFrameCount++;
        }

        if (now - lastFpsLog >= 3000) {
            float currentFps = (float)rtpFrameCount * 1000.0f / (now - lastFpsLog);
            Serial.printf("[RTSP PUSH]: -> Đang đẩy luồng RTP/JPEG lên MediaMTX (:8554)... Tốc độ: %.1f FPS\n", currentFps);
            rtpFrameCount = 0;
            lastFpsLog = now;
        }
    } 
    // TRƯỜNG HỢP 2: KHI NHẬN LỆNH 14 HOẶC MẶC ĐỊNH -> ĐÓNG PHIÊN RTSP & XẢ SẠCH BUFFER CAMERA
    else {
        if (rtspStarted) {
            stopRtspPushSession();
        }

        uint32_t now = millis();
        if (sd_card_available && SD_MMC.cardType() != CARD_NONE) {
            if (now - lastSDFrame > 1000) { 
                camera_fb_t *fb = esp_camera_fb_get();
                if (fb) {
                    File file = SD_MMC.open("/video.mjpeg", FILE_APPEND);
                    if (file) {
                        file.write(fb->buf, fb->len); file.close();
                        Serial.printf("[KHE THẺ SD 1-BIT]: Đã lưu ảnh (%d bytes) cục bộ.\n", fb->len);
                    }
                    esp_camera_fb_return(fb);
                }
                lastSDFrame = now;
            }
        }
        delay(20);
    }
}

// Hàm xử lý chung thống nhất cho cả lệnh MQTT và Serial Monitor
void executeDeviceCommand(const String& message, const char* source) {
    if (message == "13") {
        Serial.printf("\n------------------------------------------------------------\n");
        Serial.printf("[%s COMMAND]: -> ĐÃ NHẬN ĐƯỢC LỆNH STREAM VIDEO từ %s.\n", source, source);
        Serial.println(F("[COMMAND]: Khởi động cổng phát hình và kích hoạt luồng 8554..."));
        Serial.println(F("------------------------------------------------------------\n"));
        allow_rtsp = true; 
        setLedStatus(true); // BẬT ĐÈN FLASH BÁO HIỆU STREAM VIDEO THEO ĐÚNG HÀNH VI BAN ĐẦU
    } 
    else if (message == "14") {
        Serial.printf("\n------------------------------------------------------------\n");
        Serial.printf("[%s COMMAND]: -> ĐÃ NHẬN LỆNH DỪNG GỬI VIDEO từ %s.\n", source, source);
        Serial.println(F("[COMMAND]: Thực thi đóng sập cổng 8554 và tắt stream..."));
        Serial.println(F("------------------------------------------------------------\n"));
        allow_rtsp = false; 
        setLedStatus(false); // TẮT ĐÈN FLASH KHI DỪNG STREAM
    }
    else if (message == "RESET" || message == "RESET_FACTORY" || message == "99") {
        Serial.printf("\n------------------------------------------------------------\n");
        Serial.printf("[%s COMMAND]: -> ĐÃ NHẬN LỆNH KHÔI PHỤC CÀI ĐẶT GỐC (FACTORY RESET) từ %s.\n", source, source);
        Serial.println(F("[COMMAND]: Đang xóa toàn bộ cấu hình ROM mạng và khởi động lại vào chế độ Ghép nối Kép (BLE & SoftAP)..."));
        Serial.println(F("------------------------------------------------------------\n"));
        preferences.begin("iot-config", false);
        preferences.clear();
        preferences.end();
        delay(500);
        ESP.restart();
    }
    else if (message.startsWith("rtsp:")) {
        // Nhận IP/Domain MediaMTX động từ .env qua Backend MQTT khi người dùng đổi Wi-Fi hoặc lên VPS (không fallback)
        String target = message.substring(5);
        target.trim();
        int colonIdx = target.indexOf(':');
        String newHost = (colonIdx > 0) ? target.substring(0, colonIdx) : target;
        int newPort = (colonIdx > 0) ? target.substring(colonIdx + 1).toInt() : rtsp_port;
        if (newHost.length() > 0 && newPort > 0 && newPort <= 65535 && (newHost != rtsp_host || newPort != rtsp_port)) {
            stopRtspPushSession();
            rtsp_host = newHost;
            rtsp_port = newPort;
            preferences.begin("iot-config", false);
            preferences.putString("rtsp_host", rtsp_host);
            preferences.putInt("rtsp_port", rtsp_port);
            preferences.end();
            Serial.printf("[%s CONFIG]: Đã cập nhật MediaMTX mới -> %s:%d\n", source, rtsp_host.c_str(), rtsp_port);
        }
    }
    else {
        Serial.printf("[%s WARN]: Lệnh '%s' không hỗ trợ. Nhập '13' để bật stream, '14' để dừng stream.\n", source, message.c_str());
    }
}

// ⬇️ ĐÃ CẬP NHẬT CHÍNH XÁC: Hàm callback lập tức in thông báo tiếp nhận lệnh 13 / 14 ngay khi Server gửi xuống
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String message = "";
    for (unsigned int i = 0; i < length; i++) { message += (char)payload[i]; }
    message.trim();
    Serial.printf("\n[MQTT RECV]: Nhận topic=[%s] payload=[%s]\n", topic, message.c_str());
    
    if (String(topic) == mqtt_topic_cmd) {
        executeDeviceCommand(message, "MQTT");
    }
}

void connectWiFiSTA() {
    Serial.printf("-> Đang kết nối Wi-Fi STA (%s)...\n", wifi_ssid.c_str());
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());
    int attempt = 0;
    while ((WiFi.status() != WL_CONNECTED || WiFi.localIP() == IPAddress(0, 0, 0, 0)) && attempt < 2000) {
        delay(10);
        attempt++;
        if (attempt % 50 == 0) {
            setLedStatus((attempt / 50) % 2 == 0);
        }
    }
    if (WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
        WiFi.setSleep(false); // BẮT BUỘC gọi sau khi kết nối thành công để tắt Modem Sleep (chống delay 500ms Wi-Fi radio)
        WiFi.setTxPower(WIFI_POWER_19_5dBm); // Công suất phát RF tối đa 19.5dBm cho tín hiệu Wi-Fi ổn định xuyên tường
        setLedStatus(false);
        Serial.printf("\n-> Kết nối Wi-Fi STA THÀNH CÔNG! IP: %s\n", WiFi.localIP().toString().c_str());
        tat_BLE(); 
    } else {
        Serial.println(F("\n-> [HẾT THỜI GIAN 20s]: Không thể kết nối Wi-Fi đã lưu, kích hoạt BLE dự phòng!"));
        thietlap_BLE(); 
    }
}

void reconnectMQTT() {
    if (!mqttClient.connected()) {
        if (mqttClient.connect(device_name.c_str())) {
            Serial.println(F("-> [MQTT 1883]: Đã liên kết Pub/Sub với máy chủ Server thành công!"));
            String status_topic = "devices/" + device_name + "/status";
            mqttClient.publish(status_topic.c_str(), "ONLINE");
            mqttClient.subscribe(mqtt_topic_cmd.c_str()); 
        }
    }
}

void checkResetFactoryTrigger() {
    // Đã vô hiệu hóa quét chân GPIO 3 (RXD0) để tránh xung đột UART / ngắt CPU gây tràn DMA FB-OVF
}

void setup() {
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Vô hiệu hóa sụt áp Brownout để duy trì nguồn camera ổn định
    Serial.begin(115200);
    delay(500); // Đảm bảo điện áp và chip ổn định hoàn toàn sau khi khởi động

    // 1. KHỞI TẠO CAMERA NGAY LẬP TỨC ĐẦU TIÊN KHI BỘ NHỚ DRAM CÒN NGUYÊN BẢN CHƯA BỊ PHÂN MẢNH
    initCameraHardware();

    pinMode(PIN_LED_STATUS, OUTPUT);
    setLedStatus(false);
    
    Serial.println(F("\n=================================================="));
    Serial.println(F("[TRA CỨU PHẦN CỨNG] --- ĐANG KIỂM TRA BỘ NHỚ LÕI ---"));
    if (psramFound()) {
        Serial.println(F("-> KẾT QUẢ: [THÀNH CÔNG] Kết nối đến bộ nhớ ngoài PSRAM ĐÃ OK."));
        Serial.printf("   Dung lượng bộ nhớ ngoài PSRAM còn trống: %d bytes\n", ESP.getFreePsram());
    } else {
        Serial.println(F("-> KẾT QUẢ: [THẤT BẠI] Không nhận diện được bộ nhớ ngoài PSRAM vật lý!"));
    }
    Serial.printf("   Dung lượng bộ nhớ trong SRAM (Heap) hiện tại: %d bytes\n", ESP.getFreeHeap());
    Serial.println(F("==================================================\n"));

    // Đọc MAC phần cứng trực tiếp từ eFuse (tránh khởi tạo sớm WiFi driver làm vỡ DMA heap)
    uint8_t mac[6];
    esp_efuse_mac_get_default(mac);
    char macBuf[13];
    snprintf(macBuf, sizeof(macBuf), "%02X%02X%02X%02X%02X%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    device_name = "CAM" + String(macBuf);
    Serial.printf("[SETUP]: 3. Device Name = %s\n", device_name.c_str());
    
    mqtt_topic_photo = "devices/" + device_name + "/camera/photo";
    mqtt_topic_cmd = "devices/" + device_name + "/camera/cmd";
    
    preferences.begin("iot-config", true);
    wifi_ssid = preferences.getString("ssid", "");
    wifi_pass = preferences.getString("pass", "");
    mqtt_server = preferences.getString("mqtt", "");
    if (mqtt_server == "" || mqtt_server.length() == 0) {
        mqtt_server = DEFAULT_MQTT_HOST;
    }
    rtsp_host = preferences.getString("rtsp_host", MEDIAMTX_HOST);
    if (rtsp_host.length() == 0) rtsp_host = MEDIAMTX_HOST;
    rtsp_port = preferences.getInt("rtsp_port", MEDIAMTX_PORT);
    if (rtsp_port <= 0) rtsp_port = MEDIAMTX_PORT;
    preferences.end();

    mqttClient.setServer(mqtt_server.c_str(), DEFAULT_MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    
    if (wifi_ssid != "" && wifi_pass != "") {
        isConfigured = true;
        connectWiFiSTA();
    } else {
        isConfigured = false;
        Serial.println(F("Chưa có cấu hình mạng trong bộ nhớ Flash ROM. Kích hoạt chế độ Ghép nối Kép (Wi-Fi AP & BLE)..."));
        startDualProvisioning();
    }
}

void handleSerialCommands() {
    static String serialCmdBuf = "";
    static unsigned long lastCharTime = 0;
    while (Serial.available() > 0) {
        char c = (char)Serial.read();
        lastCharTime = millis();
        if (c == '\r' || c == '\n') {
            serialCmdBuf.trim();
            if (serialCmdBuf.length() > 0) {
                executeDeviceCommand(serialCmdBuf, "SERIAL");
                serialCmdBuf = "";
            }
        } else {
            if (serialCmdBuf.length() < 32) {
                serialCmdBuf += c;
            }
        }
    }
    // Hỗ trợ chế độ "No line ending" trên Arduino IDE: tự flush lệnh sau 250ms nếu không có ký tự mới
    if (serialCmdBuf.length() > 0 && millis() - lastCharTime > 250) {
        serialCmdBuf.trim();
        if (serialCmdBuf.length() > 0) {
            executeDeviceCommand(serialCmdBuf, "SERIAL");
        }
        serialCmdBuf = "";
    }
}

void loop() {
    handleSerialCommands(); // Đọc và xử lý trực tiếp lệnh '13', '14' gõ từ Serial Monitor
    checkResetFactoryTrigger(); // Luôn luôn quét nút bấm khôi phục cài đặt gốc cứng chân 13
    
    if (!isConfigured) {
        webServer.handleClient();
    } else {
        if (WiFi.status() == WL_CONNECTED) {
            reconnectMQTT();
            mqttClient.loop(); // Duy trì giao tiếp Pub/Sub nhận lệnh 13, 14 từ xa liên tục
            
            handleRTSPAndSDLogging(); // Tự động đóng/mở cổng phát 8554 thích ứng theo lệnh
        } else {
            handleRTSPAndSDLogging(); 
            
            unsigned long now = millis();
            if (now - lastWifiReconnectAttempt >= WIFI_RECONNECT_INTERVAL || now < lastWifiReconnectAttempt) {
                lastWifiReconnectAttempt = now;
                Serial.println(F("-> [CHU KỲ 5 PHÚT]: Đang thử kết nối lại Wi-Fi STA ngầm..."));
                WiFi.disconnect(); WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());
            }
        }
    }
}