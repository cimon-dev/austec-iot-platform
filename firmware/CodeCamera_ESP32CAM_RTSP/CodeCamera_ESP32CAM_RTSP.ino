#pragma GCC optimize ("Os") // Nén kích thước mã máy tối đa chống tràn bộ nhớ IRAM

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include "FS.h"
#include "SD_MMC.h"
#include "esp_camera.h"

// --- SỬ DỤNG NIMBLE SIÊU NHẸ THAY VÌ BLUEDROID GỐC (TIẾT KIỆM ~80KB RAM) ---
#include <NimBLEDevice.h>

// --- MÁY CHỦ PHÁT LUỒNG RTSP VIDEO THỜI GIAN THỰC (CỔNG 8554) ---
#include "OV2640Streamer.h"

// Ép cấu hình kích hoạt bộ nhớ mở rộng PSRAM core ở mức biên dịch
#if !defined(BOARD_HAS_PSRAM)
#define BOARD_HAS_PSRAM
#endif

// --- CẤU HÌNH UUID CHO BLUETOOTH BLE PROVISIONING (ĐỒNG BỘ 100% VỚI APP AUSTEC) ---
#define SERVICE_UUID        "4FAFC201-1FB5-459E-8FCC-C5C9C331914B"
#define CHARACTERISTIC_UUID "BEA5C122-3D83-11ED-A261-0242AC120002"

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
OV2640Streamer streamer(8554); // Cổng máy chủ truyền video RTSP chuẩn quốc tế

NimBLEServer *pServer = NULL;
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
    config.xclk_freq_hz = 10000000; // Khóa cứng 10MHz để DMA tín hiệu ổn định tuyệt đối
    config.pixel_format = PIXFORMAT_JPEG;

    if (psramFound()) {
        config.frame_size   = FRAMESIZE_VGA; // Phát hình VGA 640x480 sắc nét khi có PSRAM ngoài
        config.jpeg_quality = 12;
        config.fb_count     = 2;             // Double buffer mượt mà 15-20 FPS
        config.fb_location  = CAMERA_FB_IN_PSRAM;
        config.grab_mode    = CAMERA_GRAB_LATEST;
        Serial.println(F("-> [PHẦN CỨNG]: Đã kích hoạt cấu hình phân giải VGA 640x480 chạy trên bộ nhớ PSRAM ngoài."));
    } else {
        config.frame_size   = FRAMESIZE_CIF; // Hạ phân giải về CIF 352x288 khi dùng RAM trong
        config.jpeg_quality = 15;
        config.fb_count     = 1;
        config.fb_location  = CAMERA_FB_IN_DRAM;
        config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
        Serial.println(F("-> [PHẦN CỨNG]: Cảnh báo - Chạy phân giải CIF 352x288 trên bộ nhớ SRAM trong."));
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf(" - LỖI: Không thể khởi tạo Camera! Mã lỗi: 0x%x\n", err);
        return false;
    }
    Serial.println(F("-> [PHẦN CỨNG]: Khởi tạo phần cứng cảm biến Camera OV2640 THÀNH CÔNG."));
    return true;
}

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

// --- CHẾ ĐỘ GHÉP ĐÔI KÉP (SOFTAP + BLE) ---
void startDualProvisioning() {
    WiFi.mode(WIFI_AP);
    WiFi.softAP(device_name.c_str(), "12345678");

    webServer.on("/save", HTTP_POST, [](){
        if (webServer.hasArg("ssid") && webServer.hasArg("pass")) {
            preferences.begin("iot-config", false);
            preferences.putString("ssid", webServer.arg("ssid"));
            preferences.putString("pass", webServer.arg("pass"));
            preferences.end();
            webServer.send(200, "text/plain", "OK");
            delay(1000);
            ESP.restart();
        }
    });

    webServer.begin();
    thietlap_BLE();
    Serial.printf("-> Chế độ Ghép nối Kép đã kích hoạt. Hãy kết nối vào Wi-Fi AP [%s]\n", device_name.c_str());
}

// --- KHỞI CHẠY PHẦN CỨNG VÀ MÁY CHỦ RTSP ---
void startHardwareAndRTSP() {
    if (!hardwareInitialized) {
        Serial.println(F("-> [PHẦN CỨNG] Đang khởi tạo kết nối mạch Thẻ SD và Camera..."));

        // Kích hoạt khe cắm thẻ MicroSD ở chế độ 1-bit để không xung đột chân GPIO
        if (!SD_MMC.begin("/sdcard", true)) {
            Serial.println(F(" - Mạch khe cắm thẻ SD: KHÔNG TÌM THẤY THẺ VẬT LÝ TRONG KHE CẮM."));
            sd_card_available = false;
        } else {
            Serial.printf(" - Mạch khe cắm thẻ SD: ĐÃ SẴN SÀNG HẠ TẦNG. Dung lượng: %llu MB\n", SD_MMC.cardSize() / (1024 * 1024));
            sd_card_available = true;
        }

        if (!initCameraHardware()) {
            return;
        }
        hardwareInitialized = true;
    }

    streamer.begin();
    rtspStarted = true;
    Serial.printf("-> [RTSP SERVER]: Luồng RTSP sẵn sàng tại: rtsp://%s:8554/live\n", WiFi.localIP().toString().c_str());
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

    WiFi.mode(WIFI_MODE_STA);
    String macStr = WiFi.macAddress();
    macStr.replace(":", "");
    device_name = "CAM" + macStr;

    Serial.println(F("\n============================================="));
    Serial.printf("  AUSTEC REALTIME AI CAMERA - %s\n", device_name.c_str());
    Serial.println(F("  GIAO THỨC TRUYỀN: RTSP STREAMING (PORT :8554)\n"));
    Serial.println(F("============================================="));

    // Đọc cấu hình Wi-Fi đã lưu
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
        webServer.handleClient();
    } else {
        if (WiFi.status() == WL_CONNECTED) {
            if (!rtspStarted) {
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

