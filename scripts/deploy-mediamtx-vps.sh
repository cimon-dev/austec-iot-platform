#!/bin/bash
set -e

echo "=========================================================="
echo "  AUSTEC IOT - TRIỂN KHAI MEDIAMTX & APK SERVER LÊN VPS"
echo "=========================================================="

export DEBIAN_FRONTEND=noninteractive

echo ">>> 1. Cấu hình 2GB Swap bộ nhớ ảo (ổn định hệ thống 1GB RAM)..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap 2GB đã được kích hoạt!"
else
    echo "Swapfile đã tồn tại."
fi

echo ">>> 2. Cập nhật hệ thống & cài gói phụ trợ..."
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release ufw

echo ">>> 3. Cài đặt Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
fi

systemctl enable docker
systemctl start docker

echo ">>> 4. Tạo thư mục cấu hình /opt/austec-media & /opt/austec-downloads..."
mkdir -p /opt/austec-media
mkdir -p /opt/austec-downloads
cd /opt/austec-media

cat << 'EOF' > nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    autoindex on;
    autoindex_exact_size off;
    autoindex_localtime on;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

cat << 'EOF' > docker-compose.yml
version: "3.8"

services:
  mediamtx:
    image: bluenviron/mediamtx:latest-ffmpeg
    container_name: austec_mediamtx_prod
    restart: always
    network_mode: host
    environment:
      # 1. IP Public của CloudFly VPS
      - MTX_WEBRTCADDITIONALHOSTS=103.82.135.110

      # 2. Cổng dịch vụ
      - MTX_RTSPADDRESS=:8554
      - MTX_WEBRTCADDRESS=:8889
      - MTX_WEBRTCLOCALUDPADDRESS=:8189
      - MTX_WEBRTCLOCALTCPADDRESS=:8189
      - MTX_HLSADDRESS=:8888

      # 3. Webhook xác thực với Render Cloud Backend
      - MEDIAMTX_AUTH_URL=https://austec-backend.onrender.com/api/media/auth
      - MEDIAMTX_HOOK_BASE_URL=https://austec-backend.onrender.com/api/media/hook
      - MTX_AUTHHTTPADDRESS=https://austec-backend.onrender.com/api/media/auth

      # 4. Timeout
      - MTX_READTIMEOUT=20s
      - MTX_WRITETIMEOUT=20s
    volumes:
      - ./mediamtx.yml:/mediamtx.yml:ro

  apk-server:
    image: nginx:alpine
    container_name: austec_apk_server
    restart: always
    ports:
      - "80:80"
    volumes:
      - /opt/austec-downloads:/usr/share/nginx/html:ro
      - /opt/austec-media/nginx.conf:/etc/nginx/conf.d/default.conf:ro
EOF

echo ">>> 5. Cấu hình tường lửa UFW (Mở cổng 22, 80, 8554, 8889, 8888, 8189)..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 8554/tcp
ufw allow 8889/tcp
ufw allow 8888/tcp
ufw allow 8189/tcp
ufw allow 8189/udp
ufw --force enable

echo ">>> 6. Khởi chạy Docker containers..."
docker compose pull
docker compose down || true
docker compose up -d

echo ">>> 7. Kiểm tra trạng thái dịch vụ..."
sleep 3
docker ps
echo ""
echo "=== TRIỂN KHAI HOÀN TẤT THÀNH CÔNG! ==="
