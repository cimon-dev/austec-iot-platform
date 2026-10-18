import 'package:flutter/material.dart';
import '../../core/constants/app_theme.dart';
import '../../core/services/iot_gateway_client.dart';

class ChatMessage {
  final String sender; // 'user' | 'cskh'
  final String text;
  final String time;
  final bool isTelemetrySnapshot;
  final Map<String, dynamic>? telemetryData;

  ChatMessage({
    required this.sender,
    required this.text,
    required this.time,
    this.isTelemetrySnapshot = false,
    this.telemetryData,
  });
}

class CskhChatScreen extends StatefulWidget {
  const CskhChatScreen({super.key});

  @override
  State<CskhChatScreen> createState() => _CskhChatScreenState();
}

class _CskhChatScreenState extends State<CskhChatScreen> {
  final TextEditingController _textController = TextEditingController();
  final List<ChatMessage> _messages = [
    ChatMessage(
      sender: "cskh",
      text: "Xin chào Quý khách! Trung tâm Chăm sóc Khách hàng Austec Smart Home hân hạnh hỗ trợ bạn.",
      time: "20:45",
    ),
    ChatMessage(
      sender: "user",
      text: "Cửa cuốn mặt tiền nhà mình dạo này phản hồi hơi chậm, bạn kiểm tra giúp mình thông số bo mạch với.",
      time: "20:46",
    ),
    ChatMessage(
      sender: "cskh",
      text: "Dạ vâng, em đã kết nối từ xa với thiết bị AT-DOOR-88239A của anh Nam rồi ạ! Em đã nhận được gói thông số kỹ thuật viễn thám.",
      time: "20:47",
    ),
  ];

  void _sendUserMessage() {
    final txt = _textController.text.trim();
    if (txt.isEmpty) return;

    setState(() {
      _messages.add(ChatMessage(
        sender: "user",
        text: txt,
        time: "Vừa xong",
      ));
      _textController.clear();
    });

    // Auto simulated CSKH response
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) {
        setState(() {
          _messages.add(ChatMessage(
            sender: "cskh",
            text: "Kỹ sư CSKH Austec đã ghi nhận yêu cầu của anh. Đội hỗ trợ đang kiểm tra biểu đồ điện áp bo mạch.",
            time: "Vừa xong",
          ));
        });
      }
    });
  }

  void _attachTelemetrySnapshot() {
    final device = IoTGatewayClient().findByHardwareId("AT-DOOR-88239A");
    if (device == null) return;

    setState(() {
      _messages.add(ChatMessage(
        sender: "user",
        text: "Gói chẩn đoán viễn thám tự động (Telemetry Snapshot)",
        time: "Vừa xong",
        isTelemetrySnapshot: true,
        telemetryData: {
          "hardwareId": device.hardwareId,
          "model": device.modelName,
          "doorState": device.positionPercent == 0 ? "CLOSED" : "OPEN (${device.positionPercent}%)",
          "battery": "${device.batteryPercent}%",
          "wifiRssi": "-58 dBm (Tốt)",
          "currentA": "2.45 A (Bình thường)",
          "firmware": "v2.4.1-release",
        },
      ));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // CSKH Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: AppTheme.glassBox(radius: 0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  CircleAvatar(
                    backgroundColor: AppTheme.blueAccent,
                    radius: 18,
                    child: Icon(Icons.support_agent, color: Colors.white, size: 20),
                  ),
                  SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Kỹ Thuật Viên Hỗ Trợ 24/7",
                        style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        "Đang trực tuyến • Soi lỗi từ xa tức thì",
                        style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.bolt, color: AppTheme.cyanAccent),
                tooltip: "Gửi thông số kỹ thuật",
                onPressed: _attachTelemetrySnapshot,
              ),
            ],
          ),
        ),

        // Chat Messages List
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final msg = _messages[index];
              final isMe = msg.sender == "user";

              if (msg.isTelemetrySnapshot && msg.telemetryData != null) {
                return _buildTelemetrySnapshotBubble(msg.telemetryData!, msg.time);
              }

              return Align(
                alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                  decoration: BoxDecoration(
                    color: isMe ? AppTheme.blueAccent : AppTheme.surfaceGlass,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: isMe ? AppTheme.cyanAccent.withOpacity(0.3) : AppTheme.cardBorder,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        msg.text,
                        style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.4),
                      ),
                      const SizedBox(height: 4),
                      Align(
                        alignment: Alignment.bottomRight,
                        child: Text(
                          msg.time,
                          style: TextStyle(
                            color: isMe ? Colors.white70 : AppTheme.textMuted,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Input Bar
        Container(
          padding: const EdgeInsets.all(12),
          decoration: AppTheme.glassBox(radius: 0),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.camera_alt_outlined, color: AppTheme.textSecondary),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Đã đính kèm ảnh hiện trường thực tế!")),
                  );
                },
              ),
              IconButton(
                icon: const Icon(Icons.analytics_outlined, color: AppTheme.cyanAccent),
                onPressed: _attachTelemetrySnapshot,
                tooltip: "Đính kèm viễn thám thiết bị",
              ),
              Expanded(
                child: TextField(
                  controller: _textController,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: "Nhập tin nhắn hỗ trợ kỹ thuật...",
                    hintStyle: const TextStyle(color: AppTheme.textMuted),
                    filled: true,
                    fillColor: AppTheme.surface,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                  onSubmitted: (_) => _sendUserMessage(),
                ),
              ),
              const SizedBox(width: 8),
              CircleAvatar(
                backgroundColor: AppTheme.cyanAccent,
                child: IconButton(
                  icon: const Icon(Icons.send_rounded, color: Colors.black, size: 18),
                  onPressed: _sendUserMessage,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTelemetrySnapshotBubble(Map<String, dynamic> data, String time) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        width: 300,
        decoration: AppTheme.glassBox(
          color: AppTheme.cyanAccent.withOpacity(0.08),
          borderColor: AppTheme.cyanAccent.withOpacity(0.5),
          radius: 18,
          glow: true,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.monitor_heart, color: AppTheme.cyanAccent, size: 18),
                SizedBox(width: 6),
                Text(
                  "GÓI CHẨN ĐOÁN VIỄN THÁM",
                  style: TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 10),
            _buildParamRow("Hardware ID", data["hardwareId"]),
            _buildParamRow("Trạng thái", data["doorState"]),
            _buildParamRow("Mức Pin", data["battery"]),
            _buildParamRow("Tín hiệu WiFi", data["wifiRssi"]),
            _buildParamRow("Dòng động cơ", data["currentA"]),
            _buildParamRow("Bản Firmware", data["firmware"]),
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.bottomRight,
              child: Text(time, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildParamRow(String label, dynamic val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
          Text(
            "$val",
            style: const TextStyle(color: Colors.white, fontSize: 11, fontFamily: "monospace", fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
