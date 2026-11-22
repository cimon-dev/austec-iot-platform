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
      final matches = _devices.where((d) => d.hardwareId == widget.initialHardwareId);
      _selectedDevice = matches.isNotEmpty ? matches.first : (_devices.isNotEmpty ? _devices.first : null);
    } else if (_devices.isNotEmpty) {
      _selectedDevice = _devices.first;
    } else {
      _selectedDevice = null;
    }

    if (_selectedDevice != null) {
      _loadMembersAndSuggestions(_selectedDevice!.hardwareId);
    }
  }

  Future<void> _loadMembersAndSuggestions(String hardwareId) async {
    setState(() => _isLoadingMembers = true);

    final loadedMembers = await _service.getMembers(hardwareId);
    final loadedSuggestions = await _service.getSuggestions(hardwareId);

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
        onMembersAdded: (newMembers) async {
          setState(() {
            _currentMembers.addAll(newMembers);
            final addedNames = newMembers.map((m) => m.memberName).toSet();
            final addedPhones = newMembers.map((m) => m.phoneNumber).toSet();
            _suggestedMembers.removeWhere(
              (s) => addedPhones.contains(s.phoneNumber) || addedNames.contains(s.memberName),
            );
          });

          for (final m in newMembers) {
            await _service.addMember(_selectedDevice!.hardwareId, m);
          }
          _loadMembersAndSuggestions(_selectedDevice!.hardwareId);

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text("Đã phân quyền thành công cho ${newMembers.length} thành viên!"),
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
          _loadMembersAndSuggestions(_selectedDevice!.hardwareId);

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

  Future<void> _generateTransferOtp() async {
    if (_selectedDevice == null) return;
    final res = await _service.createTransferOtp(_selectedDevice!.hardwareId);
    if (!mounted) return;
    if (res != null && res['otpCode'] != null) {
      setState(() => _transferOtp = res['otpCode'].toString());
      _showTransferOtpDialog();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Không thể tạo mã OTP. Vui lòng kiểm tra lại quyền Chủ sở hữu."),
          backgroundColor: AppTheme.amberWarning,
        ),
      );
    }
  }

  void _showTransferOtpDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surface : Colors.white,
        title: const Text("Chuyển Giao Quyền Sở Hữu", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text("Mã OTP chuyển nhượng thiết bị '${_selectedDevice?.name}' có hiệu lực trong 15 phút. Người nhận nhập mã này để tiếp quản quyền sở hữu:"),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.cyanAccent),
              ),
              child: Text(
                _transferOtp ?? "------",
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
          TextButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              if (_selectedDevice != null) {
                await _service.cancelTransferOtp(_selectedDevice!.hardwareId);
                setState(() => _transferOtp = null);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Đã hủy mã OTP chuyển giao thiết bị!"),
                      backgroundColor: AppTheme.roseDanger,
                    ),
                  );
                }
              }
            },
            child: const Text("Hủy mã OTP", style: TextStyle(color: AppTheme.roseDanger)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.brandBlue, foregroundColor: Colors.white),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Đã hiểu"),
          ),
        ],
      ),
    );
  }

  void _openClaimDeviceDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surface : Colors.white,
        title: const Text("Tiếp Nhận Thiết Bị Bằng OTP", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text("Nhập mã OTP 6 chữ số do Chủ sở hữu cũ cung cấp để tiếp quản quyền sở hữu:"),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.bold),
              decoration: const InputDecoration(
                hintText: "000000",
                counterText: "",
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text("Hủy")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.emeraldSuccess, foregroundColor: Colors.white),
            onPressed: () async {
              final code = controller.text.trim();
              if (code.length < 6) return;
              Navigator.of(ctx).pop();
              final res = await _service.claimDeviceByOtp(code);
              if (mounted) {
                if (res != null && res['success'] == true) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(res['message'] ?? "Chúc mừng! Tiếp nhận quyền sở hữu thành công!"),
                      backgroundColor: AppTheme.emeraldSuccess,
                    ),
                  );
                  await _gateway.fetchDevicesFromBackend();
                  _initDeviceList();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Mã OTP không hợp lệ hoặc đã hết hạn (15 phút)!"),
                      backgroundColor: AppTheme.roseDanger,
                    ),
                  );
                }
              }
            },
            child: const Text("Xác nhận"),
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

    if (_selectedDevice == null || _devices.isEmpty) {
      return Scaffold(
        backgroundColor: bgCol,
        appBar: AppBar(
          title: const Text("Phân Quyền Thành Viên", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          centerTitle: true,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.family_restroom_rounded, size: 64, color: (isDark ? AppTheme.textMuted : Colors.grey).withValues(alpha: 0.5)),
                const SizedBox(height: 16),
                Text(
                  "Chưa có thiết bị nào để chia sẻ",
                  style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  "Vui lòng kết nối hoặc thêm thiết bị trước khi phân quyền cho thành viên gia đình.",
                  style: TextStyle(color: isDark ? AppTheme.textMuted : AppTheme.lightTextSecondary, fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: bgCol,
      appBar: AppBar(
        title: const Text("Phân Quyền Thành Viên", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.key_rounded, color: AppTheme.cyanAccent),
            tooltip: "Tiếp nhận thiết bị bằng mã OTP",
            onPressed: _openClaimDeviceDialog,
          ),
          if (_selectedDevice?.isOwner == true)
            IconButton(
              icon: const Icon(Icons.person_add_alt_1_rounded, color: AppTheme.brandBlue),
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
            // Device Dropdown / Combobox
            Text(
              "CHỌN THIẾT BỊ PHÂN QUYỀN",
              style: TextStyle(
                color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cardBorder, width: 1.2),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<DeviceItem>(
                  value: _selectedDevice != null &&
                          _devices.any((d) => d.hardwareId == _selectedDevice!.hardwareId)
                      ? _devices.firstWhere((d) => d.hardwareId == _selectedDevice!.hardwareId)
                      : (_devices.isNotEmpty ? _devices.first : null),
                  isExpanded: true,
                  dropdownColor: isDark ? const Color(0xFF1E222D) : Colors.white,
                  icon: Icon(Icons.keyboard_arrow_down_rounded, color: textCol),
                  items: _devices.map((dev) {
                    return DropdownMenuItem<DeviceItem>(
                      value: dev,
                      child: Row(
                        children: [
                          Icon(_getDeviceIcon(dev.category),
                              color: AppTheme.brandBlue, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              "${dev.name} (${dev.hardwareId})",
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: textCol,
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                  onChanged: (newDev) {
                    if (newDev != null) _onDeviceSelected(newDev);
                  },
                ),
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
                    onEdit: _selectedDevice?.isOwner == true ? () => _openEditMemberModal(m) : null,
                    onDelete: _selectedDevice?.isOwner == true ? () => _deleteMember(m) : null,
                  );
                },
              ),

            // Transfer Ownership Button (CHỈ HIỂN THỊ KHI LÀ CHỦ SỞ HỮU OWNER)
            if (_selectedDevice?.isOwner == true) ...[
              const SizedBox(height: 24),
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
          ],
        ),
      ),
    );
  }
}
