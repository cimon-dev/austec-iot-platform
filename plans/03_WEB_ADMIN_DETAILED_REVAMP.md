# KẾ HOẠCH CHI TIẾT CẢI TỔ GIAO DIỆN WEB-ADMIN (WEB ADMIN REVAMP PLAN)
**Mã tài liệu:** `03_WEB_ADMIN_DETAILED_REVAMP.md`  
**Dự án:** `web-admin` (`Next.js 16 / React 19 / Tailwind CSS`)  
**Mục tiêu:** Xóa bỏ hoàn toàn Pairing Lab; dọn sạch thanh điều hướng ngang trùng lặp và mô tả thừa theo chuẩn `/settings`; trang bị Checkbox chọn nhiều + nút Xóa nhiều trên tất cả các bảng; tích hợp Dialog phóng to hình ảnh toàn hệ thống.

---

## 1. NHIỆM VỤ 1: XÓA BỎ HOÀN TOÀN TRANG PAIRING-LAB (`/devices/pairing-lab`)

Theo yêu cầu dứt khoát của người dùng, trang Pairing Lab không còn phục vụ mục tiêu sản xuất thực tế và cần được dọn dẹp triệt để cả mã nguồn lẫn menu điều hướng:

### 1.1. Các bước thực hiện xóa
1. **Xóa tệp mã nguồn:**
   - Xóa thư mục và toàn bộ tệp bên trong: `d:\Work\Austec\austec-iot-platform\web-admin\src\app\devices\pairing-lab\` (bao gồm tệp `page.tsx` dung lượng 36.7 KB).
2. **Xóa liên kết điều hướng trên Sidebar (`src/components/Sidebar.tsx`):**
   - Loại bỏ dòng 63:
     ```diff
     - { id: "pairing", label: language === "vi" ? "Lab ghép nối ESP32" : "Hardware Lab & Test", href: "/devices/pairing-lab" },
     ```
3. **Kiểm tra rà soát Dead Code:**
   - Đảm bảo không còn bất kỳ liên kết nội bộ `Link href="/devices/pairing-lab"` nào sót lại trong toàn bộ codebase.

---

## 2. NHIỆM VỤ 2: DỌN SẠCH KHỐI ĐIỀU HƯỚNG TRÙNG LẶP VÀ CÁC MÔ TẢ THỪA (THEO CHUẨN `/settings`)

### 2.1. Phân tích hiện trạng thừa thãi (Căn cứ Ảnh 1)
- **Khối chuyển hướng ngang (bôi đỏ phía trên):** Chứa các nút tab "Nhóm sản phẩm", "Loại phần cứng", "Từ điển thuộc tính", "Mẫu thương phẩm", "Nhập kho Excel", "Danh sách thiết bị". Khối này **hoàn toàn trùng lặp** với danh sách Menu Sidebar bên trái (`QUẢN LÝ THIẾT BỊ`). Khi người dùng bấm trên Sidebar đã nhảy đúng tab, thanh ngang này làm chật chội màn hình và gây rối mắt.
- **Khối mô tả dài dòng (bôi đỏ phía dưới):** "Danh mục nhóm sản phẩm & dải thiết bị phần cứng trong hệ sinh thái". Người dùng thực tế không có nhu cầu đọc những câu mô tả này.

### 2.2. Giải pháp tái cấu trúc `src/app/devices/page.tsx`
- **Xóa bỏ hoàn toàn** thanh tab ngang ở dòng 122-180 trong `devices/page.tsx`.
- **Xóa bỏ toàn bộ** dòng mô tả phụ bên dưới.
- **Thiết kế Header theo đúng chuẩn `/settings`:**
  - Chỉ gồm một dòng tiêu đề ngắn gọn theo Tab hiện tại (ví dụ: "Danh sách thiết bị", "Nhóm sản phẩm", "Mẫu thương phẩm").
  - Bên phải là các nút hành động cốt lõi: "Thêm mới", "Làm mới" hoặc "Nhập Excel".
  - Chiều cao Header cố định nhỏ gọn, tối đa hóa không gian chiều dọc cho bảng dữ liệu.

```tsx
// Cấu trúc Header chuẩn tối giản cho trang Devices
<div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2.5 shrink-0">
  <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
    {getTabTitle(activeTab)}
  </h1>
  <div className="flex items-center gap-2">
    {/* Các nút hành động chính */}
  </div>
</div>
```

### 2.3. Dọn dẹp mô tả trên các trang khác
Rà soát và xóa bỏ toàn bộ các thẻ `<p className="text-xs text-slate-500">` mang tính giải thích lý thuyết tại:
- `src/app/dashboard/page.tsx`
- `src/app/customers/page.tsx`
- `src/app/users/page.tsx`
- `src/app/blackbox/page.tsx`
- `src/app/cskh/page.tsx`
- `src/app/firmware/page.tsx`

---

## 3. NHIỆM VỤ 3: TÍCH HỢP DIALOG PHÓNG TO HÌNH ẢNH TOÀN DIỆN (UNIVERSAL IMAGE ZOOM MODAL)

### 3.1. Thiết kế Component `@/components/ImageZoomModal.tsx`
Tạo một modal tái sử dụng toàn hệ thống:
- **Kích hoạt:** Bấm vào bất kỳ ảnh nào (ảnh đại diện người dùng, ảnh mẫu thiết bị, ảnh tem QR code, ảnh chứng nhận bảo hành, ảnh gửi kèm trong chat CSKH).
- **Hiển thị:** 
  - Lớp phủ nền tối sang trọng (`bg-black/80 backdrop-blur-[2px]`).
  - Ảnh phóng to giữ nguyên tỷ lệ khung hình thực tế (`object-contain max-h-[85vh] max-w-[90vw]`).
  - Viền mỏng đơn sắc trắng/xám, nút Đóng (X) góc trên bên phải hỗ trợ phím tắt `ESC` hoặc click ra ngoài để đóng.
  - Hiệu ứng mở mượt mà (Fade-in & Scale-up nhẹ).

```tsx
"use client";
import React, { useEffect } from "react";
import { X, ZoomIn } from "lucide-react";

interface ImageZoomModalProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageZoomModal({ src, alt, onClose }: ImageZoomModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!src) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <img 
          src={src} 
          alt={alt || "Ảnh phóng to"} 
          className="max-h-[80vh] w-auto object-contain rounded-lg mx-auto"
        />
      </div>
    </div>
  );
}
```

### 3.2. Triển khai vào các điểm hiển thị hình ảnh
- Trong bảng `DeviceModelTab.tsx`: Bấm vào thumbnail ảnh mẫu thương phẩm -> mở Modal.
- Trong bảng `DeviceListTab.tsx`: Bấm vào mã QR thiết bị -> mở Modal xem to rõ để in/quét.
- Trong `users/page.tsx` và `customers/page.tsx`: Bấm vào avatar.
- Trong `cskh/page.tsx`: Bấm vào hình ảnh hiện trường gửi qua live chat.

---

## 4. NHIỆM VỤ 4: BỔ SUNG CỘT CHECKBOX CHỌN NHIỀU & NÚT XÓA NHIỀU (BULK SELECTION & DELETE)

### 4.1. Kiến trúc Quản lý State Chọn Nhiều
Tại mỗi tab/trang danh sách có dạng bảng (Table view), trang bị:
1. `const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());`
2. Logic chọn một dòng:
   ```tsx
   const toggleSelectRow = (id: string) => {
     const next = new Set(selectedIds);
     if (next.has(id)) next.delete(id);
     else next.add(id);
     setSelectedIds(next);
   };
   ```
3. Logic chọn tất cả (Select All) trên trang hiện tại:
   ```tsx
   const isAllSelected = paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.has(i.id));
   const toggleSelectAll = () => {
     if (isAllSelected) {
       setSelectedIds(new Set());
     } else {
       setSelectedIds(new Set(paginatedItems.map(i => i.id)));
     }
   };
   ```

### 4.2. Thanh tác vụ hàng loạt nổi bật (Floating Bulk Action Bar)
Khi `selectedIds.size > 0`, hiển thị thanh công cụ hành động phía trên bảng hoặc cố định chân bảng:
- Hiển thị số lượng: `Đã chọn: X mục`.
- Nút "Hủy chọn": Xóa sạch tập `selectedIds`.
- Nút "Xóa đã chọn" (Nút xóa nhiều): Màu đỏ trầm tối giản, icon thùng rác `Trash2` 14px.
- Khi bấm "Xóa đã chọn":
  - Bật Modal xác nhận: "Bạn có chắc chắn muốn xóa X mục đã chọn? Thao tác này không thể hoàn tác."
  - Khi xác nhận: Gọi API xóa hàng loạt (hoặc gọi tuần tự qua `Promise.allSettled`) và cập nhật lại danh sách.
  - Hiển thị Toast thông báo: "Đã xóa X mục thành công".

### 4.3. Danh sách các bảng dữ liệu bắt buộc trang bị
1. `src/app/devices/components/tabs/DeviceListTab.tsx` (Danh sách thiết bị)
2. `src/app/devices/components/tabs/DeviceGroupTab.tsx` (Nhóm sản phẩm)
3. `src/app/devices/components/tabs/DeviceTypeTab.tsx` (Loại phần cứng)
4. `src/app/devices/components/tabs/DevicePropertyTab.tsx` (Từ điển thuộc tính)
5. `src/app/devices/components/tabs/DeviceModelTab.tsx` (Mẫu thương phẩm)
6. `src/app/customers/page.tsx` (Khách hàng)
7. `src/app/users/page.tsx` (Người dùng & Cán bộ)
8. `src/app/firmware/page.tsx` (Firmware OTA)

---

## 5. CHECKLIST ĐÁNH GIÁ CỦA CHUYÊN GIA UI (WEB ADMIN GATEWAY)

- [ ] Đường dẫn `/devices/pairing-lab` đã được xóa sạch, không còn xuất hiện trong Sidebar và không còn file code rác.
- [ ] Màn hình Quản lý thiết bị đã xóa bỏ hoàn toàn thanh tab ngang lặp lại và câu mô tả dài dòng (khớp 100% với yêu cầu trên Ảnh 1).
- [ ] Bấm vào bất kỳ ảnh nào trên Web Admin đều bật Dialog xem phóng to sắc nét, bấm ESC hoặc ngoài màn hình là đóng tức thì.
- [ ] Tất cả các bảng danh sách đều có cột Checkbox ở vị trí đầu tiên; bấm Chọn tất cả hoạt động mượt mà.
- [ ] Nút "Xóa nhiều" hiển thị rõ ràng số lượng đã chọn kèm hộp thoại xác nhận an toàn.
- [ ] Giao diện Web Admin đạt độ đồng nhất tối giản theo đúng chuẩn mực của trang `/settings`.
