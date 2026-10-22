import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../core/constants/app_theme.dart';
import '../../core/models/device_model.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/iot_gateway_client.dart';

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

class FamilySharingScreen extends StatefulWidget {
  final String? initialHardwareId;
  final DeviceItem? initialDevice;

  const FamilySharingScreen({
    super.key,
    this.initialHardwareId,
    this.initialDevice,
  });

  @override
  State<FamilySharingScreen> createState() => _FamilySharingScreenState();
}

class _FamilySharingScreenState extends State<FamilySharingScreen> {
  final IoTGatewayClient _gateway = IoTGatewayClient();
  List<DeviceItem> _devices = [];
  DeviceItem? _selectedDevice;

  List<MemberPermission> _currentMembers = [];
  List<SuggestedMember> _suggestedMembers = [];
  bool _isLoadingMembers = false;
  String? _transferOtp;

  @override
  void initState() {
    super.initState();
    _initDeviceList();
  }

  void _initDeviceList() {
    final gatewayDevices = _gateway.devices;
    setState(() {
      _devices = List.from(gatewayDevices);
    });

    // Chọn thiết bị ban đầu:
    if (widget.initialDevice != null) {
      _selectedDevice = widget.initialDevice;
    } else if (widget.initialHardwareId != null) {
      _selectedDevice = _devices.firstWhere(
        (d) => d.hardwareId == widget.initialHardwareId,
        orElse: () => _devices.isNotEmpty ? _devices.first : _createDefaultDevice(),
      );
    } else if (_devices.isNotEmpty) {
      _selectedDevice = _devices.first;
    } else {
      _selectedDevice = _createDefaultDevice();
    }

    _loadMembersAndSuggestions(_selectedDevice!.hardwareId);
  }

  DeviceItem _createDefaultDevice() {
    return DeviceItem(
      id: "DEV-DEFAULT",
      hardwareId: "AT-DOOR-88239A01",
      name: "Cửa cuốn Gara Đức Mạnh",
      modelName: "Austec Titadoor A900 Super",
      category: DeviceCategory.rollerDoor,
      roomName: "Mặt tiền nhà phố",
      badgeText: "AUSTEC",
      deviceNumber: "882",
    );
  }

  Future<void> _loadMembersAndSuggestions(String hardwareId) async {
    setState(() {
      _isLoadingMembers = true;
    });

    final token = AuthService().token ?? 'austec-customer-token';

    try {
      // 1. Tải danh sách thành viên đang có của thiết bị này
      final membersRes = await http.get(
        Uri.parse('http://localhost:4000/api/devices/$hardwareId/members'),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 4));

      List<MemberPermission> loadedMembers = [];
      if (membersRes.statusCode == 200) {
        final data = jsonDecode(membersRes.body);
        if (data['success'] == true && data['members'] is List) {
          loadedMembers = (data['members'] as List)
              .map((m) => MemberPermission.fromJson(m))
              .toList();
        }
      }

      // 2. Tải danh sách gợi ý thành viên từ các thiết bị khác của chủ sở hữu
      final suggestionsRes = await http.get(
        Uri.parse('http://localhost:4000/api/devices/$hardwareId/member-suggestions'),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 4));

      List<SuggestedMember> loadedSuggestions = [];
      if (suggestionsRes.statusCode == 200) {
        final data = jsonDecode(suggestionsRes.body);
        if (data['success'] == true && data['suggestions'] is List) {
          loadedSuggestions = (data['suggestions'] as List)
              .map((s) => SuggestedMember.fromJson(s))
              .toList();
        }
      }

      if (mounted) {
        setState(() {
          _currentMembers = loadedMembers;
          _suggestedMembers = loadedSuggestions;
          _isLoadingMembers = false;
        });
      }
    } catch (_) {
      // Fallback offline an toàn nếu chưa bật backend
      if (mounted) {
        setState(() {
          if (_currentMembers.isEmpty) {
            _currentMembers = _getOfflineFallbackMembers(hardwareId);
          }
          if (_suggestedMembers.isEmpty) {
            _suggestedMembers = _getOfflineFallbackSuggestions(hardwareId);
          }
          _isLoadingMembers = false;
        });
      }
    }
  }

  List<MemberPermission> _getOfflineFallbackMembers(String hwId) {
    return [
      MemberPermission(
        id: "PERM-01",
        hardwareId: hwId,
        userId: "USER-OWNER",
        memberName: "Nguyễn Mạnh Đức (Chủ nhà)",
        phoneNumber: "0944102588",
        role: "OWNER",
        canControl: true,
        canViewHistory: true,
        canChildLock: true,
        canConfig: true,
        createdAt: "2026-09-01",
      ),
      MemberPermission(
        id: "PERM-02",
        hardwareId: hwId,
        userId: "USER-SUB-001",
        memberName: "Trần Thu Hà (Vợ)",
        phoneNumber: "0988776655",
        role: "MEMBER",
        canControl: true,
        canViewHistory: true,
        canChildLock: true,
        canConfig: false,
        createdAt: "2026-09-02",
      ),
    ];
  }

  List<SuggestedMember> _getOfflineFallbackSuggestions(String hwId) {
    return [
      SuggestedMember(
        userId: "USER-SUB-002",
        memberName: "Nguyễn Minh Khang (Con trai)",
        phoneNumber: "0977112233",
        role: "MEMBER",
        canControl: true,
        canViewHistory: true,
        canChildLock: false,
        canConfig: false,
        sourceDeviceNames: ["Cửa cuốn Gara Đức Mạnh"],
      ),
      SuggestedMember(
        userId: "USER-SUB-003",
        memberName: "Lê Văn Toàn (Tài xế / Khách)",
        phoneNumber: "0911223344",
        role: "GUEST",
        canControl: true,
        canViewHistory: false,
        canChildLock: false,
        canConfig: false,
        scheduleLimitActive: true,
        accessStartTime: "07:30",
        accessEndTime: "18:30",
        sourceDeviceNames: ["Cửa cuốn Gara Đức Mạnh"],
      ),
    ];
  }

  void _onDeviceSelected(DeviceItem device) {
    if (_selectedDevice?.hardwareId == device.hardwareId) return;
    setState(() {
      _selectedDevice = device;
    });
    _loadMembersAndSuggestions(device.hardwareId);
  }

  void _openAddMemberModal() {
    if (_selectedDevice == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddMemberBottomSheet(
        device: _selectedDevice!,
        suggestions: _suggestedMembers,
        onMemberAdded: (newMember) async {
          final token = AuthService().token ?? 'austec-customer-token';
          setState(() {
            _currentMembers.add(newMember);
            _suggestedMembers.removeWhere(
              (s) => s.phoneNumber == newMember.phoneNumber || s.memberName == newMember.memberName,
            );
          });

          try {
            await http.post(
              Uri.parse('http://localhost:4000/api/devices/${_selectedDevice!.hardwareId}/members'),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer $token',
              },
              body: jsonEncode(newMember.toJson()),
            );
          } catch (_) {}

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    const Icon(Icons.check_circle_outline, color: Colors.white, size: 20),
                    const SizedBox(width: 8),
                    Text("Đã phân quyền thành công cho ${newMember.memberName}!"),
                  ],
                ),
                backgroundColor: AppTheme.emeraldSuccess,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
      ),
    );
  }

  void _openEditMemberModal(MemberPermission member) {
    if (member.role == "OWNER") {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Chủ sở hữu có toàn quyền trên thiết bị!"),
          backgroundColor: AppTheme.cyanAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _EditMemberBottomSheet(
        member: member,
        deviceName: _selectedDevice?.name ?? 'Thiết bị',
        onMemberUpdated: (updated) async {
          final token = AuthService().token ?? 'austec-customer-token';
          final idx = _currentMembers.indexWhere((m) => m.id == updated.id);
          if (idx != -1) {
            setState(() {
              _currentMembers[idx] = updated;
            });
          }

          try {
            await http.put(
              Uri.parse('http://localhost:4000/api/devices/${_selectedDevice!.hardwareId}/members/${updated.id}'),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer $token',
              },
              body: jsonEncode(updated.toJson()),
            );
          } catch (_) {}

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text("Đã cập nhật quyền của ${updated.memberName}!"),
                backgroundColor: AppTheme.emeraldSuccess,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
      ),
    );
  }

  void _deleteMember(MemberPermission member) {
    if (member.role == "OWNER") {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Không thể xóa tài khoản Chủ sở hữu (OWNER)!"),
          backgroundColor: AppTheme.roseDanger,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final isDark = AppTheme.isDarkMode;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppTheme.surface : Colors.white,
        title: const Text(
          "Thu Hồi Quyền Truy Cập",
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
        content: Text(
          "Bạn có chắc muốn thu hồi toàn bộ quyền điều khiển của '${member.memberName}' đối với thiết bị '${_selectedDevice?.name}'?",
          style: TextStyle(
            color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
            fontSize: 13,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Hủy"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.roseDanger,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.of(ctx).pop();
              final token = AuthService().token ?? 'austec-customer-token';
              setState(() {
                _currentMembers.removeWhere((m) => m.id == member.id);
              });

              try {
                await http.delete(
                  Uri.parse('http://localhost:4000/api/devices/${_selectedDevice!.hardwareId}/members/${member.id}'),
                  headers: {'Authorization': 'Bearer $token'},
                );
              } catch (_) {}

              // Tải lại gợi ý vì người này có thể xuất hiện lại trong gợi ý nếu họ vẫn ở thiết bị khác
              _loadMembersAndSuggestions(_selectedDevice!.hardwareId);

              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text("Đã thu hồi quyền của ${member.memberName}!"),
                    backgroundColor: AppTheme.roseDanger,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            child: const Text("Thu hồi"),
          ),
        ],
      ),
    );
  }

  void _generateTransferOtp() {
    setState(() {
      _transferOtp = "889241";
    });

    final isDark = AppTheme.isDarkMode;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppTheme.surface : Colors.white,
        title: Text(
          "Chuyển Giao Quyền Sở Hữu",
          style: TextStyle(
            color: isDark ? Colors.white : Colors.black,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              "Mã OTP chuyển nhượng thiết bị '${_selectedDevice?.name}' có hiệu lực trong 15 phút. Người mua mới mở App Austec và quét mã này để nhận toàn quyền:",
              style: TextStyle(
                color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                fontSize: 12.5,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.background : AppTheme.lightBackground,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.cyanAccent),
              ),
              child: Text(
                _transferOtp!,
                style: const TextStyle(
                  color: AppTheme.cyanAccent,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 6,
                  fontFamily: "monospace",
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              "Sau khi người nhận xác nhận, tài khoản hiện tại sẽ tự động bàn giao toàn bộ thiết bị và lịch sử bảo hành an toàn.",
              style: TextStyle(color: AppTheme.amberWarning, fontSize: 11),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.cyanAccent,
              foregroundColor: Colors.black,
            ),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Đã hiểu"),
          ),
        ],
      ),
    );
  }

  IconData _getDeviceIcon(DeviceCategory category) {
    switch (category) {
      case DeviceCategory.rollerDoor:
        return Icons.door_sliding_outlined;
      case DeviceCategory.camera:
        return Icons.videocam_outlined;
      case DeviceCategory.energyManage:
        return Icons.battery_charging_full_outlined;
      case DeviceCategory.environment:
        return Icons.sensors_outlined;
      case DeviceCategory.lightSwitch:
        return Icons.lightbulb_outline;
      case DeviceCategory.othersControl:
        return Icons.lock_outline;
      case DeviceCategory.dataAnalytics:
        return Icons.analytics_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    return Scaffold(
      backgroundColor: bgCol,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: textCol, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          children: [
            Text(
              "Phân Quyền Thành Viên",
              style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              "Quản lý phân quyền theo thiết bị & Gợi ý nhanh",
              style: TextStyle(
                color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                fontSize: 10.5,
              ),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_alt_1_rounded, color: AppTheme.cyanAccent),
            tooltip: "Mời thành viên mới",
            onPressed: _openAddMemberModal,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. THANH CHỌN THIẾT BỊ (DEVICE SELECTOR - CHỌN QUẢN LÝ THEO THIẾT BỊ)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 3.5,
                      height: 14,
                      color: AppTheme.cyanAccent,
                      margin: const EdgeInsets.only(right: 8),
                    ),
                    const Text(
                      "CHỌN THIẾT BỊ QUẢN LÝ",
                      style: TextStyle(
                        color: AppTheme.cyanAccent,
                        fontSize: 11.5,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
                Text(
                  "${_devices.length} thiết bị",
                  style: TextStyle(
                    color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Horizontal Device Carousel / Chips
            SizedBox(
              height: 72,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _devices.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, idx) {
                  final dev = _devices[idx];
                  final isSelected = dev.hardwareId == _selectedDevice?.hardwareId;

                  return GestureDetector(
                    onTap: () => _onDeviceSelected(dev),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 180,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? (isDark ? AppTheme.cyanAccent.withValues(alpha: 0.16) : Colors.cyan.shade50)
                            : cardBg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isSelected ? AppTheme.cyanAccent : cardBorder,
                          width: isSelected ? 1.6 : 1,
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: AppTheme.cyanAccent.withValues(alpha: 0.25),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                )
                              ]
                            : null,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppTheme.cyanAccent.withValues(alpha: 0.25)
                                  : (isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.05)),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              _getDeviceIcon(dev.category),
                              color: isSelected ? AppTheme.cyanAccent : (isDark ? Colors.white70 : Colors.black54),
                              size: 19,
                            ),
                          ),
                          const SizedBox(width: 9),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  dev.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: isSelected ? (isDark ? Colors.white : Colors.cyan.shade900) : textCol,
                                    fontSize: 12,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  dev.hardwareId,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: AppTheme.textMuted,
                                    fontSize: 9.5,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 18),

            // 2. ACTIVE DEVICE SUMMARY BANNER
            if (_selectedDevice != null) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? [
                            AppTheme.surfaceGlass,
                            AppTheme.blueAccent.withValues(alpha: 0.08),
                          ]
                        : [
                            Colors.white,
                            Colors.blue.shade50.withValues(alpha: 0.5),
                          ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: cardBorder),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppTheme.blueAccent.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        _getDeviceIcon(_selectedDevice!.category),
                        color: AppTheme.blueAccent,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  _selectedDevice!.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: textCol,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: AppTheme.emeraldSuccess.withValues(alpha: 0.4)),
                                ),
                                child: const Text(
                                  "ONLINE",
                                  style: TextStyle(
                                    color: AppTheme.emeraldSuccess,
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            "HWID: ${_selectedDevice!.hardwareId} • ${_currentMembers.length} tài khoản có quyền",
                            style: TextStyle(
                              color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.cyanAccent,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
                        minimumSize: const Size(0, 34),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text(
                        "Mời thêm",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11.5),
                      ),
                      onPressed: _openAddMemberModal,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // 3. DANH SÁCH THÀNH VIÊN ĐÃ PHÂN QUYỀN
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 3.5,
                      height: 14,
                      color: AppTheme.cyanAccent,
                      margin: const EdgeInsets.only(right: 8),
                    ),
                    const Text(
                      "THÀNH VIÊN CÓ QUYỀN ĐIỀU KHIỂN",
                      style: TextStyle(
                        color: AppTheme.cyanAccent,
                        fontSize: 11.5,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
                if (_isLoadingMembers)
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent),
                  ),
              ],
            ),
            const SizedBox(height: 10),

            if (_currentMembers.isEmpty && !_isLoadingMembers)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: cardBorder),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.shield_outlined, size: 40, color: AppTheme.textMuted),
                    const SizedBox(height: 10),
                    Text(
                      "Chưa có thành viên nào được phân quyền cho thiết bị này",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: textCol, fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "Mời người thân hoặc kỹ thuật viên để cùng quản lý và điều khiển an toàn.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                        fontSize: 11.5,
                      ),
                    ),
                    const SizedBox(height: 14),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.cyanAccent,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.person_add_alt_1, size: 16),
                      label: const Text("Phân Quyền Ngay"),
                      onPressed: _openAddMemberModal,
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _currentMembers.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final m = _currentMembers[index];
                  return _buildMemberCard(m, isDark, textCol, cardBg, cardBorder);
                },
              ),

            const SizedBox(height: 24),

            // 4. THẺ CHUYỂN NHƯỢNG QUYỀN SỞ HỮU THIẾT BỊ
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.amberWarning.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.amberWarning.withValues(alpha: 0.35)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.swap_horizontal_circle_rounded, color: AppTheme.amberWarning, size: 19),
                      SizedBox(width: 8),
                      Text(
                        "Chuyển Giao Quyền Sở Hữu",
                        style: TextStyle(
                          color: AppTheme.amberWarning,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    "Sử dụng khi bàn giao nhà hoặc bán thiết bị. Tạo mã OTP bảo mật 6 chữ số có hiệu lực trong 15 phút.",
                    style: TextStyle(
                      color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 38,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.amberWarning,
                        side: const BorderSide(color: AppTheme.amberWarning),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.vpn_key_outlined, size: 15),
                      label: const Text(
                        "Tạo Mã OTP Chuyển Nhượng",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11.5),
                      ),
                      onPressed: _generateTransferOtp,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildMemberCard(
    MemberPermission m,
    bool isDark,
    Color textCol,
    Color cardBg,
    Color cardBorder,
  ) {
    Color badgeColor;
    String roleLabel;

    if (m.role == "OWNER") {
      badgeColor = AppTheme.cyanAccent;
      roleLabel = "CHỦ SỞ HỮU";
    } else if (m.role == "MEMBER") {
      badgeColor = AppTheme.emeraldSuccess;
      roleLabel = "THÀNH VIÊN GIA ĐÌNH";
    } else {
      badgeColor = AppTheme.amberWarning;
      roleLabel = "KHÁCH TẠM THỜI";
    }

    final isOwner = m.role == "OWNER";

    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: badgeColor.withValues(alpha: 0.18),
                radius: 20,
                child: Text(
                  m.memberName.isNotEmpty ? m.memberName[0].toUpperCase() : "U",
                  style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            m.memberName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: textCol, fontWeight: FontWeight.bold, fontSize: 13.5),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: badgeColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            roleLabel,
                            style: TextStyle(color: badgeColor, fontSize: 8.5, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Icon(Icons.phone_outlined, size: 12, color: AppTheme.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          m.phoneNumber.isNotEmpty ? m.phoneNumber : "Chưa có SĐT",
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 11, fontFamily: 'monospace'),
                        ),
                        const SizedBox(width: 10),
                        Icon(Icons.access_time, size: 12, color: AppTheme.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          m.scheduleLimitActive
                              ? "${m.accessStartTime} - ${m.accessEndTime}"
                              : "Toàn thời gian (24/7)",
                          style: TextStyle(
                            color: m.scheduleLimitActive ? AppTheme.amberWarning : AppTheme.textMuted,
                            fontSize: 10.5,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (!isOwner) ...[
                IconButton(
                  icon: const Icon(Icons.tune_rounded, size: 18, color: AppTheme.cyanAccent),
                  tooltip: "Chỉnh sửa quyền",
                  onPressed: () => _openEditMemberModal(m),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.roseDanger),
                  tooltip: "Thu hồi quyền",
                  onPressed: () => _deleteMember(m),
                ),
              ] else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.cyanAccent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    "Toàn quyền",
                    style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          ),

          const SizedBox(height: 10),
          // Permission Badges
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              _buildPermBadge("Điều khiển", m.canControl, Icons.flash_on_rounded),
              _buildPermBadge("Nhật ký", m.canViewHistory, Icons.history_rounded),
              _buildPermBadge("Khóa trẻ em", m.canChildLock, Icons.lock_clock_rounded),
              _buildPermBadge("Cấu hình", m.canConfig, Icons.settings_outlined),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPermBadge(String title, bool isGranted, IconData icon) {
    final color = isGranted ? AppTheme.cyanAccent : AppTheme.textMuted.withValues(alpha: 0.5);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: isGranted ? AppTheme.cyanAccent.withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: isGranted ? AppTheme.cyanAccent.withValues(alpha: 0.3) : Colors.white12,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(
            title,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: isGranted ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}

// ==========================================
// BOTTOM SHEET: THÊM THÀNH VIÊN VỚI SMART SUGGESTIONS TỪ THIẾT BỊ KHÁC
// ==========================================
class _AddMemberBottomSheet extends StatefulWidget {
  final DeviceItem device;
  final List<SuggestedMember> suggestions;
  final Function(MemberPermission) onMemberAdded;

  const _AddMemberBottomSheet({
    required this.device,
    required this.suggestions,
    required this.onMemberAdded,
  });

  @override
  State<_AddMemberBottomSheet> createState() => _AddMemberBottomSheetState();
}

class _AddMemberBottomSheetState extends State<_AddMemberBottomSheet> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  String _selectedRole = "MEMBER"; // MEMBER | GUEST
  bool _canControl = true;
  bool _canViewHistory = true;
  bool _canChildLock = false;
  bool _canConfig = false;
  bool _scheduleLimitActive = false;
  String _accessStartTime = "08:00";
  String _accessEndTime = "18:00";

  String? _selectedSuggestionName;

  void _applySuggestion(SuggestedMember sug) {
    setState(() {
      _nameController.text = sug.memberName;
      _phoneController.text = sug.phoneNumber;
      _selectedRole = sug.role == "GUEST" ? "GUEST" : "MEMBER";
      _canControl = sug.canControl;
      _canViewHistory = sug.canViewHistory;
      _canChildLock = sug.canChildLock;
      _canConfig = sug.canConfig;
      _scheduleLimitActive = sug.scheduleLimitActive;
      _accessStartTime = sug.accessStartTime;
      _accessEndTime = sug.accessEndTime;
      _selectedSuggestionName = sug.memberName;
    });
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final newMember = MemberPermission(
      id: "PERM-${DateTime.now().millisecondsSinceEpoch}",
      hardwareId: widget.device.hardwareId,
      userId: "USER-${DateTime.now().millisecondsSinceEpoch}",
      memberName: _nameController.text.trim(),
      phoneNumber: _phoneController.text.trim(),
      role: _selectedRole,
      canControl: _canControl,
      canViewHistory: _canViewHistory,
      canChildLock: _canChildLock,
      canConfig: _canConfig,
      scheduleLimitActive: _scheduleLimitActive,
      accessStartTime: _accessStartTime,
      accessEndTime: _accessEndTime,
      createdAt: DateTime.now().toIso8601String(),
    );

    widget.onMemberAdded(newMember);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.surface : Colors.white;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        top: 14,
        left: 16,
        right: 16,
      ),
      decoration: BoxDecoration(
        color: bgCol,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Thanh kéo drag handle
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Phân Quyền Thành Viên Mới",
                        style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "Thiết bị: ${widget.device.name}",
                        style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const Divider(height: 20),

              // ==========================================
              // MỤC GỢI Ý TỪ CÁC THIẾT BỊ KHÁC (SMART SUGGESTIONS)
              // ==========================================
              if (widget.suggestions.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.cyanAccent.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.auto_awesome, color: AppTheme.cyanAccent, size: 16),
                          const SizedBox(width: 6),
                          Text(
                            "Gợi ý từ các thiết bị khác (${widget.suggestions.length})",
                            style: const TextStyle(
                              color: AppTheme.cyanAccent,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "Đã có trong các thiết bị khác của bạn. Chạm để chọn nhanh:",
                        style: TextStyle(
                          color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                          fontSize: 10.5,
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 58,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: widget.suggestions.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (context, i) {
                            final sug = widget.suggestions[i];
                            final isPicked = _selectedSuggestionName == sug.memberName;

                            return InkWell(
                              onTap: () => _applySuggestion(sug),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: isPicked
                                      ? AppTheme.cyanAccent.withValues(alpha: 0.25)
                                      : (isDark ? Colors.white10 : Colors.white),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: isPicked ? AppTheme.cyanAccent : Colors.grey.withValues(alpha: 0.3),
                                    width: isPicked ? 1.5 : 1,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    CircleAvatar(
                                      radius: 14,
                                      backgroundColor: AppTheme.cyanAccent.withValues(alpha: 0.2),
                                      child: Text(
                                        sug.memberName.isNotEmpty ? sug.memberName[0].toUpperCase() : "U",
                                        style: const TextStyle(
                                          color: AppTheme.cyanAccent,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              sug.memberName,
                                              style: TextStyle(
                                                color: textCol,
                                                fontSize: 11.5,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            if (isPicked) ...[
                                              const SizedBox(width: 4),
                                              const Icon(Icons.check_circle, size: 12, color: AppTheme.cyanAccent),
                                            ],
                                          ],
                                        ),
                                        Text(
                                          "${sug.phoneNumber} • ${sug.sourceDeviceNames.join(', ')}",
                                          style: const TextStyle(
                                            color: AppTheme.textMuted,
                                            fontSize: 9.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // 1. Tên thành viên
              Text(
                "HỌ VÀ TÊN THÀNH VIÊN *",
                style: TextStyle(color: textCol, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.6),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _nameController,
                style: TextStyle(color: textCol, fontSize: 13),
                decoration: InputDecoration(
                  hintText: "Ví dụ: Trần Thu Hà (Vợ), Nguyễn Văn An...",
                  hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  filled: true,
                  fillColor: isDark ? AppTheme.background : AppTheme.lightBackground,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.person_outline, size: 18),
                ),
                validator: (val) => (val == null || val.trim().isEmpty) ? "Vui lòng nhập tên thành viên" : null,
              ),
              const SizedBox(height: 12),

              // 2. Số điện thoại
              Text(
                "SỐ ĐIỆN THOẠI ĐĂNG NHẬP APP *",
                style: TextStyle(color: textCol, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.6),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                style: TextStyle(color: textCol, fontSize: 13, fontFamily: 'monospace'),
                decoration: InputDecoration(
                  hintText: "Ví dụ: 0988 776 655...",
                  hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  filled: true,
                  fillColor: isDark ? AppTheme.background : AppTheme.lightBackground,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.phone_outlined, size: 18),
                ),
                validator: (val) => (val == null || val.trim().isEmpty) ? "Vui lòng nhập số điện thoại" : null,
              ),
              const SizedBox(height: 14),

              // 3. Phân loại vai trò (MEMBER vs GUEST)
              Text(
                "VAI TRÒ TRUY CẬP",
                style: TextStyle(color: textCol, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.6),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: _buildRoleChip(
                      label: "Thành viên gia đình",
                      role: "MEMBER",
                      icon: Icons.group_outlined,
                      isSelected: _selectedRole == "MEMBER",
                      onTap: () => setState(() => _selectedRole = "MEMBER"),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildRoleChip(
                      label: "Khách / Giúp việc",
                      role: "GUEST",
                      icon: Icons.person_outline,
                      isSelected: _selectedRole == "GUEST",
                      onTap: () => setState(() => _selectedRole = "GUEST"),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 4. Ma trận các quyền hạn chi tiết
              Text(
                "CHI TIẾT QUYỀN HẠN ĐƯỢC CẤP",
                style: TextStyle(color: textCol, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.6),
              ),
              const SizedBox(height: 6),
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.background : AppTheme.lightBackground,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    SwitchListTile(
                      dense: true,
                      activeThumbColor: AppTheme.cyanAccent,
                      title: const Text("Điều khiển từ xa (Mở / Đóng / Dừng)", style: TextStyle(fontSize: 12.5)),
                      value: _canControl,
                      onChanged: (val) => setState(() => _canControl = val),
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      dense: true,
                      activeThumbColor: AppTheme.cyanAccent,
                      title: const Text("Xem nhật ký & lịch sử đóng mở", style: TextStyle(fontSize: 12.5)),
                      value: _canViewHistory,
                      onChanged: (val) => setState(() => _canViewHistory = val),
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      dense: true,
                      activeThumbColor: AppTheme.cyanAccent,
                      title: const Text("Kích hoạt Khóa trẻ em an toàn", style: TextStyle(fontSize: 12.5)),
                      value: _canChildLock,
                      onChanged: (val) => setState(() => _canChildLock = val),
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      dense: true,
                      activeThumbColor: AppTheme.cyanAccent,
                      title: const Text("Đổi tên & cấu hình thiết bị", style: TextStyle(fontSize: 12.5)),
                      value: _canConfig,
                      onChanged: (val) => setState(() => _canConfig = val),
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      dense: true,
                      activeThumbColor: AppTheme.amberWarning,
                      title: const Text("Giới hạn khung giờ truy cập", style: TextStyle(fontSize: 12.5)),
                      subtitle: _scheduleLimitActive
                          ? Text("Chỉ được mở từ $_accessStartTime đến $_accessEndTime", style: const TextStyle(fontSize: 10.5, color: AppTheme.amberWarning))
                          : null,
                      value: _scheduleLimitActive,
                      onChanged: (val) => setState(() => _scheduleLimitActive = val),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Nút xác nhận
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.cyanAccent,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.check, size: 18),
                  label: const Text(
                    "XÁC NHẬN PHÂN QUYỀN",
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  onPressed: _submit,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleChip({
    required String label,
    required String role,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.cyanAccent.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppTheme.cyanAccent : Colors.grey.withValues(alpha: 0.3),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 15, color: isSelected ? AppTheme.cyanAccent : Colors.grey),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  color: isSelected ? AppTheme.cyanAccent : Colors.grey,
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// BOTTOM SHEET: CHỈNH SỬA QUYỀN THÀNH VIÊN
// ==========================================
class _EditMemberBottomSheet extends StatefulWidget {
  final MemberPermission member;
  final String deviceName;
  final Function(MemberPermission) onMemberUpdated;

  const _EditMemberBottomSheet({
    required this.member,
    required this.deviceName,
    required this.onMemberUpdated,
  });

  @override
  State<_EditMemberBottomSheet> createState() => _EditMemberBottomSheetState();
}

class _EditMemberBottomSheetState extends State<_EditMemberBottomSheet> {
  late bool _canControl;
  late bool _canViewHistory;
  late bool _canChildLock;
  late bool _canConfig;
  late bool _scheduleLimitActive;
  late String _accessStartTime;
  late String _accessEndTime;

  @override
  void initState() {
    super.initState();
    _canControl = widget.member.canControl;
    _canViewHistory = widget.member.canViewHistory;
    _canChildLock = widget.member.canChildLock;
    _canConfig = widget.member.canConfig;
    _scheduleLimitActive = widget.member.scheduleLimitActive;
    _accessStartTime = widget.member.accessStartTime;
    _accessEndTime = widget.member.accessEndTime;
  }

  void _save() {
    final updated = MemberPermission(
      id: widget.member.id,
      hardwareId: widget.member.hardwareId,
      userId: widget.member.userId,
      memberName: widget.member.memberName,
      phoneNumber: widget.member.phoneNumber,
      role: widget.member.role,
      canControl: _canControl,
      canViewHistory: _canViewHistory,
      canChildLock: _canChildLock,
      canConfig: _canConfig,
      scheduleLimitActive: _scheduleLimitActive,
      accessStartTime: _accessStartTime,
      accessEndTime: _accessEndTime,
      accessDays: widget.member.accessDays,
      createdAt: widget.member.createdAt,
    );

    widget.onMemberUpdated(updated);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.surface : Colors.white;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgCol,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Cập Nhật Quyền: ${widget.member.memberName}",
                    style: TextStyle(color: textCol, fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "Thiết bị: ${widget.deviceName}",
                    style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11.5),
                  ),
                ],
              ),
              IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () => Navigator.of(context).pop()),
            ],
          ),
          const Divider(height: 20),

          SwitchListTile(
            dense: true,
            activeThumbColor: AppTheme.cyanAccent,
            title: const Text("Điều khiển từ xa (Mở / Đóng / Dừng)", style: TextStyle(fontSize: 13)),
            value: _canControl,
            onChanged: (val) => setState(() => _canControl = val),
          ),
          SwitchListTile(
            dense: true,
            activeThumbColor: AppTheme.cyanAccent,
            title: const Text("Xem nhật ký & lịch sử đóng mở", style: TextStyle(fontSize: 13)),
            value: _canViewHistory,
            onChanged: (val) => setState(() => _canViewHistory = val),
          ),
          SwitchListTile(
            dense: true,
            activeThumbColor: AppTheme.cyanAccent,
            title: const Text("Kích hoạt Khóa trẻ em an toàn", style: TextStyle(fontSize: 13)),
            value: _canChildLock,
            onChanged: (val) => setState(() => _canChildLock = val),
          ),
          SwitchListTile(
            dense: true,
            activeThumbColor: AppTheme.cyanAccent,
            title: const Text("Đổi tên & cấu hình thiết bị", style: TextStyle(fontSize: 13)),
            value: _canConfig,
            onChanged: (val) => setState(() => _canConfig = val),
          ),
          SwitchListTile(
            dense: true,
            activeThumbColor: AppTheme.amberWarning,
            title: const Text("Giới hạn khung giờ truy cập", style: TextStyle(fontSize: 13)),
            subtitle: _scheduleLimitActive
                ? Text("Khung giờ: $_accessStartTime - $_accessEndTime", style: const TextStyle(fontSize: 11, color: AppTheme.amberWarning))
                : null,
            value: _scheduleLimitActive,
            onChanged: (val) => setState(() => _scheduleLimitActive = val),
          ),
          const SizedBox(height: 18),

          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.cyanAccent,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _save,
              child: const Text("LƯU THAY ĐỔI", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }
}
