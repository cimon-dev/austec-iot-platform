import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../core/constants/app_theme.dart';
import '../../core/models/device_model.dart';
import '../../core/services/iot_gateway_client.dart';
import '../../core/services/auth_service.dart';

class ChatDeviceItem {
  final bool isOwned;
  final String? hardwareId;
  final String deviceName;
  final String modelName;
  final String categoryTag;
  final Map<String, String>? specs;
  final String? imageUrl;
  final int? price;

  ChatDeviceItem({
    required this.isOwned,
    this.hardwareId,
    required this.deviceName,
    required this.modelName,
    required this.categoryTag,
    this.specs,
    this.imageUrl,
    this.price,
  });

  Map<String, dynamic> toJson() => {
    'isOwned': isOwned,
    'hardwareId': hardwareId,
    'deviceName': deviceName,
    'modelName': modelName,
    'categoryTag': categoryTag,
    'specs': specs,
    'imageUrl': imageUrl,
    'price': price,
  };

  factory ChatDeviceItem.fromJson(Map<String, dynamic> json) => ChatDeviceItem(
    isOwned: json['isOwned'] == true,
    hardwareId: json['hardwareId']?.toString(),
    deviceName: (json['deviceName'] ?? json['modelName'] ?? 'Thiết bị Austec').toString(),
    modelName: (json['modelName'] ?? 'Austec Device').toString(),
    categoryTag: (json['categoryTag'] ?? 'SMART HOME').toString(),
    specs: json['specs'] is Map ? Map<String, String>.from(json['specs']) : null,
    imageUrl: json['imageUrl']?.toString(),
    price: json['price'] is num ? (json['price'] as num).toInt() : null,
  );
}

final List<ChatDeviceItem> UNOWNED_CATALOG_DEVICES = [
  ChatDeviceItem(
    isOwned: false,
    deviceName: 'Cửa Cuốn Khe Thoáng Austec AluDoor X-Series Siêu Êm',
    modelName: 'Austec AluDoor X-100',
    categoryTag: 'CỬA CUỐN THÔNG MINH',
    price: 19500000,
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
    specs: {
      'Công suất': '850W Turbo Inverter',
      'Tải trọng': '1200 kg',
      'Vật liệu': 'Hợp kim nhôm 6063-T5 AkzoNobel',
      'Tiêu chuẩn': 'IP65',
    },
  ),
  ChatDeviceItem(
    isOwned: false,
    deviceName: 'Motor Cổng Trượt Biến Tần Austec Turbo 1500kg',
    modelName: 'Austec Gate Turbo 1500',
    categoryTag: 'MOTOR CỔNG TỰ ĐỘNG',
    price: 14200000,
    imageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop&q=80',
    specs: {
      'Công suất': '550W Biến tần Inverter',
      'Tải trọng': '1500 kg',
      'Tiêu chuẩn': 'IP67 chống ngập nước ngoài trời',
    },
  ),
  ChatDeviceItem(
    isOwned: false,
    deviceName: 'Khóa Cửa Thông Minh FaceID Austec Masaru X1',
    modelName: 'Masaru FaceID X1',
    categoryTag: 'KHÓA CỬA TỰ ĐỘNG',
    price: 9800000,
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
    specs: {
      'Phương thức mở': 'FaceID 3D, Vân tay FPC, Mã PIN, Thẻ RFID',
      'Nguồn điện': 'Pin Lithium 5000mAh Type-C',
    },
  ),
  ChatDeviceItem(
    isOwned: false,
    deviceName: 'Bộ Lưu Điện UPS Austec Sine Chuẩn 48 Giờ',
    modelName: 'UPS Pro Sine-48H',
    categoryTag: 'NGUỒN & PHỤ KIỆN',
    price: 4500000,
    imageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop&q=80',
    specs: {
      'Công suất': '1000VA / 800W',
      'Thời gian lưu': '48 giờ chờ / 20 lần đóng mở',
    },
  ),
];

class ChatMessage {
  final String sender; // 'user' | 'cskh' | 'system'
  final String text;
  final String time;
  final bool isTelemetrySnapshot;
  final Map<String, dynamic>? telemetryData;
  final List<String> attachmentUrls;
  final ChatDeviceItem? selectedDevice;

  ChatMessage({
    required this.sender,
    required this.text,
    required this.time,
    this.isTelemetrySnapshot = false,
    this.telemetryData,
    this.attachmentUrls = const [],
    this.selectedDevice,
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

  WebSocketChannel? _wsChannel;
  StreamSubscription? _wsSubscription;
  Timer? _reconnectTimer;
  bool _isWsConnected = false;

  final List<ChatMessage> _messages = [];
  bool _hasActiveConversation = false;
  bool _isLoading = true;
  bool _isStartingConversation = false;

  // Selected device attached to next message or ticket
  ChatDeviceItem? _selectedDevice;

  // Attached image URLs before sending
  final List<String> _pendingAttachmentUrls = [];

  @override
  void initState() {
    super.initState();
    // Default select first owned device if available
    final owned = _getOwnedDevices();
    if (owned.isNotEmpty) {
      _selectedDevice = owned.first;
    }
    _fetchLiveChatMessages();
    _connectWebSocket();
  }

  @override
  void dispose() {
    _reconnectTimer?.cancel();
    _wsSubscription?.cancel();
    _wsChannel?.sink.close();
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
    if (list.isEmpty) {
      list.add(ChatDeviceItem(
        isOwned: true,
        hardwareId: 'amtuong1834',
        deviceName: 'Cửa Cuốn Austec Titadoor A900 Super',
        modelName: 'Austec Titadoor A900 Super',
        categoryTag: 'CỬA CUỐN THÔNG MINH',
        imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
        specs: {
          'Công suất': '850W Turbo Inverter',
          'Tải trọng': '1200 kg',
          'Serial': 'amtuong1834',
        },
      ));
    }
    return list;
  }

  void _connectWebSocket() {
    try {
      final host = kIsWeb ? 'localhost' : '10.0.2.2';
      final wsUri = Uri.parse('ws://$host:4000/ws/chat');
      _wsChannel = WebSocketChannel.connect(wsUri);

      final user = AuthService().currentUser;
      final customerId = user?.id ?? '00000000-0000-0000-0000-000000000001';
      final customerName = user?.fullName ?? 'Khách Hàng Austec';
      final customerPhone = user?.phoneNumber ?? '0912 345 678';

      // Send JOIN event immediately
      _wsChannel?.sink.add(jsonEncode({
        'type': 'JOIN',
        'role': 'CUSTOMER',
        'userId': customerId,
        'customerName': customerName,
        'customerPhone': customerPhone,
      }));

      setState(() => _isWsConnected = true);

      _wsSubscription = _wsChannel?.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message.toString());
            _handleWebSocketEvent(data);
          } catch (_) {}
        },
        onDone: () {
          setState(() => _isWsConnected = false);
          _scheduleReconnect();
        },
        onError: (e) {
          setState(() => _isWsConnected = false);
          _scheduleReconnect();
        },
      );
    } catch (_) {
      setState(() => _isWsConnected = false);
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) _connectWebSocket();
    });
  }

  void _handleWebSocketEvent(Map<String, dynamic> data) {
    final type = data['type'];
    if (type == 'JOINED') {
      if (data['ticket'] != null) {
        _loadTicketData(data['ticket']);
      }
    } else if (type == 'NEW_MESSAGE' && data['message'] != null) {
      final m = data['message'];
      final isCSKH = m['sender'] == 'CSKH' || m['senderRole'] == 'CSKH';
      final text = (m['text'] ?? m['message'] ?? '').toString();
      final time = (m['time'] ?? 'Vừa xong').toString();

      List<String> images = [];
      if (m['attachmentUrls'] is List) {
        images = List<String>.from(m['attachmentUrls'].map((e) => e.toString()));
      }

      ChatDeviceItem? dev;
      if (m['selectedDevice'] is Map) {
        dev = ChatDeviceItem.fromJson(Map<String, dynamic>.from(m['selectedDevice']));
      }

      if (text.isNotEmpty || images.isNotEmpty) {
        setState(() {
          // Check duplicate
          final exists = _messages.any((msg) => msg.text == text && msg.time == time);
          if (!exists) {
            _messages.add(ChatMessage(
              sender: isCSKH ? 'cskh' : 'user',
              text: text,
              time: time,
              attachmentUrls: images,
              selectedDevice: dev,
              isTelemetrySnapshot: m['hasSnapshot'] == true,
            ));
          }
          _hasActiveConversation = true;
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } else if (type == 'CONVERSATION_STARTED' && data['ticket'] != null) {
      _loadTicketData(data['ticket']);
    } else if (type == 'TICKETS_UPDATED' && data['tickets'] is List) {
      final user = AuthService().currentUser;
      final customerId = user?.id;
      final tickets = data['tickets'] as List;
      final myTicket = tickets.firstWhere(
        (t) => customerId != null ? (t['customerId'] == customerId || t['customerPhone'] == user?.phoneNumber) : true,
        orElse: () => null,
      );
      if (myTicket != null) {
        _loadTicketData(myTicket);
      }
    }
  }

  void _loadTicketData(Map<String, dynamic> ticket) {
    if (ticket['messages'] is List) {
      final List incoming = ticket['messages'];
      final List<ChatMessage> updated = [];
      for (var m in incoming) {
        final isCSKH = m['sender'] == 'CSKH' || m['senderRole'] == 'CSKH';
        final textContent = (m['text'] ?? m['message'] ?? '').toString();
        final timeContent = (m['time'] ?? 'Vừa xong').toString();

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
      if (mounted) {
        setState(() {
          _messages.clear();
          _messages.addAll(updated);
          _hasActiveConversation = true;
          _isLoading = false;
          _isStartingConversation = false;
        });
        _scrollToBottom();
      }
    }
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
      ).timeout(const Duration(seconds: 3));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final bool hasActive = data['hasActiveConversation'] == true;
        if (data['success'] == true && data['messages'] is List) {
          final List incoming = data['messages'];
          if (incoming.isNotEmpty && hasActive) {
            final List<ChatMessage> updated = [];
            for (var m in incoming) {
              final isCSKH = m['sender'] == 'CSKH' || m['senderRole'] == 'CSKH';
              final textContent = (m['text'] ?? m['message'] ?? '').toString();
              final timeContent = (m['time'] ?? 'Vừa xong').toString();

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
            if (mounted) {
              setState(() {
                _messages.clear();
                _messages.addAll(updated);
                _hasActiveConversation = true;
                _isLoading = false;
              });
              _scrollToBottom();
            }
          } else {
            if (mounted && (_hasActiveConversation || _messages.isNotEmpty || _isLoading)) {
              setState(() {
                _messages.clear();
                _hasActiveConversation = false;
                _isLoading = false;
              });
            }
          }
        }
      }
    } catch (_) {
      if (mounted && _isLoading) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _startConversation() async {
    if (_isStartingConversation) return;
    setState(() => _isStartingConversation = true);

    final token = AuthService().token ?? 'austec-customer-token';
    final user = AuthService().currentUser;
    final customerId = user?.id ?? '00000000-0000-0000-0000-000000000001';
    final customerName = user?.fullName ?? 'Khách Hàng Austec';
    final customerPhone = user?.phoneNumber ?? '0912 345 678';

    final dev = _selectedDevice ?? (_getOwnedDevices().isNotEmpty ? _getOwnedDevices().first : null);
    final hardwareId = dev?.hardwareId ?? 'AT-DOOR-88239A01';
    final deviceName = dev?.deviceName ?? 'Cửa Cuốn Austec Titadoor A900 Super';

    // 1. Send via WebSocket if connected
    if (_isWsConnected && _wsChannel != null) {
      _wsChannel?.sink.add(jsonEncode({
        'type': 'START_CONVERSATION',
        'customerId': customerId,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'hardwareId': hardwareId,
        'deviceName': deviceName,
        'selectedDevice': dev?.toJson(),
        'message': 'Xin chào Trung tâm CSKH Austec! Tôi cần hỗ trợ kỹ thuật về thiết bị ${dev?.deviceName ?? "Austec"}.',
      }));
    }

    // 2. Call REST endpoint as reliable fallback
    try {
      final res = await http.post(
        Uri.parse('http://localhost:4000/api/cskh/conversations/start'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'customerId': customerId,
          'customerName': customerName,
          'customerPhone': customerPhone,
          'hardwareId': hardwareId,
          'deviceName': deviceName,
          'selectedDevice': dev?.toJson(),
          'message': 'Xin chào Trung tâm CSKH Austec! Tôi cần hỗ trợ kỹ thuật về thiết bị ${dev?.deviceName ?? "Austec"}.',
        }),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['messages'] is List) {
          final List incoming = data['messages'];
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
                selectedDevice: dev,
                isTelemetrySnapshot: m['hasSnapshot'] == true,
              ));
            }
          }
          if (mounted) {
            setState(() {
              _messages.clear();
              _messages.addAll(updated);
              _hasActiveConversation = true;
              _isStartingConversation = false;
            });
            _scrollToBottom();
          }
          return;
        }
      }
    } catch (_) {
      // Local fallback
      if (mounted) {
        final now = DateTime.now();
        final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
        setState(() {
          _messages.clear();
          _messages.addAll([
            ChatMessage(
              sender: "user",
              text: "Xin chào Trung tâm CSKH Austec! Tôi cần hỗ trợ kỹ thuật về thiết bị ${dev?.deviceName ?? "Austec"}.",
              time: timeStr,
              selectedDevice: dev,
            ),
            ChatMessage(
              sender: "cskh",
              text: "Dạ em chào Quý khách! Kỹ thuật viên Austec đã tiếp nhận yêu cầu và kết nối từ xa qua WebSocket. Em có thể hỗ trợ gì cho bạn ạ?",
              time: timeStr,
            ),
          ]);
          _hasActiveConversation = true;
          _isStartingConversation = false;
        });
        _scrollToBottom();
      }
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

    final user = AuthService().currentUser;
    final customerId = user?.id;

    // Send via WebSocket
    if (_isWsConnected && _wsChannel != null) {
      _wsChannel?.sink.add(jsonEncode({
        'type': 'SEND_MESSAGE',
        'sender': 'CUSTOMER',
        'customerId': customerId,
        'text': txt.isNotEmpty ? txt : "[Hình ảnh hiện trường đính kèm]",
        'attachmentUrls': attachmentsToSend,
        'selectedDevice': devToSend?.toJson(),
      }));
    }

    // Call REST fallback
    final token = AuthService().token ?? 'austec-customer-token';
    http.post(
      Uri.parse('http://localhost:4000/api/cskh/active-chat/messages'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'sender': 'CUSTOMER',
        'senderRole': 'CUSTOMER',
        'text': txt.isNotEmpty ? txt : "[Hình ảnh hiện trường đính kèm]",
        'message': txt,
        'customerId': customerId,
        'attachmentUrls': attachmentsToSend,
        'selectedDevice': devToSend?.toJson(),
      }),
    ).catchError((_) => http.Response('{}', 500));
  }

  void _attachTelemetrySnapshot() {
    final dev = _selectedDevice ?? (_getOwnedDevices().isNotEmpty ? _getOwnedDevices().first : null);
    final hwId = dev?.hardwareId ?? 'amtuong1834';
    final model = dev?.modelName ?? 'Austec Titadoor A900 Super';

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

    final user = AuthService().currentUser;
    final customerId = user?.id;

    if (_isWsConnected && _wsChannel != null) {
      _wsChannel?.sink.add(jsonEncode({
        'type': 'SEND_MESSAGE',
        'sender': 'CUSTOMER',
        'customerId': customerId,
        'text': '[TELEMETRY]: Đã gửi gói viễn thám thiết bị $hwId ($model)',
        'hasSnapshot': true,
        'selectedDevice': dev?.toJson(),
      }));
    }

    final token = AuthService().token ?? 'austec-customer-token';
    http.post(
      Uri.parse('http://localhost:4000/api/cskh/active-chat/messages'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'sender': 'CUSTOMER',
        'customerId': customerId,
        'text': '[TELEMETRY]: Đã gửi gói viễn thám thiết bị $hwId ($model)',
        'hasSnapshot': true,
        'selectedDevice': dev?.toJson(),
      }),
    ).catchError((_) => http.Response('{}', 500));
  }

  // Open Device Combobox Selection Modal
  void _openDeviceComboboxModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _DeviceSelectionSheet(
        currentlySelected: _selectedDevice,
        ownedDevices: _getOwnedDevices(),
        unownedDevices: UNOWNED_CATALOG_DEVICES,
        onSelectDevice: (selected) {
          setState(() {
            _selectedDevice = selected;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppTheme.blueAccent,
              content: Text("Đã chọn thiết bị: ${selected.deviceName} (${selected.isOwned ? 'Đã sở hữu' : 'Tư vấn mới'})"),
              duration: const Duration(seconds: 2),
            ),
          );
        },
      ),
    );
  }

  // Open Image Picker / Attachment Options Modal
  void _openImagePickerModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ImageAttachmentOptionsSheet(
        onImageSelected: (url) {
          setState(() {
            _pendingAttachmentUrls.add(url);
          });
        },
      ),
    );
  }

  // Open Zoom Preview Dialog
  void _openImageZoomDialog(String imageUrl) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.black.withOpacity(0.9),
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Center(
                    child: Text("Không thể tải hình ảnh", style: TextStyle(color: Colors.white)),
                  ),
                ),
              ),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 28),
                onPressed: () => Navigator.of(ctx).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Open Support Request Form Modal Bottom Sheet
  void _openSupportTicketForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _SupportTicketFormSheet(
        selectedDevice: _selectedDevice,
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

  Widget _buildStartConversationView() {
    final dev = _selectedDevice ?? (_getOwnedDevices().isNotEmpty ? _getOwnedDevices().first : null);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Glowing Icon Ring
            Container(
              width: 86,
              height: 86,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    AppTheme.blueAccent.withOpacity(0.3),
                    AppTheme.cyanAccent.withOpacity(0.2),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(color: AppTheme.cyanAccent.withOpacity(0.6), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.cyanAccent.withOpacity(0.25),
                    blurRadius: 24,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: const Icon(
                Icons.support_agent_rounded,
                color: AppTheme.cyanAccent,
                size: 44,
              ),
            ),
            const SizedBox(height: 18),

            // Headline
            const Text(
              "Trung Tâm Hỗ Trợ Kỹ Thuật Austec",
              style: TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.3,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),

            // Description
            const Text(
              "Kênh chat 1-1 trực tiếp qua WebSocket với kỹ sư & CSKH Austec. Gửi hình ảnh hiện trường và liên kết thiết bị cần hỗ trợ.",
              style: TextStyle(
                color: AppTheme.textMuted,
                fontSize: 12,
                height: 1.45,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),

            // Device Combobox Selector Preview Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: AppTheme.glassBox(
                color: AppTheme.surfaceGlass,
                borderColor: AppTheme.cyanAccent.withOpacity(0.3),
                radius: 14,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "THIẾT BỊ HỖ TRỢ ĐÍNH KÈM (COMBOBOX):",
                        style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                      GestureDetector(
                        onTap: _openDeviceComboboxModal,
                        child: const Text(
                          "Đổi thiết bị ➔",
                          style: TextStyle(color: AppTheme.blueAccent, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: _openDeviceComboboxModal,
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.cardBorder),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            dev?.isOwned == true ? Icons.verified : Icons.shopping_bag_outlined,
                            color: dev?.isOwned == true ? AppTheme.emeraldSuccess : AppTheme.cyanAccent,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  dev?.deviceName ?? "Chọn thiết bị cần hỗ trợ",
                                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  dev?.isOwned == true ? "Đã sở hữu • ${dev?.hardwareId ?? ''}" : "Sản phẩm tư vấn mới • Chưa sở hữu",
                                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_drop_down, color: Colors.white70),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Feature Badges
            Container(
              padding: const EdgeInsets.all(14),
              decoration: AppTheme.glassBox(
                color: AppTheme.surfaceGlass,
                borderColor: AppTheme.cardBorder,
                radius: 14,
              ),
              child: Column(
                children: [
                  _buildFeatureRow(
                    Icons.bolt,
                    AppTheme.cyanAccent,
                    "WebSocket Siêu Tốc",
                    "Đồng bộ tin nhắn tức thời 1-1 với bàn làm việc CSKH Admin",
                  ),
                  const Divider(color: AppTheme.cardBorder, height: 16),
                  _buildFeatureRow(
                    Icons.camera_alt_outlined,
                    AppTheme.purpleAccent,
                    "Gửi Ảnh Hiện Trường",
                    "Đính kèm ảnh kẹt nan, mã lỗi, hoặc linh kiện cần thay thế",
                  ),
                  const Divider(color: AppTheme.cardBorder, height: 16),
                  _buildFeatureRow(
                    Icons.devices,
                    AppTheme.emeraldSuccess,
                    "Combobox Chọn Thiết Bị",
                    "Phân loại rõ ràng thiết bị đã sở hữu và sản phẩm tư vấn mới",
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),

            // Prominent Start Button
            Container(
              width: double.infinity,
              height: 48,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.blueAccent, AppTheme.cyanAccent],
                ),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.cyanAccent.withOpacity(0.35),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: _isStartingConversation
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.chat_bubble_outline_rounded, color: Colors.white, size: 19),
                label: Text(
                  _isStartingConversation ? "Đang kết nối WebSocket..." : "Bắt đầu cuộc trò chuyện",
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.3,
                  ),
                ),
                onPressed: _isStartingConversation ? null : _startConversation,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureRow(IconData icon, Color color, String title, String subtitle) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 16),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 1),
              Text(
                subtitle,
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // CSKH Header with Live Status & Create Ticket Button
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: AppTheme.glassBox(radius: 0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: AppTheme.blueAccent,
                    radius: 17,
                    child: Icon(Icons.support_agent, color: Colors.white, size: 19),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Kỹ Thuật Viên Hỗ Trợ 24/7",
                        style: TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.bold),
                      ),
                      Row(
                        children: [
                          Icon(
                            Icons.circle,
                            color: _isWsConnected ? AppTheme.emeraldSuccess : Colors.amber,
                            size: 7,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _isWsConnected ? "WebSocket Real-time" : "Đang kết nối lại...",
                            style: TextStyle(
                              color: _isWsConnected ? AppTheme.emeraldSuccess : Colors.amber,
                              fontSize: 10.5,
                            ),
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
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.assignment_outlined, size: 13),
                    label: const Text("Gửi Phiếu", style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                    onPressed: _openSupportTicketForm,
                  ),
                  if (_hasActiveConversation) ...[
                    const SizedBox(width: 4),
                    IconButton(
                      icon: const Icon(Icons.bolt, color: AppTheme.cyanAccent, size: 20),
                      tooltip: "Gửi viễn thám thiết bị",
                      onPressed: _attachTelemetrySnapshot,
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),

        // Body: Chuyển đổi linh hoạt giữa giao diện "Bắt đầu cuộc trò chuyện" và "Khung chat tin nhắn"
        Expanded(
          child: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: AppTheme.cyanAccent),
                )
              : !_hasActiveConversation
                  ? _buildStartConversationView()
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(14),
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
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
                            decoration: BoxDecoration(
                              color: isMe ? AppTheme.blueAccent : AppTheme.surfaceGlass,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isMe ? AppTheme.cyanAccent.withOpacity(0.3) : AppTheme.cardBorder,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Attached Device Badge in bubble
                                if (msg.selectedDevice != null) ...[
                                  Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: isMe ? Colors.white.withOpacity(0.12) : AppTheme.cyanAccent.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: isMe ? Colors.white24 : AppTheme.cyanAccent.withOpacity(0.3),
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          msg.selectedDevice!.isOwned ? Icons.verified : Icons.shopping_bag_outlined,
                                          color: isMe ? Colors.white : AppTheme.cyanAccent,
                                          size: 14,
                                        ),
                                        const SizedBox(width: 6),
                                        Flexible(
                                          child: Text(
                                            "${msg.selectedDevice!.deviceName} (${msg.selectedDevice!.isOwned ? 'Đã sở hữu' : 'Tư vấn mới'})",
                                            style: TextStyle(
                                              color: isMe ? Colors.white : AppTheme.cyanAccent,
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.bold,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],

                                // Attached Images in bubble
                                if (msg.attachmentUrls.isNotEmpty) ...[
                                  Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    child: Wrap(
                                      spacing: 6,
                                      runSpacing: 6,
                                      children: msg.attachmentUrls.map((imgUrl) {
                                        return GestureDetector(
                                          onTap: () => _openImageZoomDialog(imgUrl),
                                          child: ClipRRect(
                                            borderRadius: BorderRadius.circular(10),
                                            child: Container(
                                              width: 140,
                                              height: 100,
                                              color: Colors.black26,
                                              child: Image.network(
                                                imgUrl,
                                                fit: BoxFit.cover,
                                                errorBuilder: (_, __, ___) => const Icon(Icons.image, color: Colors.white54),
                                              ),
                                            ),
                                          ),
                                        );
                                      }).toList(),
                                    ),
                                  ),
                                ],

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
                                      fontSize: 9.5,
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

        // Bottom Device & Attachment Bar (Above Input)
        if (_hasActiveConversation) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            color: const Color(0xFF0D1527),
            child: Row(
              children: [
                // Combobox Chip: Thiết bị đang chọn
                Expanded(
                  child: InkWell(
                    onTap: _openDeviceComboboxModal,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _selectedDevice != null ? AppTheme.cyanAccent.withOpacity(0.12) : AppTheme.surface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _selectedDevice != null ? AppTheme.cyanAccent.withOpacity(0.4) : AppTheme.cardBorder,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _selectedDevice?.isOwned == true ? Icons.verified : Icons.sell_outlined,
                            size: 13,
                            color: _selectedDevice?.isOwned == true ? AppTheme.emeraldSuccess : AppTheme.cyanAccent,
                          ),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              _selectedDevice != null
                                  ? "${_selectedDevice!.deviceName} (${_selectedDevice!.isOwned ? 'Đã sở hữu' : 'Tư vấn'})"
                                  : "Chọn thiết bị cần hỗ trợ (Combobox)...",
                              style: TextStyle(
                                color: _selectedDevice != null ? Colors.white : AppTheme.textMuted,
                                fontSize: 10.5,
                                fontWeight: _selectedDevice != null ? FontWeight.bold : FontWeight.normal,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (_selectedDevice != null)
                            GestureDetector(
                              onTap: () => setState(() => _selectedDevice = null),
                              child: const Icon(Icons.close, size: 13, color: Colors.white70),
                            )
                          else
                            const Icon(Icons.arrow_drop_down, size: 14, color: AppTheme.textMuted),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Button: Đính kèm ảnh
                IconButton(
                  icon: const Icon(Icons.add_photo_alternate_outlined, color: AppTheme.cyanAccent, size: 21),
                  tooltip: "Đính kèm hình ảnh hiện trường",
                  onPressed: _openImagePickerModal,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),

          // Pending Images Preview Strip
          if (_pendingAttachmentUrls.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              color: const Color(0xFF0D1527),
              child: SizedBox(
                height: 55,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _pendingAttachmentUrls.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, idx) {
                    final img = _pendingAttachmentUrls[idx];
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            width: 55,
                            height: 55,
                            color: Colors.black38,
                            child: Image.network(img, fit: BoxFit.cover),
                          ),
                        ),
                        Positioned(
                          top: 2,
                          right: 2,
                          child: GestureDetector(
                            onTap: () => setState(() => _pendingAttachmentUrls.removeAt(idx)),
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(color: Colors.black87, shape: BoxShape.circle),
                              child: const Icon(Icons.close, size: 11, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),

          // Bottom Input Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: AppTheme.glassBox(radius: 0),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.bolt, color: AppTheme.cyanAccent, size: 22),
                  onPressed: _attachTelemetrySnapshot,
                  tooltip: "Đính kèm viễn thám thiết bị",
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                ),
                Expanded(
                  child: TextField(
                    controller: _textController,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: "Nhập tin nhắn hỗ trợ qua WebSocket...",
                      hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                      filled: true,
                      fillColor: AppTheme.surface,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                    onSubmitted: (_) => _sendUserMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppTheme.cyanAccent,
                  radius: 19,
                  child: IconButton(
                    icon: const Icon(Icons.send_rounded, color: Colors.black, size: 17),
                    onPressed: _sendUserMessage,
                    padding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildTelemetrySnapshotBubble(Map<String, dynamic> data, String time) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        width: 300,
        decoration: AppTheme.glassBox(
          color: AppTheme.cyanAccent.withOpacity(0.08),
          borderColor: AppTheme.cyanAccent.withOpacity(0.5),
          radius: 16,
          glow: true,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.monitor_heart, color: AppTheme.cyanAccent, size: 17),
                SizedBox(width: 6),
                Text(
                  "GÓI CHẨN ĐOÁN VIỄN THÁM (WS)",
                  style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _buildParamRow("Hardware ID", data["hardwareId"]),
            _buildParamRow("Trạng thái", data["doorState"]),
            _buildParamRow("Mức Pin", data["battery"]),
            _buildParamRow("Tín hiệu WiFi", data["wifiRssi"]),
            _buildParamRow("Dòng động cơ", data["currentA"]),
            _buildParamRow("Bản Firmware", data["firmware"]),
            _buildParamRow("Gói dịch vụ", data["subscription"] ?? "Có thời hạn"),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.bottomRight,
              child: Text(time, style: const TextStyle(color: AppTheme.textMuted, fontSize: 9.5)),
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
          Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10.5)),
          Text(
            "$val",
            style: const TextStyle(color: Colors.white, fontSize: 10.5, fontFamily: "monospace", fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

// Device Selection Modal Bottom Sheet (Combobox: Owned vs Unowned)
class _DeviceSelectionSheet extends StatefulWidget {
  final ChatDeviceItem? currentlySelected;
  final List<ChatDeviceItem> ownedDevices;
  final List<ChatDeviceItem> unownedDevices;
  final Function(ChatDeviceItem selected) onSelectDevice;

  const _DeviceSelectionSheet({
    required this.currentlySelected,
    required this.ownedDevices,
    required this.unownedDevices,
    required this.onSelectDevice,
  });

  @override
  State<_DeviceSelectionSheet> createState() => _DeviceSelectionSheetState();
}

class _DeviceSelectionSheetState extends State<_DeviceSelectionSheet> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.72,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.devices, color: AppTheme.cyanAccent, size: 20),
                  SizedBox(width: 8),
                  Text(
                    "CHỌN THIẾT BỊ HỖ TRỢ (COMBOBOX)",
                    style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 0.3),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const Text(
            "Chọn thiết bị bạn đang cần giải đáp sự cố hoặc sản phẩm cần tư vấn mới để kỹ thuật viên CSKH chuẩn bị tài liệu kỹ thuật chính xác nhất.",
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11, height: 1.4),
          ),
          const SizedBox(height: 12),

          // Tabs: Đã sở hữu vs Chưa sở hữu
          Container(
            height: 38,
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: AppTheme.blueAccent,
                borderRadius: BorderRadius.circular(10),
              ),
              labelColor: Colors.white,
              unselectedLabelColor: AppTheme.textMuted,
              labelStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
              tabs: [
                Tab(text: "Thiết bị đã sở hữu (${widget.ownedDevices.length})"),
                Tab(text: "Tư vấn mới / Chưa sở hữu (${widget.unownedDevices.length})"),
              ],
            ),
          ),
          const SizedBox(height: 12),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Owned devices
                _buildDeviceList(widget.ownedDevices, isOwnedTab: true),

                // Tab 2: Unowned catalog devices
                _buildDeviceList(widget.unownedDevices, isOwnedTab: false),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceList(List<ChatDeviceItem> list, {required bool isOwnedTab}) {
    if (list.isEmpty) {
      return Center(
        child: Text(
          isOwnedTab ? "Chưa có thiết bị nào được liên kết tài khoản" : "Không có sản phẩm khả dụng",
          style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
        ),
      );
    }

    return ListView.separated(
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, idx) {
        final item = list[idx];
        final isSelected = widget.currentlySelected?.deviceName == item.deviceName;

        return InkWell(
          onTap: () {
            widget.onSelectDevice(item);
            Navigator.of(context).pop();
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isSelected ? AppTheme.cyanAccent.withOpacity(0.12) : AppTheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? AppTheme.cyanAccent : AppTheme.cardBorder,
              ),
            ),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    width: 48,
                    height: 48,
                    color: Colors.black26,
                    child: Image.network(
                      item.imageUrl ?? 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.devices, color: Colors.white54),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: item.isOwned ? AppTheme.emeraldSuccess.withOpacity(0.15) : AppTheme.amberWarning.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              item.isOwned ? "ĐÃ SỞ HỮU" : "TƯ VẤN MỚI",
                              style: TextStyle(
                                color: item.isOwned ? AppTheme.emeraldSuccess : AppTheme.amberWarning,
                                fontSize: 8.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            item.categoryTag,
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 9.5, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        item.deviceName,
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item.isOwned
                            ? "Serial: ${item.hardwareId ?? 'Chưa gán'}"
                            : item.price != null
                                ? "Giá tham khảo: ${item.price!.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')} đ"
                                : "Liên hệ báo giá ưu đãi",
                        style: TextStyle(
                          color: item.isOwned ? AppTheme.cyanAccent : Colors.amber.shade300,
                          fontSize: 10.5,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  const Icon(Icons.check_circle, color: AppTheme.cyanAccent, size: 20)
                else
                  const Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 18),
              ],
            ),
          ),
        );
      },
    );
  }
}

// Image Attachment Options Bottom Sheet
class _ImageAttachmentOptionsSheet extends StatelessWidget {
  final Function(String imageUrl) onImageSelected;
  const _ImageAttachmentOptionsSheet({required this.onImageSelected});

  @override
  Widget build(BuildContext context) {
    final sampleImages = [
      {
        'title': 'Nan cửa bị kẹt / Lệch ray trượt',
        'desc': 'Ảnh mẫu hiện trường lỗi nan cửa cuốn',
        'url': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
      },
      {
        'title': 'Bo mạch motor nhấp nháy đèn đỏ',
        'desc': 'Ảnh chụp đèn LED báo lỗi bo điều khiển',
        'url': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop&q=80',
      },
      {
        'title': 'Khóa cửa báo lỗi nhận diện FaceID',
        'desc': 'Ảnh màn hình khóa hiển thị cảnh báo',
        'url': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
      },
    ];

    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.add_photo_alternate, color: AppTheme.cyanAccent, size: 20),
                  SizedBox(width: 8),
                  Text(
                    "ĐÍNH KÈM ẢNH HIỆN TRƯỜNG",
                    style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const Text(
            "Chọn hình ảnh mô tả hiện trường sự cố để kỹ thuật viên kiểm tra từ xa:",
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
          ),
          const SizedBox(height: 12),

          ...sampleImages.map((s) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () {
                  onImageSelected(s['url']!);
                  Navigator.of(context).pop();
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.cardBorder),
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Image.network(s['url']!, width: 44, height: 44, fit: BoxFit.cover),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(s['title']!, style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                            Text(s['desc']!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                          ],
                        ),
                      ),
                      const Icon(Icons.add_circle_outline, color: AppTheme.cyanAccent, size: 20),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

// Bottom Sheet Form for Submitting Customer Support Requests
class _SupportTicketFormSheet extends StatefulWidget {
  final ChatDeviceItem? selectedDevice;
  final Function(String ticketId) onSubmitSuccess;
  const _SupportTicketFormSheet({this.selectedDevice, required this.onSubmitSuccess});

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
    final dev = widget.selectedDevice ??
        (IoTGatewayClient().devices.isNotEmpty ? IoTGatewayClient().devices.first : null);

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
          'hardwareId': dev is ChatDeviceItem ? dev.hardwareId : (dev as dynamic)?.hardwareId ?? 'AT-DOOR-88239A01',
          'deviceName': dev is ChatDeviceItem ? dev.deviceName : (dev as dynamic)?.name ?? 'Cửa Cuốn Austec Smart',
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
