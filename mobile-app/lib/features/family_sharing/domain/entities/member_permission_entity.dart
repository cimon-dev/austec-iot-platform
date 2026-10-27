class MemberPermission {
  final String id;
  final String hardwareId;
  final String userId;
  String memberName;
  String phoneNumber;
  String role; // 'OWNER' | 'MEMBER' | 'GUEST'
  bool canControl;
  bool canViewHistory;
  bool canChildLock;
  bool canConfig;
  bool scheduleLimitActive;
  String accessStartTime;
  String accessEndTime;
  List<bool> accessDays;
  final String createdAt;

  MemberPermission({
    required this.id,
    required this.hardwareId,
    required this.userId,
    required this.memberName,
    required this.phoneNumber,
    required this.role,
    this.canControl = true,
    this.canViewHistory = true,
    this.canChildLock = false,
    this.canConfig = false,
    this.scheduleLimitActive = false,
    this.accessStartTime = "08:00",
    this.accessEndTime = "18:00",
    List<bool>? accessDays,
    required this.createdAt,
  }) : accessDays = accessDays ?? [true, true, true, true, true, true, false];

  factory MemberPermission.fromJson(Map<String, dynamic> json) {
    List<bool> days = [true, true, true, true, true, true, false];
    if (json['accessDays'] is List) {
      days = (json['accessDays'] as List).map((e) => e == true).toList();
    }
    return MemberPermission(
      id: json['id']?.toString() ?? 'PERM-${DateTime.now().millisecondsSinceEpoch}',
      hardwareId: json['hardwareId']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      memberName: json['memberName']?.toString() ?? 'Thành viên',
      phoneNumber: json['phoneNumber']?.toString() ?? '',
      role: json['role']?.toString() ?? 'MEMBER',
      canControl: json['canControl'] ?? true,
      canViewHistory: json['canViewHistory'] ?? true,
      canChildLock: json['canChildLock'] ?? false,
      canConfig: json['canConfig'] ?? false,
      scheduleLimitActive: json['scheduleLimitActive'] ?? false,
      accessStartTime: json['accessStartTime']?.toString() ?? '08:00',
      accessEndTime: json['accessEndTime']?.toString() ?? '18:00',
      accessDays: days,
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'hardwareId': hardwareId,
    'userId': userId,
    'memberName': memberName,
    'phoneNumber': phoneNumber,
    'role': role,
    'canControl': canControl,
    'canViewHistory': canViewHistory,
    'canChildLock': canChildLock,
    'canConfig': canConfig,
    'scheduleLimitActive': scheduleLimitActive,
    'accessStartTime': accessStartTime,
    'accessEndTime': accessEndTime,
    'accessDays': accessDays,
  };
}

class SuggestedMember {
  final String userId;
  final String memberName;
  final String phoneNumber;
  final String role;
  final bool canControl;
  final bool canViewHistory;
  final bool canChildLock;
  final bool canConfig;
  final bool scheduleLimitActive;
  final String accessStartTime;
  final String accessEndTime;
  final List<String> sourceDeviceNames;

  SuggestedMember({
    required this.userId,
    required this.memberName,
    required this.phoneNumber,
    required this.role,
    this.canControl = true,
    this.canViewHistory = true,
    this.canChildLock = false,
    this.canConfig = false,
    this.scheduleLimitActive = false,
    this.accessStartTime = "08:00",
    this.accessEndTime = "18:00",
    required this.sourceDeviceNames,
  });

  factory SuggestedMember.fromJson(Map<String, dynamic> json) {
    List<String> sources = [];
    if (json['sourceDeviceNames'] is List) {
      sources = (json['sourceDeviceNames'] as List).map((e) => e.toString()).toList();
    }
    return SuggestedMember(
      userId: json['userId']?.toString() ?? '',
      memberName: json['memberName']?.toString() ?? '',
      phoneNumber: json['phoneNumber']?.toString() ?? '',
      role: json['role']?.toString() ?? 'MEMBER',
      canControl: json['canControl'] ?? true,
      canViewHistory: json['canViewHistory'] ?? true,
      canChildLock: json['canChildLock'] ?? false,
      canConfig: json['canConfig'] ?? false,
      scheduleLimitActive: json['scheduleLimitActive'] ?? false,
      accessStartTime: json['accessStartTime']?.toString() ?? '08:00',
      accessEndTime: json['accessEndTime']?.toString() ?? '18:00',
      sourceDeviceNames: sources,
    );
  }
}
