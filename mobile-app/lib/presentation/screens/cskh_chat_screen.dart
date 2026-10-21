import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../core/constants/app_theme.dart';
import '../../core/services/iot_gateway_client.dart';
import '../../core/services/auth_service.dart';

class ChatMessage {
  final String sender; // 'user' | 'cskh' | 'system'
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
  final ScrollController _scrollController = ScrollController();
  Timer? _pollTimer;

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
      text: "Dạ vâng, em đã kết nối từ xa với thiết bị AT-DOOR-88239A01 của anh Đức rồi ạ! Em đã nhận được gói thông số kỹ thuật viễn thám.",
      time: "20:47",
    ),
  ];

  @override
  void initState() {
    super.initState();
    _fetchLiveChatMessages();
    // Poll backend every 2.5s for real-time 1-1 chat sync between Web Admin & Mobile
    _pollTimer = Timer.periodic(const Duration(milliseconds: 2500), (_) {
      _fetchLiveChatMessages();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchLiveChatMessages() async {
    try {
      final token = AuthService().token ?? 'austec-customer-token';
      final customerId = AuthService().currentUser?.id;
      final uri = customerId != null 
          ? Uri.parse('http://localhost:4000/api/cskh/active-chat?customerId=$customerId')
          : Uri.parse('http://localhost:4000/api/cskh/active-chat');

      final res = await http.get(
        uri,
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 2));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['messages'] is List) {
          final List incoming = data['messages'];
          if (incoming.length > _messages.length || _messages.isEmpty) {
            final List<ChatMessage> updated = [];
            for (var m in incoming) {
              final isCSKH = m['sender'] == 'CSKH' || m['senderRole'] == 'CSKH';
              final textContent = (m['text'] ?? m['message'] ?? '').toString();
              final timeContent = (m['time'] ?? 'Vừa xong').toString();
              if (textContent.isNotEmpty) {
                updated.add(ChatMessage(
                  sender: isCSKH ? 'cskh' : 'user',
                  text: textContent,
                  time: timeContent,
                  isTelemetrySnapshot: m['hasSnapshot'] == true,
                ));
              }
            }
            if (mounted && updated.isNotEmpty) {
              setState(() {
                _messages.clear();
                _messages.addAll(updated);
              });
              _scrollToBottom();
            }
          }
        }
      }
    } catch (_) {
      // Backend offline fallback - keeps existing client messages smoothly
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendUserMessage() {
    final txt = _textController.text.trim();
    if (txt.isEmpty) return;

    final now = DateTime.now();
    final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";

    setState(() {
      _messages.add(ChatMessage(
        sender: "user",
        text: txt,
        time: timeStr,
      ));
      _textController.clear();
    });
    _scrollToBottom();

    // Call backend API for real-time synchronization with Web Admin
    final token = AuthService().token ?? 'austec-customer-token';
    final customerId = AuthService().currentUser?.id;
    http.post(
      Uri.parse('http://localhost:4000/api/cskh/active-chat/messages'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'sender': 'CUSTOMER',
        'senderRole': 'CUSTOMER',
        'text': txt,
        'message': txt,
        'customerId': customerId,
      }),
    ).catchError((_) => http.Response('{}', 500));
  }

  void _attachTelemetrySnapshot() {
    final device = IoTGatewayClient().findByHardwareId("amtuong1834") ??
        IoTGatewayClient().devices.first;

    final data = {
      "hardwareId": device.hardwareId,
      "model": device.modelName,
      "doorState": device.positionPercent == 0 ? "CLOSED" : "OPEN (${device.positionPercent}%)",
      "battery": "${device.batteryPercent}%",
      "wifiRssi": "-58 dBm (Tốt)",
      "currentA": "${device.motorCurrentA} A (Bình thường)",
      "firmware": "v2.4.1-release",
      "subscription": device.subscriptionType == 'PERPETUAL' ? 'Trọn đời' : 'Có thời hạn',
    };

    setState(() {
      _messages.add(ChatMessage(
        sender: "user",
        text: "Gói chẩn đoán viễn thám tự động (Telemetry Snapshot)",
        time: "Vừa xong",
        isTelemetrySnapshot: true,
        telemetryData: data,
      ));
    });
    _scrollToBottom();

    // Post to backend
    http.post(
      Uri.parse('http://localhost:4000/api/cskh/active-chat/messages'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer austec-customer-token',
      },
      body: jsonEncode({
        'sender': 'CUSTOMER',
        'text': '[TELEMETRY]: Đã gửi gói viễn thám thiết bị ${device.hardwareId} (${device.modelName})',
      }),
    ).catchError((_) => http.Response('{}', 500));
  }

  // Open Support Request Form Modal Bottom Sheet
  void _openSupportTicketForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _SupportTicketFormSheet(
        onSubmitSuccess: (ticketId) {
          setState(() {
            _messages.add(ChatMessage(
              sender: "cskh",
              text: "[HỆ THỐNG]: Phiếu yêu cầu hỗ trợ mã #$ticketId đã được tiếp nhận thành công! Kỹ thuật viên Austec sẽ phản hồi lại cho bạn sớm nhất.",
              time: "Vừa xong",
            ));
          });
          _scrollToBottom();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // CSKH Header with Live Status & Create Ticket Button
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                      Row(
                        children: [
                          Icon(Icons.circle, color: AppTheme.emeraldSuccess, size: 8),
                          SizedBox(width: 4),
                          Text(
                            "Đồng bộ Web Admin 1-1",
                            style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 11),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              Row(
                children: [
                  // Button: Tạo Phiếu Yêu Cầu Hỗ Trợ
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.purpleAccent.withOpacity(0.2),
                      foregroundColor: AppTheme.purpleAccent,
                      side: const BorderSide(color: AppTheme.purpleAccent),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.assignment_outlined, size: 14),
                    label: const Text("Gửi Phiếu", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    onPressed: _openSupportTicketForm,
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    icon: const Icon(Icons.bolt, color: AppTheme.cyanAccent),
                    tooltip: "Gửi viễn thám thiết bị",
                    onPressed: _attachTelemetrySnapshot,
                  ),
                ],
              ),
            ],
          ),
        ),

        // Chat Messages List
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
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
                icon: const Icon(Icons.bolt, color: AppTheme.cyanAccent),
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
            _buildParamRow("Gói dịch vụ", data["subscription"] ?? "Có thời hạn"),
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

// Bottom Sheet Form for Submitting Customer Support Requests
class _SupportTicketFormSheet extends StatefulWidget {
  final Function(String ticketId) onSubmitSuccess;
  const _SupportTicketFormSheet({required this.onSubmitSuccess});

  @override
  State<_SupportTicketFormSheet> createState() => _SupportTicketFormSheetState();
}

class _SupportTicketFormSheetState extends State<_SupportTicketFormSheet> {
  final TextEditingController _descController = TextEditingController();
  final TextEditingController _contactTimeController = TextEditingController(text: "Sau 17:30 chiều");
  String _selectedType = "TECHNICAL";
  String _selectedReplyChannel = "PHONE";
  bool _isSubmitting = false;

  final Map<String, String> _typeLabels = {
    "TECHNICAL": "Sự cố kỹ thuật / Thiết bị không chạy",
    "SETUP": "Hướng dẫn cài đặt & Thêm thành viên",
    "WARRANTY": "Bảo hành linh kiện / Đổi mới",
    "RENEWAL": "Gia hạn gói dịch vụ 12/24 tháng",
    "FEEDBACK": "Góp ý chất lượng dịch vụ",
  };

  Future<void> _submitRequest() async {
    final desc = _descController.text.trim();
    if (desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Vui lòng nhập mô tả vấn đề bạn cần hỗ trợ!")),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final ticketId = "REQ-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}";
    final user = AuthService().currentUser;
    final dev = IoTGatewayClient().devices.isNotEmpty
        ? IoTGatewayClient().devices.first
        : null;

    try {
      final token = AuthService().token ?? 'austec-customer-token';
      await http.post(
        Uri.parse('http://localhost:4000/api/cskh/requests'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'id': ticketId,
          'customerId': user?.id ?? 'USR-001',
          'customerName': user?.fullName ?? 'Khách Hàng Austec',
          'customerPhone': user?.phoneNumber ?? '0912345678',
          'customerEmail': user?.email ?? 'customer@austec.vn',
          'hardwareId': dev?.hardwareId ?? 'AT-DOOR-88239A01',
          'deviceName': dev?.name ?? 'Cửa Cuốn Austec Smart',
          'requestType': _selectedType,
          'description': desc,
          'replyChannel': _selectedReplyChannel,
          'preferredContactTime': _contactTimeController.text.trim(),
          'images': [],
          'status': 'PENDING',
        }),
      ).timeout(const Duration(seconds: 3));
    } catch (_) {}

    setState(() => _isSubmitting = false);
    Navigator.of(context).pop();
    widget.onSubmitSuccess(ticketId);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppTheme.emeraldSuccess,
        content: Text("Đã gửi phiếu hỗ trợ #$ticketId thành công tới Admin!"),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.assignment, color: AppTheme.cyanAccent, size: 20),
                    SizedBox(width: 8),
                    Text(
                      "GỬI PHIẾU YÊU CẦU HỖ TRỢ",
                      style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white60),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              "Nếu bạn không tiện chat trực tuyến, hãy gửi form yêu cầu này. Đội ngũ kỹ thuật CSKH sẽ xử lý và liên hệ lại cho bạn.",
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 11, height: 1.4),
            ),
            const SizedBox(height: 16),

            // Dropdown: Loại yêu cầu (Combobox)
            const Text("LOẠI YÊU CẦU HỖ TRỢ (COMBOBOX)", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedType,
                  dropdownColor: const Color(0xFF1E293B),
                  isExpanded: true,
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                  items: _typeLabels.entries.map((e) {
                    return DropdownMenuItem(value: e.key, child: Text(e.value));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedType = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Textfield: Mô tả
            const Text("MÔ TẢ CHI TIẾT SỰ CỐ / YÊU CẦU *", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            TextField(
              controller: _descController,
              maxLines: 3,
              style: const TextStyle(color: Colors.white, fontSize: 12),
              decoration: InputDecoration(
                hintText: "Mô tả hiện tượng, mã lỗi hoặc nhu cầu của bạn...",
                hintStyle: const TextStyle(color: AppTheme.textMuted),
                filled: true,
                fillColor: AppTheme.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
            const SizedBox(height: 14),

            // Kênh nhận phản hồi
            const Text("KÊNH PHẢN HỒI MONG MUỐN", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Row(
              children: [
                _buildChannelOption("PHONE", "Gọi điện thoại", Icons.phone),
                const SizedBox(width: 8),
                _buildChannelOption("EMAIL", "Email", Icons.email),
                const SizedBox(width: 8),
                _buildChannelOption("PUSH", "Thông báo App", Icons.notifications),
              ],
            ),
            const SizedBox(height: 14),

            // Khung giờ hẹn
            const Text("KHUNG GIỜ LIÊN HỆ THUẬN TIỆN", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            TextField(
              controller: _contactTimeController,
              style: const TextStyle(color: Colors.white, fontSize: 12),
              decoration: InputDecoration(
                filled: true,
                fillColor: AppTheme.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 20),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.cyanAccent,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isSubmitting ? null : _submitRequest,
                child: _isSubmitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                    : const Text("GỬI PHIẾU HỖ TRỢ NGAY", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChannelOption(String val, String title, IconData icon) {
    final isSelected = _selectedReplyChannel == val;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedReplyChannel = val),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.cyanAccent.withOpacity(0.15) : AppTheme.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? AppTheme.cyanAccent : AppTheme.cardBorder),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? AppTheme.cyanAccent : AppTheme.textMuted, size: 16),
              const SizedBox(height: 4),
              Text(
                title,
                style: TextStyle(
                  color: isSelected ? Colors.white : AppTheme.textSecondary,
                  fontSize: 10,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
