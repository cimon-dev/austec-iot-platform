#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiServer.h>
#include "esp_camera.h"
#include "CRtspSession.h"
#include <vector>

/**
 * OV2640Streamer: Máy chủ phát luồng video RTSP thời gian thực cho ESP32-CAM
 * Đóng gói khung hình JPEG theo chuẩn RFC 2435 RTP Payload Format for JPEG-compressed Video
 * Cổng phát mặc định: :8554 (chuẩn IANA RTSP)
 */
class OV2640Streamer {
public:
    OV2640Streamer(uint16_t port = 8554) : m_server(port), m_port(port), m_sequenceNumber(0), m_timestamp(0) {}

    void begin() {
        m_server.begin();
        Serial.printf("-> [OV2640 RTSP STREAMER]: Đã kích hoạt máy chủ RTSP trên cổng :%d\n", m_port);
    }

    void handle() {
        // Chấp nhận client mới kết nối
        WiFiClient newClient = m_server.accept();
        if (newClient) {
            Serial.printf("-> [RTSP]: Client mới kết nối từ IP: %s\n", newClient.remoteIP().toString().c_str());
            m_sessions.push_back(new CRtspSession(newClient));
        }

        // Xử lý request từ các client đang kết nối
        for (auto it = m_sessions.begin(); it != m_sessions.end();) {
            CRtspSession* session = *it;
            if (!session->isConnected()) {
                delete session;
                it = m_sessions.erase(it);
            } else {
                session->handleRequest();
                ++it;
            }
        }
    }

    bool hasActiveClients() {
        for (auto session : m_sessions) {
            if (session->getState() == CRtspSession::PLAYING) {
                return true;
            }
        }
        return false;
    }

    /**
     * Phát 1 khung hình JPEG qua tất cả các client đang ở trạng thái PLAYING
     */
    void streamFrame(camera_fb_t* fb) {
        if (!fb || !hasActiveClients()) return;

        const size_t maxPayloadSize = 1400; // MTU an toàn tránh phân mảnh gói mạng
        size_t offset = 0;
        size_t totalLen = fb->len;
        const uint8_t* buf = fb->buf;

        m_timestamp += 3600; // Tăng timestamp RTP theo chuẩn 90kHz clock (cho ~25fps)

        while (offset < totalLen) {
            size_t chunkSize = totalLen - offset;
            bool isLast = false;
            if (chunkSize > maxPayloadSize) {
                chunkSize = maxPayloadSize;
            } else {
                isLast = true;
            }

            // Tạo gói RTP (12 bytes RTP header + 8 bytes JPEG header + chunk payload)
            uint8_t packet[12 + 8 + maxPayloadSize];

            // 1. RTP Header (RFC 3550)
            packet[0] = 0x80; // Version 2
            packet[1] = isLast ? 0x80 | 26 : 26; // Marker bit = 1 ở gói cuối, Payload Type 26 (JPEG)
            packet[2] = (m_sequenceNumber >> 8) & 0xFF;
            packet[3] = m_sequenceNumber & 0xFF;
            m_sequenceNumber++;

            packet[4] = (m_timestamp >> 24) & 0xFF;
            packet[5] = (m_timestamp >> 16) & 0xFF;
            packet[6] = (m_timestamp >> 8) & 0xFF;
            packet[7] = m_timestamp & 0xFF;

            packet[8]  = 0x12; // SSRC định danh luồng Austec
            packet[9]  = 0x34;
            packet[10] = 0x56;
            packet[11] = 0x78;

            // 2. JPEG Header (RFC 2435)
            packet[12] = 0; // Type-specific
            packet[13] = (offset >> 16) & 0xFF; // Fragment offset (24 bit)
            packet[14] = (offset >> 8) & 0xFF;
            packet[15] = offset & 0xFF;

            packet[16] = 1; // Type = 1 (JPEG Progressive/Sequential)
            packet[17] = fb->format == PIXFORMAT_JPEG ? 12 : 20; // Q-factor
            packet[18] = fb->width / 8;  // Width / 8
            packet[19] = fb->height / 8; // Height / 8

            // 3. Payload dữ liệu ảnh JPEG
            memcpy(&packet[20], &buf[offset], chunkSize);

            size_t packetLen = 20 + chunkSize;

            // Bắn gói tin tới tất cả Client đang xem
            for (auto session : m_sessions) {
                session->sendRtpPacket(packet, packetLen);
            }

            offset += chunkSize;
        }
    }

private:
    WiFiServer m_server;
    uint16_t m_port;
    std::vector<CRtspSession*> m_sessions;
    uint16_t m_sequenceNumber;
    uint32_t m_timestamp;
};

