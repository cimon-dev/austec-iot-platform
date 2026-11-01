import 'chat_attachment.dart';

class ChatMessageModel {
  final dynamic id;
  final String conversationId;
  final String senderId;
  final String senderRole;
  final String senderName;
  final String? senderAvatar;
  final String messageType; // 'TEXT', 'IMAGE', 'VIDEO', 'FILE', 'DEVICE_SNAPSHOT', 'SYSTEM'
  final String content;
  final List<ChatAttachment> attachments;
  final String? clientTempId;
  final Map<String, dynamic> metadata;
  final String createdAt;
  final bool isSending;
  final bool isMe;

  ChatMessageModel({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderRole,
    required this.senderName,
    this.senderAvatar,
    this.messageType = 'TEXT',
    required this.content,
    this.attachments = const [],
    this.clientTempId,
    this.metadata = const {},
    required this.createdAt,
    this.isSending = false,
    this.isMe = false,
  });

  bool get isSystem => messageType == 'SYSTEM';
  bool get isDeviceSnapshot => messageType == 'DEVICE_SNAPSHOT' || (metadata.containsKey('hardwareId'));

  factory ChatMessageModel.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    final senderId = (json['senderId'] ?? json['sender_id'] ?? '').toString();
    final isMe = currentUserId != null && currentUserId.isNotEmpty && senderId == currentUserId;

    List<ChatAttachment> atts = [];
    final rawAtts = json['attachments'];
    if (rawAtts is List) {
      atts = rawAtts.map((a) {
        if (a is Map) return ChatAttachment.fromJson(Map<String, dynamic>.from(a));
        if (a is String) return ChatAttachment(url: a, name: 'Ảnh đính kèm', size: 0, mimeType: 'image/jpeg', mediaType: 'image');
        return ChatAttachment(url: a.toString(), name: 'Tệp', size: 0, mimeType: 'application/octet-stream', mediaType: 'file');
      }).toList();
    } else if (json['attachmentUrls'] is List) {
      atts = (json['attachmentUrls'] as List).map((u) {
        return ChatAttachment(url: u.toString(), name: 'Ảnh đính kèm', size: 0, mimeType: 'image/jpeg', mediaType: 'image');
      }).toList();
    }

    return ChatMessageModel(
      id: json['id'] ?? json['clientTempId'] ?? DateTime.now().millisecondsSinceEpoch,
      conversationId: (json['conversationId'] ?? json['ticketId'] ?? '').toString(),
      senderId: senderId,
      senderRole: (json['senderRole'] ?? json['sender'] ?? 'CUSTOMER').toString().toUpperCase(),
      senderName: (json['senderName'] ?? (isMe ? 'Tôi' : 'Thành viên')).toString(),
      senderAvatar: json['senderAvatar'],
      messageType: (json['messageType'] ?? 'TEXT').toString().toUpperCase(),
      content: (json['content'] ?? json['text'] ?? json['message'] ?? '').toString(),
      attachments: atts,
      clientTempId: json['clientTempId'] ?? json['client_temp_id'],
      metadata: json['metadata'] is Map
          ? Map<String, dynamic>.from(json['metadata'])
          : (json['deviceSnapshot'] is Map ? Map<String, dynamic>.from(json['deviceSnapshot']) : {}),
      createdAt: (json['createdAt'] ?? json['created_at'] ?? DateTime.now().toIso8601String()).toString(),
      isSending: false,
      isMe: isMe,
    );
  }

  String get timeFormatted {
    try {
      final dt = DateTime.parse(createdAt).toLocal();
      return "${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}";
    } catch (_) {
      return '';
    }
  }

  ChatMessageModel copyWith({
    dynamic id,
    bool? isSending,
  }) {
    return ChatMessageModel(
      id: id ?? this.id,
      conversationId: conversationId,
      senderId: senderId,
      senderRole: senderRole,
      senderName: senderName,
      senderAvatar: senderAvatar,
      messageType: messageType,
      content: content,
      attachments: attachments,
      clientTempId: clientTempId,
      metadata: metadata,
      createdAt: createdAt,
      isSending: isSending ?? this.isSending,
      isMe: isMe,
    );
  }
}
