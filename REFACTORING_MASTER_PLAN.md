# AUSTEC IOT PLATFORM - REFACTORING MASTER PLAN
**Phiên bản:** 2.0.0 (Production Enterprise Standard)  
**Ngày lập kế hoạch:** 26/10/2026  
**Mục tiêu:** Tái cấu trúc toàn diện hệ thống (Backend, Web Admin, Mobile App), loại bỏ 100% Mock Data, lưu trữ thực tế vào PostgreSQL, tích hợp Cloudflare R2 Object Storage cho hình ảnh/media, chuẩn hóa Full CRUD kèm Dialog xác nhận xóa và tinh gọn UI Clean Minimalist.

---

## MỤC LỤC
1. [Nguyên Tắc Cốt Lõi & Cam Kết Kỹ Thuật](#1-nguyên-tắc-cốt-lõi--cam-kết-kỹ-thuật)
2. [Báo Cáo Kiểm Tra Toàn Diện Các Trang Web Admin (Audit Matrix)](#2-báo-cáo-kiểm-tra-toàn-diện-các-trang-web-admin-audit-matrix)
3. [Quy Chuẩn Tinh Gọn Giao Diện (Clean Minimalist UI Standard)](#3-quy-chuẩn-tinh-gọn-giao-diện-clean-minimalist-ui-standard)
4. [Kiến Trúc Module Tổng Thể (Feature-First Architecture)](#4-kiến-trúc-module-tổng-thể-feature-first-architecture)
5. [Thiết Kế Tầng Lưu Trữ Hình Ảnh: Cloudflare R2 + CDN](#5-thiết-kế-tầng-lưu-trữ-hình-ảnh-cloudflare-r2--cdn)
6. [Chi Tiết Phân Rã Component & Kết Nối DB Từng Màn Hình](#6-chi-tiết-phân-rã-component--kết-nối-db-từng-màn-hình)
7. [Chi Tiết Tái Cấu Trúc Backend (API, Router & Repositories)](#7-chi-tiết-tái-cấu-trúc-backend-api-router--repositories)
8. [Chi Tiết Tái Cấu Trúc Mobile App Flutter](#8-chi-tiết-tái-cấu-trúc-mobile-app-flutter)
9. [Lộ Trình Triển Khai Chi Tiết Từng Bước (Implementation Roadmap)](#9-lộ-trình-triển-khai-chi-tiết-từng-bước-implementation-roadmap)
10. [Hướng Dẫn Thiết Lập & Tích Hợp Cloudflare R2](#10-hướng-dẫn-thiết-lập--tích-hợp-cloudflare-r2)

---

## 1. NGUYÊN TẮC CỐT LÕI & CAM KẾT KỸ THUẬT

1. **Zero Data Loss (Tuyệt đối không mất dữ liệu)**:
   - Dữ liệu hiện có trong PostgreSQL và file snapshot `data/austec_database.json` được tự động nạp (seed/migrate) đầy đủ vào các bảng chuẩn của PostgreSQL trước khi chuyển giao diện.
   - Luôn có bản sao lưu trước khi thực thi mỗi giai đoạn.
2. **Zero Breaking Change (Không làm gãy luồng đang chạy)**:
   - Giữ nguyên cấu trúc trả về của API (`{ success: true, ... }`).
   - Mobile App và các tiến trình IoT (MQTT, BLE, Telemetry) vẫn hoạt động liên tục không gián đoạn.
3. **100% Real Persistence (Dữ liệu thực tế trong Database)**:
   - Bỏ toàn bộ cơ chế lưu biến cục bộ `useState` ảo mà không gọi backend.
   - Mọi thao tác Thêm, Sửa, Xóa đều phải qua REST API và ghi nhận xuống PostgreSQL. Sau khi nhấn F5 tải lại trang, dữ liệu vẫn giữ nguyên 100%.
4. **Không lưu Icon/Emoji làm hình ảnh đại diện**:
   - Loại bỏ các ô chọn icon, chuỗi ký tự icon (như `"📦"`, `"Layers"`, `"Cpu"`).
   - Thay thế bằng **Component Upload Hình Ảnh Thực Tế** (lưu trên Cloudflare R2, lưu URL trong Database).
5. **100% Thao Tác Xóa Đều Có Dialog Cảnh Báo (ConfirmDeleteModal)**:
   - Loại bỏ hoàn toàn hộp thoại `window.confirm()` mặc định của trình duyệt.
   - Toàn bộ danh mục quản lý đều dùng Modal xác nhận cảnh báo nguy hiểm: hiển thị rõ tên đối tượng, mã nhận diện, nút đỏ "Xác nhận xóa" kèm trạng thái loading và nút "Hủy".
6. **Strict Plan Adherence (Bám sát kế hoạch)**:
   - Mọi bước triển khai phải tuân thủ đúng tên file, đường dẫn, schema đã định nghĩa trong tài liệu này; không tự ý thay đổi kiến trúc hoặc sinh thêm mã nguồn ngoài phạm vi.

---

## 2. BÁO CÁO KIỂM TRA TOÀN DIỆN CÁC TRANG WEB ADMIN (AUDIT MATRIX)

| Trang / Module | Đường dẫn Route | Tình trạng Dữ liệu | Tình trạng CRUD | Tình trạng Media/Icon | Dialog Xóa | Hành động Tái Cấu Trúc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cài đặt hệ thống** | `/settings` | **100% Mock**: Bấm lưu chỉ hiện Toast, không có API backend | Không có CRUD DB | Có icon trước tiêu đề và thẻ, nhiều text mô tả thừa | Không có | Tạo bảng DB `system_settings`, tạo API GET/PUT, bỏ icon và subtitle thừa, tách 3 Card nhỏ |
| **Loại phần cứng** | `/devices?tab=types` | **Dữ liệu cục bộ ảo**: `setDeviceTypes` chỉ đổi React State, F5 là mất | FE chưa gọi API dù BE đã có route | Đang lưu emoji/icon `"📦"` | Dùng `confirm()` | Nối API `POST/PUT/DELETE /api/admin/device-types`, thay icon bằng `ImageUploader`, gắn `ConfirmDeleteModal` |
| **Mẫu thương phẩm** | `/devices?tab=models` | **Dữ liệu cục bộ ảo**: `setModels` chỉ đổi State; BE thiếu route PUT & DELETE | Thiếu PUT & DELETE ở BE và FE | Đang lưu icon | Dùng `confirm()` | Thêm PUT/DELETE ở BE, nối API ở FE, thay icon bằng `ImageUploader`, gắn `ConfirmDeleteModal` |
| **Từ điển Schema** | `/devices?tab=properties` | **Ảo một phần**: Tạo mới có gọi API, nhưng Xóa chỉ filter React State | Thiếu DELETE trong DB | Dùng icon biểu tượng | Dùng `confirm()` | Thêm DELETE ở BE, nối API xóa ở FE, gắn `ConfirmDeleteModal` |
| **Nhóm sản phẩm** | `/devices?tab=groups` | Đã có API PostgreSQL | Có CRUD | Đang dùng icon picker / string | Dùng `confirm()` | Thay icon bằng `ImageUploader`, gắn `ConfirmDeleteModal` |
| **Danh sách thiết bị** | `/devices?tab=list` | Đã có API PostgreSQL | Có Read/Filter | Ảnh thiết bị theo model | Dùng `confirm()` | Tách component độc lập, bổ sung `ConfirmDeleteModal` khi xóa thiết bị |
| **Nhập kho & Tem QR** | `/devices?tab=import` | Đã có API import Excel | Có Create | Mã QR SVG | Không có | Tách component riêng, tinh gọn form |
| **Gian hàng & Sản phẩm** | `/store` | **Lưu file JSON tạm**, chưa lưu vào bảng PostgreSQL `products` | Có CRUD vào JSON | Link Unsplash mẫu | Dùng `confirm()` | Chuyển Backend sang lưu bảng `products`, tích hợp `ImageUploader`, gắn `ConfirmDeleteModal` |
| **Khách hàng & Phân quyền** | `/customers` | Có fallback `MOCK_CUSTOMERS`, phân quyền gia đình lưu ngắt quãng | Cần đồng bộ 100% DB | Icon avatar SVG | Dùng `confirm()` | Bỏ mock data, tách Tab Accounts và Matrix, đồng bộ DB, gắn `ConfirmDeleteModal` |
| **Cán bộ quản trị** | `/users/admin` | Đã có API `/api/admin/staff` | Có CRUD | Avatar chữ cái | Dùng `confirm()` | Tách component, gắn `ConfirmDeleteModal` |
| **Vai trò & Phân quyền** | `/users/roles` | Đã có API `/api/admin/roles` | Có Update RBAC | Không có | Dùng `confirm()` | Tinh gọn giao diện, gắn `ConfirmDeleteModal` |
| **Hộp đen kiểm toán** | `/blackbox` | Đã có API `/api/blackbox/logs`, có mock fallback | Read-only | Không có | Không áp dụng | Tinh gọn tiêu đề, xuất Excel giữ nguyên |
| **CSKH Hub & Chat** | `/cskh` | Đã có API Ticket & WS Chat | Đã có CRUD ticket | Ảnh đính kèm tin nhắn | Đã có | Tách component Chat, tích hợp R2 cho ảnh chat |

---

## 3. QUY CHUẨN TINH GỌN GIAO DIỆN (CLEAN MINIMALIST UI STANDARD)

Nhằm loại bỏ hiện tượng giao diện quá nhiều chữ, rối mắt và rườm rà (như các điểm đã khoanh đỏ), áp dụng triệt để các quy tắc sau:

### 3.1. Sidebar Navigation ([web-admin/src/components/Sidebar.tsx](file:///d:/Work/Austec/austec-iot-platform/web-admin/src/components/Sidebar.tsx))
1. **Loại bỏ đánh số thứ tự**: Xóa bỏ các tiền tố `1.`, `2.`, `3.`... trong danh sách menu con.
2. **Loại bỏ icon ở menu con**: Menu con cấp 2 (Nhóm sản phẩm, Loại phần cứng, Từ điển thuộc tính...) hiển thị text thuần thụt lề nhẹ nhàng, thanh thoát, không gắn icon con trước mỗi chữ.
3. **Loại bỏ toàn bộ các Tag/Badge tĩnh**: Xóa bỏ vĩnh viễn các badge `NEW`, `LIVE`, `SHA-256`, `SYNC`, `VIDEO`. Chỉ giữ lại huy hiệu số đếm thông báo thực tế khi `unread_count > 0`.
4. **Chuẩn hóa nhãn menu**:
   - `Nhóm sản phẩm` (thay cho `1. Nhóm sản phẩm`)
   - `Loại phần cứng` (thay cho `2. Loại phần cứng`)
   - `Từ điển thuộc tính` (thay cho `3. Từ điển Schema`)
   - `Mẫu thương phẩm` (thay cho `4. Mẫu thương phẩm`)
   - `Nhập kho & Tem QR` (thay cho `5. Nhập kho & Tem QR`)
   - `Danh sách thiết bị` (thay cho `6. Danh sách thiết bị`)
   - `Quản lý Firmware & OTA` (thay cho `7. Quản lý Firmware & OTA`)
   - `Lab ghép nối ESP32` (thay cho `8. Lab Ghép Nối & Test ESP32`)

### 3.2. Tiêu Đề Màn Hình & Tiêu Đề Thẻ (Headers & Section Cards)
1. **Bỏ icon trang trí trước tiêu đề**:
   - Tiêu đề màn hình chỉ dùng chữ đậm rõ ràng, không lồng icon trong hộp vuông màu mè.
   - Ví dụ: `Cài đặt hệ thống` (Bỏ icon bánh răng `<Settings />`).
2. **Bỏ song ngữ in hoa thô ráp**:
   - Xóa bỏ các hậu tố mở ngoặc in hoa tiếng Anh:
     - Xóa `(System Settings)`
     - Xóa `(WARRANTY & NOTIFICATIONS)`
     - Xóa `(CONNECTIVITY STACK)`
     - Xóa `(ENTERPRISE METADATA)`
   - Sử dụng tiếng Việt chuẩn Sentence case:
     - `Chính sách bảo hành & cảnh báo`
     - `Hạ tầng kết nối MQTT`
     - `Thông tin doanh nghiệp`
3. **Bỏ icon trong tiêu đề Card**: Card section header chỉ gồm văn bản tiêu đề nhóm và đường kẻ phân cách nhẹ.

### 3.3. Nhãn Form & Ô Nhập Liệu (Input Fields & Labels)
1. **Loại bỏ các dòng chữ giải thích rườm rà (Sub-descriptions)**:
   - Xóa bỏ dòng: *"Số ngày quét và gửi thông báo trước khi thiết bị hết bảo hành"*
   - Xóa bỏ dòng: *"Thời hạn dùng thử mặc định cho thiết bị mới xuất kho"*
   - Xóa bỏ dòng: *"Tần suất gửi cảnh báo định kỳ tới tài khoản khách hàng"*
   - Xóa bỏ dòng: *"Địa chỉ máy chủ phân phối tin nhắn MQTT"*
2. **Tích hợp đơn vị vào thẳng nhãn hoặc Placeholder**:
   - Nhãn: `Thời hạn cảnh báo (ngày)`
   - Nhãn: `Thời hạn dùng thử (ngày)`
   - Nhãn: `Tần suất gửi cảnh báo` -> Tùy chọn: `Hàng ngày`, `Hàng tuần`, `Hàng tháng` (Bỏ `Daily`, `Weekly`)
   - Nhãn: `Máy chủ MQTT` -> Placeholder: `mqtt://broker.austec.vn`
   - Nhãn: `Cổng kết nối (Port)` -> Giá trị: `8883`

---

## 4. KIẾN TRÚC MODULE TỔNG THỂ (FEATURE-FIRST ARCHITECTURE)

### 4.1. Cấu Trúc Web Admin (`web-admin/src/`) - Feature-Driven Architecture
Tổ chức chuẩn Feature-Driven: Mỗi feature nằm độc lập trong `features/[feature]/` tự đóng gói `components`, `hooks`, `services` và `types` riêng:
```
web-admin/src/
├── app/                                 # Next.js App Router (Chỉ làm nhiệm vụ Routing < 50 dòng)
│   ├── dashboard/page.tsx
│   ├── devices/page.tsx                 # Nhập và render Feature Container
│   ├── customers/page.tsx
│   ├── store/page.tsx
│   ├── settings/page.tsx
│   ├── users/admin/page.tsx
│   ├── users/roles/page.tsx
│   ├── blackbox/page.tsx
│   └── cskh/page.tsx
├── components/                          # Core UI Primitives dùng chung toàn app
│   ├── ConfirmDeleteModal.tsx           # Dialog xác nhận xóa chuẩn Enterprise
│   ├── ImageUploader.tsx                # Upload ảnh Cloudflare R2 kéo thả + xem trước
│   ├── Sidebar.tsx                      # Đã dọn sạch icon/badge rác
│   ├── AdminHeader.tsx
│   ├── Pagination.tsx
│   └── AccessDenied.tsx
└── features/                            # TỔ CHỨC THEO FEATURE-DRIVEN TỪNG TÍNH NĂNG
    ├── devices/
    │   ├── components/                  # UI Components, Tabs, Modals riêng của Devices
    │   │   ├── tabs/
    │   │   │   ├── DeviceListTab.tsx
    │   │   │   ├── DeviceGroupTab.tsx
    │   │   │   ├── DeviceTypeTab.tsx
    │   │   │   ├── DevicePropertyTab.tsx
    │   │   │   ├── DeviceModelTab.tsx
    │   │   │   └── DeviceImportTab.tsx
    │   │   └── modals/
    │   │       ├── CreateDeviceModal.tsx
    │   │       ├── DeviceControlModal.tsx
    │   │       └── DeviceQrModal.tsx
    │   ├── hooks/                       # Custom React Hooks riêng của Devices
    │   │   ├── useDevices.ts
    │   │   └── useDeviceTelemetry.ts
    │   ├── services/                    # API Services riêng của Devices (thay thế api/)
    │   │   └── devices.service.ts
    │   └── types/                       # TypeScript interfaces riêng của Devices
    │       └── devices.types.ts
    ├── settings/
    │   ├── components/
    │   │   ├── SettingsHeader.tsx
    │   │   ├── WarrantyPolicyCard.tsx
    │   │   ├── MqttBrokerCard.tsx
    │   │   └── CompanyInfoCard.tsx
    │   ├── hooks/
    │   │   └── useSettings.ts
    │   ├── services/
    │   │   └── settings.service.ts
    │   └── types/
    │       └── settings.types.ts
    ├── store/
    │   ├── components/
    │   │   ├── ProductListTable.tsx
    │   │   ├── ProductFormModal.tsx
    │   │   └── ProductDetailDrawer.tsx
    │   ├── hooks/
    │   │   └── useStoreProducts.ts
    │   ├── services/
    │   │   └── store.service.ts
    │   └── types/
    │       └── store.types.ts
    └── customers/
        ├── components/
        │   ├── CustomerAccountsTab.tsx
        │   ├── FamilyMatrixTab.tsx
        │   └── CustomerDetailModal.tsx
        ├── hooks/
        │   └── useCustomers.ts
        ├── services/
        │   └── customers.service.ts
        └── types/
            └── customers.types.ts
```

### 4.2. Cấu Trúc Backend (`backend/src/`) - Modular Feature Architecture (Chuẩn NestJS Pattern)
*Backend đóng gói theo mô hình NestJS Feature Modules (`modules/[feature]/`), mỗi module tự đóng gói `controller`, `service`, `routes` (hoặc `module`), `dto` (validate bằng Zod), và `repository` truy vấn PostgreSQL:*
```
backend/src/
├── core/                                # Tầng hạ tầng dùng chung (Cross-cutting Concerns)
│   ├── storage/                         # Quản lý lưu trữ Media (Cloudflare R2 Adapter)
│   │   ├── storage.interface.ts
│   │   ├── cloudflare-r2.service.ts
│   │   └── storage.factory.ts
│   ├── database/                        # PostgreSQL Connection Pool & Migration Client
│   │   └── postgres.client.ts
│   ├── middlewares/                     # Middlewares: Auth, RBAC, Error Handler
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   └── websocket/                       # WebSocket Server & Connection Registry
│       └── chat-ws.server.ts
├── modules/                             # TỔ CHỨC THEO TỪNG FEATURE MODULE TỰ ĐÓNG GÓI
│   ├── devices/                         # Feature Module: Quản lý thiết bị & mẫu mã
│   │   ├── controllers/                 # Controller: Xử lý Request/Response, HTTP status
│   │   │   ├── device.controller.ts
│   │   │   ├── device-type.controller.ts
│   │   │   └── device-model.controller.ts
│   │   ├── services/                    # Service: Business Logic, tính toán nghiệp vụ
│   │   │   └── devices.service.ts
│   │   ├── repositories/                # Repository: Truy vấn SQL trực tiếp PostgreSQL
│   │   │   └── devices.repository.ts
│   │   ├── dto/                         # DTO: Data Transfer Objects & Zod Validation Schemas
│   │   │   ├── create-device.dto.ts
│   │   │   └── update-device.dto.ts
│   │   └── devices.routes.ts            # Router / Module: Định tuyến nội bộ module
│   ├── settings/                        # Feature Module: Cài đặt hệ thống
│   │   ├── settings.controller.ts
│   │   ├── settings.service.ts
│   │   ├── settings.repository.ts
│   │   ├── dto/
│   │   │   └── update-settings.dto.ts
│   │   └── settings.routes.ts
│   ├── store/                           # Feature Module: Gian hàng sản phẩm (lưu PostgreSQL)
│   │   ├── store.controller.ts
│   │   ├── store.service.ts
│   │   ├── store.repository.ts
│   │   ├── dto/
│   │   │   └── product.dto.ts
│   │   └── store.routes.ts
│   ├── upload/                          # Feature Module: Upload Cloudflare R2
│   │   ├── upload.controller.ts
│   │   ├── upload.service.ts
│   │   └── upload.routes.ts
│   ├── users/                           # Feature Module: Tài khoản cán bộ & khách hàng
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   ├── dto/
│   │   │   └── user.dto.ts
│   │   └── users.routes.ts
│   ├── blackbox/                        # Feature Module: Hộp đen kiểm toán
│   │   ├── blackbox.controller.ts
│   │   ├── blackbox.service.ts
│   │   ├── blackbox.repository.ts
│   │   └── blackbox.routes.ts
│   └── cskh/                            # Feature Module: Chăm sóc khách hàng & Chat
│       ├── cskh.controller.ts
│       ├── cskh.service.ts
│       ├── cskh.repository.ts
│       ├── dto/
│       │   └── ticket.dto.ts
│       └── cskh.routes.ts
├── app.ts                               # Khởi tạo Express, mount các Feature Modules (< 100 dòng)
└── server.ts                            # Entrypoint: Khởi động HTTP & WebSocket Server (< 60 dòng)
```

---

## 5. THIẾT KẾ TẦNG LƯU TRỮ HÌNH ẢNH: CLOUDFLARE R2 + CDN

### 5.1. Kiến Trúc Luồng Upload
```
[User Browser / Admin Web / Mobile App]
                │
                │ 1. Chọn file ảnh (JPEG, PNG, WebP)
                ▼
      [ImageUploader Component]
                │
                │ 2. FormData (file) POST /api/upload/image
                ▼
       [Backend Upload Route]
                │
                │ 3. S3 Client PutObjectCommand (chuyển đổi WebP tối ưu)
                ▼
    [Cloudflare R2 Bucket: austec-media]
                │
                │ 4. Trả về Public CDN URL: https://media.austec.vn/devices/abc.webp
                ▼
       [PostgreSQL Database]  <-- Chỉ lưu chuỗi URL ngắn
```

### 5.2. Biến Môi Trường Cần Thiết (`backend/.env`)
```env
# Cloudflare R2 Storage Configuration (S3-Compatible)
R2_ACCOUNT_ID=YOUR_CLOUDFLARE_ACCOUNT_ID
R2_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=YOUR_R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME=austec-media
R2_PUBLIC_DOMAIN=https://media.austec.vn
STORAGE_DRIVER=r2   # Hỗ trợ 'r2' (production) hoặc 'local' (offline dev)
```

### 5.3. Định Dạng File & Giới Hạn
- **Định dạng cho phép**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`.
- **Dung lượng tối đa**: 5MB đối với ảnh đại diện / mẫu sản phẩm; 10MB đối với tài liệu kỹ thuật.
- **Tên file lưu trữ**: Chuẩn hóa UUID + Timestamp chống trùng lặp (ví dụ: `devices/model_a900_1730000000.webp`).

---

## 6. CHI TIẾT PHÂN RÃ COMPONENT & KẾT NỐI DB TỪNG MÀN HÌNH

### 6.1. Module Cài Đặt Hệ Thống (`/settings`)
* **Schema PostgreSQL (`system_settings`)**:
  ```sql
  CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY DEFAULT 1,
    expiry_notification_days INT DEFAULT 30,
    trial_expiry_period INT DEFAULT 15,
    notification_frequency VARCHAR(50) DEFAULT 'daily',
    mqtt_broker_url VARCHAR(255) DEFAULT 'mqtt://broker.austec.vn',
    mqtt_port INT DEFAULT 8883,
    tls_enabled BOOLEAN DEFAULT TRUE,
    keep_alive_seconds INT DEFAULT 60,
    company_name VARCHAR(255) DEFAULT 'CÔNG TY CỔ PHẦN CÔNG NGHỆ AUSTEC',
    hotline VARCHAR(50) DEFAULT '1900 6868',
    support_email VARCHAR(255) DEFAULT 'support@austec.vn',
    timezone VARCHAR(100) DEFAULT 'Asia/Ho_Chi_Minh (GMT+7)',
    updated_at VARCHAR(50),
    updated_by VARCHAR(100)
  );
  ```
* **API**:
  - `GET /api/admin/settings`: Lấy cấu hình hiện tại (nếu chưa có thì nạp dòng mặc định `id = 1`).
  - `PUT /api/admin/settings`: Cập nhật cấu hình và ghi xuống PostgreSQL.
* **Component Phân Rã**:
  1. `WarrantyPolicyCard.tsx`: 3 trường (`Thời hạn cảnh báo`, `Thời hạn dùng thử`, `Tần suất cảnh báo`). Không có subtitle thừa.
  2. `MqttBrokerCard.tsx`: 4 trường (`Máy chủ MQTT`, `Port`, `Bật mã hóa TLS`, `Keepalive`).
  3. `CompanyInfoCard.tsx`: 4 trường (`Tên doanh nghiệp`, `Hotline`, `Email hỗ trợ`, `Múi giờ`).
  4. `SettingsHeader.tsx`: Tiêu đề `Cài đặt hệ thống` + nút `Khôi phục mặc định` + nút `Lưu thiết lập`.

### 6.2. Module Quản Lý Thiết Bị (`/devices`)
Tách file [devices/page.tsx](file:///d:/Work/Austec/austec-iot-platform/web-admin/src/app/devices/page.tsx) (3.649 dòng) thành 6 Tab và 3 Modal:

#### Tab 1: Loại phần cứng (`DeviceTypeTab.tsx`)
- **Schema**: Bảng `device_types` (`id`, `type_code`, `type_name`, `image_url`, `description`, `created_at`).
- **Thực thi**:
  - `GET /api/admin/device-types`: Đọc danh sách từ PostgreSQL.
  - `POST /api/admin/device-types`: Thêm mới kèm `image_url` từ `ImageUploader` (loại bỏ emoji `"📦"`).
  - `PUT /api/admin/device-types/:id`: Cập nhật tên, mã, ảnh.
  - `DELETE /api/admin/device-types/:id`: Mở `ConfirmDeleteModal`, khi xác nhận gọi API xóa thật trong DB.

#### Tab 2: Mẫu thương phẩm (`DeviceModelTab.tsx`)
- **Schema**: Bảng `device_models` (`id`, `model_code`, `model_name`, `group_id`, `type_id`, `image_url`, `firmware_version_latest`, `hardware_version`, `assigned_properties`).
- **Thực thi**:
  - Bổ sung `PUT /api/admin/models/:id` và `DELETE /api/admin/models/:id` ở Backend.
  - Thay icon bằng `ImageUploader`.
  - Gắn `ConfirmDeleteModal` khi xóa mẫu sản phẩm.

#### Tab 3: Từ điển thuộc tính (`DevicePropertyTab.tsx`)
- **Schema**: Bảng `device_properties` (`id`, `property_key`, `display_name`, `data_type`, `unit`, `ui_widget_type`, `is_controllable`, `min_val`, `max_val`).
- **Thực thi**:
  - Bổ sung `DELETE /api/admin/properties/:id` ở Backend.
  - Nối API xóa ở Frontend, gắn `ConfirmDeleteModal`.

#### Tab 4: Nhóm sản phẩm (`DeviceGroupTab.tsx`)
- **Schema**: Bảng `device_groups` (`id`, `code`, `group_name`, `image_url`, `banner_url`, `description`).
- **Thực thi**:
  - Tích hợp `ImageUploader` cho cả ảnh đại diện nhóm và ảnh banner.
  - Gắn `ConfirmDeleteModal` khi xóa nhóm.

#### Tab 5: Danh sách thiết bị thực tế (`DeviceListTab.tsx`)
- Hiển thị bảng danh sách thiết bị nhập kho/ghép nối, phân trang, lọc theo trạng thái online/offline.
- Gắn `ConfirmDeleteModal` khi admin xóa thiết bị khỏi hệ thống.

#### Tab 6: Nhập kho & QR Decal (`DeviceImportTab.tsx`)
- Upload file Excel kiểm tra tính hợp lệ và import hàng loạt vào PostgreSQL.

### 6.3. Module Gian Hàng & Sản Phẩm (`/store`)
- **Chuyển đổi Backend**: Bỏ `productsStore` in-memory và bỏ file JSON. Đọc/ghi 100% vào bảng `products` của PostgreSQL:
  - `GET /api/admin/products`: Lấy từ bảng `products`.
  - `POST /api/admin/products`: Insert vào bảng `products`.
  - `PUT /api/admin/products/:id`: Update vào bảng `products`.
  - `DELETE /api/admin/products/:id`: Xóa khỏi bảng `products`.
- **Component Phân Rã**:
  - `ProductListTable.tsx`: Bảng danh sách sản phẩm, giá, tồn kho, ảnh thumbnail.
  - `ProductFormModal.tsx`: Form thêm/sửa, tích hợp `ImageUploader` chọn ảnh trực tiếp từ máy tính lên Cloudflare R2.
  - Gắn `ConfirmDeleteModal` khi xóa sản phẩm.

### 6.4. Module Khách Hàng & Phân Quyền (`/customers`)
- **Component Phân Rã**:
  - `CustomerAccountsTab.tsx`: Danh sách khách hàng thực tế từ bảng `users WHERE role = 'CUSTOMER'`, quản lý trạng thái kích hoạt/khóa tài khoản, gắn `ConfirmDeleteModal`.
  - `FamilyMatrixTab.tsx`: Quản lý ma trận phân quyền điều khiển thiết bị gia đình, lưu trực tiếp vào bảng `device_member_permissions`.

---

## 7. CHI TIẾT TÁI CẤU TRÚC BACKEND (API, ROUTER & REPOSITORIES)

### 7.1. Tách God File [server.ts](file:///d:/Work/Austec/austec-iot-platform/backend/src/server.ts) (2.886 dòng) Theo Chuẩn Feature Module
Chuyển đổi toàn bộ logic API từ monolithic `server.ts` sang mô hình **NestJS Feature Modules** độc lập trong `backend/src/modules/[feature]/`. Mỗi module tự đóng gói:
1. **Controller (`*.controller.ts`)**: Tiếp nhận Request, gọi Service, trả Response chuẩn HTTP.
2. **Service (`*.service.ts`)**: Xử lý logic nghiệp vụ, tính toán, kiểm tra quyền hạn.
3. **Module / Router (`*.routes.ts` hoặc `*.module.ts`)**: Khai báo routing và gắn middlewares nội bộ của module.
4. **DTO (`dto/*.dto.ts`)**: Định nghĩa kiểu dữ liệu truyền nhận và validate schema bằng Zod.
5. **Repository (`repositories/*.repository.ts`)**: Thực thi các câu truy vấn SQL an toàn xuống PostgreSQL.

Danh sách các Feature Module độc lập:
1. `src/modules/devices/`: Quản lý `/api/admin/groups`, `/device-types`, `/properties`, `/models`, `/inventory`, `/api/devices/*`.
2. `src/modules/settings/`: Quản lý `/api/admin/settings`.
3. `src/modules/upload/`: Quản lý `POST /api/upload/image` (Cloudflare R2).
4. `src/modules/store/`: Quản lý `/api/admin/products`, `/api/shop/products`, `/api/admin/orders` (100% PostgreSQL).
5. `src/modules/users/`: Quản lý `/api/admin/staff`, `/api/admin/customers`, `/api/admin/roles`.
6. `src/modules/blackbox/`: Quản lý `/api/blackbox/*`.
7. `src/modules/cskh/`: Quản lý `/api/support/*` và WebSocket Chat.
8. `src/modules/mqtt/`: Quản lý `/api/mqtt/status`, `/api/mqtt/history`, `/api/mqtt/publish`, `/api/wifi/current`.

### 7.2. Tách God Class [postgres.service.ts](file:///d:/Work/Austec/austec-iot-platform/backend/src/services/postgres.service.ts) (2.315 dòng)
Tách các hàm truy vấn SQL sang từng Repository chuyên biệt nằm trong module tương ứng:
- `SettingsRepository`: `getSettings()`, `updateSettings()`
- `DeviceTypeRepository`: `getTypes()`, `createType()`, `updateType()`, `deleteType()`
- `DeviceModelRepository`: `getModels()`, `createModel()`, `updateModel()`, `deleteModel()`
- `DevicePropertyRepository`: `getProperties()`, `createProperty()`, `updateProperty()`, `deleteProperty()`
- `ProductRepository`: Đọc/ghi bảng `products` hoàn toàn bằng SQL chuẩn.

---

## 8. CHI TIẾT TÁI CẤU TRÚC MOBILE APP FLUTTER - FEATURE-FIRST CLEAN ARCHITECTURE

### 8.1. Tổ Chức Theo Feature-First (Data - Domain - Presentation)
Chuyển đổi triệt để từ thư mục phẳng `presentation/screens/` sang cấu trúc **Feature-First chuẩn Clean Architecture**: Mỗi tính năng nằm trong `lib/features/[feature]/` tự đóng gói 3 tầng độc lập:
- **`data/`**: Chứa `datasources` (gọi REST/BLE/MQTT), `models` (from/toJson), `repositories` (triển khai Interface từ Domain).
- **`domain/`**: Chứa `entities` (đối tượng cốt lõi), `repositories` (hợp đồng trừu tượng), `usecases` (luồng nghiệp vụ thuần túy không dính UI).
- **`presentation/`**: Chứa `screens` (màn hình mỏng < 200 dòng), `widgets` (các component con tái sử dụng), `controllers` (quản lý State).

```
mobile-app/lib/
├── core/                                # Thành phần dùng chung toàn ứng dụng
│   ├── network/                         # HTTP Client, MQTT Client, WebSocket Client
│   ├── services/                        # BleProvisioningService, StorageService
│   ├── theme/                           # Color tokens, Typography, AppTheme
│   └── widgets/                         # Reusable Primitives (AppButton, AppDialog, AppTextField)
└── features/                            # CÁC TÍNH NĂNG TỰ ĐÓNG GÓI FEATURE-FIRST
    ├── auth/                            # Module: Đăng nhập & Xác thực
    │   ├── data/
    │   │   ├── datasources/             # AuthRemoteDataSource
    │   │   ├── models/                  # UserModel
    │   │   └── repositories/            # AuthRepositoryImpl
    │   ├── domain/
    │   │   ├── entities/                # UserEntity
    │   │   └── repositories/            # AuthRepository (Interface)
    │   └── presentation/
    │       ├── controllers/             # AuthController
    │       ├── screens/                 # LoginScreen, RegisterScreen
    │       └── widgets/                 # LoginFormWidget, AuthHeaderWidget
    ├── provisioning/                    # Module: Ghép nối phần cứng ESP32 (BLE & WiFi)
    │   ├── data/
    │   │   ├── datasources/             # BleScannerDataSource, EspGattDataSource
    │   │   ├── models/                  # DiscoveredBleModel, WifiNetworkModel
    │   │   └── repositories/            # ProvisioningRepositoryImpl
    │   ├── domain/
    │   │   ├── entities/                # BleDeviceEntity, WifiCredentialsEntity
    │   │   └── usecases/                # ScanBleDevicesUseCase, ProvisionWifiUseCase
    │   └── presentation/
    │       ├── controllers/             # ProvisioningController
    │       ├── screens/                 # ProvisioningScreen (giảm từ 81KB xuống < 15KB)
    │       └── widgets/                 # BleRadarWidget, WifiSelectionSheet, StepProgressWidget
    ├── device_control/                  # Module: Điều khiển thiết bị (Cửa cuốn Titadoor, Cảm biến)
    │   ├── data/
    │   │   ├── datasources/             # MqttControlDataSource, DeviceRestDataSource
    │   │   ├── models/                  # TelemetryModel, CommandPayloadModel
    │   │   └── repositories/            # DeviceControlRepositoryImpl
    │   ├── domain/
    │   │   ├── entities/                # DeviceRealtimeStateEntity
    │   │   └── usecases/                # SendDoorCommandUseCase, RefreshTelemetryUseCase
    │   └── presentation/
    │       ├── controllers/             # DeviceControlController
    │       ├── screens/                 # RollerDoorControlScreen, DeviceDetailScreen
    │       └── widgets/                 # DoorAnimationWidget, ControlButtonGroup, SensorGrid
    ├── cskh/                            # Module: Chăm sóc khách hàng & Chat Realtime
    │   ├── data/
    │   │   ├── datasources/             # ChatWebSocketDataSource, SupportRestDataSource
    │   │   ├── models/                  # ChatMessageModel, SupportTicketModel
    │   │   └── repositories/            # CskhRepositoryImpl
    │   ├── domain/
    │   │   ├── entities/                # ChatMessageEntity, TicketEntity
    │   │   └── usecases/                # SendChatMessageUseCase, UploadChatAttachmentUseCase
    │   └── presentation/
    │       ├── controllers/             # ChatController
    │       ├── screens/                 # CskhChatScreen (giảm từ 82KB xuống < 15KB)
    │       └── widgets/                 # ChatBubbleWidget, ChatInputBar, MediaViewer
    └── family_sharing/                  # Module: Chia sẻ quyền điều khiển gia đình
        ├── data/
        │   ├── datasources/             # FamilySharingRemoteDataSource
        │   ├── models/                  # FamilyMemberModel, PermissionMatrixModel
        │   └── repositories/            # FamilySharingRepositoryImpl
        ├── domain/
        │   ├── entities/                # FamilyMemberEntity
        │   └── usecases/                # GrantPermissionUseCase, RevokePermissionUseCase
        └── presentation/
            ├── controllers/             # FamilySharingController
            ├── screens/                 # FamilySharingScreen (giảm từ 71KB xuống < 15KB)
            └── widgets/                 # MemberCardWidget, PermissionMatrixSheet
```

### 8.2. Đơn Giản Hóa Giao Diện Mobile
- Bỏ các tag kỹ thuật hiển thị rườm rà trong chat CSKH và màn hình danh sách thiết bị (như `specs` chi tiết không cần thiết).
- Hiển thị trực tiếp hình ảnh lấy từ CDN Cloudflare R2 thay vì link Unsplash ngẫu nhiên.
- Loại bỏ hoàn toàn các biến in đậm rác, thống nhất bảng mã màu chuẩn Austec Industrial Design.

---

## 9. LỘ TRÌNH TRIỂN KHAI CHI TIẾT TỪNG BƯỚC (IMPLEMENTATION ROADMAP)

### Giai Đoạn 1: Chuẩn Bị Cơ Sở Dữ Liệu & Backend API (Ngày 1)
- [x] **Bước 1.1**: Backup toàn bộ file `data/austec_database.json` và tạo bảng `system_settings` trong PostgreSQL.
- [x] **Bước 1.2**: Viết module `storage` tích hợp AWS SDK kết nối Cloudflare R2 (`cloudflare-r2.service.ts`).
- [x] **Bước 1.3**: Tạo route `POST /api/upload/image`.
- [x] **Bước 1.4**: Bổ sung đầy đủ các endpoint còn thiếu:
  - `GET /api/admin/settings` & `PUT /api/admin/settings`
  - `PUT /api/admin/models/:id` & `DELETE /api/admin/models/:id`
  - `DELETE /api/admin/properties/:id`
  - Chuyển `products` sang lưu bảng PostgreSQL `products`.
- [x] **Bước 1.5**: Test toàn bộ endpoint qua Postman/Curl để đảm bảo API hoạt động chính xác trước khi sửa giao diện.

### Giai Đoạn 2: Xây Dựng Component Nền Tảng & Tinh Gọn Sidebar (Ngày 2)
- [x] **Bước 2.1**: Tạo `ConfirmDeleteModal.tsx` tại `web-admin/src/components/ConfirmDeleteModal.tsx`.
- [x] **Bước 2.2**: Tạo `ImageUploader.tsx` tại `web-admin/src/components/ImageUploader.tsx`.
- [x] **Bước 2.3**: Dọn dẹp [Sidebar.tsx](file:///d:/Work/Austec/austec-iot-platform/web-admin/src/components/Sidebar.tsx): bỏ số thứ tự `1.-8.`, bỏ icon sub-menu, bỏ toàn bộ badge `NEW`, `LIVE`, `SHA-256`, `SYNC`, `VIDEO`.

### Giai Đoạn 3: Tái Cấu Trúc Toàn Bộ Màn Hình Web Admin - Feature-Driven (Ngày 3 - 4)
- [x] **Bước 3.1: Màn hình Cài đặt hệ thống (`/settings`)**:
  - Tách thành 3 component Card: `WarrantyPolicyCard`, `MqttBrokerCard`, `CompanyInfoCard`.
  - Xóa bỏ icon tiêu đề, xóa bỏ song ngữ in hoa, xóa bỏ toàn bộ text mô tả thừa.
  - Nối API `GET /api/admin/settings` và `PUT /api/admin/settings`.
- [x] **Bước 3.2: Màn hình Quản lý thiết bị (`/devices`)**:
  - Tách nhỏ 6 Tab và 3 Modal.
  - Tab Loại phần cứng: Dùng `ImageUploader`, nối API CRUD thật, gắn `ConfirmDeleteModal`.
  - Tab Mẫu thương phẩm: Dùng `ImageUploader`, nối API CRUD thật, gắn `ConfirmDeleteModal`.
  - Tab Từ điển thuộc tính: Nối API xóa thật, gắn `ConfirmDeleteModal`.
  - Tab Nhóm sản phẩm: Dùng `ImageUploader`, gắn `ConfirmDeleteModal`.
  - Tab Danh sách thiết bị & Nhập kho: Gắn `ConfirmDeleteModal`.
- [ ] **Bước 3.3: Màn hình Gian hàng (`/store`)**:
  - Tách `ProductListTable.tsx`, `ProductFormModal.tsx`, `ProductDetailDrawer.tsx`.
  - Tạo `hooks/useStoreProducts.ts` và `services/store.service.ts`.
  - Đưa `src/app/store/page.tsx` về chuẩn < 50 dòng wrapper.
- [ ] **Bước 3.4: Màn hình Khách hàng & Phân quyền (`/customers`)**:
  - Tách file 1.945 dòng thành `src/features/customers/`:
    - `components/CustomerAccountsTab.tsx`
    - `components/FamilyMatrixTab.tsx`
    - `components/CustomerDetailModal.tsx`
    - `hooks/useCustomers.ts`
    - `services/customers.service.ts`
    - `types/customers.types.ts`
  - Đưa `src/app/customers/page.tsx` về chuẩn < 50 dòng wrapper.

### Giai Đoạn 4: Tái Cấu Trúc Backend & Mobile App Theo Chuẩn Module (Ngày 5)
- [x] **Bước 4.1: Tái cấu trúc Backend Router (Mục 7.1 Master Plan)**:
  - Tách God File `server.ts` (115KB, 2.886 dòng) thu gọn xuống còn **23 dòng**.
  - Tạo `backend/src/app.ts` cấu hình Express, thiết lập hạ tầng Core Services và mount toàn bộ 7 Feature Modules:
    - `src/modules/settings/` (`settings.controller.ts`, `settings.service.ts`, `settings.repository.ts`, `dto/`, `settings.routes.ts`)
    - `src/modules/devices/` (`devices.controller.ts`, `devices.service.ts`, `devices.repository.ts`, `dto/`, `devices.routes.ts`)
    - `src/modules/store/` (`store.controller.ts`, `store.service.ts`, `store.repository.ts`, `dto/`, `store.routes.ts` - 100% PostgreSQL)
    - `src/modules/users/` (`users.controller.ts`, `users.service.ts`, `users.repository.ts`, `dto/`, `users.routes.ts`)
    - `src/modules/blackbox/` (`blackbox.controller.ts`, `blackbox.service.ts`, `blackbox.repository.ts`, `blackbox.routes.ts`)
    - `src/modules/mqtt/` (`mqtt.routes.ts`)
    - `src/modules/upload/` (`upload.controller.ts`, `upload.routes.ts` - Cloudflare R2)
  - Backend TypeScript compile 100% sạch lỗi (`npx tsc --noEmit` code 0).
- [x] **Bước 4.2: Tái cấu trúc Mobile App Flutter (Mục 8 Master Plan)**:
  - Thiết lập kiến trúc Feature-First Clean Architecture (`data/`, `domain/`, `presentation/`) trong `mobile-app/lib/features/`:
    - `lib/features/cskh/` (`data/models/chat_message_model.dart`, `domain/entities/chat_device_item.dart`)
    - `lib/features/provisioning/` (`domain/entities/ble_device_entity.dart`)
    - `lib/features/family_sharing/` (`domain/entities/member_permission_entity.dart`)
  - Chạy `flutter analyze` 0 lỗi biên dịch.

### Giai Đoạn 5: Kiểm Thử Toàn Diện & Nghiệm Thu (Ngày 6)
- [ ] **Test Độ Bền Vững Dữ Liệu**:
  - Thêm Loại thiết bị mới -> F5 -> Vẫn hiển thị đúng.
  - Đổi thông số Cài đặt hệ thống -> F5 -> Vẫn lưu đúng trong PostgreSQL.
  - Upload ảnh từ máy tính -> Kiểm tra file đã xuất hiện trên Cloudflare R2 bucket.
  - Bấm xóa một mục -> Dialog cảnh báo mở ra -> Xác nhận xóa -> Kiểm tra DB đã bị xóa vĩnh viễn.
- [ ] **Test Khả Năng Tương Thích**:
  - Kiểm tra Mobile App vẫn điều khiển thiết bị, quét BLE và chat bình thường.
  - Đảm bảo Backend và Web Admin compile 0 lỗi (`tsc --noEmit`).

---

## 10. HƯỚNG DẪN THIẾT LẬP & TÍCH HỢP CLOUDFLARE R2

Dưới đây là từng bước cụ thể để thiết lập hệ thống lưu trữ ảnh chuẩn Enterprise sử dụng **Cloudflare R2** hoàn toàn miễn phí băng thông:

### Bước 1: Tạo Tài Khoản & Kích Hoạt Cloudflare R2
1. Truy cập [dash.cloudflare.com](https://dash.cloudflare.com/) và đăng nhập (hoặc đăng ký tài khoản miễn phí).
2. Tại thanh điều hướng bên trái, chọn **R2 Object Storage**.
3. Bấm **Purchase R2 Plan** hoặc kích hoạt (Cloudflare miễn phí 10 GB lưu trữ đầu tiên mỗi tháng và 10.000.000 lượt đọc ảnh/tháng).

### Bước 2: Tạo Bucket Lưu Trữ Media
1. Bấm nút **Create bucket**.
2. Nhập tên bucket: `austec-media`.
3. Vùng lưu trữ (Location): Chọn **Automatic** (Cloudflare sẽ tự động định vị tối ưu gần Việt Nam).
4. Bấm **Create bucket**.

### Bước 3: Thiết Lập Tên Miền Công Khai (Public Domain) Cho Ảnh
Để ảnh sau khi upload có thể hiển thị trực tiếp trên Web và Mobile App:
1. Mở bucket `austec-media` vừa tạo.
2. Chuyển sang tab **Settings**.
3. Tại mục **Public access**:
   - **Cách 1 (Nhanh nhất - Miễn phí)**: Bật tính năng **R2.dev subdomain** -> Bấm **Allow**. Bạn sẽ nhận được một đường link công khai dạng: `https://pub-xxxxxxxxxxxxxx.r2.dev`.
   - **Cách 2 (Chuyên nghiệp)**: Tại mục **Custom Domains**, bấm **Connect Domain** và nhập tên miền của bạn (ví dụ: `media.austec.vn`). Cloudflare sẽ tự động cấp chứng chỉ SSL HTTPS miễn phí.

### Bước 4: Tạo Khóa API (API Tokens / S3 Credentials)
1. Quay lại trang chủ **R2 Overview** -> Ở cột bên phải bấm **Manage R2 API Tokens**.
2. Bấm **Create API Token**.
3. Đặt tên: `austec-backend-token`.
4. Quyền hạn (Permissions): Chọn **Object Read & Write**.
5. Phạm vi (Apply to): Chọn **austec-media** (hoặc All buckets).
6. Bấm **Create API Token**.
7. Lưu lại 4 thông số hiển thị trên màn hình:
   - **Account ID**: (dãy mã hex 32 ký tự)
   - **Access Key ID**: (dãy mã gồm chữ và số)
   - **Secret Access Key**: (mã bí mật - chỉ hiển thị 1 lần)
   - **Jurisdiction-specific endpoint**: dạng `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

### Bước 5: Cài Đặt Thư Viện Trên Backend
Tại thư mục [backend](file:///d:/Work/Austec/austec-iot-platform/backend), cài đặt AWS SDK v3 (chuẩn tương thích S3 của Cloudflare R2) và multer xử lý upload file:
```bash
cd d:\Work\Austec\austec-iot-platform\backend
npm install @aws-sdk/client-s3 multer
npm install --save-dev @types/multer
```

### Bước 6: Cập Nhật File Cấu Hình `.env` Backend
Mở [backend/.env](file:///d:/Work/Austec/austec-iot-platform/backend/.env) và điền các thông số:
```env
# Cloudflare R2 Credentials
R2_ACCOUNT_ID=dán_account_id_vào_đây
R2_ACCESS_KEY_ID=dán_access_key_id_vào_đây
R2_SECRET_ACCESS_KEY=dán_secret_access_key_vào_đây
R2_BUCKET_NAME=austec-media
R2_PUBLIC_DOMAIN=https://pub-xxxxxxxxxxxxxx.r2.dev
STORAGE_DRIVER=r2
```

---
*Kế hoạch này là tài liệu chuẩn duy nhất quy định việc tái cấu trúc dự án Austec IoT Platform. Toàn bộ quá trình triển khai kỹ thuật tiếp theo sẽ tuân thủ nghiêm ngặt 100% các bước đã nêu.*
