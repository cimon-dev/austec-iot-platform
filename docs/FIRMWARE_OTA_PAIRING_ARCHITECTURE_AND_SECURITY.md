# KIẾN TRÚC CẬP NHẬT FIRMWARE OTA, CƠ CHẾ GHÉP NỐI THÔNG MINH VÀ BẢO MẬT 2 LỚP (ADMIN 2FA)

Tài liệu này hệ thống hóa toàn bộ kiến trúc kỹ thuật về **Cập nhật Firmware qua mạng (OTA)**, **Cơ chế ghép nối & Đặt lại thiết bị (Smart Pairing & Reset)** và **Cơ chế xác thực bảo mật 2 lớp qua Email (Admin 2FA)** cho nền tảng Austec Smart IoT Platform.

---

## PHẦN I. CƠ CHẾ NẠP FIRMWARE TỪ XA (OTA - OVER-THE-AIR)

### 1. Bản chất Phần Cứng và Phần Mềm
* **Khẳng định**: **100% việc nạp OTA được giải quyết bằng Phần Mềm (Code Firmware + Backend Server)**, hoàn toàn **KHÔNG CẦN THAY ĐỔI HOẶC THÊM BỚT BẤT KỲ LINH KIỆN PHẦN CỨNG NÀO**.
* **Nền tảng phần cứng**: Dòng vi điều khiển hiện đại như ESP32 / ESP32-C3 trên bo mạch Austec đã tích hợp sẵn phần cứng hỗ trợ nạp OTA từ trong kiến trúc chip (Hỗ trợ Dual-Bank Flash, phần cứng mã hóa SHA/AES và Bootloader thông minh).

### 2. Nguyên lý Phân vùng Bộ nhớ kép (Dual-Bank Partition Scheme)
Bộ nhớ Flash trên bo mạch (tiêu chuẩn 4MB hoặc 8MB) được chia thành các phân vùng độc lập:

```
[BỘ NHỚ FLASH ESP32 - 4MB / 8MB]
┌────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Bootloader │  Phân vùng A     │  Phân vùng B     │ Dữ liệu Cấu hình │
│ & otadata  │  (app0 - ĐANG CHẠY) (app1 - NẠP MỚI)   │ (nvs_flash / WiFi│
└────────────┴──────────────────┴──────────────────┴──────────────────┘
```

* **Phân vùng A (`app0`)**: Chứa firmware hiện tại của thiết bị, thực hiện các tác vụ điều khiển rơ-le, nhận nút bấm, điều khiển cửa cuốn bình thường.
* **Phân vùng B (`app1`)**: Phân vùng dự phòng trống. Khi có lệnh cập nhật, dữ liệu mới sẽ được tải và ghi thẳng vào đây.
* **Phân vùng `otadata`**: Con trỏ điều khiển của Bootloader, lưu trữ địa chỉ phân vùng sẽ khởi động trong lần bật nguồn tiếp theo.

### 3. Quy trình 5 bước Nạp Firmware Không Dây An Toàn
1. **Phát lệnh cập nhật (Trigger via MQTT)**:
   * Quản trị viên kích hoạt chiến dịch trên Web Admin `/devices/firmware`.
   * Backend phát bản tin qua MQTT Broker:
     ```json
     Topic: austec/<HARDWARE_ID>/sub/ota
     {
       "action": "OTA_UPDATE",
       "targetVersion": "v1.2.0",
       "firmwareUrl": "https://api.austec.vn/firmware/cuacuon_v1.2.0.bin",
       "sha256": "8f4e2b1a9c3d5e7f0b2a4c6e8d1f3b5a7c9e0d2f4a6b8c1e3d5f7a9b0c2e4f6a",
       "fileSizeBytes": 1602112
     }
     ```
2. **Tải dữ liệu qua HTTP/HTTPS**:
   * Thiết bị nhận lệnh, mở kết nối HTTP/HTTPS đến máy chủ để tải file `.bin`.
   * Trong lúc tải, thiết bị ghi dữ liệu từng khối (Stream Write) vào Phân vùng B (`app1`). Toàn bộ hoạt động cửa cuốn vẫn được duy trì an toàn.
3. **Kiểm tra toàn vẹn (Checksum SHA-256 Validation)**:
   * Sau khi tải đủ số byte, vi điều khiển tự tính mã băm SHA-256 của phân vùng vừa ghi và so sánh với mã SHA-256 từ máy chủ.
   * Nếu phát hiện sai lệch (do mất gói tin mạng hoặc chập chờn) $\rightarrow$ Huỷ bỏ nạp, giữ nguyên phân vùng A, gửi bản tin `FAILED_CHECKSUM` về máy chủ.
4. **Chuyển cờ Bootloader & Tự Khởi Động Lại**:
   * Nếu mã băm khớp 100%, chip ghi cờ kích hoạt phân vùng B vào `otadata` và thực hiện `ESP.restart()`.
5. **Khởi động và Cơ chế Tự Phục Hồi (Auto-Rollback)**:
   * Thiết bị khởi động lại từ Phân vùng B. Nếu firmware mới chạy ổn định và kết nối được WiFi/MQTT, chip sẽ đánh dấu phân vùng mới là `VALID`.
   * **Cơ chế chống treo chip (Brick-Protection)**: Nếu firmware mới bị lỗi crash liên tục hoặc treo Watchdog Timer $\rightarrow$ Bootloader của ESP32 tự động quay trở lại (Rollback) Phân vùng A cũ, đảm bảo thiết bị không bao giờ bị mất liên lạc.

---

## PHẦN II. TIẾN HÓA CƠ CHẾ GHÉP NỐI & ĐẶT LẠI THIẾT BỊ (SMART PAIRING)

### 1. Bản chất Kỹ thuật của Nút Reset 10 Giây
* **Về phần cứng**: Nút bấm vật lý chỉ là công tắc cơ nối với chân `GPIO 0` của vi điều khiển. Chân này chỉ có 2 mức điện áp: `LOW (0V)` khi bị bấm và `HIGH (3.3V)` khi nhả ra.
* **Về phần mềm**: Việc phải giữ 10 giây hoàn toàn do đoạn code đếm thời gian trong Firmware quy định (`millis() - pressTime >= 10000`).

### 2. Kế hoạch Tiến hóa: Loại bỏ thao tác leo trèo bấm nút 10s
Vì hộp điều khiển cửa cuốn thường được lắp trên cao (hộp kỹ thuật hoặc sát trần nhà), việc bắt người dùng trèo thang lên ấn giữ 10s rất bất tiện và nguy hiểm. Lộ trình cải tiến như sau:

| Phương Án | Cách Thực Hiện Bằng Code | Trải Nghiệm Người Dùng |
| :--- | :--- | :--- |
| **1. Ghép nối qua Bluetooth BLE nền (Ưu tiên)** | Mạch luôn phát sóng BLE quảng bá ở chế độ bảo mật thấp. Khi người dùng mở App bấm "Thêm thiết bị", App tự dò thấy và truyền WiFi qua BLE. | Đứng dưới sàn cầm điện thoại bấm nút là kết nối xong trong 3 giây. |
| **2. Bật/Tắt Nguồn Điện (Power-Cycle Pairing)** | Khi bật aptomat hoặc cấp điện nguồn cho hộp điều khiển, code trong chip tự mở cửa sổ ghép nối trong 3 - 5 phút đầu tiên. | Bật công tắc điện rồi quét app, sau 5 phút mạch tự khóa lại an toàn. |
| **3. Đặt lại từ xa qua App (Remote In-App Reset)** | Khách hàng hoặc kỹ thuật viên bấm "Xóa thiết bị" hoặc "Chuyển nhượng" trên Mobile App / Web Admin $\rightarrow$ Máy chủ gửi lệnh qua mạng yêu cầu chip xóa bộ nhớ Flash NVS. | Không cần bất kỳ thao tác vật lý nào vào phần cứng. |
| **4. Tổ hợp nút bấm tiện dụng** | Sửa code: Bấm nhanh 3 lần liên tiếp (Triple-Click) hoặc bấm giữ phím Khóa trên tay Remote cầm tay (RF 433MHz). | Thao tác bằng điều khiển từ xa có sẵn trong tay. |

---

## PHẦN III. CƠ CHẾ BẢO MẬT 2 LỚP (ADMIN EMAIL OTP 2FA)

Do mã nguồn Firmware và tệp nhị phân `.bin` là tài sản trí tuệ cốt lõi của công ty, đồng thời việc nạp firmware sai có thể ảnh hưởng đến an toàn vận hành của hàng nghìn bộ cửa cuốn ngoài đời, hệ thống thiết kế cơ chế bảo vệ 2 lớp như sau:

### 1. Các Hành Động Bắt Buộc Xác Thực Email OTP
1. **Xem mã nguồn nhúng (Code Preview)** của từng dòng thiết bị.
2. **Tải lên bản phát hành Firmware mới** (`.bin`).
3. **Kích hoạt chiến dịch nạp hàng loạt (Mass Rollout Campaign)** cho toàn bộ thiết bị khách hàng.

### 2. Luồng Hoạt Động (OTP Flow)
```
[Admin Bấm Yêu Cầu] 
        │
        ▼
[Hệ thống sinh mã OTP 6 số ngẫu nhiên] ──► [Gửi qua SMTP tới admin@austec.vn]
        │                                  (Hạn sử dụng 5 phút, giới hạn 3 lần thử)
        ▼
[Admin nhập OTP vào Dialog Web Admin]
        │
        ├─► Hợp lệ ──► Cấp phiên làm việc bảo mật (15 phút) ──► Mở khóa xem Code / Upload
        └─► Sai ────► Báo lỗi, sau 3 lần sai tự động khóa chức năng 30 phút
```

### 3. Ghi Nhật Ký Kiểm Toán (Audit Trail)
Mọi hành vi mở khóa xem mã nguồn hoặc phát hành firmware đều được hệ thống ghi nhận vào Hộp đen kiểm toán (`audit_logs`) với mã băm SHA-256 bao gồm:
* Email quản trị viên thực hiện.
* Địa chỉ IP và thiết bị truy cập.
* Mã model và phiên bản firmware thao tác.
* Thời gian chuẩn xác đến từng mili-giây.
