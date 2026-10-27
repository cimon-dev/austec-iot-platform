import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/auth_service.dart';
import '../domain/entities/chat_device_item.dart';
import '../models/chat_message.dart';

class CskhChatService {
  static final CskhChatService _instance = CskhChatService._internal();
  factory CskhChatService() => _instance;
  CskhChatService._internal();

  WebSocketChannel? _wsChannel;
  StreamSubscription? _wsSubscription;
  Timer? _reconnectTimer;
  bool _isConnected = false;

  Function(bool isConnected)? onConnectionChanged;
  Function(ChatMessage message)? onMessageReceived;
  Function(Map<String, dynamic> ticketData)? onTicketLoaded;

  bool get isConnected => _isConnected;

  void connectWebSocket() {
    try {
      final wsUri = Uri.parse(ApiConfig.wsChatUrl);
      _wsChannel = WebSocketChannel.connect(wsUri);

      final user = AuthService().currentUser;
      final customerId = user?.id ?? '00000000-0000-0000-0000-000000000001';
      final customerName = user?.fullName ?? 'Khách Hàng Austec';
      final customerPhone = user?.phoneNumber ?? '0912 345 678';

      // Send JOIN event immediately
      _wsChannel?.sink.add(jsonEncode({
        'type': 'JOIN',
        'role': 'CUSTOMER',
        'customerId': customerId,
        'userId': customerId,
        'customerName': customerName,
        'customerPhone': customerPhone,
      }));

      _isConnected = true;
      onConnectionChanged?.call(true);

      _wsSubscription = _wsChannel?.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message.toString());
            _handleWebSocketEvent(data);
          } catch (e) {
            debugPrint('[CskhChatService] Decode error: $e');
          }
        },
        onDone: () {
          _isConnected = false;
          onConnectionChanged?.call(false);
          _scheduleReconnect();
        },
        onError: (e) {
          _isConnected = false;
          onConnectionChanged?.call(false);
          _scheduleReconnect();
        },
      );
    } catch (_) {
      _isConnected = false;
      onConnectionChanged?.call(false);
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 3), () {
      connectWebSocket();
    });
  }

  void _handleWebSocketEvent(Map<String, dynamic> data) {
    final type = data['type'];
    if (type == 'JOINED') {
      if (data['ticket'] != null) {
        onTicketLoaded?.call(Map<String, dynamic>.from(data['ticket']));
      }
    } else if (type == 'NEW_MESSAGE' && data['message'] != null) {
      final m = data['message'];
      final isCSKH = m['sender'] == 'CSKH' || m['senderRole'] == 'CSKH';
      final text = (m['text'] ?? m['message'] ?? '').toString().trim();
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
        onMessageReceived?.call(ChatMessage(
          sender: isCSKH ? 'cskh' : 'user',
          text: text,
          time: time,
          attachmentUrls: images,
          selectedDevice: dev,
          isTelemetrySnapshot: m['hasSnapshot'] == true,
        ));
      }
    } else if (type == 'CONVERSATION_STARTED' && data['ticket'] != null) {
      onTicketLoaded?.call(Map<String, dynamic>.from(data['ticket']));
    } else if (type == 'TICKETS_UPDATED' && data['tickets'] is List) {
      final user = AuthService().currentUser;
      final customerId = user?.id;
      final tickets = data['tickets'] as List;
      final myTicket = tickets.firstWhere(
        (t) => customerId != null ? (t['customerId'] == customerId || t['customerPhone'] == user?.phoneNumber) : true,
        orElse: () => null,
      );
      if (myTicket != null) {
        onTicketLoaded?.call(Map<String, dynamic>.from(myTicket));
      }
    }
  }

  Future<Map<String, dynamic>?> fetchLiveChatMessages() async {
    final customerId = AuthService().currentUser?.id;
    final endpoint = customerId != null 
        ? '/api/cskh/active-chat?customerId=$customerId' 
        : '/api/cskh/active-chat';

    final res = await ApiClient().get(endpoint);
    if (res.success && res.data is Map<String, dynamic>) {
      return res.data;
    }
    return null;
  }

  Future<void> startConversation({
    ChatDeviceItem? selectedDevice,
    required String greeting,
  }) async {
    final user = AuthService().currentUser;
    final customerId = user?.id ?? '00000000-0000-0000-0000-000000000001';
    String customerName = (user?.fullName ?? '').trim();
    if (customerName.contains('@') || customerName.startsWith('USR-') || customerName.isEmpty) {
      customerName = 'Quý khách';
    }
    final customerPhone = user?.phoneNumber ?? '0912 345 678';
    final hardwareId = selectedDevice?.hardwareId ?? '';
    final deviceName = selectedDevice?.deviceName ?? '';

    // Gửi qua WebSocket nếu đã kết nối
    if (_isConnected && _wsChannel != null) {
      _wsChannel?.sink.add(jsonEncode({
        'type': 'START_CONVERSATION',
        'customerId': customerId,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'hardwareId': hardwareId,
        'deviceName': deviceName,
        'selectedDevice': selectedDevice?.toJson(),
        'message': greeting,
      }));
      return;
    }

    // Fallback qua REST
    await ApiClient().post('/api/cskh/conversations/start', body: {
      'customerId': customerId,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'hardwareId': hardwareId,
      'deviceName': deviceName,
      'selectedDevice': selectedDevice?.toJson(),
      'message': greeting,
    });
  }

  Future<void> sendMessage({
    required String text,
    List<String> attachmentUrls = const [],
    ChatDeviceItem? selectedDevice,
    bool isTelemetry = false,
  }) async {
    final user = AuthService().currentUser;
    final customerId = user?.id;

    if (_isConnected && _wsChannel != null) {
      _wsChannel?.sink.add(jsonEncode({
        'type': 'SEND_MESSAGE',
        'sender': 'CUSTOMER',
        'customerId': customerId,
        'text': text,
        'hasSnapshot': isTelemetry,
        'attachmentUrls': attachmentUrls,
        'selectedDevice': selectedDevice?.toJson(),
      }));
    } else {
      await ApiClient().post('/api/cskh/active-chat/messages', body: {
        'sender': 'CUSTOMER',
        'senderRole': 'CUSTOMER',
        'text': text,
        'message': text,
        'customerId': customerId,
        'hasSnapshot': isTelemetry,
        'attachmentUrls': attachmentUrls,
        'selectedDevice': selectedDevice?.toJson(),
      });
    }
  }

  void dispose() {
    _reconnectTimer?.cancel();
    _wsSubscription?.cancel();
    _wsChannel?.sink.close();
    _isConnected = false;
  }
}
