import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/services/auth_service.dart';

class UserProfileScreen extends StatefulWidget {
  const UserProfileScreen({super.key});

  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen> {
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  bool _isChangingPassword = false;
  bool _isUploadingAvatar = false;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadAvatar(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: source, maxWidth: 800, maxHeight: 800, imageQuality: 85);
      if (picked == null) return;

      setState(() => _isUploadingAvatar = true);
      final bytes = await picked.readAsBytes();
      final filename = "avatar_${DateTime.now().millisecondsSinceEpoch}_${picked.name}";

      final newUrl = await AuthService().uploadAvatar(bytes, filename);
      if (mounted) {
        setState(() => _isUploadingAvatar = false);
        if (newUrl != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Đã cập nhật ảnh đại diện thành công!"),
              backgroundColor: AppTheme.emeraldSuccess,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Không thể tải ảnh đại diện lên máy chủ. Vui lòng thử lại."),
              backgroundColor: AppTheme.roseDanger,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingAvatar = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Lỗi chọn ảnh: $e"),
            backgroundColor: AppTheme.roseDanger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showAvatarPickerOptions() {
    final isDark = AppTheme.isDarkMode;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppTheme.surfaceDark : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Thay đổi ảnh đại diện",
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppTheme.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: AppTheme.cyanAccent),
                title: Text(
                  "Chọn ảnh từ Thư viện",
                  style: TextStyle(color: isDark ? Colors.white : AppTheme.lightTextPrimary),
                ),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _pickAndUploadAvatar(ImageSource.gallery);
                },
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined, color: AppTheme.cyanAccent),
                title: Text(
                  "Chụp ảnh từ Máy ảnh",
                  style: TextStyle(color: isDark ? Colors.white : AppTheme.lightTextPrimary),
                ),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _pickAndUploadAvatar(ImageSource.camera);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleChangePassword() async {
    final cur = _currentPasswordController.text.trim();
    final newP = _newPasswordController.text.trim();
    final conf = _confirmPasswordController.text.trim();

    if (cur.isEmpty || newP.isEmpty || conf.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Vui lòng điền đầy đủ cả 3 ô mật khẩu."),
          backgroundColor: AppTheme.roseDanger,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (newP.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Mật khẩu mới phải có độ dài tối thiểu từ 6 ký tự."),
          backgroundColor: AppTheme.roseDanger,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (newP != conf) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Xác nhận mật khẩu mới không khớp! Vui lòng nhập lại."),
          backgroundColor: AppTheme.roseDanger,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (cur == newP) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Mật khẩu mới không được trùng với mật khẩu hiện tại."),
          backgroundColor: AppTheme.amberWarning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isChangingPassword = true);

    final res = await AuthService().changePassword(
      currentPassword: cur,
      newPassword: newP,
      confirmPassword: conf,
    );

    if (mounted) {
      setState(() => _isChangingPassword = false);
      if (res['success'] == true) {
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? "Đổi mật khẩu thành công!"),
            backgroundColor: AppTheme.emeraldSuccess,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['error']?.toString() ?? "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại."),
            backgroundColor: AppTheme.roseDanger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
    final cardBg = isDark ? const Color(0xFF141924) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF26324A) : const Color(0xFFE2E8F0);

    return Scaffold(
      backgroundColor: bgCol,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: textCol, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          "Thông tin cá nhân",
          style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        child: Column(
          children: [
            // 1. Khối Avatar Người Dùng
            Center(
              child: Stack(
                children: [
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                      border: Border.all(color: AppTheme.cyanAccent, width: 2.0),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.cyanAccent.withValues(alpha: 0.25),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ClipOval(
                      child: _isUploadingAvatar
                          ? const Center(child: CircularProgressIndicator(color: AppTheme.cyanAccent, strokeWidth: 2))
                          : (user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty)
                              ? Image.network(
                                  user.avatarUrl!.startsWith('http')
                                      ? user.avatarUrl!
                                      : '${ApiConfig.baseUrl}${user.avatarUrl!}',
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Icon(Icons.person, color: subTextCol, size: 48),
                                )
                              : Icon(Icons.person, color: subTextCol, size: 48),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: InkWell(
                      onTap: _showAvatarPickerOptions,
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: AppTheme.brandBlue,
                          shape: BoxShape.circle,
                          border: Border.all(color: isDark ? const Color(0xFF141924) : Colors.white, width: 2),
                        ),
                        child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              user?.fullName ?? "Chủ hộ Austec",
              style: TextStyle(color: textCol, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                color: AppTheme.brandBlue.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.brandBlue.withValues(alpha: 0.4)),
              ),
              child: Text(
                user?.role == 'ADMIN'
                    ? 'QUẢN TRỊ VIÊN'
                    : user?.role == 'CSKH'
                        ? 'CSKH HỖ TRỢ'
                        : 'CHỦ HỘ GIA ĐÌNH',
                style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5, fontWeight: FontWeight.bold),
              ),
            ),

            const SizedBox(height: 24),

            // 2. Thẻ Thông Tin Tài Khoản Chi Tiết
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.badge_outlined, color: AppTheme.cyanAccent, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        "Hồ sơ người dùng",
                        style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _buildProfileRow("Họ và tên", user?.fullName ?? "---", textCol, subTextCol),
                  Divider(color: cardBorder, height: 18),
                  _buildProfileRow("Email", user?.email ?? "---", textCol, subTextCol),
                  Divider(color: cardBorder, height: 18),
                  _buildProfileRow("Số điện thoại", user?.phoneNumber ?? "---", textCol, subTextCol),
                  Divider(color: cardBorder, height: 18),
                  _buildProfileRow("Địa chỉ", (user != null && user.address.isNotEmpty) ? user.address : "Chưa cập nhật", textCol, subTextCol),
                  Divider(color: cardBorder, height: 18),
                  _buildProfileRow("Khu vực / Tỉnh", (user != null && user.province.isNotEmpty) ? user.province : "Hà Nội", textCol, subTextCol),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // 3. Khối Đổi Mật Khẩu
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.lock_reset_rounded, color: AppTheme.amberWarning, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        "Đổi mật khẩu",
                        style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    "Nhập mật khẩu hiện tại và thiết lập mật khẩu mới bảo mật cho tài khoản của bạn.",
                    style: TextStyle(color: subTextCol, fontSize: 11.5),
                  ),
                  const SizedBox(height: 16),

                  // Mật khẩu hiện tại
                  _buildPasswordField(
                    controller: _currentPasswordController,
                    label: "Mật khẩu hiện tại",
                    obscureText: _obscureCurrent,
                    onToggleObscure: () => setState(() => _obscureCurrent = !_obscureCurrent),
                    isDark: isDark,
                  ),

                  const SizedBox(height: 12),

                  // Mật khẩu mới
                  _buildPasswordField(
                    controller: _newPasswordController,
                    label: "Mật khẩu mới",
                    obscureText: _obscureNew,
                    onToggleObscure: () => setState(() => _obscureNew = !_obscureNew),
                    isDark: isDark,
                  ),

                  const SizedBox(height: 12),

                  // Xác nhận mật khẩu mới
                  _buildPasswordField(
                    controller: _confirmPasswordController,
                    label: "Xác nhận mật khẩu mới",
                    obscureText: _obscureConfirm,
                    onToggleObscure: () => setState(() => _obscureConfirm = !_obscureConfirm),
                    isDark: isDark,
                  ),

                  const SizedBox(height: 18),

                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.brandBlue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      onPressed: _isChangingPassword ? null : _handleChangePassword,
                      icon: _isChangingPassword
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.check_circle_outline, size: 18),
                      label: Text(
                        _isChangingPassword ? "Đang xử lý..." : "Cập nhật mật khẩu",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileRow(String label, String value, Color textCol, Color subTextCol) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: subTextCol, fontSize: 12.5)),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(color: textCol, fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String label,
    required bool obscureText,
    required VoidCallback onToggleObscure,
    required bool isDark,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      style: TextStyle(color: isDark ? Colors.white : AppTheme.lightTextPrimary, fontSize: 13),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: isDark ? Colors.white70 : Colors.black54, fontSize: 12),
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.cyanAccent, size: 18),
        suffixIcon: IconButton(
          icon: Icon(
            obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined,
            color: isDark ? Colors.white54 : Colors.black45,
            size: 18,
          ),
          onPressed: onToggleObscure,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: isDark ? const Color(0xFF2E3D5B) : const Color(0xFFCBD5E1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppTheme.cyanAccent),
        ),
      ),
    );
  }
}

