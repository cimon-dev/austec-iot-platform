#!/bin/bash
set -e

echo "=========================================================="
echo "  AUSTEC IOT - TRIỂN KHAI MEDIAMTX LÊN CLOUDFLY VPS"
echo "=========================================================="

export DEBIAN_FRONTEND=noninteractive

echo ">>> 1. Cập nhật hệ thống & cài gói phụ trợ..."
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release ufw

echo ">>> 2. Cài đặt Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
fi

systemctl enable docker
systemctl start docker

echo ">>> 3. Tạo thư mục cấu hình /opt/austec-media..."
mkdir -p /opt/austec-media
cd /opt/austec-media

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
      - MTX_WEBRTCADDITIONALHOSTS=103.82.39.109

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
EOF

echo ">>> 4. Cấu hình tường lửa UFW (Mở cổng 22, 8554, 8889, 8888, 8189)..."
ufw allow 22/tcp
ufw allow 8554/tcp
ufw allow 8889/tcp
ufw allow 8888/tcp
ufw allow 8189/tcp
ufw allow 8189/udp
ufw --force enable

echo ">>> 5. Khởi chạy Docker container MediaMTX..."
docker compose pull
docker compose down || true
docker compose up -d

echo ">>> 6. Kiểm tra trạng thái dịch vụ..."
sleep 3
docker ps
echo ""
echo "=== TRIỂN KHAI HOÀN TẤT THÀNH CÔNG! ==="

