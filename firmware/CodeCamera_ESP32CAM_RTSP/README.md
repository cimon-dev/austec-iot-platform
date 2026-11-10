# AUSTEC REALTIME AI CAMERA FIRMWARE (RTSP PORT 8554)

> Bản nâng cấp toàn diện từ thiết kế `Document2.pdf`, thay thế cơ chế chụp ảnh ngắt quãng qua MQTT bằng **Máy chủ truyền hình ảnh Video thời gian thực chuẩn quốc tế (RTSP Streaming trên cổng :8554)**.

---

## 1. Cấu hình bo mạch khi biên dịch (Arduino IDE / PlatformIO)

* **Board**: `AI Thinker ESP32-CAM`
* **CPU Frequency**: `240MHz (WiFi/BT)`
* **Flash Frequency**: `80MHz`
* **Flash Mode**: `QIO`
* **Partition Scheme**: `Huge APP (3MB No OTA/1MB SPIFFS)` hoặc `Minimal SPIFFS (1.9MB APP with OTA/190KB SPIFFS)`
* **PSRAM**: **`Enabled`** (Bắt buộc bật để chạy độ phân giải VGA 640x480 mượt 15–20 FPS)

---

## 2. Thư viện yêu cầu
1. `NimBLE-Arduino` (Cài đặt từ Library Manager: `h2zero/NimBLE-Arduino`) — Giúp tiết kiệm ~80KB RAM so với Bluetooth gốc.
2. `esp32-camera` (Đã tích hợp sẵn trong ESP32 Arduino Core).

---

## 3. Cách xem luồng trực tiếp ngay trong mạng LAN (Không cần Server)

Sau khi cấp Wi-Fi cho mạch qua Bluetooth BLE hoặc WebServer SoftAP:
* Mở trình duyệt VLC Player trên máy tính hoặc điện thoại.
* Vào **Media** $\rightarrow$ **Open Network Stream** $\rightarrow$ Dán địa chỉ:
  ```
  rtsp://<IP_CAMERA>:8554/live
  ```
* Video hiển thị ngay tức khắc ở tốc độ **15–20 FPS**, độ trễ < 0.3 giây.

