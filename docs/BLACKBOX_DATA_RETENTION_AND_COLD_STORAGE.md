# CHIẾN LƯỢC QUẢN LÝ VÒNG ĐỜI DỮ LIỆU & LƯU TRỮ LẠNH HỘP ĐEN KIỂM TOÁN
*(Austec IoT Blackbox - Data Retention Policy & Cold Storage Archiving Strategy)*

---

## 1. TỔNG QUAN & BỐI CẢNH (EXECUTIVE SUMMARY)

### 1.1. Bản chất của Hộp Đen Kiểm Toán (/blackbox)
Hệ thống Hộp Đen Kiểm Toán của nền tảng **Austec IoT Platform** là cơ chế ghi vết viễn thám bất biến (**WORM** - *Write Once, Read Many*) chuẩn chứng cứ pháp lý và an toàn dữ liệu, ghi lại toàn bộ thao tác điều khiển thiết bị (cửa cuốn, cổng thông minh, bộ lưu điện UPS, khóa trẻ em, cảm biến hành trình...):
* **Ai điều khiển**: Chủ nhà, Quản trị viên ADMIN, Nhân viên CSKH, hoặc Cảm biến tự động.
* **Hành động & Tham số**: Lệnh `OPEN`, `CLOSE`, `STOP`, `TOGGLE_CHILD_LOCK`... kèm payload chi tiết.
* **Địa chỉ & Mạng**: IP máy phát lệnh, thời gian phát lệnh (T1), thời gian thiết bị phản hồi ACK (T2).
* **Tính toàn vẹn mật mã**: Chữ ký số băm **HMAC-SHA256** duy nhất chống sửa đổi, chống chối bỏ trách nhiệm.

### 1.2. Mâu thuẫn giữa Hiệu năng Database & Trách nhiệm Pháp lý
* **Vấn đề hiệu năng**: Với hàng nghìn thiết bị hoạt động liên tục mỗi ngày, bảng `blackbox_logs` trong CSDL PostgreSQL sẽ phình to rất nhanh (hàng triệu bản ghi sau 6–12 tháng), gây chậm truy vấn, tốn RAM và tăng chi phí thuê database cloud.
* **Vấn đề trách nhiệm pháp lý**: Nếu **xóa cứng vĩnh viễn** dữ liệu sau 90 ngày, khi xảy ra sự cố kỹ thuật, tai nạn kẹt cửa, trộm đột nhập hoặc tranh chấp bảo hành động cơ sau 1–2 năm, Austec và khách hàng sẽ mất hoàn toàn bằng chứng lịch sử để bảo vệ quyền lợi.
* **Giải pháp tối ưu**: Triển khai **Chiến lược Phân tầng Lưu trữ (Tiered Storage)**:
  * **Tầng Nóng (Hot Tier - PostgreSQL)**: Lưu trữ 90 ngày gần nhất để xem tức thì trên giao diện Web-Admin.
  * **Tầng Lạnh (Cold Tier - Cloudflare R2 / S3 Object Storage)**: Tự động nén và đẩy dữ liệu cũ lên kho lưu trữ đám mây giá rẻ trọn đời.

---

## 2. KIẾN TRÚC PHÂN TẦNG LƯU TRỮ (TIERED STORAGE ARCHITECTURE)

```
                     ┌────────────────────────────────────────┐
                     │   Mobile App / Web Admin / Cảm biến    │
                     └───────────────────┬────────────────────┘
                                         │ Phát lệnh điều khiển
                                         ▼
                     ┌────────────────────────────────────────┐
                     │          Backend IoT Gateway           │
                     └───────────────────┬────────────────────┘
                                         │ Ghi log tức thì
                                         ▼
                     ┌────────────────────────────────────────┐
                     │        TẦNG NÓNG (HOT DATABASE)        │
                     │         PostgreSQL: blackbox_logs       │
                     │       (Lưu 90 ngày gần nhất - Nhanh)   │
                     └───────────────────┬────────────────────┘
                                         │
                 Sau 90 ngày (Cron Worker chạy lúc 02:00 sáng)
                                         │
             ┌───────────────────────────┴───────────────────────────┐
             │ 1. Trích xuất bản ghi cũ & Nén gzip (.json.gz)        │
             │ 2. Đẩy file lên Cloudflare R2 Object Storage          │
             │ 3. Dọn dẹp an toàn trong PostgreSQL (Batch Delete)    │
             │ 4. Lưu bản ghi metadata vào `blackbox_archives`       │
             └───────────────────────────┬───────────────────────────┘
                                         ▼
                     ┌────────────────────────────────────────┐
                     │        TẦNG LẠNH (COLD ARCHIVE)        │
                     │    Cloudflare R2: austec-media/archives│
                     │     (Lưu trữ vĩnh viễn - Siêu rẻ)      │
                     └────────────────────────────────────────┘
```

---

## 3. ĐẶC TẢ BIẾN CẤU HÌNH MÔI TRƯỜNG (.ENV SPECIFICATION)

Cấu hình được quản lý tập trung trong file `backend/.env`:

```env
# ==============================================================================
# AUSTEC BLACKBOX - CHÍNH SÁCH LƯU TRỮ DỮ LIỆU & LƯU TRỮ LẠNH (DATA RETENTION)
# ==============================================================================

# Số ngày lưu trữ tối đa trên CSDL nóng PostgreSQL (Mặc định: 90 ngày)
# Giá trị: Số nguyên > 0 (Nếu đặt 0 hoặc để trống = Lưu trữ vĩnh viễn không dọn dẹp)
BLACKBOX_RETENTION_DAYS=90

# Khung giờ chạy tiến trình dọn dẹp định kỳ (Cron Expression)
# Mặc định: Chạy lúc 02:00 sáng hàng ngày (khung giờ thấp điểm ít người dùng)
BLACKBOX_CLEANUP_CRON="0 2 * * *"

# Bật/Tắt tính năng tự động đóng gói lưu trữ lạnh lên Cloudflare R2 trước khi xóa
# Giá trị: true | false (Khuyên dùng: true)
BLACKBOX_AUTO_ARCHIVE_ENABLED=true

# Số lượng bản ghi xóa trong mỗi mẻ (Batch Deletion Size) để chống khóa bảng
# Mặc định: 5000 dòng/mẻ
BLACKBOX_CLEANUP_BATCH_SIZE=5000

# Thư mục lưu trữ trên Cloudflare R2 Bucket
BLACKBOX_ARCHIVE_R2_PREFIX="audit-archives"
```

---

## 4. QUY TRÌNH VẬN HÀNH TỰ ĐỘNG (DETAILED WORKFLOW)

Tiến trình dọn dẹp và lưu trữ lạnh chạy ngầm hàng ngày gồm 5 bước tiêu chuẩn:

### Bước 1: Tính toán Mốc thời gian cắt (Cutoff Timestamp)
* Worker đọc giá trị `BLACKBOX_RETENTION_DAYS` (ví dụ: `90`).
* Tính toán mốc thời gian: `cutoffDate = NOW() - INTERVAL '90 days'`.

### Bước 2: Kiểm tra & Trích xuất dữ liệu cũ
* Truy vấn các bản ghi có `created_at < cutoffDate`.
* Nhóm dữ liệu theo từng tháng (ví dụ: `2026-08`, `2026-09`) để đóng gói khoa học.

### Bước 3: Đóng gói & Nén siêu nhẹ (Gzip Stream)
* Định dạng tệp tin: `austec_blackbox_archive_YYYY_MM.json.gz`.
* Tỷ lệ nén đạt tới **90%**: 100.000 bản ghi thô (~30 MB) nén lại chỉ còn **khoảng 2.5 MB**.
* Giữ nguyên chữ ký số SHA-256 của từng bản ghi để bảo đảm tính pháp lý.

### Bước 4: Tải lên Cloudflare R2 Object Storage
* Sử dụng thư viện `@aws-sdk/client-s3` đã tích hợp sẵn trong backend để đẩy file lên bucket `austec-media`:
  `austec-media/audit-archives/2026/08/austec_blackbox_archive_2026_08.json.gz`.
* Tạo đường link tải xuống an toàn (Presigned URL hoặc URL nội bộ có phân quyền).

### Bước 5: Ghi nhận Metadata & Dọn dẹp CSDL Nóng
* Lưu 1 dòng tóm lược vào bảng `blackbox_archives` trên PostgreSQL.
* Thực hiện xóa dữ liệu cũ trong bảng `blackbox_logs` theo từng mẻ (`LIMIT 5000`) nhằm bảo đảm các lệnh điều khiển mở/đóng cửa của khách hàng không bị nghẽn (Zero Lock Contention).

---

## 5. THIẾT KẾ CƠ SỞ DỮ LIỆU BẢNG LƯU TRỮ LẠNH (`blackbox_archives`)

Bảng mục lục lưu trữ lạnh được tạo trong CSDL PostgreSQL để quản lý danh sách các tệp nén đã lưu trữ:

```sql
CREATE TABLE IF NOT EXISTS blackbox_archives (
    id SERIAL PRIMARY KEY,
    archive_code VARCHAR(100) UNIQUE NOT NULL,       -- Ví dụ: 'ARCHIVE-2026-08'
    archive_period VARCHAR(50) NOT NULL,            -- Ví dụ: '2026-08' (Tháng/Năm)
    total_records INT NOT NULL,                     -- Số lượng bản ghi trong tệp
    raw_size_bytes BIGINT,                          -- Dung lượng gốc chưa nén
    compressed_size_bytes BIGINT,                   -- Dung lượng sau khi nén gzip
    file_path VARCHAR(255) NOT NULL,                -- Đường dẫn lưu trên Cloudflare R2
    file_url TEXT NOT NULL,                         -- URL truy cập tệp lưu trữ
    merkle_root_hash VARCHAR(255),                  -- Băm gốc Merkle xác thực toàn bộ gói tin
    archived_by VARCHAR(100) DEFAULT 'SYSTEM_CRON', -- Tác nhân thực thi
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blackbox_archives_period ON blackbox_archives(archive_period);
```

---

## 6. KẾ HOẠCH TÍCH HỢP GIAO DIỆN WEB-ADMIN (/blackbox)

Giao diện Quản trị Hộp Đen sẽ được bổ sung thêm khu vực **"Kho Lưu Trữ Lạnh (Cold Archives)"**:

1. **Tab "Dữ liệu Hiện tại (90 ngày)"**:
   * Hiển thị bảng dòng sự kiện trực tiếp phục vụ giám sát vận hành hàng ngày.
   * Lọc nhanh theo Hardware ID, Email, Vai trò, Trạng thái, IP.
2. **Tab "Kho Lưu Trữ Lạnh (Cold Archives)"**:
   * Bảng danh sách các gói dữ liệu theo tháng:
     * *Tháng 08/2026*: 45.200 bản ghi | Dung lượng nén: 2.1 MB | [Tải file .json.gz] | [Tải Báo cáo Pháp lý Excel].
     * *Tháng 07/2026*: 38.100 bản ghi | Dung lượng nén: 1.8 MB | [Tải file .json.gz] | [Tải Báo cáo Pháp lý Excel].
3. **Tính năng Trích xuất theo Yêu cầu (On-Demand Legal Report)**:
   * Khi công an, tòa án hoặc khách hàng yêu cầu xác minh sự cố của năm trước:
   * Quản trị viên chỉ cần chọn khoảng thời gian cần tra cứu $\rightarrow$ Hệ thống tự động đọc từ file nén trên R2 $\rightarrow$ Xuất ngay file Excel **Báo Cáo Pháp Lý Hộp Đen** với đầy đủ chữ ký số HMAC-SHA256 chuẩn FIPS 180-4.

---

## 7. ĐÁNH GIÁ HIỆU QUẢ KINH TẾ & KỸ THUẬT

| Tiêu chí | Lưu trữ toàn bộ trên PostgreSQL | Phân tầng: PostgreSQL (90 ngày) + Cloudflare R2 |
| :--- | :--- | :--- |
| **Dung lượng CSDL sau 2 năm** | 50 – 100 GB (Chậm chạp, dễ quá tải RAM/CPU) | Luôn duy trì ổn định $\le 1 - 2$ GB |
| **Tốc độ truy vấn Web-Admin** | Suy giảm dần theo thời gian (vài giây/query) | Luôn đạt đỉnh dưới 50ms |
| **Chi phí hạ tầng lưu trữ** | Chi phí nâng cấp dung lượng Managed DB rất đắt | Miễn phí (R2 miễn phí 10 GB đầu & miễn phí băng thông tải về) |
| **An toàn & Toàn vẹn dữ liệu** | Rủi ro khi bảo trì, backup CSDL cồng kềnh | Tách biệt hoàn toàn, file nén bất biến không thể bị hack/ghi đè |
| **Giá trị chứng cứ pháp lý** | Dễ bị mất nếu xóa bỏ | Lưu trữ vĩnh viễn, sẵn sàng đối chiếu mọi lúc |

---
*Tài liệu được biên soạn phục vụ định hướng phát triển kiến trúc hệ thống Austec IoT Platform.*
