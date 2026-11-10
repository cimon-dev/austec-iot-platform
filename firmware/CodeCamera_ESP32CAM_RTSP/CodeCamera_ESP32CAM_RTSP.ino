// #pragma GCC optimize ("Os")

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <esp_mac.h>
#include "FS.h"
#include "SD_MMC.h"
#include "esp_camera.h"

// ============================================================================
// CHẾ ĐỘ CẤU HÌNH WIFI (PROVISIONING)
// ESP32-CAM AI-Thinker chỉ có 520KB SRAM và 128KB IRAM phần cứng.
// Khi kích hoạt Camera DMA + Wi-Fi RTSP + PSRAM fix, IRAM đạt ngưỡng tối đa.
// Cơ chế chuẩn công nghiệp cho ESP32-CAM là dùng SoftAP Captive Portal:
// - Camera phát Wi-Fi "AUSTEC-CAM-xxxx" (192.168.4.1) với giao diện Web cấu hình.
// - Sau khi lưu Wi-Fi thành công, tắt AP để dành 100% RAM và ăng-ten 2.4GHz cho RTSP 20 FPS.
// ============================================================================
#define ENABLE_BLE_PROVISIONING 0

#if ENABLE_BLE_PROVISIONING
#include <NimBLEDevice.h>
#define SERVICE_UUID        "4FAFC201-1FB5-459E-8FCC-C5C9C331914B"
#define CHARACTERISTIC_UUID "BEA5C122-3D83-11ED-A261-0242AC120002"
#endif

// --- MÁY CHỦ PHÁT LUỒNG RTSP VIDEO THỜI GIAN THỰC (CỔNG 8554) ---
#include "OV2640Streamer.h"

// Ép cấu hình kích hoạt bộ nhớ mở rộng PSRAM core ở mức biên dịch
#if !defined(BOARD_HAS_PSRAM)
#define BOARD_HAS_PSRAM
#endif

// --- SƠ ĐỒ CHÂN PHẦN CỨNG BẢN QUYỀN BOARD AI-THINKER ESP32-CAM ---
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Chuyển chân nút nhấn khôi phục sang chân RXD0 (GPIO 3) an toàn 100%, không xung đột thẻ nhớ
#define BUTTON_RESET_PIN   3

// --- KHAI BÁO CÁC ĐỐI TƯỢNG HỆ THỐNG BIẾN TOÀN CỤC ---
Preferences preferences;
WebServer webServer(80);
DNSServer dnsServer;
OV2640Streamer streamer(8554); // Cổng máy chủ truyền video RTSP chuẩn quốc tế

#if ENABLE_BLE_PROVISIONING
NimBLEServer *pServer = NULL;
#endif
bool ble_running = false;
bool isConfigured = false;
bool hardwareInitialized = false;
bool rtspStarted = false;
bool sd_card_available = false; // Biến cờ theo dõi trạng thái thẻ nhớ vật lý

String wifi_ssid = "", wifi_pass = "";
String device_name = "";
unsigned long lastWifiReconnectAttempt = 0;
const unsigned long WIFI_RECONNECT_INTERVAL = 5 * 60 * 1000; // Chu kỳ thử kết nối lại Wi-Fi nếu mất mạng (5 phút)
uint32_t lastSDFrame = 0;

// --- HÀM KHỞI TẠO CAMERA QUA ESP-IDF DRIVER TIÊU CHUẨN ---
bool initCameraHardware() {
    if (hardwareInitialized) return true;

    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer   = LEDC_TIMER_0;
    config.pin_d0       = Y2_GPIO_NUM;
    config.pin_d1       = Y3_GPIO_NUM;
    config.pin_d2       = Y4_GPIO_NUM;
    config.pin_d3       = Y5_GPIO_NUM;
    config.pin_d4       = Y6_GPIO_NUM;
    config.pin_d5       = Y7_GPIO_NUM;
    config.pin_d6       = Y8_GPIO_NUM;
    config.pin_d7       = Y9_GPIO_NUM;
    config.pin_xclk     = XCLK_GPIO_NUM;
    config.pin_pclk     = PCLK_GPIO_NUM;
    config.pin_vsync    = VSYNC_GPIO_NUM;
    config.pin_href     = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn     = PWDN_GPIO_NUM;
    config.pin_reset    = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    if (psramFound()) {
        config.frame_size   = FRAMESIZE_VGA; // Phát hình VGA 640x480 sắc nét khi có PSRAM ngoài
        config.jpeg_quality = 12;
        config.fb_count     = 2;             // Double buffer mượt mà 15-20 FPS
        config.fb_location  = CAMERA_FB_IN_PSRAM;
        config.grab_mode    = CAMERA_GRAB_LATEST;
        Serial.println(F("-> [PHẦN CỨNG]: Đã kích hoạt cấu hình phân giải VGA 640x480 chạy trên bộ nhớ PSRAM ngoài."));
    } else {
        config.frame_size   = FRAMESIZE_QVGA; // Hạ phân giải về QVGA 320x240 khi dùng RAM trong
        config.jpeg_quality = 14;
        config.fb_count     = 1;
        config.fb_location  = CAMERA_FB_IN_DRAM;
        config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
        Serial.println(F("-> [PHẦN CỨNG]: Cảnh báo - Chạy phân giải QVGA 320x240 trên bộ nhớ SRAM trong."));
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf(" - Thử lần 1 thất bại (mã: 0x%x). Đang thử lại chế độ an toàn 1 buffer...\n", err);
        config.fb_count = 1;
        config.frame_size = FRAMESIZE_VGA;
        err = esp_camera_init(&config);
        if (err != ESP_OK) {
            Serial.printf(" - LỖI: Không thể khởi tạo Camera! Mã lỗi: 0x%x\n", err);
            return false;
        }
    }

    sensor_t *s = esp_camera_sensor_get();
    if (s != NULL) {
        s->set_vflip(s, 1);
        s->set_hmirror(s, 0);
    }

    Serial.println(F("-> [PHẦN CỨNG]: Khởi tạo phần cứng cảm biến Camera OV2640 THÀNH CÔNG."));
    hardwareInitialized = true;
    return true;
}

#if ENABLE_BLE_PROVISIONING
// --- CALLBACK NHẬN DỮ LIỆU CẤU HÌNH BLE (TƯƠNG THÍCH MỌI PHIÊN BẢN NIMBLE) ---
class MyBLECallbacks: public NimBLECharacteristicCallbacks {
    void handleReceivedData(NimBLECharacteristic *pCharacteristic) {
        String rxValue = String(pCharacteristic->getValue().c_str());
        if (rxValue.length() > 0) {
            int comma = rxValue.indexOf(',');
            if (comma != -1) {
                pCharacteristic->setValue("SUCCESS");
                pCharacteristic->notify();
                delay(500);

                String s = rxValue.substring(0, comma);
                String p = rxValue.substring(comma + 1);

                preferences.begin("iot-config", false);
                preferences.putString("ssid", s);
                preferences.putString("pass", p);
                preferences.end();

                Serial.println(F("Đã nhận thông số cấu hình mạng từ BLE. Thiết bị đang khởi động lại..."));
                delay(1000);
                ESP.restart();
            }
        }
    }
public:
    void onWrite(NimBLECharacteristic *pCharacteristic) {
        handleReceivedData(pCharacteristic);
    }
    void onWrite(NimBLECharacteristic *pCharacteristic, NimBLEConnInfo& connInfo) {
        handleReceivedData(pCharacteristic);
    }
};

void thietlap_BLE() {
    if (ble_running) return;
    NimBLEDevice::init(device_name.c_str());
    pServer = NimBLEDevice::createServer();
    NimBLEService *pService = pServer->createService(SERVICE_UUID);
    NimBLECharacteristic *pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
    );
    static MyBLECallbacks chrCallbacks;
    pCharacteristic->setCallbacks(chrCallbacks);
    pService->start();

    NimBLEAdvertising *pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->start();
    ble_running = true;
    Serial.println(F("-> Đã BẬT mạng Bluetooth NimBLE thích ứng (Chờ ghép nối)."));
}

void tat_BLE() {
    if (!ble_running) return;
    NimBLEDevice::deinit(true); // Giải phóng hoàn toàn stack bộ nhớ NimBLE khỏi RAM Heap
    ble_running = false;
    pServer = NULL;
    Serial.println(F("-> Đã TẮT VĨNH VIỄN mạng Bluetooth BLE để tối ưu RAM cho hệ thống."));
}
#else
inline void thietlap_BLE() {}
inline void tat_BLE() {}
#endif

// --- CHẾ ĐỘ GHÉP NỐI WEB CAPTIVE PORTAL (SOFTAP) ---
void startDualProvisioning() {
    IPAddress apIP(192, 168, 4, 1);
    IPAddress netMsk(255, 255, 255, 0);
    WiFi.mode(WIFI_AP);
    WiFi.softAPConfig(apIP, apIP, netMsk);
    WiFi.softAP(device_name.c_str(), "12345678");

    dnsServer.start(53, "*", apIP);

    webServer.on("/", HTTP_GET, [](){
        int n = WiFi.scanNetworks();
        String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1'>";
        html += "<title>Cấu hình Camera Austec</title><style>";
        html += "body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:16px;box-sizing:border-box}";
        html += ".card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px 22px;max-width:380px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.5);text-align:center}";
        html += "h2{color:#38bdf8;margin:0 0 6px 0;font-size:22px}p{color:#94a3b8;font-size:13px;margin:0 0 20px 0}";
        html += "label{display:block;text-align:left;color:#cbd5e1;font-size:13px;margin:14px 0 6px 2px;font-weight:600}";
        html += "select,input{width:100%;padding:12px;margin:0;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc;font-size:14px;box-sizing:border-box}";
        html += "select{cursor:pointer}select:focus,input:focus{outline:none;border-color:#38bdf8}";
        html += "button{width:100%;padding:14px;background:#0284c7;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer;margin-top:24px;transition:0.2s}";
        html += "button:hover{background:#0369a1}";
        html += "</style></head><body><div class='card'>";
        html += "<h2>AUSTEC AI CAMERA</h2><p>Cấu hình kết nối mạng Wi-Fi (2.4GHz)</p>";
        html += "<form action='/save' method='POST'>";
        html += "<label>CHỌN MẠNG WI-FI XUNG QUANH:</label>";
        html += "<select name='ssid' id='ssidSelect' onchange='checkCustom(this)'>";
        if (n > 0) {
            for (int i = 0; i < n; ++i) {
                String curSSID = WiFi.SSID(i);
                if (curSSID.length() > 0) {
                    html += "<option value='" + curSSID + "'>" + curSSID + " (" + String(WiFi.RSSI(i)) + " dBm)</option>";
                }
            }
        }
        html += "<option value='__custom'>-- Nhập Wi-Fi khác thủ công --</option>";
        html += "</select>";
        html += "<input type='text' name='custom_ssid' id='customSsid' placeholder='Nhập tên Wi-Fi...' style='display:none;margin-top:8px;'>";
        html += "<label>MẬT KHẨU WI-FI:</label>";
        html += "<input type='password' name='pass' placeholder='Nhập mật khẩu Wi-Fi...' required>";
        html += "<button type='submit'>LƯU VÀ KẾT NỐI CAMERA</button>";
        html += "</form>";
        html += "<script>";
        html += "function checkCustom(sel){var c=document.getElementById('customSsid');if(sel.value==='__custom'){c.style.display='block';c.required=true;}else{c.style.display='none';c.required=false;}}";
        html += "</script>";
        html += "</div></body></html>";
        webServer.send(200, "text/html", html);
    });

    webServer.on("/save", HTTP_POST, [](){
        String s = webServer.arg("ssid");
        if (s == "__custom") {
            s = webServer.arg("custom_ssid");
        }
        String p = webServer.arg("pass");
        if (s.length() > 0) {
            preferences.begin("iot-config", false);
            preferences.putString("ssid", s);
            preferences.putString("pass", p);
            preferences.end();
            String resHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1'>";
            resHtml += "<style>body{font-family:sans-serif;background:#0f172a;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;text-align:center}.card{background:#1e293b;padding:30px;border-radius:16px;max-width:360px}h2{color:#4ade80}</style></head>";
            resHtml += "<body><div class='card'><h2>LƯU THÀNH CÔNG!</h2><p>Camera đang khởi động lại để kết nối vào Wi-Fi: <b>" + s + "</b></p><p style='color:#94a3b8;font-size:13px'>Bạn có thể đóng trang này và mở VLC hoặc App Austec.</p></div></body></html>";
            webServer.send(200, "text/html", resHtml);
            delay(1500);
            ESP.restart();
        } else {
            webServer.send(400, "text/plain", "Missing SSID");
        }
    });

    webServer.onNotFound([](){
        webServer.sendHeader("Location", "http://192.168.4.1/", true);
        webServer.send(302, "text/plain", "");
    });

    webServer.begin();
    thietlap_BLE();
    Serial.println(F("\n============================================="));
    Serial.printf("-> Chế độ Ghép nối Web Captive Portal đã kích hoạt.\n");
    Serial.printf("-> Wi-Fi phát: [%s] | Pass: [12345678]\n", device_name.c_str());
    Serial.println(F("-> Mở trình duyệt gõ: http://192.168.4.1 để cấu hình Wi-Fi\n"));
    Serial.println(F("============================================="));
}

// --- KHỞI CHẠY PHẦN CỨNG VÀ MÁY CHỦ RTSP ---
void startHardwareAndRTSP() {
    if (!hardwareInitialized) {
        if (!initCameraHardware()) {
            return;
        }
    }

    // Chỉ thử đọc thẻ SD một lần duy nhất lúc khởi động
    static bool sd_checked = false;
    if (!sd_checked) {
        sd_checked = true;
        if (!SD_MMC.begin("/sdcard", true)) {
            Serial.println(F(" - Mạch khe cắm thẻ SD: KHÔNG CÓ THẺ VẬT LÝ (Chế độ phát trực tuyến RTSP)."));
            sd_card_available = false;
        } else {
            Serial.printf(" - Mạch khe cắm thẻ SD: ĐÃ SẴN SÀNG HẠ TẦNG. Dung lượng: %llu MB\n", SD_MMC.cardSize() / (1024 * 1024));
            sd_card_available = true;
        }
    }

    if (!rtspStarted) {
        streamer.begin();
        rtspStarted = true;
        Serial.println(F("\n============================================="));
        Serial.printf("-> [RTSP SERVER]: Luồng RTSP sẵn sàng tại: rtsp://%s:8554/live\n", WiFi.localIP().toString().c_str());
        Serial.println(F("=============================================\n"));
    }
}

// --- XỬ LÝ PHÁT LUỒNG VIDEO RTSP VÀ GHI HÌNH THẺ NHỚ ---
void handleRTSPAndSDLogging() {
    if (!hardwareInitialized || !rtspStarted) return;

    // Xử lý các yêu cầu bắt tay RTSP từ client (App / Web Admin / MediaMTX)
    streamer.handle();

    // Nếu có Client đang xem trực tiếp: Lấy frame và truyền mượt 15-20 FPS
    if (streamer.hasActiveClients()) {
        camera_fb_t *fb = esp_camera_fb_get();
        if (fb) {
            // Phát gói tin RTP JPEG tới các Client đang xem
            streamer.streamFrame(fb);

            // Ghi nối tiếp vào thẻ nhớ SD mỗi 500ms nếu có thẻ
            uint32_t now = millis();
            if (sd_card_available && (now - lastSDFrame > 500)) {
                File file = SD_MMC.open("/video.mjpeg", FILE_APPEND);
                if (file) {
                    file.write(fb->buf, fb->len);
                    file.close();
                }
                lastSDFrame = now;
            }

            esp_camera_fb_return(fb);
        }
    } else {
        // Chế độ chờ: Chỉ ghi thẻ nhớ định kỳ mỗi 1000ms nếu có cắm thẻ
        uint32_t now = millis();
        if (sd_card_available && (now - lastSDFrame > 1000)) {
            camera_fb_t *fb = esp_camera_fb_get();
            if (fb) {
                File file = SD_MMC.open("/video.mjpeg", FILE_APPEND);
                if (file) {
                    file.write(fb->buf, fb->len);
                    file.close();
                }
                esp_camera_fb_return(fb);
            }
            lastSDFrame = now;
        }
        delay(10); // Nghỉ nhẹ CPU khi không có ai xem
    }
}

// --- THUẬT TOÁN CHỐNG NHIỄU NÚT FACTORY RESET TRÊN CỔNG RXD0 (GPIO 3) ---
void checkResetFactoryTrigger() {
    if (digitalRead(BUTTON_RESET_PIN) == LOW) {
        unsigned long start = millis();
        while (digitalRead(BUTTON_RESET_PIN) == LOW) {
            delay(10);
            if (millis() - start >= 5000) { // Giữ nút đúng 5 giây liên tục
                Serial.println(F("-> PHÁT LỆNH RESET FACTORY! Xóa sạch cấu hình ROM mạng và khởi động lại..."));
                preferences.begin("iot-config", false);
                preferences.clear();
                preferences.end();
                delay(1000);
                ESP.restart();
            }
        }
    }
}

// ================= SETUP =================
void setup() {
    Serial.begin(115200);

    // Chân RXD0 (GPIO 3) làm nút bấm Reset Factory
    pinMode(BUTTON_RESET_PIN, INPUT);

    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    char macBuf[13];
    snprintf(macBuf, sizeof(macBuf), "%02X%02X%02X%02X%02X%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    device_name = "CAM" + String(macBuf);

    Serial.println(F("\n============================================="));
    Serial.printf("  AUSTEC REALTIME AI CAMERA - %s\n", device_name.c_str());
    Serial.println(F("  GIAO THỨC TRUYỀN: RTSP STREAMING (PORT :8554)\n"));
    Serial.println(F("============================================="));

    // 1. Khởi tạo Camera ngay đầu setup khi SRAM nội bộ còn nguyên 100%
    initCameraHardware();

    // 2. Đọc cấu hình Wi-Fi đã lưu
    preferences.begin("iot-config", true);
    wifi_ssid = preferences.getString("ssid", "");
    wifi_pass = preferences.getString("pass", "");
    preferences.end();

    if (wifi_ssid != "" && wifi_pass != "") {
        isConfigured = true;
        Serial.printf("Đã tìm thấy cấu hình Wi-Fi. Đang kết nối tới: %s\n", wifi_ssid.c_str());
        WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());

        int attempt = 0;
        while (WiFi.status() != WL_CONNECTED && attempt < 25) {
            delay(500);
            Serial.print(".");
            attempt++;
        }

        if (WiFi.status() == WL_CONNECTED) {
            Serial.println(F("\n-> Kết nối Wi-Fi THÀNH CÔNG!"));
            Serial.printf("-> IP NỘI BỘ CAMERA: %s\n", WiFi.localIP().toString().c_str());
            startHardwareAndRTSP();
        } else {
            Serial.println(F("\n-> Chưa kết nối được Wi-Fi. Kích hoạt Bluetooth BLE dự phòng..."));
            lastWifiReconnectAttempt = millis();
            thietlap_BLE();
            startHardwareAndRTSP();
        }
    } else {
        isConfigured = false;
        Serial.println(F("Chưa có cấu hình mạng trong ROM. Kích hoạt Ghép nối Kép (Wi-Fi AP & BLE)..."));
        startDualProvisioning();
    }
}

// ================= LOOP =================
void loop() {
    checkResetFactoryTrigger();

    if (!isConfigured) {
        dnsServer.processNextRequest();
        webServer.handleClient();
    } else {
        if (WiFi.status() == WL_CONNECTED) {
            if (!rtspStarted && hardwareInitialized) {
                startHardwareAndRTSP();
            }
            if (rtspStarted) {
                handleRTSPAndSDLogging();
            }
        } else {
            // Mất mạng Wi-Fi: Vẫn tự chủ lưu trữ video vào thẻ nhớ SD
            handleRTSPAndSDLogging();

            // Thử kết nối lại Wi-Fi sau mỗi chu kỳ 5 phút
            unsigned long now = millis();
            if (now - lastWifiReconnectAttempt >= WIFI_RECONNECT_INTERVAL) {
                lastWifiReconnectAttempt = now;
                Serial.println(F("-> [CHU KỲ 5 PHÚT]: Đang thử kết nối lại Wi-Fi ngầm..."));
                WiFi.disconnect();
                WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());
            }
        }
    }
}

