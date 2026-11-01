import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/auth_service.dart';
import '../models/conversation_item.dart';
import '../models/chat_message_model.dart';
import '../models/chat_attachment.dart';

class ChatService {
  static final ChatService _instance = ChatService._internal();
  factory ChatService() => _instance;
  ChatService._internal();

  WebSocketChannel? _wsChannel;
  StreamSubscription? _wsSubscription;
  String? _activeConversationId;
  bool _isConnected = false;

  Function(ChatMessageModel)? _onMessageReceived;
  Function(ChatMessageModel)? _onMessageAck;
  Function(bool)? _onConnectionChanged;

  bool get isConnected => _isConnected;
  String? get activeConversationId => _activeConversationId;

  // ==========================================
  // REST API METHODS
  // ==========================================

  Future<List<Map<String, dynamic>>> searchUsers(String query) async {
    if (query.trim().isEmpty) return [];
    try {
      final res = await ApiClient().get('/api/chat/users/search', queryParams: {'q': query.trim()});
      if (res.success && res.data != null && res.data['users'] is List) {
        return List<Map<String, dynamic>>.from(res.data['users']);
      }
    } catch (e) {
      debugPrint('[ChatService] searchUsers error: $e');
    }
    return [];
  }

  Future<List<ConversationItem>> fetchConversations() async {
    try {
      final res = await ApiClient().get('/api/chat/conversations');
      if (res.success && res.data != null && res.data['conversations'] is List) {
        final list = res.data['conversations'] as List;
        return list.map((c) => ConversationItem.fromJson(Map<String, dynamic>.from(c))).toList();
      }
    } catch (e) {
      debugPrint('[ChatService] fetchConversations error: $e');
    }
    return [];
  }

  Future<ConversationItem?> fetchConversationById(String conversationId) async {
    try {
      final res = await ApiClient().get('/api/chat/conversations/$conversationId');
      if (res.success && res.data != null && res.data['conversation'] is Map) {
        return ConversationItem.fromJson(Map<String, dynamic>.from(res.data['conversation']));
      }
    } catch (e) {
      debugPrint('[ChatService] fetchConversationById error: $e');
    }
    return null;
  }

  Future<String?> createDirectChat(String targetUserId) async {
    try {
      final res = await ApiClient().post('/api/chat/conversations/direct', body: {
        'targetUserId': targetUserId,
      });
      if (res.success && res.data != null && res.data['conversationId'] != null) {
        return res.data['conversationId'].toString();
      }
    } catch (e) {
      debugPrint('[ChatService] createDirectChat error: $e');
    }
    return null;
  }

  Future<String?> createGroupChat(String title, List<String> memberIds, {String? avatarUrl}) async {
    try {
      final res = await ApiClient().post('/api/chat/conversations/group', body: {
        'title': title,
        'memberIds': memberIds,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
      });
      if (res.success && res.data != null && res.data['conversationId'] != null) {
        return res.data['conversationId'].toString();
      }
    } catch (e) {
      debugPrint('[ChatService] createGroupChat error: $e');
    }
    return null;
  }

  Future<bool> addGroupMembers(String conversationId, List<String> memberIds) async {
    try {
      final res = await ApiClient().post('/api/chat/conversations/$conversationId/members', body: {
        'memberIds': memberIds,
      });
      return res.success;
    } catch (e) {
      debugPrint('[ChatService] addGroupMembers error: $e');
      return false;
    }
  }

  Future<bool> removeGroupMember(String conversationId, String targetUserId) async {
    try {
      final res = await ApiClient().delete('/api/chat/conversations/$conversationId/members/$targetUserId');
      return res.success;
    } catch (e) {
      debugPrint('[ChatService] removeGroupMember error: $e');
      return false;
    }
  }

  Future<List<ChatMessageModel>> fetchMessages(String conversationId) async {
    try {
      final res = await ApiClient().get('/api/chat/conversations/$conversationId/messages');
      if (res.success && res.data != null && res.data['messages'] is List) {
        final currentUserId = AuthService().currentUser?.id;
        final list = res.data['messages'] as List;
        return list.map((m) => ChatMessageModel.fromJson(Map<String, dynamic>.from(m), currentUserId: currentUserId)).toList();
      }
    } catch (e) {
      debugPrint('[ChatService] fetchMessages error: $e');
    }
    return [];
  }

  Future<ChatAttachment?> uploadAttachment(List<int> bytes, String filename) async {
    try {
      final res = await ApiClient().uploadMultipart(
        '/api/upload/file',
        fileBytes: bytes,
        filename: filename,
        fields: {'folder': 'chat-media'},
      );
      if (res.success && res.data is Map) {
        return ChatAttachment.fromJson(Map<String, dynamic>.from(res.data));
      }
    } catch (e) {
      debugPrint('[ChatService] uploadAttachment error: $e');
    }
    return null;
  }

  // ==========================================
  // WEBSOCKET ROOM LIFECYCLE (CONNECT ON DEMAND)
  // ==========================================

  void connectToConversation(
    String conversationId, {
    required Function(ChatMessageModel message) onMessageReceived,
    required Function(ChatMessageModel ack) onMessageAck,
    Function(bool isConnected)? onStatusChanged,
  }) {
    // Ngắt kết nối phòng cũ nếu có
    disconnect();

    _activeConversationId = conversationId;
    _onMessageReceived = onMessageReceived;
    _onMessageAck = onMessageAck;
    _onConnectionChanged = onStatusChanged;

    try {
      final wsUri = Uri.parse(ApiConfig.wsChatUrl);
      _wsChannel = WebSocketChannel.connect(wsUri);

      final user = AuthService().currentUser;
      final userId = user?.id ?? '00000000-0000-0000-0000-000000000001';
      final userName = user?.fullName ?? 'Khách Hàng Austec';

      // 1. Gửi thông tin JOIN hệ thống
      _wsChannel?.sink.add(jsonEncode({
        'type': 'JOIN',
        'role': user?.role ?? 'CUSTOMER',
        'customerId': userId,
        'userId': userId,
        'customerName': userName,
        'customerPhone': user?.phoneNumber ?? '',
      }));

      // 2. Vào phòng hội thoại cụ thể
      _wsChannel?.sink.add(jsonEncode({
        'type': 'JOIN_CONVERSATION',
        'conversationId': conversationId,
        'userId': userId,
      }));

      _isConnected = true;
      _onConnectionChanged?.call(true);

      _wsSubscription = _wsChannel?.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message.toString());
            _handleWebSocketEvent(data);
          } catch (e) {
            debugPrint('[ChatService] Decode error: $e');
          }
        },
        onDone: () {
          _isConnected = false;
          _onConnectionChanged?.call(false);
        },
        onError: (e) {
          _isConnected = false;
          _onConnectionChanged?.call(false);
        },
      );
    } catch (e) {
      debugPrint('[ChatService] Connect error: $e');
      _isConnected = false;
      _onConnectionChanged?.call(false);
    }
  }

  void _handleWebSocketEvent(Map<String, dynamic> data) {
    final type = data['type'];
    final currentUserId = AuthService().currentUser?.id;

    // ACK từ server khi gửi tin nhắn thành công
    if (type == 'MESSAGE_ACK' && data['message'] != null) {
      final msg = ChatMessageModel.fromJson(Map<String, dynamic>.from(data['message']), currentUserId: currentUserId);
      _onMessageAck?.call(msg);
      return;
    }

    // Tin nhắn mới từ cuộc trò chuyện nhóm / 1-1
    if (type == 'NEW_CONVERSATION_MESSAGE' && data['message'] != null) {
      final msg = ChatMessageModel.fromJson(Map<String, dynamic>.from(data['message']), currentUserId: currentUserId);
      if (_activeConversationId == null || _activeConversationId == msg.conversationId) {
        _onMessageReceived?.call(msg);
      }
      return;
    }

    // Tin nhắn mới từ CSKH ticket
    if (type == 'NEW_MESSAGE' && data['message'] != null) {
      final msg = ChatMessageModel.fromJson(Map<String, dynamic>.from(data['message']), currentUserId: currentUserId);
      _onMessageReceived?.call(msg);
      return;
    }
  }

  Future<void> sendChatMessage({
    required String conversationId,
    required String content,
    required String clientTempId,
    String messageType = 'TEXT',
    List<ChatAttachment> attachments = const [],
    Map<String, dynamic> metadata = const {},
  }) async {
    final user = AuthService().currentUser;
    final userId = user?.id ?? '00000000-0000-0000-0000-000000000001';
    final userName = user?.fullName ?? 'Người dùng';

    final payload = {
      'type': 'SEND_CONVERSATION_MESSAGE',
      'conversationId': conversationId,
      'senderId': userId,
      'senderName': userName,
      'senderRole': user?.role ?? 'CUSTOMER',
      'content': content,
      'text': content,
      'messageType': messageType,
      'attachments': attachments.map((a) => a.toJson()).toList(),
      'clientTempId': clientTempId,
      'metadata': metadata,
    };

    if (_isConnected && _wsChannel != null) {
      _wsChannel?.sink.add(jsonEncode(payload));
    } else {
      // Fallback qua REST endpoint
      await ApiClient().post('/api/chat/conversations/$conversationId/messages', body: {
        'content': content,
        'messageType': messageType,
        'attachments': attachments.map((a) => a.toJson()).toList(),
        'clientTempId': clientTempId,
        'metadata': metadata,
      });
    }
  }

  void disconnect() {
    if (_activeConversationId != null && _isConnected && _wsChannel != null) {
      try {
        _wsChannel?.sink.add(jsonEncode({
          'type': 'LEAVE_CONVERSATION',
          'conversationId': _activeConversationId,
        }));
      } catch (_) {}
    }
    _wsSubscription?.cancel();
    _wsChannel?.sink.close();
    _wsSubscription = null;
    _wsChannel = null;
    _activeConversationId = null;
    _isConnected = false;
    _onConnectionChanged?.call(false);
  }
}
