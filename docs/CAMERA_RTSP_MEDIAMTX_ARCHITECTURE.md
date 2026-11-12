# KIẾN TRÚC TRUYỀN LUỒNG CAMERA ESP32-CAM QUA RTSP PUSH & MEDIAMTX (LOCAL $\rightarrow$ VPS)

Tài liệu này ghi lại toàn bộ thiết kế, cấu hình **MediaMTX Local** (máy tính cá nhân đóng vai trò máy chủ trung gian trong giai đoạn phát triển), nâng cấp **Firmware `esp32cam1.ino`**, cấu hình **Backend / Mobile App**, và **danh sách các vị trí bắt buộc phải đổi IP/Domain khi chuyển lên VPS thực tế**.

---

## 1. So sánh Cơ chế Cũ vs. Cơ chế Mới (RTSP Thực Sự)

| Tiêu chí | Firmware cũ (`esp32cam1.ino` trước nâng cấp) | Firmware mới (`esp32cam1.ino` RTSP Client PUSH) |
| :--- | :--- | :--- |
| **Vai trò mạng của ESP32** | Server thụ động mở TCP port `8554` trên IP LAN (`WiFiServer`) chờ người xem chọc vào | **Client chủ động** kết nối ra ngoài tới MediaMTX Server (`WiFiClient`) |
| **Giao thức hình ảnh** | HTTP MJPEG (`HTTP/1.1 200 OK ... multipart/x-mixed-replace`) | **RTSP 1.0 (RFC 2326) + RTP/JPEG (RFC 2435)** qua `RTP/AVP/TCP;interleaved=0-1` |
| **Đích đến luồng video** | Chỉ phát cục bộ trong Wi-Fi nội bộ tại `http://<IP_ESP32>:8554` | Đẩy trực tiếp tới `rtsp://<MEDIAMTX_HOST>:8554/raw/<hardware_id>` $\rightarrow$ MediaMTX + FFmpeg chuyển mã sang `live/<hardware_id>` |
| **Đồng bộ với Backend & Mobile** | Backend/App không kết nối xuyên NAT vào IP LAN camera được | Backend nhận Webhook `publish`/`unpublish` từ MediaMTX (`live/<id>`); App phát trực tiếp WebRTC `:8889/live/<id>` |
| **Khả năng mở rộng ra VPS/4G** | Không thể (phụ thuộc IP LAN nội bộ) | Chỉ cần đổi `MEDIAMTX_HOST` sang Public IP/Domain VPS là chạy qua Internet/4G |

---

## 2. Nguyên tắc Thiết kế Bắt Buộc

1. **KHÔNG FALLBACK (No Silent Fallback):**
   - Không fallback ngầm từ RTSP PUSH về HTTP MJPEG cũ, không tự sinh ảnh giả hay chuyển hướng server ẩn khi lỗi.
   - Nếu không kết nối được tới `MEDIAMTX_HOST:8554` hoặc MediaMTX từ chối (`ANNOUNCE` / `SETUP` / `RECORD` không trả `200 OK`), ESP32 ghi log lỗi rõ ràng ra Serial (`115200 baud`), đóng socket sạch sẽ và dừng phiên stream.
   - Phía Mobile App nếu luồng stream không mở được phải hiển thị trạng thái thật, không hiển thị dữ liệu giả lập.
2. **Bảo toàn 100% các chức năng đã hoạt động tốt từ firmware gốc:**
   - **BLE Provisioning (NimBLE)** UUID `4FAFC201-1FB5-459E-8FCC-C5C9C331914B` / Characteristic `BEA5C122-3D83-11ED-A261-0242AC120002`, nhận `{ssid},{pass},{mqtt}` và SoftAP `/save`.
   - Lưu cấu hình vào Flash NVS (`Preferences` namespace `"iot-config"`).
   - Định danh `device_name = "CAM" + WiFi.macAddress()` (bỏ dấu `:`).
   - Kết nối Wi-Fi STA (DHCP), tự động thử lại mỗi 5 phút khi mất Wi-Fi.
   - **MQTT 1883:**
     - Publish `"ONLINE"` lên topic `devices/<device_name>/status`.
     - Subscribe `devices/<device_name>/camera/cmd`.
     - Xử lý mã lệnh `"13"` (Bật stream & đèn Flash GPIO `4`) và `"14"` (Dừng stream, tắt đèn Flash, quay về chế độ thẻ nhớ).
   - Nút Reset Factory cứng trên `GPIO 13` (giữ $\ge 5$ giây xóa NVS và khởi động lại).
   - Khởi tạo phần cứng OV2640 (`initCameraHardware()`) và ghi thẻ SD 1-bit (`SD_MMC`) khi ở chế độ chờ (`allow_rtsp == false`).

---

## 3. Cơ chế Bắt tay RTSP Client PUSH trên `esp32cam1.ino`

Khi ESP32 nhận lệnh `"13"` từ MQTT (`allow_rtsp = true`), firmware mở kết nối TCP tới `MEDIAMTX_HOST:8554` và thực hiện tuần tự chuẩn **RFC 2326 (Client Publish / RECORD)**:

```text
[ESP32-CAM]                                    [MediaMTX :8554]
    | --- TCP Connect MEDIAMTX_HOST:8554 -------------> |
    | --- OPTIONS rtsp://.../raw/<hwId> RTSP/1.0 -----> |
    | <--- 200 OK ------------------------------------- |
    | --- ANNOUNCE rtsp://.../raw/<hwId> + SDP -------> |  (m=video 0 RTP/AVP 26, a=control:trackID=0)
    | <--- 200 OK ------------------------------------- |
    | --- SETUP .../trackID=0 (interleaved=0-1;mode=record) -> |
    | <--- 200 OK (Session: xxx) ---------------------- |
    | --- RECORD rtsp://.../raw/<hwId> (Session) -----> |
    | <--- 200 OK ------------------------------------- |
    | === TCP '$'\x00<len>[RTP Header + RFC2435 JPEG] => |  (~15 FPS, chu kỳ 66ms/frame)
    | ... (MediaMTX runOnAvailable FFmpeg -> /live/<hwId> H.264) ...
    | ... (Khi nhận lệnh MQTT "14") ...                 |
    | --- TEARDOWN rtsp://.../raw/<hwId> -------------> |
    | <--- 200 OK / Close TCP ------------------------> |
```

### Quy cách đóng gói RTP/JPEG (RFC 2435)
- Cảm biến OV2640 xuất dữ liệu JPEG đầy đủ (`FF D8 ... FF D9`).
- Firmware trích xuất trực tiếp từ từng frame:
  - **DQT (`FF DB`):** bảng lượng tử 8-bit (`Q = 255` kèm Quantization Table Header 4 byte ở gói đầu tiên của mỗi frame để màu sắc & chất lượng giải mã chính xác 100%).
  - **SOF0 (`FF C0`):** chiều rộng (`Width / 8`), chiều cao (`Height / 8`), và kiểu lấy mẫu (`Type = 0` cho YUV 4:2:2 hoặc `Type = 1` cho YUV 4:2:0).
  - **SOS (`FF DA`):** lấy đúng phần **entropy-coded scan data** nằm ngay sau header `SOS` tới trước marker kết thúc `FF D9` để nhét vào từng gói RTP (MTU tối đa ~1360 bytes/gói, Marker bit `M=1` ở gói cuối mỗi frame).
- Toàn bộ gói RTP được đóng gói qua **TCP Interleaved** (`$` + channel `0` + độ dài 2 byte Big-Endian + RTP Packet) trên chính kết nối TCP `:8554` nhằm tránh mất gói UDP và hoạt động ổn định qua NAT/Docker/VPS.

---

## 4. Kiến trúc Triển khai Môi trường Local (Windows PC Hiện Tại)

Trong giai đoạn phát triển hiện tại, máy tính Windows đóng vai trò đồng thời **MediaMTX Streaming Server** và **Backend Local** (cùng Wi-Fi với ESP32-CAM và điện thoại test):

```text
  ESP32-CAM (Wi-Fi LAN)
     ├── MQTT 1883 <======> broker.emqx.io <======> Backend Local (<SERVER_HOST>:4000)
     └── RTSP PUSH ======> MediaMTX Docker (<MEDIAMTX_HOST>:8554/raw/<hwId>)
                                ├── FFmpeg Transcode (MJPEG -> H.264 zerolatency -> /live/<hwId>)
                                ├── Webhook (http://host.docker.internal:4000/api/media/...)
                                ├── Stream RTSP (:8554/live/<hwId>)
                                ├── Stream HLS  (:8888/live/<hwId>/index.m3u8)
                                └── Stream WebRTC (:8889/live/<hwId>)
                                        ▲
  Mobile App (cùng Wi-Fi LAN) ──────────┘ (Login -> Server Config -> nút "Local (<SERVER_HOST>:4000)")
```

### Lưu ý tương thích Video Codec (OV2640 MJPEG $\rightarrow$ RTSP / HLS / WebRTC)
- ESP32-CAM OV2640 xuất **MJPEG (`RTP/AVP 26`)**.
- MediaMTX tiếp nhận trực tiếp **MJPEG qua RTSP** tại đường dẫn `/raw/<hwId>`, nhưng chuẩn **WebRTC (`:8889`) / HLS fMP4 (`:8888`)** yêu cầu luồng **H.264**.
- Container [`docker-compose.yml`](file:///d:/Work/Austec/austec-iot-platform/backend/mediamtx/docker-compose.yml) dùng image `bluenviron/mediamtx:latest-ffmpeg` và [`mediamtx.yml`](file:///d:/Work/Austec/austec-iot-platform/backend/mediamtx/mediamtx.yml) chạy `runOnAvailable` bằng `ffmpeg` (`-c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -g 15 -pkt_size 1300`) đẩy sang `/live/<hwId>`.
- Mobile App sử dụng widget [`CameraWebRtcPlayer`](file:///d:/Work/Austec/austec-iot-platform/mobile-app/lib/features/devices/widgets/camera_webrtc_player.dart):
  - **Chế độ Hybrid (khuyên dùng khi Render chưa cập nhật route `/camera/stream` hoặc muốn dùng DB/tài khoản trên Render):** App đăng nhập, quản lý thiết bị và gửi lệnh MQTT `"13"`/`"14"` qua **Render Cloud**, riêng luồng Video đi thẳng tới `MEDIAMTX_HOST:8889/live/<hwId>` (nạp từ `.env` qua `--dart-define=MEDIAMTX_HOST=...` lúc build APK hoặc nhập ở mục **2. MediaMTX Host** trong hộp thoại Cấu hình Máy chủ ở màn Đăng nhập).
  - **Chế độ Local đầy đủ:** Khi trỏ Backend về máy Local (`<SERVER_HOST>:4000`), widget gọi `/api/devices/:hardwareId/camera/stream` để lấy `endpoints.webrtc`. Luôn hiển thị lỗi thật nếu không vào được MediaMTX, **không fallback** về `/camera/snapshot`.

---

## 5. BẢNG ĐỐI CHIẾU KHI CHUYỂN TỪ LOCAL SANG VPS THỰC TẾ (BẮT BUỘC ĐỌC LẠI KHI DEPLOY)

Khi bạn thuê VPS (ví dụ Oracle Cloud / AWS / DigitalOcean) có **IP Public** hoặc trỏ tên miền (ví dụ `stream.austec.vn`), **KHÔNG CẦN ĐỔI LOGIC CODE**, chỉ cần cập nhật đúng các điểm sau:

| STT | Thành phần / File | Giá trị lúc TEST LOCAL (Windows PC) | Giá trị khi ĐƯA LÊN VPS THỰC TẾ | Ghi chú quan trọng |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **File `.env` tập trung (nguồn gốc duy nhất)**<br>[`.env`](file:///d:/Work/Austec/austec-iot-platform/.env) | `SERVER_HOST=<IP_WIFI>`<br>`MEDIAMTX_HOST=<IP_WIFI>`<br>`MEDIAMTX_AUTH_URL=http://host.docker.internal:4000/api/media/auth` | `SERVER_HOST=<PUBLIC_IP_VPS>`<br>`MEDIAMTX_HOST=<PUBLIC_IP_VPS>`<br>`MEDIAMTX_AUTH_URL=https://austec-backend.onrender.com/api/media/auth` | Khi đổi Wi-Fi chỉ cần chạy `.\scripts\sync-env.ps1 -AutoDetect` để tự bắt IP Wi-Fi và đồng bộ cho toàn hệ thống |
| **2** | **Firmware ESP32**<br>[`d:\Work\Austec\esp32cam1.ino`](file:///d:/Work/Austec/esp32cam1.ino) | `#define MEDIAMTX_HOST` (được `sync-env.ps1` ghi tự động từ `.env`) | Đồng bộ qua `sync-env.ps1` hoặc nhận động từ Backend qua lệnh MQTT `rtsp:<host>:<port>` | Không cần cắm cáp nạp lại ESP32 khi đổi Wi-Fi nếu camera đã online MQTT (NVS tự lưu `rtsp_host`) |
| **3** | **Backend Local `.env`**<br>[`backend/.env`](file:///d:/Work/Austec/austec-iot-platform/backend/.env) | Tự đồng bộ `MEDIAMTX_HOST` từ root `.env` (`server.ts` ưu tiên nạp root `.env`) | `MEDIAMTX_HOST=<PUBLIC_IP_VPS>` trên **Render Dashboard** | Phải restart Backend local sau khi đổi Wi-Fi (hoặc deploy code Backend mới lên Render) |
| **4** | **MediaMTX Docker**<br>[`mediamtx.yml`](file:///d:/Work/Austec/austec-iot-platform/backend/mediamtx/mediamtx.yml) & [`docker-compose.yml`](file:///d:/Work/Austec/austec-iot-platform/backend/mediamtx/docker-compose.yml) | Không fix cứng IP trong YAML; đọc `MTX_*` và `MEDIAMTX_HOOK_BASE_URL` trực tiếp từ `.env` | Trên VPS Linux giữ nguyên cấu hình `.env` (hoặc dùng `network_mode: host`), mở UDP ICE port `8189` | `sync-env.ps1` tự chạy `docker compose --env-file ..\.env up -d --force-recreate` |
| **5** | **Firewall / Cloud Security Group** | Mở Windows Firewall cho TCP `8554`, `8888`, `8889`, `4000`, UDP `8189` trên mạng Private LAN | Mở Inbound Rules trên Security Group / `ufw` của VPS: TCP `8554`, `8888`, `8889`, UDP `8189` | Không mở port `8554` thì ESP32 sẽ báo lỗi kết nối RTSP |
| **6** | **Mobile App**<br>[`api_config.dart`](file:///d:/Work/Austec/austec-iot-platform/mobile-app/lib/core/constants/api_config.dart) | Không fix cứng IP trong code Dart; [`build-apk.ps1`](file:///d:/Work/Austec/austec-iot-platform/build-apk.ps1) truyền `.env` qua `--dart-define`, hoặc nhập IP LAN mới ngay tại màn Login (tự lưu `last_local_server_host`) | Bấm **Dùng mặc định Cloud** (`https://austec-backend.onrender.com`) | Người dùng bật 4G hoặc Wi-Fi bất kỳ đều xem được khi trỏ Cloud + VPS |

---

## 6. Ghi chú Tình trạng Hệ thống Trước khi Nâng cấp

- Kiểm tra thực tế trước khi nâng cấp cho thấy Backend trên `https://austec-backend.onrender.com` chưa có các route mới của camera (`/api/devices/:hardwareId/camera/stream` và `/api/media/auth` trả về `404`), trong khi Backend chạy local tại `http://<SERVER_HOST>:4000` đã có đầy đủ mã nguồn của commit `111c021` trở đi.
- Do đó trong giai đoạn test Local, Mobile App cần trỏ về **Backend Local (`<SERVER_HOST>:4000`)** trên cùng Wi-Fi để gọi API `/camera/stream` và nhận hook MediaMTX chính xác (có sẵn nút chọn nhanh `Local (<SERVER_HOST>:4000)` trong hộp thoại cấu hình Server ở màn hình Đăng nhập; hoặc nhập tay IP mới tại màn Đăng nhập). Khi deploy chính thức ra Production/VPS, cần đồng bộ đẩy code Backend lên Render/VPS.
- **Lưu ý Windows Firewall khi test LAN tại máy Windows:** Nếu Wi-Fi đang ở profile **Public**, Windows Firewall sẽ có rule `Inbound Block` đối với `com.docker.backend.exe` chặn kết nối từ ESP32/điện thoại vào cổng Docker (`8554`, `8888`, `8889`, `8189`). Cần chuyển Wi-Fi sang **Private network** trong Windows Settings (hoặc mở Inbound Ports `4000, 8554, 8888, 8889, 8189` / cho phép `com.docker.backend.exe`) để ESP32 và điện thoại cùng mạng truy cập được Backend & MediaMTX.

---

## 7. Lưu ý Biên dịch Firmware ESP32-CAM (Arduino IDE / Core 3.3.12)

- **Board & Partition bắt buộc:** `AI Thinker ESP32-CAM` (`esp32:esp32:esp32cam`) với **Partition Scheme = `Huge APP (3MB No OTA/1MB SPIFFS)`**.
- **Thư viện sử dụng trong `d:\Study\IoT\Arduino\libraries`:**
  - `PubSubClient` (`2.8.0`) — dùng cho MQTT cổng `1883`.
  - `NimBLE-Arduino` — `esp32cam1.ino` đã tích hợp sẵn helper SFINAE `attachBleCallbacks` và 2 chữ ký `onWrite(...)` để tương thích cả `NimBLE-Arduino 2.x` lẫn `3.0.0-dev`.
- **Tối ưu bộ nhớ IRAM0:** Trên `esp32:esp32` Core `3.3.12` kết hợp `WiFi` + `NimBLE` + `esp_camera` + `SD_MMC`, vùng `.iram0.text` sát ngưỡng `0x400a0000`. Hàm `localtime_r` trong [`d:\Work\Austec\esp32cam1.ino`](file:///d:/Work/Austec/esp32cam1.ino) được đặt ở Flash (`.flash.text`, gọi `gmtime_r`) — theo map linker chỉ do FatFS `SD_MMC` gọi ở ngữ cảnh task thông thường — giúp giải phóng `599` bytes khỏi `libc.a` trong `.iram0.text`.

---

## 8. Quy trình 1 Lệnh Khi Đổi Wi-Fi Liên Tục

Khi di chuyển sang mạng Wi-Fi mới (IP máy Windows thay đổi):
1. Chạy từ thư mục `austec-iot-platform`:
   ```powershell
   .\scripts\sync-env.ps1 -AutoDetect
   ```
   (Hoặc sửa tay `SERVER_HOST` / `MEDIAMTX_HOST` trong [`.env`](file:///d:/Work/Austec/austec-iot-platform/.env) rồi chạy `.\scripts\sync-env.ps1`.)
2. Khởi động lại Backend Local (cổng `4000`) để nạp `.env` mới.
3. Khi bấm mở Camera trên Mobile App (hoặc nhập IP mới ở mục cấu hình Server màn Đăng nhập), Backend tự đẩy lệnh `rtsp:<MEDIAMTX_HOST>:<PORT>` qua MQTT trước lệnh `13`, giúp ESP32-CAM cập nhật ngay MediaMTX host mới vào NVS mà **không cần cắm dây nạp lại code**.
