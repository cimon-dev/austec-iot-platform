# THIẾT KẾ HỆ THỐNG GIAO DIỆN TỐI GIẢN TRẮNG ĐEN (MONOCHROME DESIGN SYSTEM)
**Mã tài liệu:** `01_DESIGN_SYSTEM_AND_MONOCHROME_REVAMP.md`  
**Áp dụng:** Toàn bộ Web-Admin (`Next.js / Tailwind CSS`) & Mobile App (`Flutter`)  
**Mục tiêu:** Xóa bỏ hoàn toàn hiệu ứng Neon AI sặc sỡ, đưa bảng màu về phong cách Trắng - Đen - Xám kim loại sang trọng, tinh tế và tối ưu không gian hiển thị.

---

## 1. THAY ĐỔI TƯ DUY THIẾT KẾ: TỪ "AI CYBER" SANG "MINIMALIST INDUSTRIAL"

### 1.1. Thực trạng cần loại bỏ
- **Bảng màu lòe loẹt:** Hiện tại giao diện dùng quá nhiều màu cùng lúc: viền tím (`#9900FF`), viền xanh neon (`#00E5FF`), nút cam chói (`#FFB300`), bóng đổ màu rực làm màn hình giống game viễn tưởng giá rẻ thay vì phần mềm điều khiển thiết bị cao cấp.
- **Lạm dụng Icon & Hiệu ứng nhòe (Backdrop Blur):** Bất cứ chỗ nào cũng nhồi nhét icon, hộp icon có nền màu riêng, hiệu ứng kính mờ (glassmorphism) quá đậm làm giảm độ tương phản và tốc độ hiển thị.
- **Thiếu tính đồng nhất:** Web-admin mỗi khối một màu viền; Mobile app nút điều khiển cửa 4 nút 4 màu khác nhau (tím, xanh, cam, xám) tạo cảm giác phân mảnh.

### 1.2. Định hướng chuẩn mực mới
- **Tông màu chủ đạo:** Trắng (`#FFFFFF`), Đen sâu (`#09090B` hoặc `#0A0A0C`), Xám ghi trung tính (`#71717A` / `#27272A`).
- **Hạn chế màu xanh biển:** Chỉ giữ một tông xanh thép trầm (`#2563EB` hoặc `#0284C7`) khi hiển thị trạng thái bắt buộc (ví dụ: Trực tuyến / Đã kích hoạt), không dùng làm màu viền trang trí.
- **Độ nhòe và bóng đổ:** Đưa `backdrop-blur` về mức tối thiểu (`blur-[2px]` hoặc tắt hoàn toàn), thay thế bóng đổ phát sáng bằng đường viền đơn sắc siêu mỏng 1px (`border border-slate-200 dark:border-zinc-800`).

---

## 2. BẢNG MÃ MÀU VÀ TOKENS THIẾT KẾ (DESIGN TOKENS)

### 2.1. Web-Admin (Tailwind CSS v4 & CSS Variables)
Chuyển đổi các biến màu trong `web-admin/src/app/globals.css` và áp dụng nhất quán:

| Nhóm thuộc tính | Chế độ Sáng (Light Mode) | Chế độ Tối (Dark Mode) | Ứng dụng thực tế |
| :--- | :--- | :--- | :--- |
| **Nền chính (Canvas)** | `#F8FAFC` (`slate-50`) | `#09090B` (`zinc-950`) | Toàn bộ nền trang làm việc |
| **Nền Card / Bảng** | `#FFFFFF` (`white`) | `#121215` (`zinc-900`) | Thẻ card, bảng dữ liệu, modal popup |
| **Đường viền (Border)** | `#E2E8F0` (`slate-200`) | `#27272A` (`zinc-800`) | Viền card, phân tách hàng bảng, viền ô nhập |
| **Văn bản chính (Primary)** | `#0F172A` (`slate-900`) | `#F4F4F5` (`zinc-100`) | Tiêu đề chính, tên thiết bị, chỉ số lớn |
| **Văn bản phụ (Muted)** | `#64748B` (`slate-500`) | `#A1A1AA` (`zinc-400`) | Nhãn phụ, mã Hardware ID, ngày cập nhật |
| **Nút bấm chính (Primary CTA)**| `#0F172A` chữ trắng | `#F4F4F5` chữ đen `#09090B` | Nút Thêm mới, Nút Lưu, Nút Xác nhận |
| **Nút bấm phụ (Secondary)** | Nền trong suốt, viền xám | Nền trong suốt, viền xám | Nút Hủy, Nút Đóng, Nút Làm mới |
| **Nút nguy hiểm (Destructive)**| Nền đỏ nhạt, chữ đỏ sẫm | Nền đỏ tối `#450A0A`, chữ `#FCA5A5` | Nút Xóa nhiều, Nút Ngắt kết nối |

### 2.2. Mobile App (Flutter `AppTheme.dart`)
Cấu trúc lại toàn bộ class `AppTheme` trong `mobile-app/lib/core/constants/app_theme.dart`:

```dart
class AppTheme {
  // Bảng màu Trắng - Đen Tối giản
  static const Color background = Color(0xFF09090B);      // Đen sâu tối giản
  static const Color surface = Color(0xFF141417);         // Card container
  static const Color surfaceElevated = Color(0xFF1C1C21); // Bottom sheet, Dialog
  static const Color border = Color(0xFF27272A);          // Viền 1px tinh tế
  
  // Màu chữ tiêu chuẩn
  static const Color textPrimary = Color(0xFFF4F4F5);
  static const Color textSecondary = Color(0xFFA1A1AA);
  static const Color textMuted = Color(0xFF71717A);

  // Điểm nhấn chức năng (Dùng cực kỳ hạn chế)
  static const Color statusOnline = Color(0xFF10B981);    // Xanh ngọc lục bảo (chỉ dùng cho dot online)
  static const Color statusOffline = Color(0xFF71717A);   // Xám cho offline
  static const Color statusAlert = Color(0xFFEF4444);     // Đỏ cho cảnh báo nguy hiểm
  
  // Nút hành động
  static const Color buttonPrimary = Color(0xFFFFFFFF);  // Nền trắng chữ đen
  static const Color buttonPrimaryText = Color(0xFF09090B);
  static const Color buttonSecondary = Color(0xFF27272A);
}
```

---

## 3. CHUẨN HÓA NÚT BẤM VÀ KHẮC PHỤC LỖI GIAO DIỆN (TYPOGRAPHY & BUTTON OVERHAUL)

### 3.1. Sửa lỗi nút bấm bị to và chữ rớt dòng trên Mobile (Khắc phục Ảnh 3)
- **Vấn đề trên màn hình thực tế:** Hàng 4 nút điều khiển cửa cuốn (Khóa an toàn, Mở cửa, Dừng lại, Đóng cửa) sử dụng hình vuông to lớn, chữ dài dẫn tới hiện tượng rớt dòng vụn vặt:
  ```
  [ Khóa an ]  <-- Rớt chữ "toàn" xuống dòng 2
  [  toàn   ]
  ```
- **Giải pháp thiết kế mới:**
  1. Chuyển cấu trúc nút từ khối vuông cao sang **dạng thanh ngang bo góc gọn gàng (Horizontal Capsule/Pill Buttons)** hoặc **lưới 4 cột cân xứng với kích thước chuẩn 42px chiều cao**.
  2. Rút gọn nhãn hoặc điều chỉnh font size:
     - Nút 1: `Khóa` (hoặc `Khóa remote`) với icon `Icons.lock_outline` kích cỡ 16px.
     - Nút 2: `Mở cửa` với icon `Icons.arrow_upward` 16px.
     - Nút 3: `Dừng` với icon `Icons.stop` 16px.
     - Nút 4: `Đóng cửa` với icon `Icons.arrow_downward` 16px.
  3. Cấm đặt `Wrap` tùy ý làm vỡ bố cục; sử dụng `Row` kết hợp `Expanded` với tỷ lệ bằng nhau và `maxLines: 1`, `overflow: TextOverflow.ellipsis`.

### 3.2. Tiêu chuẩn kích thước Icon (Icon Sizing Quota)
- **Kích thước chuẩn:**
  - Icon trên thanh công cụ / Header: `16px - 18px` (Không được vượt quá 20px).
  - Icon trong bảng / danh sách: `14px - 16px`.
  - Icon trên nút bấm hành động: `14px`.
- **Loại bỏ hộp viền màu xung quanh Icon:** Xóa bỏ toàn bộ các thẻ `<div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40">` chứa icon bên trong. Giữ icon trần với màu sắc trung tính nhẹ nhàng (`text-slate-500` hoặc `text-zinc-400`).

---

## 4. LOẠI BỎ CÁC MÔ TẢ VÀ KHỐI ĐIỀU HƯỚNG THỪA (MINIMALIST CLEANUP)

### 4.1. Web Admin: Học tập triệt để chuẩn mực `/settings`
Trang Cài đặt hệ thống (`/settings`) đã được tối giản rất tốt và trở thành hình mẫu chuẩn:
1. **Chỉ giữ tiêu đề cấp 1 (`h1`):** Font chữ `text-lg md:text-xl font-bold`, không có bất kỳ dòng mô tả giải thích thừa nào bên dưới.
2. **Không gian làm việc tối đa:** Không sử dụng các khối giải thích "Danh mục nhóm sản phẩm & dải thiết bị phần cứng trong hệ sinh thái".
3. **Các thẻ Card gọn nhẹ:** Mỗi khối thông tin được gói trong một `div` có viền xám mỏng, padding đều đặn `p-3` hoặc `p-4`, header thẻ đơn giản gồm tên khối và các trường nhập liệu trực tiếp.

### 4.2. Mobile App: Loại bỏ mô tả văn bản rườm rà
- Các đoạn thông báo dài, các chỉ số không cần thiết được gom gọn vào màn hình Thông tin chi tiết.
- Danh sách thẻ thiết bị ở màn hình chính và Sheet danh mục chỉ hiển thị 3 thông số vàng:
  1. Tên thiết bị + Model.
  2. Vị trí lắp đặt.
  3. Trạng thái kết nối (Dấu chấm Online xanh lá hoặc Offline xám).

---

## 5. CHECKLIST ĐÁNH GIÁ CỦA CHUYÊN GIA UI (DESIGN SYSTEM GATEWAY)

- [ ] Toàn bộ mã màu Hex trong CSS và Dart đã chuyển về bảng màu Đen - Trắng - Xám trung tính.
- [ ] Không còn bất kỳ bóng đổ neon (`shadow-cyan`, `shadow-purple`) hoặc viền gradient nào.
- [ ] Tất cả nút bấm trên Mobile đều hiển thị vừa vặn trên 1 dòng text, không rớt dòng mồ côi.
- [ ] Tỷ lệ icon và cỡ chữ đạt chuẩn (Icon 14-18px, Text 12-14px).
- [ ] Giao diện nhìn thoáng đạt, sang trọng, mang phong cách thiết bị công nghệ hiện đại.
