class ChatParticipant {
  final String userId;
  final String fullName;
  final String email;
  final String? phoneNumber;
  final String role;
  final String chatRole; // 'ADMIN', 'MEMBER'

  ChatParticipant({
    required this.userId,
    required this.fullName,
    required this.email,
    this.phoneNumber,
    required this.role,
    required this.chatRole,
  });

  factory ChatParticipant.fromJson(Map<String, dynamic> json) {
    return ChatParticipant(
      userId: (json['userId'] ?? json['id'] ?? '').toString(),
      fullName: (json['fullName'] ?? json['full_name'] ?? 'Thành viên').toString(),
      email: (json['email'] ?? '').toString(),
      phoneNumber: json['phoneNumber'] ?? json['phone_number'],
      role: (json['role'] ?? 'CUSTOMER').toString(),
      chatRole: (json['chatRole'] ?? json['role'] ?? 'MEMBER').toString(),
    );
  }
}

class ConversationItem {
  final String id;
  final String type; // 'CSKH', 'DIRECT', 'GROUP'
  final String title;
  final String? avatarUrl;
  final String? creatorId;
  final String? lastMessage;
  final String? lastMessageSenderName;
  final String? lastMessageAt;
  final int memberCount;
  final Map<String, dynamic> metadata;
  final List<ChatParticipant> participants;

  ConversationItem({
    required this.id,
    required this.type,
    required this.title,
    this.avatarUrl,
    this.creatorId,
    this.lastMessage,
    this.lastMessageSenderName,
    this.lastMessageAt,
    this.memberCount = 2,
    this.metadata = const {},
    this.participants = const [],
  });

  bool get isCskh => type == 'CSKH';
  bool get isGroup => type == 'GROUP';
  bool get isDirect => type == 'DIRECT';

  factory ConversationItem.fromJson(Map<String, dynamic> json) {
    var rawParts = json['participants'];
    List<ChatParticipant> parts = [];
    if (rawParts is List) {
      parts = rawParts.map((p) => ChatParticipant.fromJson(Map<String, dynamic>.from(p))).toList();
    }

    return ConversationItem(
      id: (json['id'] ?? '').toString(),
      type: (json['type'] ?? 'DIRECT').toString().toUpperCase(),
      title: (json['title'] ?? (json['type'] == 'CSKH' ? 'Hỗ trợ Kỹ thuật & CSKH Austec' : 'Cuộc trò chuyện')).toString(),
      avatarUrl: json['avatarUrl'] ?? json['avatar_url'],
      creatorId: json['creatorId'] ?? json['creator_id'],
      lastMessage: json['lastMessage'] ?? json['last_message'],
      lastMessageSenderName: json['lastMessageSenderName'] ?? json['last_message_sender_name'],
      lastMessageAt: json['lastMessageAt'] ?? json['last_message_at'],
      memberCount: (json['memberCount'] is num) ? (json['memberCount'] as num).toInt() : 2,
      metadata: json['metadata'] is Map ? Map<String, dynamic>.from(json['metadata']) : {},
      participants: parts,
    );
  }

  String get timeFormatted {
    if (lastMessageAt == null || lastMessageAt!.isEmpty) return '';
    try {
      final dt = DateTime.parse(lastMessageAt!).toLocal();
      final now = DateTime.now();
      if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
        return "${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}";
      }
      return "${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}";
    } catch (_) {
      return '';
    }
  }
}
