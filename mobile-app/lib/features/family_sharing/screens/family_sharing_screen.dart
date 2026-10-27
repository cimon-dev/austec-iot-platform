import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../domain/entities/member_permission_entity.dart';
import '../services/family_sharing_service.dart';
import '../widgets/member_permission_card.dart';
import '../widgets/add_member_bottom_sheet.dart';
import '../widgets/edit_member_bottom_sheet.dart';

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
  final FamilySharingService _service = FamilySharingService();

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
    setState(() => _isLoadingMembers = true);

    var loadedMembers = await _service.getMembers(hardwareId);
    var loadedSuggestions = await _service.getSuggestions(hardwareId);

    if (loadedMembers.isEmpty) {
      loadedMembers = _service.getOfflineFallbackMembers(hardwareId);
    }
    if (loadedSuggestions.isEmpty) {
      loadedSuggestions = _service.getOfflineFallbackSuggestions(hardwareId);
    }

    if (mounted) {
      setState(() {
        _currentMembers = loadedMembers;
        _suggestedMembers = loadedSuggestions;
        _isLoadingMembers = false;
      });
    }
  }

  void _onDeviceSelected(DeviceItem device) {
    if (_selectedDevice?.hardwareId == device.hardwareId) return;
    setState(() => _selectedDevice = device);
    _loadMembersAndSuggestions(device.hardwareId);
  }

  void _openAddMemberModal() {
    if (_selectedDevice == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AddMemberBottomSheet(
        device: _selectedDevice!,
        suggestions: _suggestedMembers,
        onMemberAdded: (newMember) async {
          setState(() {
            _currentMembers.add(newMember);
            _suggestedMembers.removeWhere(
              (s) => s.phoneNumber == newMember.phoneNumber || s.memberName == newMember.memberName,
            );
          });

          await _service.addMember(_selectedDevice!.hardwareId, newMember);

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text("Đã phân quyền thành công cho ${newMember.memberName}!"),
                backgroundColor: AppTheme.emeraldSuccess,
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
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => EditMemberBottomSheet(
        member: member,
        deviceName: _selectedDevice?.name ?? 'Thiết bị',
        onMemberUpdated: (updated) async {
          final idx = _currentMembers.indexWhere((m) => m.id == updated.id);
          if (idx != -1) {
            setState(() => _currentMembers[idx] = updated);
          }

          await _service.updateMember(_selectedDevice!.hardwareId, updated);

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text("Đã cập nhật quyền của ${updated.memberName}!"),
                backgroundColor: AppTheme.emeraldSuccess,
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
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surface : Colors.white,
        title: const Text("Thu Hồi Quyền Truy Cập", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: Text("Bạn có chắc muốn thu hồi toàn bộ quyền của '${member.memberName}'?"),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text("Hủy")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.roseDanger, foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.of(ctx).pop();
              setState(() => _currentMembers.removeWhere((m) => m.id == member.id));

              await _service.revokeMember(_selectedDevice!.hardwareId, member.id);
              _loadMembersAndSuggestions(_selectedDevice!.hardwareId);

              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text("Đã thu hồi quyền của ${member.memberName}!"),
                    backgroundColor: AppTheme.roseDanger,
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
    setState(() => _transferOtp = "889241");

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surface : Colors.white,
        title: const Text("Chuyển Giao Quyền Sở Hữu", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text("Mã OTP chuyển nhượng thiết bị '${_selectedDevice?.name}' có hiệu lực trong 15 phút:"),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.background,
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
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
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
      default:
        return Icons.devices_other;
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
        title: const Text("Phân Quyền Thành Viên", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_alt_1_rounded, color: AppTheme.cyanAccent),
            tooltip: "Mời thành viên mới",
            onPressed: _openAddMemberModal,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Device Horizontal Carousel
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
                    child: Container(
                      width: 180,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isSelected ? AppTheme.cyanAccent.withValues(alpha: 0.16) : cardBg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isSelected ? AppTheme.cyanAccent : cardBorder,
                          width: isSelected ? 1.6 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(_getDeviceIcon(dev.category), color: isSelected ? AppTheme.cyanAccent : Colors.grey, size: 24),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(dev.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: textCol, fontWeight: FontWeight.bold, fontSize: 12)),
                                Text(dev.hardwareId, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10, fontFamily: 'monospace')),
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
            const SizedBox(height: 20),

            // Members List
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("THÀNH VIÊN CÓ QUYỀN", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                if (_isLoadingMembers)
                  const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent)),
              ],
            ),
            const SizedBox(height: 10),

            if (_currentMembers.isEmpty && !_isLoadingMembers)
              const Center(child: Padding(padding: EdgeInsets.all(20), child: Text("Chưa có thành viên nào", style: TextStyle(color: AppTheme.textMuted))))
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _currentMembers.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final m = _currentMembers[index];
                  return MemberPermissionCard(
                    member: m,
                    isDark: isDark,
                    textCol: textCol,
                    cardBg: cardBg,
                    cardBorder: cardBorder,
                    onEdit: () => _openEditMemberModal(m),
                    onDelete: () => _deleteMember(m),
                  );
                },
              ),

            const SizedBox(height: 24),

            // Transfer Ownership Button
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
                  const Text("Chuyển Giao Quyền Sở Hữu", style: TextStyle(color: AppTheme.amberWarning, fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 6),
                  const Text("Tạo mã OTP chuyển nhượng thiết bị khi bán nhà hoặc bàn giao.", style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 38,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(foregroundColor: AppTheme.amberWarning, side: const BorderSide(color: AppTheme.amberWarning)),
                      icon: const Icon(Icons.vpn_key_outlined, size: 15),
                      label: const Text("Tạo Mã OTP Chuyển Nhượng"),
                      onPressed: _generateTransferOtp,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
