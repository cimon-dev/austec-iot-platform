import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../domain/entities/member_permission_entity.dart';

class EditMemberBottomSheet extends StatefulWidget {
  final MemberPermission member;
  final String deviceName;
  final Function(MemberPermission) onMemberUpdated;

  const EditMemberBottomSheet({
    super.key,
    required this.member,
    required this.deviceName,
    required this.onMemberUpdated,
  });

  @override
  State<EditMemberBottomSheet> createState() => _EditMemberBottomSheetState();
}

class _EditMemberBottomSheetState extends State<EditMemberBottomSheet> {
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
