# HƯỚNG DẪN TRIỂN KHAI NÂNG CẤP FIRMWARE TỪ XA (OTA) CHO TOÀN HỆ THỐNG AUSTEC IOT
*(Áp dụng cho Cửa cuốn, Ổ cắm thông minh & Lộ trình nâng cấp Camera)*

---

## 1. TỔNG QUAN VỀ CƠ CHẾ NẠP FIRMWARE TỪ XA (OTA - OVER THE AIR)

**OTA (Over-The-Air)** là tính năng cho phép vi điều khiển (ESP32 / ESP32-C3 / ESP32-S3) tự động kết nối Internet, tải file firmware đã biên dịch sẵn (`.bin`) từ máy chủ Cloud về và tự ghi đè vào bộ nhớ Flash để nâng cấp phần mềm mà **không cần kỹ thuật viên phải đến tận nhà khách hàng cắm cáp USB**.

```text
[Quản trị viên / Admin Web]
        │
        │ 1. Upload file "firmware_v1.0.2.bin" lên Cloud Storage (R2 / S3)
        ▼
[Backend Cloud Render]
        │
        │ 2. Bắn lệnh MQTT: `OTA_UPDATE:https://cdn.austec.vn/firmware_v1.0.2.bin`
        ▼
[Thiết bị: Cửa cuốn / Ổ cắm / Camera]
        │
        │ 3. Tải file .bin về phân vùng Flash dự phòng (OTA_1)
        │ 4. Kiểm tra mã băm MD5 / Checksum tính toàn vẹn
        │ 5. Đổi cờ Bootloader -> Tự khởi động lại sang bản mới
        ▼
[Hoàn tất nâng cấp mà không gián đoạn hoạt động]
```

---

## 2. PHÂN TÍCH KHẢ NĂNG THỰC HIỆN TRÊN TỪNG THIẾT BỊ HIỆN TẠI

### A. Cửa cuốn & Ổ cắm (RẤT DỄ LÀM - LÀM ĐƯỢC NGAY TRÊN PHẦN CỨNG HIỆN TẠI)
* **Phần cứng hiện tại:** ESP32 hoặc ESP32-C3 (bộ nhớ Flash tiêu chuẩn **4MB**).
* **Dung lượng code hiện tại:**
  * Cửa cuốn ([CodeCuaCuonBLE.ino](file:///d:/Work/Austec/CodeCuaCuonBLE_esp32C3WIFI_ECO/CodecuacuonBle/CodeCuaCuonBLE/CodeCuaCuonBLE.ino)) & Ổ cắm ([CodeOCAM.ino](file:///d:/Work/Austec/ocammoi/CodeOCAM/CodeOCAM.ino)) chỉ sử dụng Wi-Fi, BLE nhẹ, MQTT và điều khiển Relay/RF.
  * Kích thước file biên dịch `.bin` chỉ khoảng **600 KB ~ 850 KB**.
* **Đánh giá:**
  * Bộ nhớ Flash 4MB hoàn toàn dư sức chia làm 2 phân vùng `ota_0` (1.4MB) và `ota_1` (1.4MB).
  * **Kết luận:** Cửa cuốn và Ổ cắm **100% đủ điều kiện làm OTA ngay trên phần cứng hiện tại**, không cần thay đổi hay nâng cấp linh kiện gì.

---

### B. Camera ESP32-CAM AI-Thinker Hiện Tại (RÀO CẢN LỚN - CẦN NÂNG CẤP PHẦN CỨNG)
* **Phần cứng hiện tại:** Mạch ESP32-CAM AI-Thinker OV2640 (Flash **4MB**, PSRAM ngoài **4MB**, chip đơn lõi/kép thế hệ cũ).
* **Kích thước code hiện tại:** Đã chiếm tới **~1.6 MB** (Driver OV2640 + DMA + RTSP Push RFC 2435 + NimBLE + MQTT + SD_MMC).
* **Rào cản vật lý không thể vượt qua:**
  1. **Tràn bộ nhớ Flash (Flash Overflow):** Nếu chia Flash 4MB ra làm đôi để chạy 2 bản OTA (`app0` và `app1`), mỗi bên chỉ được tối đa ~1.4MB. Bản code camera 1.6MB sẽ **bị compiler báo lỗi `Sketch too big` ngay lập tức**. Hiện tại camera bắt buộc phải dùng phân vùng `Huge APP (3MB No OTA)` mới chứa đủ code.
  2. **Tràn bộ nhớ RAM (IRAM / Heap):** Khi vừa duy trì luồng Camera vừa tải stream file `.bin` qua giao thức HTTPS SSL/TLS, bộ nhớ RAM IRAM0 của ESP32 thế hệ cũ sẽ bị cạn kiệt, rất dễ gây treo chip hoặc đứt kết nối giữa chừng (dẫn tới nguy cơ "brick" mạch).

---

## 3. LƯU Ý BẮT BUỘC ĐỂ NÂNG CẤP CAMERA HỖ TRỢ OTA

Để Camera của Austec có thể nâng cấp phần mềm từ xa (OTA) an toàn, ổn định 100% như các dòng camera EZVIZ, Imou hay Hikvision trên thị trường, **bắt buộc phải nâng cấp phần cứng theo 1 trong 2 phương án sau**:

### Phương án Chuẩn Công Nghiệp (Khuyên Dùng): Nâng cấp lên ESP32-S3 Camera
* **Dòng chip khuyến nghị:** **ESP32-S3-WROOM-1-N8R8** hoặc **N16R8** (ESP32-S3 CAM).
* **Thông số phần cứng:**
  * **Flash:** **8MB** hoặc **16MB** *(gấp 2 đến 4 lần chip cũ)*.
  * **PSRAM:** **8MB Octal SPI** *(băng thông cao gấp 4 lần chip cũ, hỗ trợ 25-30 FPS mượt mà)*.
  * **Kiến trúc:** Lõi kép 240MHz hỗ trợ tập lệnh xử lý Vector AI cho hình ảnh.
* **Lợi thế vượt trội cho OTA:**
  * Bảng phân vùng Flash 8MB/16MB cho phép dành hẳn **3.5MB cho `ota_0`** và **3.5MB cho `ota_1`**.
  * Chứa thoải mái toàn bộ tính năng Camera HD, RTSP, BLE, Wi-Fi mà vẫn dư thừa 50% dung lượng cho các bản cập nhật trong 5 năm tới.
  * Quá trình tải OTA hoàn toàn diễn ra ngầm trên lõi CPU thứ 2 (Core 1), không làm gián đoạn hay treo camera.

---

## 4. CHI TIẾT CÁC CÔNG VIỆC PHẢI LÀM KHI TRIỂN KHAI OTA TRONG TƯƠNG LAI

Khi bạn bắt đầu bấm máy triển khai tính năng OTA, hệ thống sẽ thực hiện theo 4 hạng mục công việc sau:

### HẠNG MỤC 1: NÂNG CẤP TRÊN PHÍA FIRMWARE (Cửa cuốn, Ổ cắm & ESP32-S3)
1. **Thay đổi Bảng phân vùng (Partition Scheme) trong Arduino IDE:**
   * Chuyển từ `Huge APP (No OTA)` sang `Minimal SPIFFS (1.9MB APP with OTA)` cho Cửa cuốn / Ổ cắm.
   * Chọn `Default 8MB with OTA` cho ESP32-S3 Camera.
2. **Tích hợp thư viện cập nhật:**
   * Sử dụng thư viện chuẩn `HTTPUpdate.h` và `WiFiClientSecure.h`.
3. **Lắng nghe lệnh cập nhật qua MQTT:**
   * Thiết bị subscribe topic: `devices/<hardware_id>/ota/cmd`.
   * Nhận lệnh dạng JSON:
     ```json
     {
       "action": "UPGRADE_FIRMWARE",
       "version": "1.0.2",
       "url": "https://cdn.austec.vn/firmware/cuacuon_v1.0.2.bin",
       "md5": "e99a18c428cb38d5f260853678922e03"
     }
     ```
4. **Cơ chế an toàn (Safety Rollback):**
   * Nếu sau khi nạp bản mới mà chip bị crash khởi động liên tục quá 3 lần: Chip tự động quay ngược trở về bản firmware cũ ở phân vùng trước đó (tính năng tự phục hồi chống hỏng thiết bị của ESP-IDF).

---

### HẠNG MỤC 2: PHÁT TRIỂN TRÊN BACKEND (Render Node.js)
1. **Module Quản lý Firmware (`/api/firmware`):**
   * Bảng CSDL `firmware_versions`: Lưu trữ `version_code`, `target_device_type` (`CUA_CUON`, `O_CAM`, `CAMERA`), `file_url`, `checksum_md5`, `changelog`.
2. **Kho lưu trữ file nhị phân (Binary Storage):**
   * Tận dụng Cloudflare R2 hoặc AWS S3 (đã có sẵn trong backend Austec) để lưu file `.bin` với tốc độ tải cao.
3. **Tiến trình điều phối nạp (OTA Coordinator):**
   * API cho phép gửi lệnh nâng cấp cho:
     * 1 thiết bị đơn lẻ (để test thử nghiệm trước).
     * Hoặc toàn bộ thiết bị theo lô (Rollout toàn bộ khách hàng).

---

### HẠNG MỤC 3: GIAO DIỆN TRÊN WEB ADMIN & MOBILE APP
1. **Trên Web Admin (Quản trị viên):**
   * Màn hình **Quản lý Firmware**: Nút bấm Upload file `.bin` mới, nhập ghi chú cập nhật (`v1.0.1 -> v1.0.2`).
   * Danh sách thiết bị: Cột hiển thị phiên bản firmware hiện tại của từng máy, kèm nút *"Cập nhật ngay"*.
2. **Trên Mobile App (Khách hàng):**
   * Tại màn hình Cài đặt thiết bị: Hiển thị dòng *"Phiên bản Firmware: v1.0.1"*.
   * Khi có bản mới: Hiển thị chấm đỏ thông báo và nút *"Cập nhật phiên bản mới"*.
   * Trong lúc cập nhật: Hiển thị vòng xoay tiến trình `10% -> 50% -> 100% -> Hoàn tất`.

---

## 5. TỔNG KẾT BẢNG SO SÁNH & LỘ TRÌNH THỰC HIỆN

| Thiết bị | Khả năng làm OTA | Phần cứng cần nâng cấp | Mức độ phức tạp | Khuyến nghị thời điểm triển khai |
| :--- | :---: | :--- | :---: | :--- |
| **Ổ cắm Austec** | **Khả thi 100%** | Giữ nguyên ESP32 / ESP32-C3 hiện tại | Dễ | Có thể làm bất cứ lúc nào |
| **Cửa cuốn Austec** | **Khả thi 100%** | Giữ nguyên ESP32 / ESP32-C3 hiện tại | Dễ | Có thể làm bất cứ lúc nào |
| **Camera AI-Thinker** | **Không khuyến nghị** | Thiếu bộ nhớ Flash 4MB, IRAM quá tải | Rất rủi ro | Không nên làm trên bản này |
| **Camera ESP32-S3** | **Khả thi 100%** | Nâng cấp lên module ESP32-S3 Flash 8MB/16MB | Chuẩn mực | Triển khai đồng bộ cùng đợt nâng cấp phần cứng Camera |

