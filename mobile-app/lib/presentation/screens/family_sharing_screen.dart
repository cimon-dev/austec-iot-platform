import 'package:flutter/material.dart';
import '../../core/constants/app_theme.dart';

class FamilyMember {
  final String name;
  final String phone;
  final String austecId;
  String role; // 'ADMIN' | 'MEMBER' | 'GUEST'
  String timeWindow;
  List<String> permissions;

  FamilyMember({
    required this.name,
    required this.phone,
    required this.austecId,
    required this.role,
    this.timeWindow = "Toàn thời gian (24/7)",
    List<String>? permissions,
  }) : permissions = permissions ?? ["Cửa cuốn", "Camera"];
}

class SystemUser {
  final String name;
  final String phone;
  final String austecId;
  final String location;
  final String avatarLetter;

  const SystemUser({
    required this.name,
    required this.phone,
    required this.austecId,
    required this.location,
    required this.avatarLetter,
  });
}

class FamilySharingScreen extends StatefulWidget {
  const FamilySharingScreen({super.key});

  @override
  State<FamilySharingScreen> createState() => _FamilySharingScreenState();
}

class _FamilySharingScreenState extends State<FamilySharingScreen> {
  final List<FamilyMember> _members = [
    FamilyMember(
      name: "Nguyễn Mạnh Đức (Chủ nhà)",
      phone: "0988.xxx.888",
      austecId: "AST-88992",
      role: "ADMIN",
    ),
    FamilyMember(
      name: "Trần Thị Mai (Vợ)",
      phone: "0988.776.655",
      austecId: "AST-10045",
      role: "MEMBER",
    ),
    FamilyMember(
      name: "Nguyễn Tuấn Anh (Con trai)",
      phone: "0905.112.233",
      austecId: "AST-10088",
      role: "MEMBER",
    ),
    FamilyMember(
      name: "Bác Giúp Việc (Khách)",
      phone: "0934.112.233",
      austecId: "AST-10201",
      role: "GUEST",
      timeWindow: "T2-T6: 08:00 - 18:00",
      permissions: ["Cửa cuốn"],
    ),
  ];

  // Danh bạ người dùng hệ thống để tìm kiếm mời thêm
  final List<SystemUser> _systemDirectory = const [
    SystemUser(
      name: "Trần Văn An",
      phone: "0912.345.678",
      austecId: "AST-10023",
      location: "Hà Đông, Hà Nội",
      avatarLetter: "A",
    ),
    SystemUser(
      name: "Lê Thị Mai",
      phone: "0987.654.321",
      austecId: "AST-10045",
      location: "Cầu Giấy, Hà Nội",
      avatarLetter: "M",
    ),
    SystemUser(
      name: "Phạm Hoàng Nam",
      phone: "0903.112.233",
      austecId: "AST-10088",
      location: "Thanh Xuân, Hà Nội",
      avatarLetter: "N",
    ),
    SystemUser(
      name: "Đỗ Minh Trí",
      phone: "0978.998.877",
      austecId: "AST-10112",
      location: "Hai Bà Trưng, Hà Nội",
      avatarLetter: "T",
    ),
    SystemUser(
      name: "Nguyễn Hoàng Long",
      phone: "0934.556.789",
      austecId: "AST-10156",
      location: "Tây Hồ, Hà Nội",
      avatarLetter: "L",
    ),
    SystemUser(
      name: "Vũ Thị Hương",
      phone: "0966.223.344",
      austecId: "AST-10201",
      location: "Đống Đa, Hà Nội",
      avatarLetter: "H",
    ),
  ];

  String? _transferOtp;

  void _openInviteUserModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _InviteUserBottomSheet(
        systemDirectory: _systemDirectory,
        onInviteConfirmed: (newMember) {
          setState(() {
            _members.add(newMember);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Text("Đã gửi lời mời phân quyền thành công cho ${newMember.name}!"),
                ],
              ),
              backgroundColor: AppTheme.emeraldSuccess,
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
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
          style: TextStyle(color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              "Mã OTP chuyển nhượng thiết bị có hiệu lực trong 15 phút. Người mua mới mở App Austec và quét mã này để nhận toàn quyền:",
              style: TextStyle(color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary, fontSize: 12.5),
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
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Đã hiểu"),
          ),
        ],
      ),
    );
  }

  void _removeMember(int index) {
    final member = _members[index];
    if (member.role == "ADMIN") {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Không thể xóa tài khoản Chủ sở hữu (ADMIN)!"),
          backgroundColor: AppTheme.roseDanger,
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surface : Colors.white,
        title: const Text("Xác nhận thu hồi quyền", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: Text("Bạn có chắc chắn muốn thu hồi toàn bộ quyền truy cập của '${member.name}' không?"),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text("Hủy")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.roseDanger, foregroundColor: Colors.white),
            onPressed: () {
              Navigator.of(ctx).pop();
              setState(() {
                _members.removeAt(index);
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text("Đã thu hồi quyền của ${member.name}")),
              );
            },
            child: const Text("Thu hồi"),
          ),
        ],
      ),
    );
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
        // NÚT QUAY VỀ TRANG TRƯỚC (ĐÃ SỬA LỖI THIẾU NÚT QUAY VỀ)
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: textCol, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          "Phân Quyền Thành Viên",
          style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_alt_1_rounded, color: AppTheme.cyanAccent),
            tooltip: "Mời thành viên mới",
            onPressed: _openInviteUserModal,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thẻ Tiêu đề & Nút Mời thêm thành viên
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardBorder),
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AppTheme.blueAccent.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.family_restroom_rounded, color: AppTheme.blueAccent, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Thành Viên & Khách Truy Cập",
                          style: TextStyle(color: textCol, fontSize: 13.5, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          "${_members.length} người đang có quyền điều khiển",
                          style: TextStyle(color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.cyanAccent,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      minimumSize: const Size(0, 34),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text(
                      "Mời thêm",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                    onPressed: _openInviteUserModal,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Danh sách thành viên đang có trong hệ thống
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 8),
              child: Row(
                children: [
                  Container(width: 3.5, height: 14, color: AppTheme.cyanAccent, margin: const EdgeInsets.only(right: 8)),
                  const Text(
                    "DANH SÁCH THÀNH VIÊN",
                    style: TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.6),
                  ),
                ],
              ),
            ),

            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _members.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final m = _members[index];
                return _buildMemberCard(m, index, isDark, textCol, cardBg, cardBorder);
              },
            ),
            const SizedBox(height: 20),

            // Thẻ Chuyển Giao Quyền Sở Hữu Thiết Bị
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.amberWarning.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.amberWarning.withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.swap_horizontal_circle_rounded, color: AppTheme.amberWarning, size: 20),
                      SizedBox(width: 8),
                      Text(
                        "Chuyển Nhượng Toàn Quyền Sở Hữu",
                        style: TextStyle(color: AppTheme.amberWarning, fontWeight: FontWeight.bold, fontSize: 13.5),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    "Sử dụng khi bán nhà hoặc bàn giao lại công trình. Tạo mã bảo mật OTP 6 chữ số để chuyển toàn bộ quyền quản trị trong 15 phút.",
                    style: TextStyle(color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary, fontSize: 11.5),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 40,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.amberWarning,
                        side: const BorderSide(color: AppTheme.amberWarning),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.vpn_key_outlined, size: 16),
                      label: const Text("Tạo Mã OTP Chuyển Giao Quyền", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
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

  Widget _buildMemberCard(FamilyMember m, int index, bool isDark, Color textCol, Color cardBg, Color cardBorder) {
    Color badgeColor;
    String roleLabel;

    if (m.role == "ADMIN") {
      badgeColor = AppTheme.cyanAccent;
      roleLabel = "CHỦ NHÀ (ADMIN)";
    } else if (m.role == "MEMBER") {
      badgeColor = AppTheme.blueAccent;
      roleLabel = "THÀNH VIÊN";
    } else {
      badgeColor = AppTheme.amberWarning;
      roleLabel = "KHÁCH";
    }

    return Container(
      padding: const EdgeInsets.all(14),
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
                  m.name[0],
                  style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold, fontSize: 16),
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
                            m.name,
                            style: TextStyle(color: textCol, fontWeight: FontWeight.bold, fontSize: 13.5),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: badgeColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            roleLabel,
                            style: TextStyle(color: badgeColor, fontSize: 9, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "${m.phone} • ID: ${m.austecId}",
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontFamily: "monospace"),
                    ),
                  ],
                ),
              ),
              if (m.role != "ADMIN")
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.roseDanger, size: 20),
                  tooltip: "Thu hồi quyền",
                  onPressed: () => _removeMember(index),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Divider(color: cardBorder, height: 1),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.access_time_rounded, size: 13, color: AppTheme.textMuted),
                  const SizedBox(width: 4),
                  Text(
                    m.timeWindow,
                    style: TextStyle(color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary, fontSize: 11),
                  ),
                ],
              ),
              Wrap(
                spacing: 4,
                children: m.permissions.map((p) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.cyanAccent.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      p,
                      style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 9.5, fontWeight: FontWeight.bold),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// Bottom Sheet tìm kiếm và mời người dùng từ danh bạ hệ thống
class _InviteUserBottomSheet extends StatefulWidget {
  final List<SystemUser> systemDirectory;
  final ValueChanged<FamilyMember> onInviteConfirmed;

  const _InviteUserBottomSheet({
    required this.systemDirectory,
    required this.onInviteConfirmed,
  });

  @override
  State<_InviteUserBottomSheet> createState() => _InviteUserBottomSheetState();
}

class _InviteUserBottomSheetState extends State<_InviteUserBottomSheet> {
  final TextEditingController _searchController = TextEditingController();
  SystemUser? _selectedUser;
  String _selectedRole = "MEMBER"; // 'MEMBER' | 'GUEST'
  bool _canControlDoor = true;
  bool _canViewCamera = true;
  bool _canViewHistory = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final cardBg = isDark ? AppTheme.surface : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    final query = _searchController.text.trim().toLowerCase();
    final filteredUsers = widget.systemDirectory.where((u) {
      if (query.isEmpty) return true;
      return u.name.toLowerCase().contains(query) ||
          u.phone.contains(query) ||
          u.austecId.toLowerCase().contains(query);
    }).toList();

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      padding: EdgeInsets.only(
        top: 16,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.surfaceDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: cardBorder, width: 1.5)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? AppTheme.textMuted : Colors.grey[400],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Mời Người Dùng Vào Hệ Thống",
                style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Search Bar
          TextField(
            controller: _searchController,
            onChanged: (_) => setState(() {}),
            style: TextStyle(color: textCol, fontSize: 13.5),
            decoration: InputDecoration(
              hintText: "Tìm theo SĐT, Họ tên hoặc Austec ID...",
              hintStyle: TextStyle(color: isDark ? AppTheme.textMuted : Colors.grey, fontSize: 12.5),
              prefixIcon: const Icon(Icons.search, color: AppTheme.cyanAccent, size: 20),
              suffixIcon: query.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {});
                      },
                    )
                  : null,
              filled: true,
              fillColor: isDark ? AppTheme.surface.withValues(alpha: 0.6) : Colors.grey[100],
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: cardBorder)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: cardBorder)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.cyanAccent)),
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
          const SizedBox(height: 12),

          // Danh sách kết quả tìm kiếm
          Flexible(
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: filteredUsers.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final user = filteredUsers[index];
                final isChosen = _selectedUser?.austecId == user.austecId;

                return InkWell(
                  onTap: () {
                    setState(() {
                      _selectedUser = user;
                    });
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: isChosen ? AppTheme.cyanAccent.withValues(alpha: 0.12) : cardBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isChosen ? AppTheme.cyanAccent : cardBorder,
                        width: isChosen ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: isChosen ? AppTheme.cyanAccent : (isDark ? AppTheme.cardBorder : Colors.grey[300]),
                          foregroundColor: isChosen ? Colors.black : textCol,
                          radius: 18,
                          child: Text(user.avatarLetter, style: const TextStyle(fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(user.name, style: TextStyle(color: textCol, fontWeight: FontWeight.bold, fontSize: 13)),
                              Text("${user.phone} • ${user.location}", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.cyanAccent.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            user.austecId,
                            style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontFamily: "monospace", fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          if (_selectedUser != null) ...[
            const SizedBox(height: 14),
            Divider(color: cardBorder, height: 1),
            const SizedBox(height: 10),

            // Chọn vai trò
            Text("Chọn vai trò cho ${_selectedUser!.name}:", style: TextStyle(color: textCol, fontSize: 12.5, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Text("Thành viên gia đình (24/7)"),
                    selected: _selectedRole == "MEMBER",
                    onSelected: (val) => setState(() => _selectedRole = "MEMBER"),
                    selectedColor: AppTheme.blueAccent.withValues(alpha: 0.25),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Text("Khách theo giờ"),
                    selected: _selectedRole == "GUEST",
                    onSelected: (val) => setState(() => _selectedRole = "GUEST"),
                    selectedColor: AppTheme.amberWarning.withValues(alpha: 0.25),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Chọn quyền hạn
            Wrap(
              spacing: 8,
              children: [
                FilterChip(
                  label: const Text("Cửa cuốn"),
                  selected: _canControlDoor,
                  onSelected: (v) => setState(() => _canControlDoor = v),
                ),
                FilterChip(
                  label: const Text("Camera an ninh"),
                  selected: _canViewCamera,
                  onSelected: (v) => setState(() => _canViewCamera = v),
                ),
                FilterChip(
                  label: const Text("Xem lịch sử"),
                  selected: _canViewHistory,
                  onSelected: (v) => setState(() => _canViewHistory = v),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Nút Xác nhận gửi lời mời
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.cyanAccent,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.send_rounded, size: 16),
                label: Text(
                  "GỬI LỜI MỜI CHO ${_selectedUser!.name.toUpperCase()}",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5),
                ),
                onPressed: () {
                  final perms = <String>[];
                  if (_canControlDoor) perms.add("Cửa cuốn");
                  if (_canViewCamera) perms.add("Camera");
                  if (_canViewHistory) perms.add("Lịch sử");

                  final member = FamilyMember(
                    name: _selectedUser!.name,
                    phone: _selectedUser!.phone,
                    austecId: _selectedUser!.austecId,
                    role: _selectedRole,
                    timeWindow: _selectedRole == "MEMBER" ? "Toàn thời gian (24/7)" : "T2-T6: 08:00 - 18:00",
                    permissions: perms,
                  );

                  widget.onInviteConfirmed(member);
                  Navigator.of(context).pop();
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}
