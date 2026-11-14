# HƯỚNG DẪN TRIỂN KHAI MEDIAMTX LÊN VPS PRODUCTION & LƯU Ý VẬN HÀNH

Tài liệu này tổng hợp toàn bộ hướng dẫn, cấu hình mẫu và các lưu ý kỹ thuật sống còn khi chuyển đổi hệ thống truyền luồng Camera (**MediaMTX Streaming Server**) từ máy tính cá nhân Local lên **VPS Thực Tế (Production)** (Oracle Cloud, AWS, DigitalOcean, Hetzner, Vultr...), cũng như quy trình kiểm thử khi đổi mạng Wi-Fi trên máy tính.

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG AUSTEC IOT

Hệ thống Austec IoT được phân tách hoàn toàn giữa **Luồng Điều Khiển** và **Luồng Dữ Liệu Video**:

```text
[Người Dùng: Mobile App / Web Admin (4G/5G/Wi-Fi)]
        │                                 │
        │ (1) Lệnh điều khiển MQTT         │ (2) Xem Video WebRTC (< 300ms)
        ▼                                 ▼
[Cloud Backend Render]           [MediaMTX Streaming Server]
  https://austec-backend.onrender.com       (Hiện tại: Local PC -> Tương lai: VPS Cloud)
        │                                 ▲
        │ MQTT Broker Cloud               │ (3) Đẩy RTSP MJPEG (RFC 2326)
        │ (broker.emqx.io:1883)           │
        ▼                                 │
[Thiết Bị: Cửa cuốn, Ổ cắm, ESP32-CAM] ───┘
```

* **Luồng Điều Khiển (MQTT & Database) - ĐÃ PRODUCTION 100%:**
  * Toàn bộ thiết bị (Cửa cuốn, Ổ cắm, Camera) giao tiếp qua MQTT Cloud Broker và Backend trên **Render**.
  * Bất cứ đâu có Internet (4G/5G), người dùng đều bật/tắt thiết bị, mở/đóng luồng camera (`13`/`14`), hay khôi phục cài đặt gốc (`RESET_FACTORY`) từ xa ngay lập tức.
* **Luồng Dữ Liệu Video (MediaMTX & RTSP) - ĐANG CHẠY LOCAL:**
  * Hiện tại máy tính đóng vai trò là MediaMTX trung gian (`192.168.100.3:8554` và `:8889`) phục vụ quá trình test.
  * Khi đưa lên VPS thực tế, bạn chỉ cần thay đổi địa chỉ host của MediaMTX sang **IP Public hoặc Tên miền của VPS**.

---

## 2. 5 LƯU Ý "SỐNG CÒN" KHI ĐƯA MEDIAMTX LÊN VPS PRODUCTION

### ① Mở tường lửa (Firewall Inbound Rules) - Đặc biệt trên Oracle Cloud
Lỗi 90% người mới deploy gặp phải là camera không đẩy được luồng hoặc WebRTC bị đen màn hình do bị chặn port.
* **Trên Oracle Cloud (có 2 tầng tường lửa):**
  1. **Tầng Cloud**: Vào Oracle Console -> *Networking* -> *Virtual Cloud Networks (VCN)* -> Chọn VCN -> *Security Lists* -> *Default Security List* -> Thêm **Ingress Rules**.
  2. **Tầng Hệ Điều Hành VPS**: Chạy lệnh mở port trên Ubuntu/Oracle Linux:
     ```bash
     sudo ufw allow 8554/tcp
     sudo ufw allow 8888/tcp
     sudo ufw allow 8889/tcp
     sudo ufw allow 8189/tcp
     sudo ufw allow 8189/udp
     sudo ufw reload
     ```
* **Danh sách các cổng bắt buộc phải mở:**

| Cổng | Giao thức | Mục đích | Hậu quả nếu quên mở |
| :---: | :---: | :--- | :--- |
| **`8554`** | **TCP** | Cổng nhận luồng RTSP PUSH từ ESP32-CAM | Camera báo lỗi kết nối RTSP, không đẩy được video |
| **`8889`** | **TCP** | Cổng WebRTC WHEP API cho Mobile App & Web | App không kết nối được trình phát video |
| **`8888`** | **TCP** | Cổng HLS Stream (cho Web Admin, Safari iOS) | Không xem được trên trình duyệt Safari |
| **`8189`** | **CẢ TCP VÀ UDP** | **Cổng truyền tải media WebRTC (ICE Candidate)** | **Điện thoại xem qua 4G sẽ bị lỗi "ICE failed" hoặc đứng hình** |

---

### ② Cấu hình `MTX_WEBRTCADDITIONALHOSTS`
* Trong container Docker, MediaMTX mặc định chỉ biết IP nội bộ của Docker (`172.17.x.x`).
* Khi Mobile App (dùng mạng 4G) yêu cầu xem video, MediaMTX phải gửi địa chỉ IP Public của VPS để hai bên kết nối trực tiếp (WebRTC ICE).
* **Bắt buộc cấu hình trong Docker Compose trên VPS:**
  ```yaml
  environment:
    - MTX_WEBRTCADDITIONALHOSTS=IP_PUBLIC_VPS_HOẶC_DOMAIN
  ```
  *(Ví dụ: `MTX_WEBRTCADDITIONALHOSTS=150.136.x.x` hoặc `stream.austec.vn`)*.

---

### ③ Đổi Webhook xác thực về Render Backend
Trên VPS, MediaMTX gọi webhook về Backend Render thay vì gọi local:
```yaml
environment:
  - MEDIAMTX_AUTH_URL=https://austec-backend.onrender.com/api/media/auth
  - MEDIAMTX_HOOK_BASE_URL=https://austec-backend.onrender.com/api/media/hook
```

---

### ④ Không cần cắm cáp nạp lại code cho Camera!
Hệ thống Austec đã tích hợp cơ chế cập nhật từ xa:
* Khi bạn đổi biến `MEDIAMTX_HOST=<IP_VPS>` trên Render Backend Dashboard:
* Mỗi lần người dùng mở xem camera trên App, Backend sẽ tự động bắn lệnh MQTT:
  ```text
  rtsp:<IP_VPS>:8554
  ```
* Camera ESP32-CAM nhận lệnh sẽ tự động ghi đè IP VPS mới vào bộ nhớ Flash NVS và kết nối thẳng lên VPS. **Bạn không cần phải mang camera đi cắm dây flash lại code.**

---

### ⑤ Cấu hình Tên miền & Chứng chỉ SSL (HTTPS / WSS)
* Trình duyệt web hiện đại (Chrome, Safari) và hệ điều hành di động (Android, iOS) sẽ **chặn WebRTC** nếu trang web hoặc ứng dụng gọi API bảo mật (`https://`) mà luồng WebRTC lại chạy HTTP không mã hóa (`http://`).
* **Giải pháp chuẩn Production:**
  1. Trỏ tên miền phụ (ví dụ: `stream.austec.vn`) về IP VPS.
  2. Dùng Nginx hoặc Caddy làm Reverse Proxy cấp chứng chỉ SSL Let's Encrypt tự động:
     * Cổng `443` chuyển tiếp vào cổng `8889` (WebRTC) và `8888` (HLS).
     * Khi đó link xem WebRTC sẽ có dạng: `https://stream.austec.vn/live/CAM...` chuẩn bảo mật 100%.

---

## 3. FILE CẤU HÌNH MẪU ĐỂ DEPLOY TRÊN VPS LINUX

Tạo thư mục trên VPS (ví dụ: `/opt/austec-media`) và tạo file `docker-compose.yml`:

```yaml
version: "3.8"

services:
  mediamtx:
    image: bluenviron/mediamtx:latest-ffmpeg
    container_name: austec_mediamtx_prod
    restart: always
    network_mode: host # Dùng network host để WebRTC UDP đạt hiệu năng cao nhất trên Linux
    environment:
      # 1. Địa chỉ IP Public của VPS hoặc Tên miền
      - MTX_WEBRTCADDITIONALHOSTS=stream.austec.vn
      
      # 2. Cổng dịch vụ
      - MTX_RTSPADDRESS=:8554
      - MTX_WEBRTCADDRESS=:8889
      - MTX_WEBRTCLOCALUDPADDRESS=:8189
      - MTX_WEBRTCLOCALTCPADDRESS=:8189
      - MTX_HLSADDRESS=:8888
      
      # 3. Webhook kết nối Render Cloud Backend
      - MEDIAMTX_AUTH_URL=https://austec-backend.onrender.com/api/media/auth
      - MEDIAMTX_HOOK_BASE_URL=https://austec-backend.onrender.com/api/media/hook
      - MTX_AUTHHTTPADDRESS=https://austec-backend.onrender.com/api/media/auth
      
      # 4. Tùy biến timeout chống rớt gói
      - MTX_READTIMEOUT=20s
      - MTX_WRITETIMEOUT=20s
    volumes:
      - ./mediamtx.yml:/mediamtx.yml:ro
```

Lệnh khởi chạy trên VPS:
```bash
docker compose up -d
```

---

## 4. QUY TRÌNH KHI ĐỔI MẠNG WI-FI TEST TRÊN MÁY TÍNH CÁ NHÂN (LOCAL)

Khi bạn mang laptop sang mạng Wi-Fi khác (quán cà phê, công ty, nhà khác) mà vẫn muốn test toàn bộ luồng camera trên máy tính:

### Các bước thực hiện:

1. **Kết nối chung mạng Wi-Fi:**
   * Laptop, điện thoại (Mobile App) và ESP32-CAM **bắt buộc phải cùng kết nối vào một mạng Wi-Fi**.

2. **Cập nhật IP mạng mới trên Laptop:**
   * **Cách 1 (Khuyên dùng - Tự động 1 click):**
     Mở PowerShell tại thư mục `austec-iot-platform` và chạy lệnh:
     ```powershell
     .\scripts\sync-env.ps1 -AutoDetect
     ```
     Script sẽ tự động dò tìm IP Wi-Fi mới của laptop, cập nhật toàn bộ file `.env`, đồng bộ vào code firmware và tự restart lại container MediaMTX!
   * **Cách 2 (Thủ công):**
     * Mở PowerShell gõ `ipconfig` xem IPv4 của card Wi-Fi (ví dụ: `192.168.1.50`).
     * Mở file `.env` sửa:
       ```env
       SERVER_HOST=192.168.1.50
       MEDIAMTX_HOST=192.168.1.50
       ```
     * Restart lại MediaMTX container:
       ```powershell
       cd backend\mediamtx
       docker compose up -d --force-recreate
       ```

3. **Cấu hình trên Mobile App:**
   * Tại màn hình Đăng nhập của Mobile App -> Bấm vào biểu tượng **Cấu hình Máy chủ** (hoặc nút chọn Server):
     * Mục **Backend**: Có thể để Render Cloud (`https://austec-backend.onrender.com`).
     * Mục **MediaMTX Host**: Nhập đúng IP Wi-Fi mới của laptop (ví dụ: `192.168.1.50`).

4. **Cho ESP32-CAM kết nối vào Wi-Fi mới:**
   * Nếu Wi-Fi mới có tên/mật khẩu khác Wi-Fi cũ:
     * Trên App bấm **Xóa thiết bị** (camera đang bật nguồn sẽ tự reset về chế độ Bluetooth BLE).
     * Mở App chọn **Thêm thiết bị** -> Quét Bluetooth BLE (`setup-camera`) -> Nhập tên & mật khẩu Wi-Fi mới để nạp mạng cho camera.
   * Khi camera đã vào mạng và kết nối MQTT thành công, bạn bấm mở xem trên App: Backend sẽ tự gửi IP laptop mới xuống để camera đẩy video về!

5. **Lưu ý Tường lửa Windows Defender:**
   * Khi vừa bắt mạng Wi-Fi mới, Windows thường đặt ở chế độ **Public Network** (sẽ chặn các kết nối từ điện thoại và camera vào Docker).
   * Vào **Windows Settings -> Network & internet -> Wi-Fi -> Nhấp vào tên Wi-Fi** -> Chọn **Private network** để mở thông toàn bộ luồng.

