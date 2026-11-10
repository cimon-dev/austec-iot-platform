#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiUdp.h>

/**
 * CRtspSession: Quản lý phiên giao thức RTSP 1.0 (RFC 2326)
 * Hỗ trợ các lệnh: OPTIONS, DESCRIBE, SETUP, PLAY, TEARDOWN
 * Hỗ trợ truyền RTP qua TCP Interleaved (Channel 0/1) & UDP Unicast
 */
class CRtspSession {
public:
    enum State { INIT, READY, PLAYING };

    CRtspSession(WiFiClient client) : m_client(client), m_state(INIT), m_cseq(0), m_rtpPort(0), m_rtcpPort(0), m_isTcp(false) {
        m_sessionID = esp_random();
    }

    bool isConnected() {
        return m_client.connected();
    }

    void handleRequest() {
        if (!m_client.available()) return;
        String req = m_client.readStringUntil('\n');
        req.trim();
        if (req.length() == 0) return;

        // Đọc các header tiếp theo
        int cseq = 0;
        String transport = "";
        while (m_client.available()) {
            String line = m_client.readStringUntil('\n');
            line.trim();
            if (line.startsWith("CSeq:")) {
                cseq = line.substring(5).toInt();
            } else if (line.startsWith("Transport:")) {
                transport = line.substring(10);
                transport.trim();
            }
            if (line.length() == 0) break;
        }

        m_cseq = cseq;

        if (req.startsWith("OPTIONS")) {
            handleOptions();
        } else if (req.startsWith("DESCRIBE")) {
            handleDescribe();
        } else if (req.startsWith("SETUP")) {
            handleSetup(transport);
        } else if (req.startsWith("PLAY")) {
            handlePlay();
        } else if (req.startsWith("TEARDOWN")) {
            handleTeardown();
        }
    }

    void sendRtpPacket(const uint8_t* data, size_t len) {
        if (m_state != PLAYING || !m_client.connected()) return;

        if (m_isTcp) {
            // TCP Interleaved: $ <channel 0> <length 2 bytes> <RTP Packet>
            uint8_t header[4];
            header[0] = '$';
            header[1] = 0; // Channel 0 (Video)
            header[2] = (len >> 8) & 0xFF;
            header[3] = len & 0xFF;
            m_client.write(header, 4);
            m_client.write(data, len);
        } else if (m_rtpPort > 0) {
            // UDP unicast
            m_udp.beginPacket(m_client.remoteIP(), m_rtpPort);
            m_udp.write(data, len);
            m_udp.endPacket();
        }
    }

    State getState() const { return m_state; }

    void close() {
        m_client.stop();
        m_state = INIT;
    }

private:
    WiFiClient m_client;
    WiFiUDP m_udp;
    State m_state;
    uint32_t m_sessionID;
    int m_cseq;
    int m_rtpPort;
    int m_rtcpPort;
    bool m_isTcp;

    void handleOptions() {
        String resp = "RTSP/1.0 200 OK\r\n";
        resp += "CSeq: " + String(m_cseq) + "\r\n";
        resp += "Public: DESCRIBE, SETUP, TEARDOWN, PLAY, PAUSE\r\n\r\n";
        m_client.print(resp);
    }

    void handleDescribe() {
        String sdp = "v=0\r\n";
        sdp += "o=- " + String(m_sessionID) + " 1 IN IP4 " + WiFi.localIP().toString() + "\r\n";
        sdp += "s=Austec AI Camera RTSP Stream\r\n";
        sdp += "t=0 0\r\n";
        sdp += "m=video 0 RTP/AVP 26\r\n"; // Payload 26 = Motion JPEG RFC 2435
        sdp += "c=IN IP4 0.0.0.0\r\n";
        sdp += "a=control:*\r\n";

        String resp = "RTSP/1.0 200 OK\r\n";
        resp += "CSeq: " + String(m_cseq) + "\r\n";
        resp += "Content-Type: application/sdp\r\n";
        resp += "Content-Base: rtsp://" + WiFi.localIP().toString() + ":8554/\r\n";
        resp += "Content-Length: " + String(sdp.length()) + "\r\n\r\n";
        resp += sdp;
        m_client.print(resp);
    }

    void handleSetup(String transport) {
        String respTransport = "";
        if (transport.indexOf("RTP/AVP/TCP") >= 0 || transport.indexOf("interleaved") >= 0) {
            m_isTcp = true;
            respTransport = "RTP/AVP/TCP;unicast;interleaved=0-1";
        } else {
            // Parse UDP client_port=XXXX-YYYY
            int idx = transport.indexOf("client_port=");
            if (idx >= 0) {
                int dash = transport.indexOf("-", idx);
                m_rtpPort = transport.substring(idx + 12, dash).toInt();
                m_rtcpPort = m_rtpPort + 1;
            }
            m_isTcp = false;
            m_udp.begin(8556);
            respTransport = "RTP/AVP;unicast;client_port=" + String(m_rtpPort) + "-" + String(m_rtcpPort) + ";server_port=8556-8557";
        }

        m_state = READY;
        String resp = "RTSP/1.0 200 OK\r\n";
        resp += "CSeq: " + String(m_cseq) + "\r\n";
        resp += "Transport: " + respTransport + "\r\n";
        resp += "Session: " + String(m_sessionID) + ";timeout=60\r\n\r\n";
        m_client.print(resp);
    }

    void handlePlay() {
        m_state = PLAYING;
        String resp = "RTSP/1.0 200 OK\r\n";
        resp += "CSeq: " + String(m_cseq) + "\r\n";
        resp += "Range: npt=0.000-\r\n";
        resp += "Session: " + String(m_sessionID) + "\r\n";
        resp += "RTP-Info: url=rtsp://" + WiFi.localIP().toString() + ":8554/live\r\n\r\n";
        m_client.print(resp);
    }

    void handleTeardown() {
        m_state = INIT;
        String resp = "RTSP/1.0 200 OK\r\n";
        resp += "CSeq: " + String(m_cseq) + "\r\n";
        resp += "Session: " + String(m_sessionID) + "\r\n\r\n";
        m_client.print(resp);
        m_client.stop();
    }
};

