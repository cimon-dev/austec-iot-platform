import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../domain/entities/member_permission_entity.dart';
import '../services/family_sharing_service.dart';

class SelectedUserItem {
  final String userId;
  final String name;
  final String phone;
  final String email;
  final String? avatarUrl;
  bool isChecked;

  SelectedUserItem({
    required this.userId,
    required this.name,
    required this.phone,
    required this.email,
    this.avatarUrl,
    this.isChecked = true,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SelectedUserItem &&
          ((userId.isNotEmpty && userId == other.userId) ||
              (phone.isNotEmpty && phone == other.phone) ||
              (email.isNotEmpty && email == other.email));

  @override
  int get hashCode => (userId.isNotEmpty
          ? userId
          : (phone.isNotEmpty ? phone : email))
      .hashCode;
}

class AddMemberBottomSheet extends StatefulWidget {
  final DeviceItem device;
  final List<SuggestedMember> suggestions;
  final Function(MemberPermission)? onMemberAdded;
  final Function(List<MemberPermission>)? onMembersAdded;

  const AddMemberBottomSheet({
    super.key,
    required this.device,
    required this.suggestions,
    this.onMemberAdded,
    this.onMembersAdded,
  });

  @override
  State<AddMemberBottomSheet> createState() => _AddMemberBottomSheetState();
}

class _AddMemberBottomSheetState extends State<AddMemberBottomSheet> {
  final FamilySharingService _service = FamilySharingService();
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;

  final Set<SelectedUserItem> _selectedUsers = {};
  List<Map<String, dynamic>> _searchResults = [];
  bool _isSearching = false;
  SuggestedMember? _selectedSuggestion;

  bool _canControl = true;
  bool _canViewHistory = true;
  bool _canChildLock = false;
  bool _canConfig = false;
  bool _scheduleLimitActive = false;
  String _accessStartTime = "08:00";
  String _accessEndTime = "18:00";

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _isSearching = false;
      });
      return;
    }

    setState(() => _isSearching = true);
    _debounceTimer = Timer(const Duration(milliseconds: 350), () async {
      final results = await _service.searchUsers(query);
      if (mounted) {
        setState(() {
          _searchResults = results;
          _isSearching = false;
        });
      }
    });
  }

  void _addUserToSelection({
    required String userId,
    required String name,
    required String phone,
    required String email,
    String? avatarUrl,
  }) {
    final item = SelectedUserItem(
      userId: userId,
      name: name.isNotEmpty ? name : (phone.isNotEmpty ? phone : email),
      phone: phone,
      email: email,
      avatarUrl: avatarUrl,
      isChecked: true,
    );
    setState(() {
      _selectedUsers.remove(item);
      _selectedUsers.add(item);
    });
  }

  void _submit() {
    final activeUsers = _selectedUsers.where((u) => u.isChecked).toList();
    if (activeUsers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Vui lòng chọn ít nhất 1 người dùng để phân quyền"),
          backgroundColor: AppTheme.amberWarning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final List<MemberPermission> newMembers = activeUsers.map((u) {
      return MemberPermission(
        id: "PERM-${DateTime.now().millisecondsSinceEpoch}-${u.userId}",
        hardwareId: widget.device.hardwareId,
        userId: u.userId,
        memberName: u.name,
        phoneNumber: u.phone.isNotEmpty ? u.phone : u.email,
        role: "MEMBER",
        canControl: _canControl,
        canViewHistory: _canViewHistory,
        canChildLock: _canChildLock,
        canConfig: _canConfig,
        scheduleLimitActive: _scheduleLimitActive,
        accessStartTime: _accessStartTime,
        accessEndTime: _accessEndTime,
        createdAt: DateTime.now().toIso8601String(),
      );
    }).toList();

    if (widget.onMembersAdded != null) {
      widget.onMembersAdded!(newMembers);
    } else if (widget.onMemberAdded != null) {
      for (final m in newMembers) {
        widget.onMemberAdded!(m);
      }
    }

    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.surface : Colors.white;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final cardBg = isDark ? AppTheme.background : AppTheme.lightBackground;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    final activeCount = _selectedUsers.where((u) => u.isChecked).length;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        top: 12,
        left: 16,
        right: 16,
      ),
      decoration: BoxDecoration(
        color: bgCol,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
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

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Phân Quyền Thành Viên Mới",
                      style: TextStyle(
                          color: textCol,
                          fontSize: 16,
                          fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "Thiết bị: ${widget.device.name}",
                      style: const TextStyle(
                          color: AppTheme.brandBlue,
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const Divider(height: 16),

          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. COMBOBOX GỢI Ý TỪ THIẾT BỊ KHÁC
                  if (widget.suggestions.isNotEmpty) ...[
                    Text(
                      "GỢI Ý TỪ CÁC THIẾT BỊ KHÁC",
                      style: TextStyle(
                        color: isDark ? AppTheme.cyanAccent : AppTheme.brandBlue,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: cardBorder),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<SuggestedMember>(
                          value: _selectedSuggestion,
                          isExpanded: true,
                          hint: const Text(
                            "Chọn nhanh thành viên đã có...",
                            style: TextStyle(
                                color: AppTheme.textMuted, fontSize: 13),
                          ),
                          dropdownColor:
                              isDark ? const Color(0xFF1E222D) : Colors.white,
                          icon: const Icon(Icons.keyboard_arrow_down_rounded),
                          items: widget.suggestions.map((sug) {
                            return DropdownMenuItem<SuggestedMember>(
                              value: sug,
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 12,
                                    backgroundColor: AppTheme.brandBlue
                                        .withValues(alpha: 0.2),
                                    child: Text(
                                      sug.memberName.isNotEmpty
                                          ? sug.memberName[0].toUpperCase()
                                          : "U",
                                      style: const TextStyle(
                                          color: AppTheme.brandBlue,
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      "${sug.memberName} (${sug.phoneNumber})",
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                          color: textCol, fontSize: 12.5),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                          onChanged: (sug) {
                            if (sug != null) {
                              _addUserToSelection(
                                userId: sug.userId,
                                name: sug.memberName,
                                phone: sug.phoneNumber,
                                email: '',
                              );
                              setState(() {
                                _selectedSuggestion = sug;
                              });
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // 2. Ô TÌM KIẾM THEO TÊN, EMAIL, SỐ ĐIỆN THOẠI
                  Text(
                    "TÌM KIẾM NGƯỜI DÙNG",
                    style: TextStyle(
                      color: textCol,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    style: TextStyle(color: textCol, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: "Tìm theo tên, email hoặc số điện thoại...",
                      hintStyle:
                          const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                      filled: true,
                      fillColor: cardBg,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 11),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: cardBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: cardBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide:
                            const BorderSide(color: AppTheme.brandBlue, width: 1.5),
                      ),
                      prefixIcon:
                          const Icon(Icons.search, size: 18, color: Colors.grey),
                      suffixIcon: _isSearching
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppTheme.brandBlue),
                              ),
                            )
                          : (_searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 18),
                                  onPressed: () {
                                    _searchController.clear();
                                    _onSearchChanged('');
                                  },
                                )
                              : null),
                    ),
                  ),

                  // KẾT QUẢ TÌM KIẾM TRỰC TIẾP
                  if (_searchResults.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      constraints: const BoxConstraints(maxHeight: 160),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: cardBorder),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: _searchResults.length,
                        separatorBuilder: (_, __) => Divider(
                            height: 1,
                            color: isDark ? Colors.white10 : Colors.grey[200]),
                        itemBuilder: (context, idx) {
                          final u = _searchResults[idx];
                          final name = (u['full_name'] ??
                                  u['fullName'] ??
                                  u['name'] ??
                                  '')
                              .toString();
                          final phone = (u['phone_number'] ??
                                  u['phoneNumber'] ??
                                  u['phone'] ??
                                  '')
                              .toString();
                          final email = (u['email'] ?? '').toString();
                          final uid = (u['id'] ?? '').toString();

                          final isAlreadySelected = _selectedUsers.any((item) =>
                              (uid.isNotEmpty && item.userId == uid) ||
                              (phone.isNotEmpty && item.phone == phone));

                          return ListTile(
                            dense: true,
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 0),
                            leading: CircleAvatar(
                              radius: 14,
                              backgroundColor: AppTheme.brandBlue
                                  .withValues(alpha: 0.15),
                              child: Text(
                                name.isNotEmpty ? name[0].toUpperCase() : "U",
                                style: const TextStyle(
                                    color: AppTheme.brandBlue,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                            title: Text(
                              name.isNotEmpty ? name : (phone.isNotEmpty ? phone : email),
                              style: TextStyle(
                                  color: textCol,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600),
                            ),
                            subtitle: Text(
                              "$phone ${email.isNotEmpty ? '• $email' : ''}".trim(),
                              style: const TextStyle(
                                  color: AppTheme.textMuted, fontSize: 10),
                            ),
                            trailing: isAlreadySelected
                                ? const Icon(Icons.check_circle_rounded,
                                    color: AppTheme.emeraldSuccess, size: 18)
                                : const Icon(Icons.add_circle_outline_rounded,
                                    color: AppTheme.brandBlue, size: 18),
                            onTap: () {
                              _addUserToSelection(
                                userId: uid,
                                name: name,
                                phone: phone,
                                email: email,
                                avatarUrl: u['avatar_url']?.toString(),
                              );
                            },
                          );
                        },
                      ),
                    ),
                  ],

                  const SizedBox(height: 14),

                  // 3. DANH SÁCH NGƯỜI ĐƯỢC CHỌN VỚI CHECKBOX
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "NGƯỜI ĐƯỢC CHỌN (${_selectedUsers.length})",
                        style: TextStyle(
                          color: textCol,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.6,
                        ),
                      ),
                      if (_selectedUsers.isNotEmpty)
                        TextButton(
                          onPressed: () {
                            setState(() {
                              _selectedUsers.clear();
                              _selectedSuggestion = null;
                            });
                          },
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: const Size(0, 24),
                          ),
                          child: const Text(
                            "Xóa hết",
                            style: TextStyle(
                                color: AppTheme.roseDanger, fontSize: 11),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (_selectedUsers.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: cardBorder),
                      ),
                      child: const Center(
                        child: Text(
                          "Chưa có người dùng nào được chọn",
                          style: TextStyle(
                              color: AppTheme.textMuted, fontSize: 12),
                        ),
                      ),
                    )
                  else
                    Container(
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Column(
                        children: _selectedUsers.map((u) {
                          return CheckboxListTile(
                            dense: true,
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 0),
                            value: u.isChecked,
                            activeColor: AppTheme.brandBlue,
                            onChanged: (val) {
                              setState(() {
                                u.isChecked = val ?? false;
                              });
                            },
                            title: Text(
                              u.name,
                              style: TextStyle(
                                color: textCol,
                                fontSize: 12.5,
                                fontWeight: FontWeight.bold,
                                decoration: u.isChecked
                                    ? TextDecoration.none
                                    : TextDecoration.lineThrough,
                              ),
                            ),
                            subtitle: Text(
                              "${u.phone} ${u.email.isNotEmpty ? '• ${u.email}' : ''}"
                                  .trim(),
                              style: const TextStyle(
                                  color: AppTheme.textMuted, fontSize: 10),
                            ),
                            secondary: IconButton(
                              icon: const Icon(Icons.remove_circle_outline,
                                  size: 18, color: AppTheme.roseDanger),
                              onPressed: () {
                                setState(() {
                                  _selectedUsers.remove(u);
                                });
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                  const SizedBox(height: 16),

                  // 4. MA TRẬN QUYỀN HẠN
                  Text(
                    "QUYỀN HẠN ÁP DỤNG",
                    style: TextStyle(
                      color: textCol,
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
                      border: Border.all(color: cardBorder),
                    ),
                    child: Column(
                      children: [
                        SwitchListTile(
                          dense: true,
                          activeThumbColor: AppTheme.brandBlue,
                          title: const Text(
                              "Điều khiển từ xa (Mở / Đóng / Dừng)",
                              style: TextStyle(fontSize: 12.5)),
                          value: _canControl,
                          onChanged: (val) => setState(() => _canControl = val),
                        ),
                        Divider(
                            height: 1,
                            color: isDark ? Colors.white10 : Colors.grey[200]),
                        SwitchListTile(
                          dense: true,
                          activeThumbColor: AppTheme.brandBlue,
                          title: const Text("Xem nhật ký & lịch sử",
                              style: TextStyle(fontSize: 12.5)),
                          value: _canViewHistory,
                          onChanged: (val) =>
                              setState(() => _canViewHistory = val),
                        ),
                        Divider(
                            height: 1,
                            color: isDark ? Colors.white10 : Colors.grey[200]),
                        SwitchListTile(
                          dense: true,
                          activeThumbColor: AppTheme.brandBlue,
                          title: const Text("Khóa an toàn trẻ em",
                              style: TextStyle(fontSize: 12.5)),
                          value: _canChildLock,
                          onChanged: (val) =>
                              setState(() => _canChildLock = val),
                        ),
                        Divider(
                            height: 1,
                            color: isDark ? Colors.white10 : Colors.grey[200]),
                        SwitchListTile(
                          dense: true,
                          activeThumbColor: AppTheme.brandBlue,
                          title: const Text("Đổi tên & cấu hình thiết bị",
                              style: TextStyle(fontSize: 12.5)),
                          value: _canConfig,
                          onChanged: (val) => setState(() => _canConfig = val),
                        ),
                        Divider(
                            height: 1,
                            color: isDark ? Colors.white10 : Colors.grey[200]),
                        SwitchListTile(
                          dense: true,
                          activeThumbColor: AppTheme.amberWarning,
                          title: const Text("Giới hạn khung giờ truy cập",
                              style: TextStyle(fontSize: 12.5)),
                          subtitle: _scheduleLimitActive
                              ? Text(
                                  "Cho phép điều khiển từ $_accessStartTime đến $_accessEndTime",
                                  style: const TextStyle(
                                      fontSize: 10.5,
                                      color: AppTheme.amberWarning))
                              : null,
                          value: _scheduleLimitActive,
                          onChanged: (val) =>
                              setState(() => _scheduleLimitActive = val),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),

          // Nút xác nhận
          SizedBox(
            width: double.infinity,
            height: 46,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.brandBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.check, size: 18),
              label: Text(
                activeCount > 0
                    ? "LƯU PHÂN QUYỀN ($activeCount NGƯỜI)"
                    : "LƯU PHÂN QUYỀN",
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              onPressed: activeCount > 0 ? _submit : null,
            ),
          ),
        ],
      ),
    );
  }
}
