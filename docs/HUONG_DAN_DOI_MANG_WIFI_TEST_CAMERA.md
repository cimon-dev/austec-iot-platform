# HƯỚNG DẪN ĐỔI MẠNG WI-FI KHI TEST CAMERA (LOCAL)

Tài liệu hướng dẫn ngắn gọn các bước thực hiện khi mang Laptop sang mạng Wi-Fi khác (quán cà phê, công ty, nhà khác) mà vẫn muốn test toàn bộ luồng Camera và Mobile App.

---

### BƯỚC 1: KẾT NỐI CHUNG MẠNG WI-FI
Đảm bảo cả **3 thiết bị** cùng bắt vào một mạng Wi-Fi:
1. Laptop (nơi chạy Docker MediaMTX).
2. Điện thoại (chạy Mobile App Austec).
3. Mạch Camera ESP32-CAM.

---

### BƯỚC 2: CẬP NHẬT IP MỚI CỦA LAPTOP (1 CLICK TỰ ĐỘNG)
Khi sang Wi-Fi mới, IP của Laptop sẽ thay đổi. Bạn chỉ cần chạy đúng 1 lệnh để hệ thống tự động phát hiện IP mới và cập nhật Docker MediaMTX:

1. Mở PowerShell tại thư mục: `austec-iot-platform`
2. Chạy lệnh:
   ```powershell
   .\scripts\sync-env.ps1 -AutoDetect
   ```
*(Lệnh này tự dò IPv4 mới của Laptop, tự ghi đè vào file `.env` và tự khởi động lại MediaMTX trong 2 giây).*

---

### BƯỚC 3: CẬP NHẬT TRÊN MOBILE APP
1. Mở Mobile App -> Tại màn hình **Đăng nhập**, bấm vào biểu tượng **Cấu hình Máy chủ** (hoặc nút chọn Server).
2. Tại dòng **MediaMTX Host**: Nhập địa chỉ IPv4 mới của Laptop *(IP hiển thị trong thông báo của Bước 2, ví dụ: `192.168.1.25`)*.
3. Bấm **Lưu**.

---

### BƯỚC 4: KẾT NỐI CAMERA ESP32-CAM VÀO WI-FI MỚI
*Nếu Wi-Fi mới có tên hoặc mật khẩu khác với Wi-Fi cũ:*
1. Mở App -> Bấm **Xóa thiết bị** Camera cũ *(Camera đang bật nguồn sẽ tự xóa bộ nhớ và mở lại sóng Bluetooth BLE)*.
2. Trên App chọn **Thêm thiết bị** -> Quét Bluetooth BLE (`setup-camera`) -> Nhập tên & mật khẩu Wi-Fi mới để nạp mạng cho camera.
3. Khi Camera đã có Wi-Fi và báo Online: Bấm mở xem camera trên App, hệ thống sẽ **tự động bắn IP Laptop mới xuống camera qua MQTT**, camera tự truyền video về Laptop mà **không cần cắm cáp nạp lại code**.

---

### BƯỚC 5: LƯU Ý TƯỜNG LỬA WINDOWS (BẮT BUỘC)
Khi mới bắt mạng Wi-Fi mới, Windows thường mặc định chặn các cổng mạng kết nối vào Docker:
1. Vào **Windows Settings** -> **Network & internet** -> **Wi-Fi**.
2. Nhấp vào tên mạng Wi-Fi đang kết nối.
3. Chuyển từ **Public network** sang **Private network**.

---

### KIỂM TRA NHANH KHI CẦN
* **Kiểm tra luồng MediaMTX trên Laptop:**
  Mở trình duyệt gõ: `http://localhost:8889/live/CAM704BCA465690/`
* **Xem log Docker MediaMTX:**
  ```powershell
  docker logs --tail 30 -f austec_mediamtx
  ```

