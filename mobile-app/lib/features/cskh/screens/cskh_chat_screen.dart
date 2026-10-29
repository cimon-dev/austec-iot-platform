import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../../core/models/device_model.dart';
import '../domain/entities/chat_device_item.dart';
import '../models/chat_message.dart';
import '../models/catalog_devices.dart';
import '../services/cskh_chat_service.dart';
import '../widgets/chat_message_bubble.dart';
import '../widgets/device_selection_sheet.dart';
import '../widgets/image_attachment_sheet.dart';
import '../widgets/support_ticket_sheet.dart';

class CskhChatScreen extends StatefulWidget {
  final ChatDeviceItem? initialDevice;
  final String? initialPrompt;

  const CskhChatScreen({
    super.key,
    this.initialDevice,
    this.initialPrompt,
  });

  @override
  State<CskhChatScreen> createState() => _CskhChatScreenState();
}

class _CskhChatScreenState extends State<CskhChatScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final CskhChatService _chatService = CskhChatService();

  final List<ChatMessage> _messages = [];
  bool _hasActiveConversation = false;
  bool _isLoading = true;
  bool _isWsConnected = false;

  ChatDeviceItem? _selectedDevice;
  final List<String> _pendingAttachmentUrls = [];

  @override
  void initState() {
    super.initState();
    _selectedDevice = widget.initialDevice;
    if (widget.initialPrompt != null && widget.initialPrompt!.isNotEmpty) {
      _textController.text = widget.initialPrompt!;
    }

    _setupChatService();
    _loadInitialChat();
  }

  void _setupChatService() {
    _chatService.onConnectionChanged = (connected) {
      if (mounted) setState(() => _isWsConnected = connected);
    };

    _chatService.onMessageReceived = (msg) {
      if (!mounted) return;
      setState(() {
        final exists = _messages.any((m) => m.text.trim() == msg.text.trim() && m.sender == msg.sender);
        if (!exists) {
          _messages.add(msg);
        }
        _hasActiveConversation = true;
        _isLoading = false;
      });
      _scrollToBottom();
    };

    _chatService.onTicketLoaded = (ticket) {
      if (!mounted) return;
      _loadTicketData(ticket);
    };

    _chatService.connectWebSocket();
  }

  Future<void> _loadInitialChat() async {
    final data = await _chatService.fetchLiveChatMessages();
    if (data != null && mounted) {
      final bool hasActive = data['hasActiveConversation'] == true;
      if (data['success'] == true && data['messages'] is List && hasActive) {
        _loadTicketData(data['ticket'] ?? {'messages': data['messages']});
      } else {
        setState(() {
          _messages.clear();
          _hasActiveConversation = false;
          _isLoading = false;
        });
      }
    } else if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  void _loadTicketData(Map<String, dynamic> ticket) {
    if (ticket['messages'] is List) {
      final List incoming = ticket['messages'];
      final List<ChatMessage> updated = [];
      final seen = <String>{};

      for (var m in incoming) {
        final isCSKH = m['sender'] == 'CSKH' || m['senderRole'] == 'CSKH';
        final textContent = (m['text'] ?? m['message'] ?? '').toString().trim();
        final timeContent = (m['time'] ?? 'Vừa xong').toString();
        final role = isCSKH ? 'cskh' : 'user';

        final key = "$role|$textContent";
        if (seen.contains(key)) continue;
        seen.add(key);

        List<String> images = [];
        if (m['attachmentUrls'] is List) {
          images = List<String>.from(m['attachmentUrls'].map((e) => e.toString()));
        }

        ChatDeviceItem? dev;
        if (m['selectedDevice'] is Map) {
          dev = ChatDeviceItem.fromJson(Map<String, dynamic>.from(m['selectedDevice']));
        }

        if (textContent.isNotEmpty || images.isNotEmpty) {
          updated.add(ChatMessage(
            sender: isCSKH ? 'cskh' : 'user',
            text: textContent,
            time: timeContent,
            attachmentUrls: images,
            selectedDevice: dev,
            isTelemetrySnapshot: m['hasSnapshot'] == true,
          ));
        }
      }

      setState(() {
        _messages.clear();
        _messages.addAll(updated);
        _hasActiveConversation = true;
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  @override
  void dispose() {
    _chatService.dispose();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  List<ChatDeviceItem> _getOwnedDevices() {
    final list = <ChatDeviceItem>[];
    for (var d in IoTGatewayClient().devices) {
      list.add(ChatDeviceItem(
        isOwned: true,
        hardwareId: d.hardwareId,
        deviceName: d.name,
        modelName: d.modelName,
        categoryTag: d.category == DeviceCategory.rollerDoor
            ? 'CỬA CUỐN THÔNG MINH'
            : d.category == DeviceCategory.camera
                ? 'CAMERA AN NINH'
                : 'THIẾT BỊ IOT',
        imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
        specs: {
          'Model': d.modelName,
          'Serial / Hardware ID': d.hardwareId,
          'Mức Pin': '${d.batteryPercent}%',
          'Sóng Wi-Fi': '-58 dBm',
          'Trạng thái': d.isOnline ? 'Online trực tuyến' : 'Ngoại tuyến',
        },
      ));
    }
    return list;
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

  Future<void> _startConversation() async {
    final dev = _selectedDevice;
    final greeting = dev != null
        ? 'Xin chào Trung tâm CSKH Austec! Tôi cần hỗ trợ kỹ thuật về thiết bị ${dev.deviceName}.'
        : 'Xin chào Trung tâm CSKH Austec! Tôi cần tư vấn và hỗ trợ dịch vụ.';

    await _chatService.startConversation(selectedDevice: dev, greeting: greeting);

    if (mounted) {
      final now = DateTime.now();
      final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
      setState(() {
        _messages.clear();
        _messages.addAll([
          ChatMessage(sender: "user", text: greeting, time: timeStr, selectedDevice: dev),
          ChatMessage(
            sender: "cskh",
            text: "Dạ em chào Quý khách! Kỹ thuật viên Austec đã tiếp nhận yêu cầu và kết nối từ xa. Em có thể hỗ trợ gì cho bạn ạ?",
            time: timeStr,
          ),
        ]);
        _hasActiveConversation = true;
      });
      _scrollToBottom();
    }
  }

  void _sendUserMessage() {
    final txt = _textController.text.trim();
    if (txt.isEmpty && _pendingAttachmentUrls.isEmpty) return;

    final now = DateTime.now();
    final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
    final attachmentsToSend = List<String>.from(_pendingAttachmentUrls);
    final devToSend = _selectedDevice;

    setState(() {
      _messages.add(ChatMessage(
        sender: "user",
        text: txt.isNotEmpty ? txt : "[Hình ảnh hiện trường đính kèm]",
        time: timeStr,
        attachmentUrls: attachmentsToSend,
        selectedDevice: devToSend,
      ));
      _textController.clear();
      _pendingAttachmentUrls.clear();
    });
    _scrollToBottom();

    _chatService.sendMessage(
      text: txt.isNotEmpty ? txt : "[Hình ảnh hiện trường đính kèm]",
      attachmentUrls: attachmentsToSend,
      selectedDevice: devToSend,
    );
  }

  void _attachTelemetrySnapshot() {
    final dev = _selectedDevice ?? (_getOwnedDevices().isNotEmpty ? _getOwnedDevices().first : null);
    if (dev == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Chưa có thiết bị nào để đính kèm telemetry")),
      );
      return;
    }
    final hwId = dev.hardwareId;
    final model = dev.modelName;

    final data = {
      "hardwareId": hwId,
      "model": model,
      "doorState": "ĐÃ KHÓA CHỐT AN TOÀN",
      "battery": "98%",
      "wifiRssi": "-58 dBm (Tín hiệu mạnh)",
      "currentA": "2.4 A (Bình thường)",
      "firmware": "v2.4.1-release",
      "subscription": "Còn hạn (Gia hạn đến 12/2027)",
    };

    setState(() {
      _messages.add(ChatMessage(
        sender: "user",
        text: "Gói chẩn đoán viễn thám tự động (Telemetry Snapshot)",
        time: "Vừa xong",
        isTelemetrySnapshot: true,
        telemetryData: data,
        selectedDevice: dev,
      ));
    });
    _scrollToBottom();

    _chatService.sendMessage(
      text: '[TELEMETRY]: Đã gửi gói viễn thám thiết bị $hwId ($model)',
      isTelemetry: true,
      selectedDevice: dev,
    );
  }

  void _openDeviceComboboxModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DeviceSelectionSheet(
        currentlySelected: _selectedDevice,
        ownedDevices: _getOwnedDevices(),
        unownedDevices: UNOWNED_CATALOG_DEVICES,
        onSelectDevice: (selected) {
          setState(() => _selectedDevice = selected);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: selected != null ? AppTheme.blueAccent : AppTheme.surfaceGlass,
              content: Text(selected != null
                  ? "Đã chọn: ${selected.deviceName} (${selected.isOwned ? 'Đã sở hữu' : 'Tư vấn mới'})"
                  : "Đã hủy chọn thiết bị. Chế độ trò chuyện chung."),
              duration: const Duration(seconds: 2),
            ),
          );
        },
      ),
    );
  }

  void _openImagePickerModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ImageAttachmentOptionsSheet(
        onImageSelected: (url) {
          setState(() => _pendingAttachmentUrls.add(url));
        },
      ),
    );
  }

  void _openSupportTicketForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SupportTicketFormSheet(
        selectedDevice: _selectedDevice,
        onSubmitSuccess: (ticketId) {
          setState(() {
            _messages.add(ChatMessage(
              sender: "cskh",
              text: "[HỆ THỐNG]: Phiếu yêu cầu hỗ trợ mã #$ticketId đã được tiếp nhận thành công!",
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
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Row(
          children: [
            Stack(
              children: [
                const CircleAvatar(
                  backgroundColor: AppTheme.blueAccent,
                  radius: 17,
                  child: Icon(Icons.support_agent, color: Colors.white, size: 20),
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(
                      color: _isWsConnected ? AppTheme.emeraldSuccess : Colors.amber,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.background, width: 1.5),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("CSKH Trực Tuyến Austec", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  Text(
                    _isWsConnected ? "WebSocket Live • Kỹ sư sẵn sàng" : "Đang kết nối lại máy chủ...",
                    style: TextStyle(
                      fontSize: 10,
                      color: _isWsConnected ? AppTheme.emeraldSuccess : Colors.amber,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: _openSupportTicketForm,
            icon: const Icon(Icons.assignment_outlined, size: 14, color: AppTheme.cyanAccent),
            label: const Text("Gửi Phiếu", style: TextStyle(fontSize: 11, color: AppTheme.cyanAccent)),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.cyanAccent))
                : !_hasActiveConversation
                    ? _buildStartView()
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(14),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          return ChatMessageBubble(message: _messages[index]);
                        },
                      ),
          ),
          if (_hasActiveConversation) _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildStartView() {
    final dev = _selectedDevice;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [AppTheme.blueAccent.withValues(alpha: 0.3), AppTheme.cyanAccent.withValues(alpha: 0.2)],
                ),
                border: Border.all(color: AppTheme.cyanAccent, width: 2),
              ),
              child: const Icon(Icons.support_agent_rounded, color: AppTheme.cyanAccent, size: 40),
            ),
            const SizedBox(height: 16),
            const Text("Trung Tâm Hỗ Trợ Kỹ Thuật Austec", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            const Text(
              "Kênh chat 1-1 trực tiếp với kỹ sư & CSKH Austec. Hỗ trợ giải đáp sự cố và kết nối thiết bị từ xa.",
              style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: AppTheme.glassBox(color: AppTheme.surfaceGlass, radius: 12),
              child: ListTile(
                leading: Icon(
                  dev == null ? Icons.devices_other : (dev.isOwned ? Icons.verified : Icons.shopping_bag),
                  color: dev?.isOwned == true ? AppTheme.emeraldSuccess : AppTheme.cyanAccent,
                ),
                title: Text(dev?.deviceName ?? "Chưa chọn thiết bị nào (Mặc định)", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                subtitle: Text(dev != null ? "Bấm để thay đổi" : "Bấm để liên kết thiết bị cần hỗ trợ", style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                trailing: const Icon(Icons.chevron_right, color: AppTheme.textMuted),
                onTap: _openDeviceComboboxModal,
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.cyanAccent,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _startConversation,
                icon: const Icon(Icons.chat_bubble_outline, size: 18),
                label: const Text("BẮT ĐẦU TRÒ CHUYỆN NGAY", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: AppTheme.glassBox(radius: 0),
      child: SafeArea(
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.bolt, color: AppTheme.cyanAccent, size: 22),
              onPressed: _attachTelemetrySnapshot,
              tooltip: "Gửi viễn thám thiết bị",
            ),
            IconButton(
              icon: const Icon(Icons.add_photo_alternate_outlined, color: AppTheme.cyanAccent, size: 21),
              onPressed: _openImagePickerModal,
              tooltip: "Đính kèm hình ảnh",
            ),
            Expanded(
              child: TextField(
                controller: _textController,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: "Nhập tin nhắn hỗ trợ...",
                  hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  filled: true,
                  fillColor: AppTheme.surface,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                ),
                onSubmitted: (_) => _sendUserMessage(),
              ),
            ),
            const SizedBox(width: 8),
            CircleAvatar(
              backgroundColor: AppTheme.cyanAccent,
              radius: 18,
              child: IconButton(
                icon: const Icon(Icons.send_rounded, color: Colors.black, size: 16),
                onPressed: _sendUserMessage,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
