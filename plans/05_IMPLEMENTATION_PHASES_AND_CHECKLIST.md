# LỘ TRÌNH TRIỂN KHAI THEO GIAI ĐOẠN & MA TRẬN DUYỆT CHẤT LƯỢNG (PHASES & ACCEPTANCE MATRIX)
**Mã tài liệu:** `05_IMPLEMENTATION_PHASES_AND_CHECKLIST.md`  
**Áp dụng:** Toàn bộ dự án Austec IoT Platform (`web-admin` & `mobile-app`)  
**Cơ chế thực thi:** Phân kỳ theo 7 giai đoạn tuần tự; kết thúc mỗi giai đoạn, **Chuyên gia UI độc lập** sẽ rà soát và đánh giá theo Ma trận kiểm thử trước khi chuyển tiếp.

---

## 1. TỔNG QUAN CÁC GIAI ĐOẠN TRIỂN KHAI (ROADMAP AT A GLANCE)

```mermaid
gantt
    title Lộ Trình Nâng Cấp Giao Diện Austec IoT Platform
    dateFormat  YYYY-MM-DD
    section Web Admin Revamp
    GĐ 1: Xóa Pairing-lab & Dọn dẹp Header, Subtitle        :p1, 2026-11-04, 1d
    GĐ 2: Checkbox Chọn Nhiều & Nút Xóa Nhiều Tất Cả Bảng    :p2, after p1, 2d
    GĐ 3: Universal Image Zoom Dialog & Bảng Màu Tối Giản    :p3, after p2, 1d
    GĐ 4: Xóa Mockdata, Bổ sung Loading Spinner & Copywriting:p4, after p3, 2d
    section Mobile App Revamp
    GĐ 5: Asset Logo/Banner & Splash Screen Radar Quét 360  :p5, after p4, 2d
    GĐ 6: Tách Khối Hero Banner & Sửa Tỷ Lệ Nút Cửa Cuốn    :p6, after p5, 2d
    GĐ 7: Nút Chat CSKH Kéo Thả, Vuốt Đóng & Audit UI Expert:p7, after p6, 2d
```

---

## 2. KẾ HOẠCH TRIỂN KHAI CHI TIẾT TỪNG GIAI ĐOẠN

### GIAI ĐOẠN 1: Dọn Dẹp Codebase Web Admin & Khắc Phục Lỗi Ảnh 1
* **Mục tiêu:** Xóa hoàn toàn mã nguồn Pairing Lab; dọn dẹp thanh tab ngang trùng lặp và các dòng mô tả dài dòng theo chuẩn `/settings`.
* **Phạm vi tệp chỉnh sửa:**
  - Xóa toàn bộ thư mục: `src/app/devices/pairing-lab/`
  - Chỉnh sửa `src/components/Sidebar.tsx` (xóa mục Lab ghép nối).
  - Chỉnh sửa `src/app/devices/page.tsx`: Cắt bỏ khối điều hướng phụ (dòng 122-180) và subtitle bôi đỏ trong Ảnh 1.
  - Rà soát xóa subtitle thừa tại `dashboard`, `customers`, `users`, `blackbox`, `cskh`, `firmware`.
* **Cổng kiểm soát UI Expert (Gate 1):**
  - [ ] Đường dẫn `/devices/pairing-lab` đã biến mất hoàn toàn khỏi ứng dụng.
  - [ ] Màn hình Quản lý thiết bị mở ra thoáng đãng, chỉ có tiêu đề trang ngắn gọn và danh sách dữ liệu, không có tab ngang trùng với Sidebar.

---

### GIAI ĐOẠN 2: Trang Bị Checkbox Chọn Nhiều & Nút Xóa Nhiều Cho Tất Cả Các Bảng
* **Mục tiêu:** Cung cấp trải nghiệm quản lý hàng loạt chuyên nghiệp trên toàn bộ các bảng dữ liệu của Web-Admin.
* **Phạm vi tệp chỉnh sửa:**
  - `src/app/devices/components/tabs/DeviceListTab.tsx`
  - `src/app/devices/components/tabs/DeviceGroupTab.tsx`
  - `src/app/devices/components/tabs/DeviceTypeTab.tsx`
  - `src/app/devices/components/tabs/DevicePropertyTab.tsx`
  - `src/app/devices/components/tabs/DeviceModelTab.tsx`
  - `src/app/customers/page.tsx`
  - `src/app/users/page.tsx`
  - `src/app/firmware/page.tsx`
* **Nghiệp vụ chi tiết:**
  - Thêm cột ô Checkbox ở đầu mỗi hàng của bảng (`<th className="w-10">` và `<td className="w-10">`).
  - Hỗ trợ Checkbox "Chọn tất cả" tại `<thead>`.
  - Hiển thị thanh tác vụ hàng loạt: `Đã chọn: N mục` + Nút `Xóa đã chọn`.
  - Hộp thoại Modal xác nhận xóa hàng loạt an toàn, bảo vệ dữ liệu.
* **Cổng kiểm soát UI Expert (Gate 2):**
  - [ ] Chọn 1 hoặc nhiều dòng hoạt động mượt mà, đổi màu dòng được chọn tinh tế.
  - [ ] Bấm nút Xóa nhiều hiển thị hộp thoại xác nhận rõ ràng, không bị lỗi render.

---

### GIAI ĐOẠN 3: Tích Hợp Universal Image Zoom Dialog & Tối Giản Màu Sắc Web Admin
* **Mục tiêu:** Khi click vào bất kỳ hình ảnh nào đều mở Dialog phóng to; loại bỏ triệt để viền neon, chuyển về bảng màu Trắng - Đen sang trọng.
* **Phạm vi tệp chỉnh sửa:**
  - Tạo mới: `src/components/ImageZoomModal.tsx`
  - Tích hợp vào: `DeviceModelTab.tsx`, `DeviceListTab.tsx` (QR), `users/page.tsx` (Avatar), `cskh/page.tsx` (Ảnh hiện trường).
  - Tối giản màu viền và nền trong `globals.css` và các component card.
* **Cổng kiểm soát UI Expert (Gate 3):**
  - [ ] Click vào ảnh -> Dialog phóng to tức thì, bấm ESC hoặc ngoài màn hình là đóng ngay.
  - [ ] Không còn màu sắc xanh ngọc chói lóa hay viền gradient; giao diện sắc nét, chuẩn Monochrome Industrial.

---

### GIAI ĐOẠN 4: Triệt Tiêu Mockdata, Trang Bị Loading Spinner & Viết Lại Thông Báo
* **Mục tiêu:** Xóa bỏ 100% Mockdata gây nhảy số; bổ sung vòng xoay Loading cho từng khối; viết lại toàn bộ câu từ loại bỏ thuật ngữ CSDL kỹ thuật.
* **Phạm vi tệp chỉnh sửa:**
  - `src/app/dashboard/page.tsx`: Khởi tạo state bằng `null`, bổ sung spinner, triệt tiêu việc hiện số 7 hay 6 trước khi có API.
  - `DeviceListTab.tsx`: Bổ sung trạng thái `isLoading`, chỉ hiện "Danh sách thiết bị đang trống" sau khi API trả về rỗng, tuyệt đối không chớp thông báo trống trước đó.
  - Viết lại toàn bộ câu thông báo: Thay "CSDL PostgreSQL" bằng ngôn ngữ thân thiện với người dùng.
* **Cổng kiểm soát UI Expert (Gate 4):**
  - [ ] F5 trang `/dashboard` và chuyển tab `/devices?tab=list` không còn hiện tượng giật dữ liệu (flicker).
  - [ ] Các khối thông tin có spinner xoay tròn đồng bộ khi đang tải.
  - [ ] Không còn bất kỳ câu từ mang tính kỹ thuật lập trình nào trên màn hình.

---

### GIAI ĐOẠN 5: Tích Hợp Asset & Màn Hình Chờ Radar Quét 360 Trên Mobile App
* **Mục tiêu:** Tích hợp `logo-app.webp`, trích xuất `AUSTEC BANNER.pdf` làm nền và tạo Splash Screen với chữ Austec 2026 nhẹ nhàng phóng to kèm Radar quét bên dưới.
* **Phạm vi tệp chỉnh sửa:**
  - `mobile-app/assets/`: Bổ sung `logo_app.webp`, `austec_banner_bg.png`, `austec_logo_text_transparent.png`.
  - Cập nhật `pubspec.yaml`.
  - Xây dựng `mobile-app/lib/features/splash/screens/austec_splash_screen.dart` và `AustecRadarSweepPainter`.
  - Điều chỉnh `main.dart` hiển thị Splash Screen với độ trễ tối thiểu 1.0s đồng bộ dữ liệu.
* **Cổng kiểm soát UI Expert (Gate 5):**
  - [ ] App mở lên hiển thị Splash Screen đúng chuẩn Ảnh tham khảo 2: Logo thương hiệu thở nhẹ, radar xoay 360 độ mượt mà 60fps.
  - [ ] Chuyển tiếp mượt mà vào trang chính sau khi kết thúc quá trình khởi động.

---

### GIAI ĐOẠN 6: Tách Khối Hero Banner & Khắc Phục Lỗi Nút Cửa Cuốn Trên Mobile
* **Mục tiêu:** Tách riêng ảnh quảng bá Hero lên trên, khối thông tin người dùng và công cụ xuống dưới; sửa lỗi nút bấm to quá khổ và chữ rớt dòng vụn vặt (Ảnh 3).
* **Phạm vi tệp chỉnh sửa:**
  - `lib/features/devices/screens/orbital_hub_screen.dart`: Tách `_buildHeroBanner()` thành 2 widget độc lập (Ảnh Hero ở trên, Thẻ Profile ở dưới).
  - `lib/features/devices/screens/category_device_list_sheet.dart`: Tinh chỉnh hàng nút Cửa Cuốn:
    - Chiều cao chuẩn 44px.
    - Cấu trúc `Row + Expanded` cân xứng.
    - Chữ hiển thị ngắn gọn: "Khóa", "Mở cửa", "Dừng", "Đóng cửa" (chống rớt dòng cụt).
    - Đổi màu từ tím/cam/xanh neon sang màu viền xám đen tối giản.
* **Cổng kiểm soát UI Expert (Gate 6):**
  - [ ] Ảnh Hero hoàn toàn độc lập, không bị chữ đè lên làm rối mắt.
  - [ ] 4 nút điều khiển cửa cuốn nằm cân xứng, thẳng hàng, chữ không bị gãy dòng trên mọi kích thước màn hình.

---

### GIAI ĐOẠN 7: Nút Chat CSKH Kéo Thả, Vuốt Đóng & Nghiệm Thu Tổng Thể
* **Mục tiêu:** Phát triển nút CSKH nổi có thể kéo di chuyển tự do hoặc vuốt xuống giữa đáy màn hình để đóng; thông báo vuốt tắt dễ dàng; nghiệm thu toàn diện hệ thống.
* **Phạm vi tệp chỉnh sửa:**
  - `lib/features/devices/screens/orbital_hub_screen.dart`: Bổ sung logic `Positioned` + `GestureDetector` cho nút CSKH.
  - Thiết kế vùng nhả đáy màn hình để ẩn nút.
  - Chuẩn hóa SnackBar/Toast vuốt ngang để tắt.
* **Cổng kiểm soát UI Expert (Gate 7 - Chung cuộc):**
  - [ ] Nút CSKH di chuyển nhạy bén, vuốt xuống đáy đóng mượt mà.
  - [ ] Cả Web Admin và Mobile App đều đạt chuẩn thiết kế Trắng - Đen tối giản, sạch sẽ, không còn bóng dáng AI rối mắt.

---

## 3. MA TRẬN PHÂN CÔNG & TIẾN ĐỘ THỰC THI (RACI MATRIX)

| Giai đoạn | Trách nhiệm chính (Responsible) | Phê duyệt (Accountable) | Tham vấn (Consulted) |
| :--- | :--- | :--- | :--- |
| **GĐ 1: Xóa Pairing & Dọn Header** | Kỹ sư Web Frontend | **Chuyên gia UI Expert** | Product Owner |
| **GĐ 2: Checkbox & Xóa Nhiều** | Kỹ sư Web Frontend | **Chuyên gia UI Expert** | PO & QA Lead |
| **GĐ 3: Image Zoom & Màu sắc Web** | Kỹ sư Web Frontend | **Chuyên gia UI Expert** | Designer / PO |
| **GĐ 4: Zero Mockdata & Copywriting**| Kỹ sư Fullstack | **Chuyên gia UI Expert** | PO & QA Lead |
| **GĐ 5: Asset & Splash Radar** | Kỹ sư Flutter Mobile | **Chuyên gia UI Expert** | Brand Lead / PO |
| **GĐ 6: Tách Hero & Sửa Nút Mobile** | Kỹ sư Flutter Mobile | **Chuyên gia UI Expert** | Designer / PO |
| **GĐ 7: Nút Chat Kéo Thả & Tổng Duyệt**| Kỹ sư Flutter Mobile | **Chuyên gia UI Expert** | Toàn bộ Dự án |

---

## 4. CHECKLIST KÝ DUYỆT CUỐI CÙNG TRƯỚC KHI BÀN GIAO (FINAL SIGN-OFF)

- [ ] **Kiểm thử Web Admin:** Đã chạy thử nghiệm trên Chrome, Firefox, Safari (máy tính & máy tính bảng), độ phân giải từ 1024px đến 4K.
- [ ] **Kiểm thử Mobile App:** Đã chạy thử nghiệm trên Android (các dòng màn hình 6.1" đến 6.7") và iOS simulator.
- [ ] **Hiệu năng:** Tốc độ phản hồi đạt chuẩn 60fps, không có giật lag khi kéo cuộn hay phóng to ảnh.
- [ ] **Tính nhất quán:** Toàn bộ hệ sinh thái Austec IoT mang ngôn ngữ thiết kế chung: Sang trọng, Đơn sắc, Tối giản, Chuyên nghiệp.
