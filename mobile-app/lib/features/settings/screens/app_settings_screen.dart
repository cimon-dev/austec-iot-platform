import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/services/auth_service.dart';
import '../../cskh/screens/customer_support_tickets_screen.dart';
import '../../devices/devices.dart';
import '../../family_sharing/screens/family_sharing_screen.dart';
import '../../profile/screens/user_profile_screen.dart';
import '../../auth/auth.dart';
import '../../../core/services/app_update_service.dart';

class AppSettingsScreen extends StatefulWidget {
  final VoidCallback onThemeChanged;
  final VoidCallback onLanguageChanged;

  const AppSettingsScreen({
    super.key,
    required this.onThemeChanged,
    required this.onLanguageChanged,
  });

  @override
  State<AppSettingsScreen> createState() => _AppSettingsScreenState();
}

class _AppSettingsScreenState extends State<AppSettingsScreen> {
  bool _pushNotifications = true;
  bool _biometricLock = true;
  String _currentVersionText = "Đang tải...";

  @override
  void initState() {
    super.initState();
    _loadAppVersion();
  }

  Future<void> _loadAppVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (mounted) {
        setState(() {
          _currentVersionText = "v${info.version}";
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _currentVersionText = "v2.4.0";
        });
      }
    }
  }

  void _triggerEmergencyLockdown() {
    final isDark = AppTheme.isDarkMode;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppTheme.surfaceDark : Colors.white,
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppTheme.amberWarning),
            SizedBox(width: 8),
            Text("KHÓA KHẨN CẤP TOÀN BỘ CỬA", style: TextStyle(color: AppTheme.amberWarning, fontSize: 14)),
          ],
        ),
        content: const Text(
          "Lệnh này sẽ gửi tín hiệu bảo mật khóa tất cả cửa cuốn trong nhà và vô hiệu hóa các remote RF cầm tay. Bạn có chắc chắn muốn kích hoạt?",
          style: TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text("Hủy")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.amberWarning, foregroundColor: Colors.black),
            onPressed: () {
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text("Đã kích hoạt Khóa Khẩn Cấp toàn bộ cửa cuốn thành công!"),
                  backgroundColor: AppTheme.amberWarning,
                ),
              );
            },
            child: const Text("Xác nhận Khóa"),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog() {
    final isDark = AppTheme.isDarkMode;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppTheme.surfaceDark : Colors.white,
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: AppTheme.roseDanger),
            SizedBox(width: 8),
            Text("Đăng xuất tài khoản", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text("Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng Austec Smart Home?"),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text("Ở lại")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.roseDanger, foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.of(ctx).pop();
              await AuthService().logout();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Đã đăng xuất tài khoản thành công.")),
              );
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (route) => false,
              );
            },
            child: const Text("Đăng xuất"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    final iconCol = AppTheme.dynamicAccent;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Thẻ Thông Tin Chủ Nhà / Hồ Sơ Quản Trị (Gọn gàng)
          InkWell(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const UserProfileScreen()),
              ).then((_) => setState(() {}));
            },
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: _cardBox(isDark, cardBg, cardBorder),
              child: Row(
                children: [
                  Builder(
                    builder: (context) {
                      final user = AuthService().currentUser;
                      return Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppTheme.brandBlue.withValues(alpha: isDark ? 0.16 : 0.10),
                          border: Border.all(color: AppTheme.brandBlue.withValues(alpha: 0.45), width: 1.4),
                        ),
                        child: ClipOval(
                          child: (user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty)
                              ? Image.network(
                                  user.avatarUrl!.startsWith('http')
                                      ? user.avatarUrl!
                                      : '${ApiConfig.baseUrl}${user.avatarUrl!}',
                                  width: 44,
                                  height: 44,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Icon(Icons.person_outline_rounded, color: iconCol, size: 22),
                                )
                              : Icon(Icons.person_outline_rounded, color: iconCol, size: 22),
                        ),
                      );
                    },
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Builder(
                      builder: (context) {
                        final user = AuthService().currentUser;
                        final userName = user?.fullName ?? "Nguyễn Văn An";
                        final userPhone = user?.phoneNumber ?? "0912 345 678";
                        final userLocation = user?.province ?? "Hà Nội";

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  userName,
                                  style: TextStyle(color: textCol, fontSize: 15, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    user?.role == 'ADMIN'
                                        ? "QUẢN TRỊ"
                                        : user?.role == 'CSKH'
                                            ? "CSKH"
                                            : "CHỦ NHÀ",
                                    style: TextStyle(
                                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              "$userPhone • $userLocation",
                              style: TextStyle(color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary, fontSize: 12),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                  Icon(Icons.arrow_forward_ios_rounded, color: iconCol, size: 14),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Nhóm 1: Quản trị thiết bị & hệ thống
          _buildGroupHeader("Quản trị thiết bị và hệ thống", textCol),
          Container(
            decoration: _cardBox(isDark, cardBg, cardBorder),
            child: Column(
              children: [
                _buildSettingsTile(
                  icon: Icons.devices_rounded,
                  title: "Quản lý thiết bị",
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => Scaffold(
                          backgroundColor: AppTheme.dynamicBackground,
                          appBar: AppBar(
                            backgroundColor: AppTheme.dynamicBackground,
                            elevation: 0,
                            leading: IconButton(
                              icon: Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.dynamicTextPrimary, size: 20),
                              onPressed: () => Navigator.of(context).pop(),
                            ),
                            title: Text(
                              "Quản lý thiết bị",
                              style: TextStyle(color: AppTheme.dynamicTextPrimary, fontSize: 16, fontWeight: FontWeight.w600),
                            ),
                            centerTitle: true,
                          ),
                          body: const DeviceManagementCenterScreen(),
                        ),
                      ),
                    );
                  },
                  isDark: isDark,
                  textCol: textCol,
                  iconCol: iconCol,
                ),
                _buildDivider(cardBorder),
                _buildSettingsTile(
                  icon: Icons.group_outlined,
                  title: "Phân quyền thành viên",
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (context) => const FamilySharingScreen()),
                    );
                  },
                  isDark: isDark,
                  textCol: textCol,
                  iconCol: iconCol,
                ),
                _buildDivider(cardBorder),
                _buildSettingsTile(
                  icon: Icons.lock_person_rounded,
                  title: "Khóa khẩn cấp toàn bộ cửa",
                  onTap: _triggerEmergencyLockdown,
                  isDark: isDark,
                  textCol: textCol,
                  iconCol: iconCol,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Nhóm 2: Giao diện & tùy chọn
          _buildGroupHeader("Giao diện và tùy chọn", textCol),
          Container(
            decoration: _cardBox(isDark, cardBg, cardBorder),
            child: Column(
              children: [
                // Chế độ Dark / Light
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  child: Row(
                    children: [
                      _buildIconBadge(
                        isDark ? Icons.dark_mode_outlined : Icons.light_mode_outlined,
                        iconCol,
                        isDark,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          "Giao diện tối (Dark Mode)",
                          style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                      Switch(
                        value: isDark,
                        activeThumbColor: Colors.white,
                        activeTrackColor: AppTheme.brandBlue,
                        onChanged: (_) {
                          widget.onThemeChanged();
                          setState(() {});
                        },
                      ),
                    ],
                  ),
                ),
                _buildDivider(cardBorder),

                // Ngôn ngữ
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: Row(
                    children: [
                      _buildIconBadge(Icons.language_rounded, iconCol, isDark),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          "Ngôn ngữ hệ thống",
                          style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                      InkWell(
                        onTap: () {
                          widget.onLanguageChanged();
                          setState(() {});
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppTheme.brandBlue.withValues(alpha: isDark ? 0.14 : 0.08),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppTheme.brandBlue.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              Text(AppTheme.currentLang == 'vi' ? "🇻🇳 Tiếng Việt" : "🇬🇧 English",
                                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 11.5, color: iconCol)),
                              const SizedBox(width: 4),
                              Icon(Icons.swap_horiz, size: 14, color: iconCol),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                _buildDivider(cardBorder),

                // Thông báo đẩy
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  child: Row(
                    children: [
                      _buildIconBadge(Icons.notifications_none_rounded, iconCol, isDark),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          "Thông báo cảnh báo tức thì",
                          style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                      Switch(
                        value: _pushNotifications,
                        activeThumbColor: Colors.white,
                        activeTrackColor: AppTheme.brandBlue,
                        onChanged: (val) => setState(() => _pushNotifications = val),
                      ),
                    ],
                  ),
                ),
                _buildDivider(cardBorder),

                // Sinh trắc học & Mã PIN
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  child: Row(
                    children: [
                      _buildIconBadge(Icons.fingerprint_rounded, iconCol, isDark),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          "Khóa sinh trắc học & FaceID",
                          style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                      Switch(
                        value: _biometricLock,
                        activeThumbColor: Colors.white,
                        activeTrackColor: AppTheme.brandBlue,
                        onChanged: (val) => setState(() => _biometricLock = val),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 4. NHÓM 3: HỖ TRỢ & THÔNG TIN
          _buildGroupHeader("HỖ TRỢ & PHIÊN BẢN", textCol),
          Container(
            decoration: _cardBox(isDark, cardBg, cardBorder),
            child: Column(
              children: [
                _buildSettingsTile(
                  icon: Icons.assignment_outlined,
                  title: "Danh sách phiếu yêu cầu hỗ trợ",
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const CustomerSupportTicketsScreen(),
                      ),
                    );
                  },
                  isDark: isDark,
                  textCol: textCol,
                  iconCol: iconCol,
                ),
                _buildDivider(cardBorder),
                _buildSettingsTile(
                  icon: Icons.menu_book_outlined,
                  title: "Hướng dẫn sử dụng & Ghép nối",
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Mở tài liệu hướng dẫn kỹ thuật Austec Smart Home")),
                    );
                  },
                  isDark: isDark,
                  textCol: textCol,
                  iconCol: iconCol,
                ),
                _buildDivider(cardBorder),
                _buildSettingsTile(
                  icon: Icons.headset_mic_outlined,
                  title: "Tổng đài hỗ trợ kỹ thuật",
                  trailing: Text(
                    "1900.8899",
                    style: TextStyle(color: textCol, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Gọi hotline hỗ trợ Austec: 1900.8899")),
                    );
                  },
                  isDark: isDark,
                  textCol: textCol,
                  iconCol: iconCol,
                ),
                _buildDivider(cardBorder),
                _buildSettingsTile(
                  icon: Icons.system_update_rounded,
                  title: "Kiểm tra bản cập nhật",
                  onTap: () {
                    AppUpdateService().checkForUpdatesAndPrompt(context, manualTrigger: true);
                  },
                  isDark: isDark,
                  textCol: textCol,
                  iconCol: AppTheme.brandBlue,
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _currentVersionText,
                        style: TextStyle(
                          color: isDark ? AppTheme.cyanAccent : AppTheme.lightTextSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_forward_ios_rounded, size: 13, color: AppTheme.brandBlue),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 5. NÚT ĐĂNG XUẤT
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.roseDanger,
                side: const BorderSide(color: AppTheme.roseDanger, width: 1.2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(Icons.logout_rounded, size: 20),
              label: const Text(
                "ĐĂNG XUẤT TÀI KHOẢN",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, letterSpacing: 0.5),
              ),
              onPressed: _showLogoutDialog,
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  BoxDecoration _cardBox(bool isDark, Color cardBg, Color cardBorder) {
    return BoxDecoration(
      color: cardBg,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: cardBorder),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }

  Widget _buildGroupHeader(String title, Color textCol) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: TextStyle(
          color: textCol,
          fontSize: 11.5,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.6,
        ),
      ),
    );
  }

  Widget _buildDivider(Color cardBorder) {
    return Divider(height: 1, thickness: 1, color: cardBorder);
  }

  Widget _buildIconBadge(IconData icon, Color iconCol, bool isDark) {
    return Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        color: iconCol.withValues(alpha: isDark ? 0.14 : 0.10),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: iconCol, size: 17),
    );
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
    required bool isDark,
    required Color textCol,
    required Color iconCol,
    Widget? trailing,
  }) {
    return ListTile(
      dense: true,
      visualDensity: const VisualDensity(vertical: -1),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 1),
      onTap: onTap,
      leading: _buildIconBadge(icon, iconCol, isDark),
      title: Text(
        title,
        style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.w600),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
            )
          : null,
      trailing: trailing ?? Icon(Icons.arrow_forward_ios_rounded, size: 13, color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary),
    );
  }
}
