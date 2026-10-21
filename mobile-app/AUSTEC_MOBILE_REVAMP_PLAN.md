# KẾ HOẠCH PHÁT TRIỂN NÂNG CẤP AUSTEC IOT MOBILE APP
**Dự án:** Austec IoT Mobile App (Phiên bản 2.0 Luxury Dark Glassmorphism & Orbital Architecture)  
**Địa chỉ mã nguồn phát triển:** `d:\Work\Austec\austec-iot-platform\mobile-app`  
**Kế thừa concept:** `d:\Work\Austec\3projects\3projects\austec_green_app` (Khối trung tâm user info + 6 quả cầu danh mục xoay quanh + điều khiển preview + chi tiết thiết bị + Shop native + Chat CSKH với admin + Ghép nối thiết bị).

---

## 1. MỤC TIÊU VÀ TỔNG QUAN YÊU CẦU

1. **Khối trung tâm (Hub Center)**: 
   - Đặt ngay tại tâm vòng tròn quỹ đạo: Hiển thị Avatar, Tên người dùng, Lời chào, Vị trí địa lý, Thời tiết, Nhiệt độ, Độ ẩm môi trường thực tế, Thời gian thực (chạy từng giây).
   - Bộ chọn nhanh ngữ cảnh ngôi nhà: "Ở nhà" (Home) / "Vắng nhà" (Away) / "Đi ngủ" (Sleep).
   - Chuông thông báo thông minh + Trung tâm thông báo an ninh (Notification Center).

2. **Các Quả cầu / Khối phụ xung quanh (Orbiting Category Spheres)**:
   - 6 quả cầu danh mục chính theo phong cách Neon Cyber Glassmorphism xoay quanh tâm:
     1. **DOORS** - Cửa Cuốn Austec (Icon/ảnh doors, đếm số cửa, trạng thái mở/đóng)
     2. **LIGHT & RELAY** - Chiếu Sáng & Rơ-le (Số bóng đang bật/tắt, công suất)
     3. **ENVIRONMENT** - Cảm Biến Môi Trường (Nhiệt độ, độ ẩm phòng khách, chất lượng khí)
     4. **SECURITY CAM** - Camera An Ninh (Trạng thái camera trực tuyến, phát hiện người)
     5. **ENERGY & UPS** - Quản Lý Năng Lượng & Lưu Điện (Điện áp lưới, dung lượng pin UPS, xả bảo dưỡng)
     6. **OTHERS CONTROL** - Thiết Bị Khác & Cảnh Báo (Cảm biến khói, rò nước, chuông cửa)
   - Mỗi quả cầu có hiệu ứng nhịp đập Pulse cảnh báo đỏ khi có sự cố, hiển thị badge số lượng thiết bị sở hữu.

3. **Cơ chế tương tác khi bấm vào Quả cầu Danh mục (Category -> Device List)**:
   - Chạm vào quả cầu bất kỳ -> Mở modal / màn hình **Danh sách thiết bị thuộc danh mục đó** mà người dùng sở hữu.
   - Mỗi thẻ thiết bị gồm: Tên thiết bị, Vị trí phòng (Tầng 1, Gara, Phòng khách...), Hardware ID, Huy hiệu Online/Offline.
   - **Nút bấm Preview điều khiển nhanh ngay trên thẻ**:
     - *Cửa cuốn*: Nút MỞ CỬA, DỪNG, ĐÓNG, Khóa trẻ em (Khóa remote).
     - *Đèn / Rơ-le*: Công tắc BẬT / TẮT 1 chạm, thanh chỉnh độ sáng.
     - *Camera*: Nút Xem trực tiếp (Live snapshot), Bật còi cảnh báo.
     - *UPS & Năng lượng*: Nút Bật xả bảo dưỡng thông minh, Xem công suất tiêu thụ (W).
   - **Nút "Xem Chi Tiết" (Detail)**: Điều hướng sang màn hình **Device Detail Screen** chuyên sâu.

4. **Màn hình Chi tiết Thiết bị (Device Detail Screen)**:
   - Điều khiển trực quan (Thanh trượt mở cửa theo %, nút dừng khẩn cấp).
   - Cài đặt và học tay điều khiển RF (mô phỏng lệnh `RF_setup` và `RF_clear` từ bo mạch).
   - Hộp đen kiểm toán & Nhật ký đóng mở thời gian thực.
   - Thông số kỹ thuật viễn thám (Điện áp, Ampe dòng tải motor, RSSI WiFi, mã bảo hành điện tử chính hãng).

5. **Nút "Ghép Nối Thiết Bị Mới" (Pairing / Provisioning)**:
   - Đặt nổi bật ở Top Header màn hình chính.
   - Quy trình 3 bước trực quan: Quét QR Hardware ID -> Quét Bluetooth BLE -> Nhập WiFi nhà & kích hoạt bảo hành 24 tháng.

6. **Trang Mua Sắm (Shop / Storefront - Native UI)**:
   - Xóa bỏ việc nhúng Webview chậm chạp, xây dựng màn hình Native hiện đại.
   - Thanh lọc Tabs theo danh mục: Cửa cuốn, Khóa thông minh, UPS, Động cơ, Phụ kiện.
   - Lưới sản phẩm sang trọng (Grid card): Ảnh sắc nét, Tên, Giá, Đánh giá, Huy hiệu 24 tháng bảo hành, Nút "Đặt mua / Nhận tư vấn".

7. **Trang Chat CSKH (Customer Support Live Chat)**:
   - Kết nối trực tiếp với giao diện Web Admin.
   - Tính năng độc quyền: Nút đính kèm **Gói Chẩn Đoán Viễn Thám (Telemetry Snapshot)** gửi trực tiếp thông số bo mạch (Hardware ID, điện áp, dòng Ampe, lỗi) cho kỹ thuật viên.
   - Hỗ trợ gửi ảnh hiện trường thực tế, tin nhắn thời gian thực.

8. **Trang Cá Nhân & Gia Đình (Profile & Settings)**:
   - Quản lý tài khoản, đổi avatar, thông tin người dùng.
   - Phân quyền gia đình (Owner, Member, Guest).
   - Thẻ bảo hành điện tử chính hãng tổng hợp.

---

## 2. KẾ HOẠCH TRIỂN KHAI THEO CÁC BƯỚC CỤ THỂ

### BƯỚC 1: Xây dựng Kiến trúc Data Model & Mock Data hoàn chỉnh
- Nâng cấp `device_model.dart`:
  - Mở rộng `DeviceCategory` gồm: `rollerDoor`, `lightSwitch`, `camera`, `environmentSensor`, `energyUps`, `otherDevices`.
  - Thêm `CategoryMeta` chứa tên hiển thị, icon, màu neon, ảnh minh họa.
  - Thêm cấu trúc `ProductItem` cho gian hàng mua sắm native.
  - Thêm cấu trúc `AuditLogItem` cho lịch sử đóng mở.
- Nâng cấp `iot_gateway_client.dart`:
  - Khởi tạo Mock Data đầy đủ cho cả 6 danh mục thiết bị (nhiều cửa cuốn tầng 1/gara, nhiều đèn rơ-le, camera cổng/phòng khách, cảm biến môi trường, UPS lưu điện).
  - Cung cấp hàm lọc thiết bị theo danh mục `getDevicesByCategory(category)`.
  - Cung cấp hàm dispatch lệnh preview tức thời với độ trễ phản hồi < 180ms.

### BƯỚC 2: Tái cấu trúc Màn hình Chính (Orbital Hub Screen)
- Thiết kế Khối Tâm (Center Node) hiển thị thông tin User Profile: Avatar, Họ tên, Vị trí thời tiết (Hà Đông, Hà Nội), Nhiệt độ 31°C, Độ ẩm 68%, Giờ thực đếm giây, Nút chuyển ngữ cảnh nhà.
- Cấu hình 6 Quả Cầu Danh Mục xoay tròn đều đặn theo góc lượng giác ($0^\circ, 60^\circ, 120^\circ, 180^\circ, 240^\circ, 300^\circ$), kèm viền Neon phát sáng, icon ảnh sắc nét, huy hiệu số lượng thiết bị và chỉ số tóm tắt.
- Top Header: Nút Ghép Nối nổi bật, Chuông thông báo (Notification Center Modal), Logo Austec phát sáng.
- Bắt sự kiện Click vào từng quả cầu để kích hoạt mở màn hình danh sách thiết bị.

### BƯỚC 3: Xây dựng Màn hình Danh Sách Thiết Bị Của Danh Mục (Category Device List Modal/Screen)
- Hiển thị danh sách thiết bị mà user sở hữu trong danh mục vừa chọn.
- Mỗi item có:
  - Thông tin tên, model, vị trí phòng, Hardware ID, trạng thái online/offline.
  - **Bộ nút Preview Điều Khiển Nhanh**:
    - Cửa cuốn: Mở / Dừng / Đóng / Khóa trẻ em.
    - Đèn / Rơ-le: Bật / Tắt / Độ sáng.
    - Camera: Live snapshot / Báo động.
    - Cảm biến: Chỉ số môi trường lớn rõ ràng.
    - UPS: Nút xả pin bảo dưỡng / Điện áp lưới.
  - **Nút "CHI TIẾT"**: Điều hướng mở màn hình `DeviceDetailScreen`.

### BƯỚC 4: Xây dựng Màn hình Chi Tiết Thiết Bị (Device Detail Screen)
- Màn hình chuyên sâu cho từng thiết bị:
  - Thanh trượt vị trí mở cửa 0% - 100%.
  - Hộp nút lệnh RF điều khiển (Gán remote, Xóa remote).
  - Bảng viễn thám thông số kỹ thuật (Dòng Ampe, Điện áp, Firmware, WiFi RSSI).
  - Lịch sử vận hành (Audit Log) hộp đen lưu vết hoạt động.
  - Thông tin tem bảo hành điện tử chính hãng 24 tháng.

### BƯỚC 5: Xây dựng Màn hình Gian Hàng Mua Sắm Native (Shop Screen)
- Xây dựng giao diện thương mại điện tử chuyên nghiệp cho Austec.
- Tabs lọc danh mục: Cửa cuốn, Khóa Masaru, Lưu điện UPS, Động cơ & Phụ kiện.
- Danh sách thẻ sản phẩm dạng Grid 2 cột: Ảnh, Tên, Giá bán, Đánh giá 5 sao, Nút liên hệ tư vấn / đặt mua.
- Modal xem thông số kỹ thuật chi tiết sản phẩm và nút gửi sản phẩm sang trang Chat CSKH.

### BƯỚC 6: Hoàn thiện Trang Chat CSKH & Quản Lý Cá Nhân
- Giữ vững tính năng gửi gói Viễn thám chẩn đoán thông số bo mạch sang admin.
- Bổ sung tin nhắn tương tác, đính kèm ảnh hiện trường, các câu hỏi thường gặp (FAQ).
- Hoàn thiện trang Profile: Thông tin chủ hộ, chia sẻ quyền thành viên gia đình, danh mục thiết bị bảo hành.

### BƯỚC 7: Kiểm thử Tổng thể & Hoàn thiện
- Kiểm tra tính mượt mà của các luồng điều hướng: Hub -> Quả cầu danh mục -> Danh sách thiết bị -> Điều khiển preview -> Màn hình chi tiết -> Quay lại.
- Đảm bảo tính nhất quán của Design System: Dark Mode sang trọng, Glassmorphism, Neon Cyan & Electric Blue accents, tối ưu hiển thị trên mọi kích thước màn hình.
