# KẾ HOẠCH XÓA BỎ MOCKDATA & CHUẨN HÓA TRẠNG THÁI LOADING (DATA INTEGRITY & LOADING STATES)
**Mã tài liệu:** `02_DATA_INTEGRITY_LOADING_AND_MOCKDATA_ELIMINATION.md`  
**Áp dụng:** Toàn bộ Web-Admin (`Next.js`) và Mobile-App (`Flutter`)  
**Mục tiêu cốt lõi:** Loại bỏ 100% Mock Data; giải quyết triệt để hiện tượng giật dữ liệu (flicker) và thông báo rỗng giả lập; trang bị vòng xoay Loading đồng bộ trên từng khối; viết lại toàn bộ thông báo ngắn gọn, dễ hiểu, không chứa thuật ngữ cơ sở dữ liệu kỹ thuật.

---

## 1. NGUYÊN NHÂN GỐC RỄ CỦA HIỆN TƯỢNG GIẬT MÀN HÌNH (ROOT CAUSE ANALYSIS)

### 1.1. Vấn đề tại Web Admin
1. **Khởi tạo dữ liệu mẫu trong State (`useState` có sẵn giá trị):**
   - Điển hình tại `web-admin/src/app/dashboard/page.tsx`:
     ```tsx
     // LỖI: Gán số liệu cứng 7 thiết bị, 6 online...
     const [stats, setStats] = useState({
       total: 7, online: 6, offline: 1, inStock: 2, onlinePct: "85.7%", ...
     });
     ```
     -> Khi người dùng tải trang, giao diện hiển thị ngay con số 7 và 6 trong 0.5s, sau đó API `/api/dashboard/stats` trả về mới giật sang số liệu thực tế.
2. **Thiếu cờ `isLoading` dẫn tới thông báo rỗng giả lập:**
   - Điển hình tại `DeviceListTab.tsx`:
     ```tsx
     // LỖI: devices khởi tạo là [], ngay lập tức điều kiện sau thỏa mãn:
     {paginatedDevices.length === 0 ? (
       <tr>
         <td colSpan={8}>Chưa có thiết bị nào trong CSDL PostgreSQL...</td>
       </tr>
     ) : (...)}
     ```
     -> Trong thời gian 300ms - 800ms đợi API nạp xong danh sách từ Backend, người dùng bị nhìn thấy câu thông báo rỗng "Chưa có thiết bị nào trong CSDL PostgreSQL..." rồi đột ngột danh sách thiết bị thật mới nhảy ra đè lên!

### 1.2. Vấn đề tại Mobile App
- Trong `iot_gateway_client.dart` và các màn hình (`orbital_hub_screen.dart`, `category_device_list_sheet.dart`), hệ thống gán sẵn danh sách thiết bị mock (Cửa cuốn tầng 1, Cửa gara, Đèn rơ-le...) vào bộ nhớ cache ban đầu.
- Khi mở ứng dụng hoặc mở Bottom Sheet, các thiết bị mẫu này hiện lên ngay lập tức, sau đó `fetchDevicesFromBackend()` đồng bộ về làm danh sách bị giật hoặc thay đổi đột ngột.

---

## 2. KIẾN TRÚC VÒNG ĐỜI TRẠNG THÁI CHUẨN (STATE MACHINE PATTERN)

Mọi trang, bảng dữ liệu và khối thông tin trên cả Web-Admin và Mobile-App bắt buộc phải tuân theo cỗ máy 4 trạng thái độc lập:

```
[INIT / CALLING API] 
        │
        ▼
 (1) LOADING STATE  ──> Hiển thị Vòng xoay Spinner tinh tế (Tối đa 1.5s)
        │               (Tuyệt đối KHÔNG hiển thị số liệu cũ, KHÔNG báo rỗng)
        ├──[Thành công & Có dữ liệu] ──> (2) DATA PRESENTED (Hiển thị bảng / danh sách)
        ├──[Thành công & Mảng rỗng []] ─> (3) EMPTY STATE (Chỉ báo "Danh sách đang trống")
        └──[Thất bại / Mất mạng]   ───> (4) ERROR STATE (Thông báo lỗi súc tích + Nút thử lại)
```

### 2.1. Chuẩn hóa Component Loading trên Web Admin
Tạo component dùng chung: `@/components/BlockLoadingSpinner.tsx`
- **Giao diện:** Vòng xoay mỏng nhẹ (stroke 2px), màu trung tính (`text-slate-400 dark:text-zinc-500`), không chớp giật.
- **Kích thước:**
  - Trong ô bảng/dòng: `w-4 h-4`.
  - Trong khối thẻ (Card / Widget): `w-6 h-6`.
  - Trong toàn màn hình trang: `w-8 h-8`.
- **Cấm hoàn toàn:** Không dùng skeleton phát sáng neon, không dùng chữ "Đang truy vấn CSDL PostgreSQL...".

### 2.2. Chuẩn hóa Loading State trên Mobile App (Flutter)
- Khi nạp dữ liệu danh mục hoặc danh sách thiết bị, dùng `FutureBuilder` hoặc kiểm tra biến `bool _isLoading = true;`.
- Hiển thị widget `CircularProgressIndicator` với đường nét mảnh (`strokeWidth: 2.0`), màu trắng/xám kim loại (`AppTheme.textSecondary`).
- Khi đang loading, vùng danh sách giữ khoảng trống có spinner ở chính giữa, tuyệt đối không nạp thẻ thiết bị giả.

---

## 3. RÀ SOÁT VÀ XÓA BỎ 100% MOCK DATA TRÊN HỆ THỐNG

### 3.1. Danh mục các tệp Web Admin cần dọn sạch Mock Data
1. `src/app/dashboard/page.tsx`:
   - Đặt `stats` ban đầu là `null` hoặc toàn bộ số liệu bằng `0`.
   - Thêm `const [isLoading, setIsLoading] = useState(true);`.
   - Khi `isLoading === true`: Các ô hiển thị spinner xoay vòng, biểu đồ Donut hiển thị vòng tròn chờ xám mờ.
2. `src/app/devices/components/tabs/DeviceListTab.tsx`:
   - Thêm prop hoặc state `isLoadingDevices`.
   - Trong `<tbody>`: Nếu `isLoadingDevices` là `true`, render hàng chứa Spinner:
     ```tsx
     {isLoading ? (
       <tr>
         <td colSpan={9} className="p-12 text-center text-slate-400">
           <div className="flex flex-col items-center justify-center gap-2">
             <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
             <span className="text-xs">Đang tải dữ liệu...</span>
           </div>
         </td>
       </tr>
     ) : paginatedDevices.length === 0 ? (
       <tr>
         <td colSpan={9} className="p-12 text-center text-slate-400 text-xs">
           Danh sách thiết bị đang trống
         </td>
       </tr>
     ) : (
       paginatedDevices.map(...)
     )}
     ```
3. `src/app/devices/components/tabs/DeviceGroupTab.tsx`, `DeviceTypeTab.tsx`, `DevicePropertyTab.tsx`, `DeviceModelTab.tsx`:
   - Áp dụng chuẩn tương tự: Có spinner khi gọi API, chỉ thông báo trống sau khi load xong.
4. `src/app/firmware/page.tsx`, `src/app/customers/page.tsx`, `src/app/users/page.tsx`:
   - Rà soát xóa toàn bộ biến mảng giả `MOCK_CUSTOMERS`, `MOCK_USERS`, `MOCK_FIRMWARE`.

### 3.2. Danh mục các tệp Mobile App cần dọn sạch Mock Data
1. `lib/core/services/iot_gateway_client.dart`:
   - Xóa bỏ danh sách hardcoded `_mockDevices` trong bộ nhớ ban đầu.
   - Hàm `loadDevicesFromLocalCache()` chỉ đọc từ SQLite / `SharedPreferences` thực tế nếu người dùng đã từng đăng nhập trước đó. Nếu chưa có, trả về danh sách rỗng `[]`.
2. `lib/features/devices/screens/category_device_list_sheet.dart`:
   - Không nạp thiết bị mẫu khi danh sách rỗng.
   - Nếu `_gateway.getDevicesByCategory(category).isEmpty` và đang gọi API: Hiện vòng xoay chờ.
   - Nếu gọi xong mà vẫn rỗng: Hiện text súc tích "Chưa có thiết bị nào trong danh mục này".

---

## 4. RÀ SOÁT VÀ VIẾT LẠI TOÀN BỘ CÂU THÔNG BÁO (COPYWRITING AUDIT)

Loại bỏ toàn bộ các câu thông báo mang tính nội bộ lập trình / cơ sở dữ liệu. Chuyển sang văn phong người dùng ngắn gọn, súc tích:

| Vị trí xuất hiện | Câu cũ (Lỗi / Kỹ thuật) | Câu mới chuẩn hóa (Tối giản, thân thiện) |
| :--- | :--- | :--- |
| **Bảng thiết bị rỗng** | "Chưa có thiết bị nào trong CSDL PostgreSQL. Bấm 'Thêm thiết bị mới' hoặc 'Nhập kho Excel' để nạp thiết bị." | **"Danh sách thiết bị đang trống"** |
| **Lưu cài đặt thành công** | "Đã lưu các thiết lập cấu hình hệ thống vào PostgreSQL thành công!" | **"Đã lưu cài đặt thành công"** |
| **Lỗi tải dữ liệu nhóm** | "Lỗi tải groups từ PostgreSQL: Network Error" | **"Không thể tải danh sách nhóm sản phẩm"** |
| **Bảng khách hàng rỗng** | "Không tìm thấy khách hàng nào trong CSDL hệ thống" | **"Chưa có dữ liệu khách hàng"** |
| **Nhập kho thành công** | "Đã import thành công X bản ghi vào table devices của PostgreSQL" | **"Đã nhập kho X thiết bị thành công"** |
| **Xóa thiết bị** | "Đã thực hiện truy vấn DELETE thiết bị [Mã] khỏi DB" | **"Đã xóa thiết bị thành công"** |
| **Cảnh báo quyền hạn** | "Người dùng không có quyền truy cập module mod_dev trong RBAC" | **"Bạn không có quyền thực hiện chức năng này"** |
| **Bảng hộp đen rỗng** | "Chưa có bản ghi nhật ký audit log nào được ghi nhận" | **"Chưa có nhật ký hoạt động"** |
| **Mobile: Cửa cuốn** | "Đã dispatch bản tin MQTT lệnh OPEN_DOOR xuống gateway" | **"Đã gửi lệnh mở cửa"** |
| **Mobile: Ghép nối** | "Khởi tạo tiến trình quét Bluetooth Low Energy UUID 0xFF01" | **"Đang tìm kiếm thiết bị lân cận..."** |

---

## 5. CHECKLIST ĐÁNH GIÁ CỦA CHUYÊN GIA UI (DATA INTEGRITY GATEWAY)

- [ ] Khi F5 làm mới trang `/dashboard`, không xuất hiện số liệu 7 hay 6 trước khi có API; các card hiển thị trạng thái loading mượt mà.
- [ ] Khi chuyển tab `/devices?tab=list`, tuyệt đối không chớp câu thông báo trống trước khi danh sách hiện ra.
- [ ] Không còn bất kỳ chữ "PostgreSQL", "CSDL", "DB", "Query" nào trên toàn bộ giao diện người dùng.
- [ ] Toàn bộ các thông báo Toast (Sonner trên Web và SnackBar trên Mobile) đều ngắn gọn dưới 10 từ.
- [ ] Khi rút dây mạng / tắt API, hệ thống hiển thị thông báo lỗi văn minh kèm nút "Thử lại", không vỡ giao diện.
