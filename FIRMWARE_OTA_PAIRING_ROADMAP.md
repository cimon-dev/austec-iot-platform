# AUSTEC IOT PLATFORM: KẾ HOẠCH TRIỂN KHAI TOÀN DIỆN
## Module Quản Trị Firmware OTA, Hướng Dẫn Lắp Đặt & Ghép Nối Phần Cứng Trực Tiếp

---

### I. TỔNG QUAN HỆ THỐNG VÀ MỤC TIÊU DỰ ÁN

Tài liệu này xác định chi tiết kiến trúc, cấu trúc CSDL PostgreSQL, API Backend và Giao diện Web Admin nhằm giải quyết 3 bài toán trọng tâm:
1. **Module Quản trị Firmware & Chiến dịch OTA**: Quản lý phiên bản nhị phân `.bin`, danh sách thiết bị kèm trạng thái nạp, hỗ trợ nạp đồng bộ toàn bộ hoặc từng máy, lọc thiết bị lỗi / kẹt cập nhật.
2. **Module Quản trị Hướng Dẫn Lắp Đặt & Reset Phần Cứng**: Quản lý video, checklist thao tác từng bước và sơ đồ đấu dây phân loại theo từng dòng sản phẩm (`DOOR_GERMAN_ALU`, `DOOR_AU_STEEL`, `SMART_LOCK_MASARU`, `UPS_AC_220V`...).
3. **Cơ chế Ghép Nối & Điều Khiển Trực Tiếp Phần Cứng ESP32-C3** (`CodeCuaCuonBLE_esp32C3WIFI_ECO`):
   - Hỗ trợ 2 phương thức ghép nối: **Bluetooth BLE** và **WiFi SoftAP**.
   - Vòng tròn tiến trình 4 giai đoạn trực quan (0% - 100%) kèm xử lý Timeout 60s dẫn tới chỉ dẫn nhấn giữ nút cơ 10s để reset.
   - Tích hợp Gateway/Broker MQTT (Port 1883) tại Backend để nhận tín hiệu và điều khiển trực tiếp rơ-le (Mở/Đóng/Dừng) ăn khớp 100% với firmware.

```
+---------------------------------------------------------------------------------------+
|                                    AUSTEC WEB ADMIN                                   |
|  [Kho Firmware OTA]     [Chiến dịch Nạp Hàng Loạt]    [Quản trị Hướng Dẫn & Video]    |
+---------------------------------------------------------------------------------------+
                                           │ (HTTP REST / WebSocket)
                                           ▼
+---------------------------------------------------------------------------------------+
|                                  AUSTEC IOT BACKEND                                   |
|   - Express REST API (/api/admin/firmware, /api/admin/guides, /api/devices/control)    |
|   - Embedded MQTT Broker / Gateway (TCP Port 1883)                                    |
|   - Realtime WebSocket Server (ws://localhost:4000/ws/chat & device sync)             |
+---------------------------------------------------------------------------------------+
               │                                                    │
               │ (PostgreSQL Pool)                                  │ (MQTT Topics: 1883)
               ▼                                                    ▼
+-----------------------------+                    +------------------------------------+
|     POSTGRESQL DATABASE     |                    |      ESP32-C3 CỬA CUỐN THỰC TẾ     |
| - firmware_releases         |                    | (CodeCuaCuonBLE_esp32C3WIFI_ECO)   |
| - ota_campaigns             |                    | - Sub: {user}/{hwId}/sub/action    |
| - ota_device_records        |                    | - Pub: {user}/{hwId}/pub/action    |
| - installation_guides       |                    | - BLE Service: 6E400001-...        |
| - device_inventory          |                    | - Nút Reset vật lý (GPIO 0 - 10s)  |
+-----------------------------+                    +------------------------------------+
```

---

### II. THIẾT KẾ CƠ SỞ DỮ LIỆU POSTGRESQL MỚI

Bổ sung 4 bảng chuẩn hóa vào database `austec_iot_db`:

#### 1. Bảng `firmware_releases` (Quản lý các bản phát hành nhị phân)
```sql
CREATE TABLE IF NOT EXISTS firmware_releases (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  model_code VARCHAR(50) NOT NULL REFERENCES device_models(model_code),
  binary_filename VARCHAR(255) NOT NULL,
  binary_url VARCHAR(500) NOT NULL,
  file_size_bytes INT NOT NULL,
  sha256_checksum VARCHAR(64) NOT NULL,
  release_type VARCHAR(20) DEFAULT 'STABLE', -- 'STABLE', 'BETA', 'PATCH', 'DEPRECATED'
  is_active BOOLEAN DEFAULT TRUE,
  changelog TEXT NOT NULL,
  released_by VARCHAR(100) DEFAULT 'SYSTEM_ADMIN',
  created_at VARCHAR(50) NOT NULL
);
```

#### 2. Bảng `ota_campaigns` (Quản lý các chiến dịch nạp đồng bộ)
```sql
CREATE TABLE IF NOT EXISTS ota_campaigns (
  id SERIAL PRIMARY KEY,
  campaign_name VARCHAR(255) NOT NULL,
  target_model VARCHAR(50) NOT NULL,
  target_version VARCHAR(50) NOT NULL,
  rollout_type VARCHAR(50) DEFAULT 'ALL', -- 'ALL', 'CANARY', 'SELECTIVE', 'OFF_PEAK'
  status VARCHAR(50) DEFAULT 'RUNNING',  -- 'RUNNING', 'COMPLETED', 'PAUSED', 'FAILED'
  total_devices INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  in_progress_count INT DEFAULT 0,
  started_at VARCHAR(50) NOT NULL,
  completed_at VARCHAR(50)
);
```

#### 3. Bảng `ota_device_records` (Trạng thái nạp chi tiết của từng thiết bị)
```sql
CREATE TABLE IF NOT EXISTS ota_device_records (
  id SERIAL PRIMARY KEY,
  campaign_id INT REFERENCES ota_campaigns(id) ON DELETE CASCADE,
  hardware_id VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255),
  current_version VARCHAR(50) NOT NULL,
  target_version VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING', 
  -- Status enum: 'PENDING', 'DOWNLOADING', 'VERIFYING', 'SUCCESS', 'FAILED_OFFLINE', 'FAILED_CHECKSUM', 'SKIPPED'
  progress_pct INT DEFAULT 0,
  last_attempt_at VARCHAR(50),
  error_reason TEXT,
  retry_count INT DEFAULT 0
);
```

#### 4. Bảng `installation_guides` (Hướng dẫn lắp đặt & Reset theo sản phẩm)
```sql
CREATE TABLE IF NOT EXISTS installation_guides (
  id SERIAL PRIMARY KEY,
  model_code VARCHAR(50) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  video_duration VARCHAR(50),
  reset_pin_desc VARCHAR(255) NOT NULL,
  reset_hold_seconds INT DEFAULT 10,
  wiring_diagram_url VARCHAR(500),
  steps JSONB NOT NULL,
  faqs JSONB NOT NULL,
  updated_at VARCHAR(50) NOT NULL
);
```

---

### III. KIẾN TRÚC GHÉP NỐI PHẦN CỨNG THỰC TẾ (`CodeCuaCuonBLE`)

#### 1. Ánh xạ giao thức giữa Phần Cứng và Máy Chủ
| Kênh giao tiếp | Cấu hình trong Firmware | Hành động của Hệ thống Austec |
| :--- | :--- | :--- |
| **BLE Onboarding** | Service UUID: `6E400001-...`<br>RX Characteristic: `6E400002-...`<br>TX Characteristic: `6E400003-...` | App Mobile / Web Simulator gửi chuỗi:<br>`onboard/<ssid>/<pass>/<user_id>/<broker_ip>/1883`<br>Chip ESP32 nhận, lưu EEPROM và khởi động lại. |
| **WiFi SoftAP Onboard** | SSID AP: `amtuong1994`<br>Web Server Port: 80 | Trình duyệt/App gửi HTTP GET:<br>`http://192.168.4.1/?SSID=...&PASS=...&USER=...&IP=...&PORT=1883` |
| **MQTT Lệnh điều khiển** | Subscribe: `{user}/{device_id}/sub/action` | Backend gửi giá trị String:<br>`"1"`: Mở cửa (Kích rơ-le RL_UP)<br>`"2"`: Đóng cửa (Kích rơ-le RL_DOWN)<br>`"3"`: Dừng khẩn cấp (Kích rơ-le RL_STOP)<br>`"11"`: Học lệnh RF 433MHz<br>`"12"`: Xóa bộ nhớ RF Remote |
| **MQTT Trạng thái cảm biến** | Publish: `{user}/{device_id}/pub/action` | ESP32 tự động gửi khi công tắc chạm:<br>`"4"`: Cửa đã mở hoàn toàn (CB_UP chạm đất)<br>`"5"`: Cửa đã đóng hoàn toàn (CB_DOWN chạm đất) |
| **MQTT Báo Online / Onboard** | Publish: `{user}/{device_id}/onboard`<br>Publish: `{user}/{device_id}/pub/isonline` | Backend nhận diện thiết bị Online ngay lập tức, kích hoạt trạng thái trong `device_inventory`. |

#### 2. Vòng tròn tiến trình ghép nối 4 chặng (0% - 100%)
- **Chặng 1 (0% - 25%)**: Dò quét và thiết lập kênh truyền (BLE handshake hoặc SoftAP probe).
- **Chặng 2 (25% - 50%)**: Mã hóa và truyền tải thông tin mạng WiFi gia đình + Địa chỉ MQTT Broker về chip.
- **Chặng 3 (50% - 75%)**: Chip ESP32 ghi nhớ cấu hình vào Flash, nhấp nháy đèn LED và reboot kết nối WiFi gia đình.
- **Chặng 4 (75% - 100%)**: Backend bắt tín hiệu gói tin `onboard` qua MQTT, xác thực quyền sở hữu và kích hoạt thiết bị thành công.
- **Xử lý Timeout 60s**: Nếu sau 60 giây không nhận được gói tin xác nhận từ Cloud, giao diện chuyển trạng thái Cảnh báo:
  - Chỉ dẫn chi tiết: *"Nhấn giữ nút bấm cứng trên mạch trong 10 giây cho đến khi đèn LED nháy 3 lần để reset lại bộ nhớ"*.
  - Nút bấm trực tiếp: *"Xem video & Hướng dẫn lắp đặt / Reset"* dẫn ngay tới bài hướng dẫn của Model tương ứng.

---

### IV. CÁC MÀN HÌNH QUẢN TRỊ TRÊN WEB ADMIN

1. **Trang Quản Trị Firmware & OTA (`/devices/firmware`)**:
   - Kho lưu trữ danh sách phiên bản `.bin` (v1.0.0, v1.0.1, v1.1.0...).
   - Thẻ thống kê tỷ lệ phiên bản: Tỷ lệ phủ sóng, số máy đã nâng cấp, số máy lỗi/kẹt.
   - Bảng danh sách thiết bị kèm version hiện tại, nút cập nhật đơn lẻ.
   - Hộp thoại tạo chiến dịch cập nhật đồng bộ (Bulk Update) với thanh tiến độ realtime.
   - Nút "Thử lại thiết bị lỗi (Retry Failed)".

2. **Trang Quản Trị Hướng Dẫn Lắp Đặt & Reset (`/guides`)**:
   - Bộ chọn dòng sản phẩm (Cửa cuốn Đức, Cửa cuốn Úc, Khóa Masaru, Lưu điện UPS...).
   - Trình phát Video hướng dẫn nhúng trực quan.
   - Khung checklist hướng dẫn thao tác nút Reset vật lý 10s kèm hình ảnh vị trí chân GPIO.
   - Sơ đồ đấu nối dây rơ-le và cảm biến an toàn.
   - Nút chỉnh sửa / cập nhật nội dung cho quản trị viên.

3. **Phòng Thí Nghiệm Ghép Nối & Điều Khiển Phần Cứng Trực Tiếp (`/devices/pairing-lab`)**:
   - Màn hình mô phỏng quy trình ghép nối thực tế (BLE / WiFi) với vòng tròn tiến trình 0 - 100%.
   - Bảng test điều khiển thời gian thực: Gửi lệnh Mở (1), Đóng (2), Dừng (3), Học RF (11), Xóa RF (12) thẳng tới mạch thật qua MQTT Broker.
   - Khung hiển thị Log giao tiếp thời gian thực (Heartbeat, Ack, Latency ms).

---

### V. KẾ HOẠCH KIỂM THỬ (TEST PLAN)

1. **Kiểm thử CSDL & API**:
   - Tạo mới các bảng trong PostgreSQL và nạp seed data thành công.
   - Test các endpoint REST API: thêm/sửa/xóa firmware, khởi tạo chiến dịch OTA, retry thiết bị lỗi, truy vấn hướng dẫn lắp đặt theo model.
2. **Kiểm thử Giao diện Web Admin**:
   - Kiểm tra hiển thị responsive, theme tối hiện đại, tương tác mượt mà trên `/devices/firmware`, `/guides` và `/devices/pairing-lab`.
   - Test luồng cập nhật hàng loạt và đơn lẻ trên giao diện.
3. **Kiểm thử Ghép Nối & MQTT Gateway**:
   - Kích hoạt MQTT Broker port 1883 trên Backend.
   - Giả lập/Kết nối trực tiếp client mang `device_id: amtuong1994` theo đúng topic của mqtt.h.
   - Kiểm tra phát lệnh Mở/Đóng/Dừng và nhận phản hồi công tắc hành trình 4/5.
