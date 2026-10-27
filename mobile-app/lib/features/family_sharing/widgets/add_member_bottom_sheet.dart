import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../domain/entities/member_permission_entity.dart';

class AddMemberBottomSheet extends StatefulWidget {
  final DeviceItem device;
  final List<SuggestedMember> suggestions;
  final Function(MemberPermission) onMemberAdded;

  const AddMemberBottomSheet({
    super.key,
    required this.device,
    required this.suggestions,
    required this.onMemberAdded,
  });

  @override
  State<AddMemberBottomSheet> createState() => _AddMemberBottomSheetState();
}

class _AddMemberBottomSheetState extends State<AddMemberBottomSheet> {
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

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

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

              // SMART SUGGESTIONS TỪ THIẾT BỊ KHÁC
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

              // 3. Phân loại vai trò
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

              // 4. Ma trận các quyền hạn
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
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  fontSize: 11,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
