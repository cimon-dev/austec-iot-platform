# KẾ HOẠCH CHI TIẾT CẢI TỔ FLUTTER MOBILE APP (MOBILE APP REVAMP PLAN)
**Mã tài liệu:** `04_MOBILE_APP_DETAILED_REVAMP.md`  
**Dự án:** `mobile-app` (`Flutter 3.x / Dart`)  
**Mục tiêu:** Tích hợp bộ nhận diện hình ảnh mới; xây dựng Splash Screen hiệu ứng Radar quét; tách rời khối thông tin người dùng khỏi ảnh banner Hero; tinh chỉnh tỷ lệ nút bấm chống rớt dòng; phát triển nút CSKH kéo thả/vuốt đóng thông minh.

---

## 1. NHIỆM VỤ 1: CHUẨN HÓA TÀI NGUYÊN TĨNH & NHẬN DIỆN THƯƠNG HIỆU (ASSET MANAGEMENT)

Hệ thống sẽ đồng bộ các tệp đồ họa chính hãng vào thư mục tĩnh của dự án Mobile (`mobile-app/assets/`):

1. **Logo ứng dụng (`logo-app.webp`):**
   - Sao chép `d:\Work\Austec\logo-app.webp` vào `mobile-app/assets/logo_app.webp` (và cấu hình `flutter_launcher_icons` cho Android & iOS).
   - Biểu tượng nhận diện chữ "A" vàng Austec trên nền công nghệ cao, hiển thị sắc nét trên màn hình điện thoại.
2. **Hình nền chính trang điều khiển (`AUSTEC BANNER.pdf`):**
   - Trích xuất/chuyển đổi tệp vector `AUSTEC BANNER.pdf` thành hình ảnh độ phân giải cao định dạng PNG/WEBP không nén: `mobile-app/assets/austec_banner_bg.png`.
   - Sử dụng làm nền chuyển động chính cho toàn bộ trang Điều khiển và màn hình Splash Screen.
3. **Biểu tượng chữ thương hiệu (`AUSTEC - 2026.pdf`):**
   - Xử lý tách nền trong suốt 100% (Alpha Channel) cho cụm logo chữ: **"AUSTEC - Your space · Our technology"**.
   - Lưu trữ tại: `mobile-app/assets/austec_logo_text_transparent.png`.
4. **Cập nhật `pubspec.yaml`:**
   - Khai báo đầy đủ các asset mới trong nhóm `flutter.assets`.

---

## 2. NHIỆM VỤ 2: MÀN HÌNH KHỞI ĐỘNG VỚI HIỆU ỨNG RADAR QUÉT (SPLASH SCREEN & RADAR ANIMATION)

### 2.1. Yêu cầu chuyển động (Khớp với Ảnh tham khảo 2)
- Khi người dùng bật app, hệ thống kích hoạt màn hình khởi động trong thời gian gọi API đồng bộ dữ liệu.
- Nếu mạng quá nhanh hoặc tức thời, **áp dụng độ trễ tự nhiên tối thiểu 1.0 giây** để tạo cảm giác sang trọng và an tâm về tính bảo mật.
- **Bố cục màn hình Splash:**
  1. **Nền chuyển động:** Ảnh nền `austec_banner_bg.png` tối trầm.
  2. **Tâm điểm Logo:** Ảnh chữ trong suốt `austec_logo_text_transparent.png` nằm chính giữa màn hình, có hiệu ứng thu phóng thở nhẹ nhàng (Breathe / Gentle Pulse Scale 0.96 -> 1.04).
  3. **Hiệu ứng Radar quét bên dưới (Radar Sweep Animation):** 
     - Vòng tròn đồng tâm viền mỏng đơn sắc.
     - Tia radar hình cánh cung gradient quét xoay tròn 360 độ liên tục (chu kỳ 2.0s/vòng) mô phỏng quá trình quét kết nối trạm viễn thám IoT Austec (như hình mẫu số 2).

### 2.2. Kiến trúc Kỹ thuật: CustomPainter Radar Sweep không phụ thuộc thư viện rác
Để đảm bảo hiệu năng 60fps mượt mà trên cả máy yếu và không làm phình dung lượng app, xây dựng widget `AustecRadarSweepPainter`:

```dart
class AustecRadarSweepPainter extends CustomPainter {
  final double sweepAngle; // Góc quét từ 0 đến 2 * pi

  AustecRadarSweepPainter({required this.sweepAngle});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    // 1. Vẽ các vòng tròn đồng tâm mỏng
    final circlePaint = Paint()
      ..color = const Color(0xFF27272A).withOpacity(0.6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawCircle(center, radius * 0.4, circlePaint);
    canvas.drawCircle(center, radius * 0.7, circlePaint);
    canvas.drawCircle(center, radius, circlePaint);

    // 2. Vẽ cung Radar quét xoay tròn với Shader SweepGradient
    final sweepPaint = Paint()
      ..shader = SweepGradient(
        center: Alignment.center,
        startAngle: 0,
        endAngle: math.pi / 2,
        colors: [
          Colors.transparent,
          const Color(0xFFF4F4F5).withOpacity(0.35),
        ],
        transform: GradientRotation(sweepAngle),
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, radius, sweepPaint);

    // 3. Vẽ tia quét chính
    final linePaint = Paint()
      ..color = Colors.white.withOpacity(0.8)
      ..strokeWidth = 1.5;
    final endX = center.dx + radius * math.cos(sweepAngle + math.pi / 2);
    final endY = center.dy + radius * math.sin(sweepAngle + math.pi / 2);
    canvas.drawLine(center, Offset(endX, endY), linePaint);
  }

  @override
  bool shouldRepaint(covariant AustecRadarSweepPainter oldDelegate) =>
      oldDelegate.sweepAngle != sweepAngle;
}
```

---

## 3. NHIỆM VỤ 3: TÁCH RỜI KHỐI THÔNG TIN NGƯỜI DÙNG KHỎI ẢNH HERO (UNSTACKING HERO BANNER)

### 3.1. Hiện trạng lỗi (Ảnh 3 & `orbital_hub_screen.dart`)
- Hiện tại, Lời chào "Xin chào, Nguyễn Văn Test", vị trí, nhiệt độ, thời gian đếm giây và các nút chức năng (sáng/tối, ngôn ngữ) được đặt đè trực tiếp (Overlay) lên hình ảnh ngôi nhà `header.png`.
- Chữ đè lên mái nhà, hồ bơi và các icon trong ảnh làm mắt người dùng không phân biệt được đâu là ảnh, đâu là chữ, gây rối mắt nghiêm trọng.

### 3.2. Cấu trúc hiển thị mới: 2 Khối độc lập phân tầng
1. **Khối 1: Ảnh quảng bá độc lập (Pure Hero Banner) ở trên cùng:**
   - Hiển thị ảnh `header.png` trọn vẹn, không có bất kỳ chữ, nút bấm hay lớp phủ gradient đen nào đè lên.
   - Bo góc nhẹ 12px, có đường viền 1px siêu mỏng tinh tế `Color(0xFF27272A)`.
2. **Khối 2: Thẻ thông tin người dùng & Công cụ (User Profile & Control Card) nằm riêng biệt bên dưới:**
   - Nằm ngay dưới ảnh Hero với khoảng cách `SizedBox(height: 12)`.
   - Nền Card màu xám đen phẳng sang trọng (`AppTheme.surface = Color(0xFF141417)`).
   - **Bố cục nội dung trong thẻ:**
     - Hàng trên: Avatar tròn nhỏ gọn, Lời chào súc tích: "Xin chào, Nguyễn Văn Test", Huy hiệu cấp độ tài khoản.
     - Hàng dưới: Vị trí & Nhiệt độ gọn nhẹ ("Hà Nội · 31°C"), Thời gian thực ("06:48:36"), Cụm công tắc chế độ Sáng/Tối và Ngôn ngữ VI/EN.

---

## 4. NHIỆM VỤ 4: TINH CHỈNH TỶ LỆ NÚT BẤM & LOẠI BỎ RỚT DÒNG (FIXING BUTTON OVERSIZED & ORPHAN TEXT)

### 4.1. Khắc phục triệt để lỗi nút bấm ở Ảnh 3
- **Hiện tượng:** Nút "Khóa an toàn" sử dụng nút to vuông, padding ngang quá dày dẫn tới chữ "toàn" bị rơi xuống dòng dưới (`Khóa an \n toàn`).
- **Quy chuẩn mới cho hàng 4 nút điều khiển Cửa Cuốn:**
  1. Sử dụng widget `Row` với 4 phần tử bọc trong `Expanded(child: ...)`.
  2. Chiều cao nút cố định `height: 44.0`.
  3. Cắt bỏ viền màu sặc sỡ (tím, xanh ngọc, cam). Đưa toàn bộ 4 nút về phong cách viền xám đen đơn sắc:
     - Nút 1: `Khóa` (Icon `Icons.lock_outline`, chữ trắng).
     - Nút 2: `Mở cửa` (Icon `Icons.arrow_upward`, chữ trắng).
     - Nút 3: `Dừng` (Icon `Icons.pause`, chữ trắng).
     - Nút 4: `Đóng cửa` (Icon `Icons.arrow_downward`, chữ trắng).
  4. Thuộc tính văn bản: `fontSize: 12.0, fontWeight: FontWeight.w600, maxLines: 1, overflow: TextOverflow.ellipsis`.

---

## 5. NHIỆM VỤ 5: NÚT CSKH LIVE CHAT NỔI KÉO THẢ & VUỐT ĐÓNG (DRAGGABLE & DISMISSIBLE FLOATING CHAT)

### 5.1. Vấn đề của nút CSKH cố định
- Nút tròn CSKH nằm cố định ở một góc thường che mất các nội dung quan trọng phía dưới (thông tin bảo hành hoặc nút xem chi tiết). Người dùng muốn có thể di dời nút đi chỗ khác hoặc tạm thời đóng đi khi không cần.

### 5.2. Giải pháp kỹ thuật: Nút nổi thông minh kéo thả
1. **Khả năng kéo thả tự do trên màn hình (Free Dragging):**
   - Bọc nút CSKH trong `Positioned` quản lý tọa độ `Offset _chatButtonOffset`.
   - Sử dụng `GestureDetector(onPanUpdate: (details) { ... })` cho phép người dùng kéo nút tới bất kỳ vị trí mép nào thuận tay (trái, phải, trên, dưới).
   - Có cơ chế hít mép thông minh (Snap to screen edges) khi thả tay.
2. **Kéo xuống giữa phía dưới để đóng (Swipe Down to Dismiss):**
   - Khi người dùng kéo nút xuống vùng 20% chân màn hình (vị trí giữa đáy màn hình), hiển thị một vùng mờ màu đỏ nhạt với icon `Icons.close` ("Thả để đóng").
   - Khi thả tay vào vùng này: Nút CSKH thu nhỏ và biến mất với hiệu ứng Fade/Scale.
   - Khi người dùng cần chat lại: Có thể mở từ Menu Cài đặt hoặc lắc nhẹ điện thoại / nút bấm trong Drawer.

---

## 6. NHIỆM VỤ 6: CHUẨN HÓA THÔNG BÁO DỄ VUỐT ĐI (SWIPEABLE DISMISSIBLE TOASTS)

- Thay thế toàn bộ thông báo tĩnh cứng nhắc bằng widget `Dismissible` hoặc `SnackBar` tùy biến:
  - Cho phép người dùng vuốt sang trái hoặc vuốt sang phải để đóng thông báo ngay tức khắc (`DismissDirection.horizontal`).
  - Thời gian hiển thị mặc định tối đa 2.5 giây.
  - Nội dung ngắn gọn, súc tích (dưới 8 từ).

---

## 7. CHECKLIST ĐÁNH GIÁ CỦA CHUYÊN GIA UI (MOBILE APP GATEWAY)

- [ ] Logo app `logo-app.webp` và hình nền `AUSTEC BANNER` được tích hợp sắc nét, đúng tỷ lệ.
- [ ] Màn hình khởi động có hiệu ứng Radar quét 360 độ mượt mà dưới logo Austec, thời gian chờ tối thiểu 1s tạo cảm giác chắc chắn.
- [ ] Ảnh Hero hoàn toàn đứng một mình, không bị đè bất kỳ chữ hay công cụ nào lên trên.
- [ ] Nút "Khóa", "Mở cửa", "Dừng", "Đóng cửa" nằm gọn trên 1 hàng, tuyệt đối không bị rớt dòng chữ.
- [ ] Bỏ toàn bộ viền neon màu tím, vàng, xanh ngọc; giao diện chuyển về chuẩn Trắng - Đen sang trọng.
- [ ] Nút CSKH có thể kéo di chuyển tự do khắp màn hình hoặc vuốt xuống giữa đáy để ẩn đi.
