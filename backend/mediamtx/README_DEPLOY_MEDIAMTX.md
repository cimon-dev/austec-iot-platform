# HƯỚNG DẪN DEPLOY MEDIAMTX LÊN VPS ORACLE CLOUD (1 LỆNH DUY NHẤT)

Thư mục này chứa toàn bộ cấu hình cần thiết để chạy máy chủ **MediaMTX** phát luồng video Camera thời gian thực cho hệ thống Austec.

---

## 1. Copy thư mục này lên VPS Oracle
Từ máy tính (PowerShell):
```bash
scp -i "duong-dan-ssh-key.key" -r ./austec-iot-platform/backend/mediamtx ubuntu@<PUBLIC_IP_ORACLE>:/opt/
```

---

## 2. Kích hoạt trên VPS
Đăng nhập SSH vào VPS:
```bash
ssh -i "duong-dan-ssh-key.key" ubuntu@<PUBLIC_IP_ORACLE>
```

Chạy lệnh:
```bash
cd /opt/mediamtx
sudo docker compose up -d
```

Kiểm tra trạng thái đang chạy:
```bash
sudo docker ps
sudo docker logs -f austec_mediamtx
```

---

## 3. Các cổng kết nối
* **RTSP**: `rtsp://<PUBLIC_IP_ORACLE>:8554/live/<hardware_id>` (Camera đẩy vào)
* **WebRTC**: `http://<PUBLIC_IP_ORACLE>:8889/live/<hardware_id>` (Mobile App xem trực tiếp)
* **HLS**: `http://<PUBLIC_IP_ORACLE>:8888/live/<hardware_id>/index.m3u8` (Trình duyệt Web)

