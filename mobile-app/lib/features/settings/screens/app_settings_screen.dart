import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/services/auth_service.dart';
import '../../cskh/screens/customer_support_tickets_screen.dart';
import '../../devices/devices.dart';
import '../../family_sharing/screens/family_sharing_screen.dart';
import '../../auth/auth.dart';

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

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Thẻ Thông Tin Chủ Nhà / Hồ Sơ Quản Trị
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark
                    ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                    : [Colors.white, const Color(0xFFF1F5F9)],
              ),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: cardBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: AppTheme.cyanGradient,
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.cyanAccent.withValues(alpha: 0.35),
                        blurRadius: 10,
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(Icons.person, color: Colors.white, size: 28),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Builder(
                    builder: (context) {
                      final user = AuthService().currentUser;
                      final userName = user?.fullName ?? "Nguyễn Văn An";
                      final userPhone = user?.phoneNumber ?? "0912 345 678";
                      final userEmail = user?.email ?? "nguyenvana@gmail.com";
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
                                  color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  "CHỦ NHÀ",
                                  style: TextStyle(color: AppTheme.cyanAccent, fontSize: 9.5, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            "SĐT: $userPhone • $userEmail",
                            style: TextStyle(color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary, fontSize: 11),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "$userLocation • Hệ sinh thái Austec IoT hoạt động",
                            style: const TextStyle(color: AppTheme.emeraldSuccess, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // 2. NHÓM 1: QUẢN TRỊ THIẾT BỊ & HỆ THỐNG
          _buildGroupHeader("QUẢN TRỊ THIẾT BỊ & HỆ THỐNG"),
          Container(
            decoration: _cardBox(isDark, cardBg, cardBorder),
            child: Column(
              children: [
                _buildSettingsTile(
                  icon: Icons.devices_rounded,
                  iconColor: AppTheme.cyanAccent,
                  title: "Quản lý thiết bị",
                  subtitle: "Xem 7 thiết bị, đổi tên, gán phòng, kiểm tra OTA",
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => Scaffold(
                          backgroundColor: isDark ? AppTheme.background : AppTheme.lightBackground,
                          appBar: AppBar(
                            backgroundColor: Colors.transparent,
                            elevation: 0,
                            leading: IconButton(
                              icon: Icon(Icons.arrow_back_ios_new, color: textCol, size: 20),
                              onPressed: () => Navigator.of(context).pop(),
                            ),
                            title: Text(
                              "Quản Lý Thiết Bị",
                              style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
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
                ),
                _buildDivider(cardBorder),
                _buildSettingsTile(
                  icon: Icons.group_outlined,
                  iconColor: AppTheme.blueAccent,
                  title: "Quản lý phân quyền thành viên",
                  subtitle: "Mời người dùng, tìm kiếm theo danh bạ, cấp quyền",
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (context) => const FamilySharingScreen()),
                    );
                  },
                  isDark: isDark,
                  textCol: textCol,
                ),
                _buildDivider(cardBorder),
                _buildSettingsTile(
                  icon: Icons.lock_person_rounded,
                  iconColor: AppTheme.amberWarning,
                  title: "Khóa khẩn cấp toàn bộ cửa",
                  subtitle: "Vô hiệu hóa remote RF và khóa tất cả cửa cuốn",
                  onTap: _triggerEmergencyLockdown,
                  isDark: isDark,
                  textCol: textCol,
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // 3. NHÓM 2: GIAO DIỆN & TÙY CHỌN HỆ THỐNG
          _buildGroupHeader("GIAO DIỆN & TÙY CHỌN HỆ THỐNG"),
          Container(
            decoration: _cardBox(isDark, cardBg, cardBorder),
            child: Column(
              children: [
                // Chế độ Dark / Light
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.purple.withValues(alpha: 0.15) : Colors.amber.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                          color: isDark ? AppTheme.purpleAccent : Colors.orange,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Chế độ hiển thị (Dark / Light)",
                              style: TextStyle(color: textCol, fontSize: 13.5, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              isDark ? "Đang dùng Giao diện Tối (Cyberpunk)" : "Đang dùng Giao diện Sáng",
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: isDark,
                        activeColor: AppTheme.cyanAccent,
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
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.language_rounded, color: AppTheme.cyanAccent, size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Ngôn ngữ hệ thống",
                              style: TextStyle(color: textCol, fontSize: 13.5, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              AppTheme.currentLang == 'vi' ? "Tiếng Việt (Mặc định)" : "English",
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      InkWell(
                        onTap: () {
                          widget.onLanguageChanged();
                          setState(() {});
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.4)),
                          ),
                          child: Row(
                            children: [
                              Text(AppTheme.currentLang == 'vi' ? "🇻🇳 VI" : "🇬🇧 EN",
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11.5, color: AppTheme.cyanAccent)),
                              const SizedBox(width: 4),
                              const Icon(Icons.swap_horiz, size: 14, color: AppTheme.cyanAccent),
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
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.blueAccent.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.notifications_active_outlined, color: AppTheme.blueAccent, size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Thông báo cảnh báo tức thì",
                              style: TextStyle(color: textCol, fontSize: 13.5, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              "Cảnh báo khi cửa đóng/mở hoặc motor quá dòng",
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: _pushNotifications,
                        activeColor: AppTheme.cyanAccent,
                        onChanged: (val) => setState(() => _pushNotifications = val),
                      ),
                    ],
                  ),
                ),
                _buildDivider(cardBorder),

                // Sinh trắc học & Mã PIN
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.fingerprint_rounded, color: AppTheme.emeraldSuccess, size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Khóa sinh trắc học & FaceID",
                              style: TextStyle(color: textCol, fontSize: 13.5, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              "Yêu cầu xác thực khi mở cửa cuốn quan trọng",
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: _biometricLock,
                        activeColor: AppTheme.cyanAccent,
                        onChanged: (val) => setState(() => _biometricLock = val),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // 4. NHÓM 3: HỖ TRỢ & THÔNG TIN
          _buildGroupHeader("HỖ TRỢ & PHIÊN BẢN"),
          Container(
            decoration: _cardBox(isDark, cardBg, cardBorder),
            child: Column(
              children: [
                _buildSettingsTile(
                  icon: Icons.assignment_outlined,
                  iconColor: AppTheme.purpleAccent,
                  title: "Danh sách phiếu yêu cầu hỗ trợ",
                  subtitle: "Theo dõi tiến độ và phản hồi từ kỹ thuật viên",
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const CustomerSupportTicketsScreen(),
                      ),
                    );
                  },
                  isDark: isDark,
                  textCol: textCol,
                ),
                _buildDivider(cardBorder),
                _buildSettingsTile(
                  icon: Icons.menu_book_outlined,
                  iconColor: AppTheme.cyanAccent,
                  title: "Hướng dẫn sử dụng & Ghép nối",
                  subtitle: "Tài liệu kỹ thuật và sơ đồ đấu nối bo mạch Austec",
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Mở tài liệu hướng dẫn kỹ thuật Austec Smart Home")),
                    );
                  },
                  isDark: isDark,
                  textCol: textCol,
                ),
                _buildDivider(cardBorder),
                _buildSettingsTile(
                  icon: Icons.headset_mic_outlined,
                  iconColor: AppTheme.emeraldSuccess,
                  title: "Tổng đài hỗ trợ kỹ thuật Austec",
                  subtitle: "Hotline 1900.8899 • Hỗ trợ kỹ thuật 24/7",
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Gọi hotline hỗ trợ Austec: 1900.8899")),
                    );
                  },
                  isDark: isDark,
                  textCol: textCol,
                ),
                _buildDivider(cardBorder),
                _buildSettingsTile(
                  icon: Icons.info_outline_rounded,
                  iconColor: AppTheme.purpleAccent,
                  title: "Phiên bản ứng dụng",
                  subtitle: "Austec Smart Home v2.4.1 (ESP32-S3 IoT Core)",
                  onTap: () {},
                  isDark: isDark,
                  textCol: textCol,
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      "MỚI NHẤT",
                      style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 9.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

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

  Widget _buildGroupHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Row(
        children: [
          Container(width: 3.5, height: 14, color: AppTheme.cyanAccent, margin: const EdgeInsets.only(right: 8)),
          Text(
            title,
            style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.6),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider(Color cardBorder) {
    return Divider(height: 1, thickness: 1, color: cardBorder);
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required bool isDark,
    required Color textCol,
    Widget? trailing,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.15),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(
        title,
        style: TextStyle(color: textCol, fontSize: 13.5, fontWeight: FontWeight.bold),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
      ),
      trailing: trailing ?? const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.cyanAccent),
    );
  }
}
