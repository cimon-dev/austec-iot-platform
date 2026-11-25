import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/services/auth_service.dart';
import '../../auth/auth.dart';

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
  bool _isBusySecurity = false;

  @override
  void initState() {
    super.initState();
    _syncLatestProfile();
  }

  Future<void> _syncLatestProfile() async {
    await AuthService().refreshProfile();
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? AppTheme.roseDanger : AppTheme.emeraldSuccess,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _pickAndUploadAvatar(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );
      if (picked == null) return;

      setState(() => _isUploadingAvatar = true);
      final bytes = await picked.readAsBytes();
      final filename = "avatar_${DateTime.now().millisecondsSinceEpoch}_${picked.name}";

      final newUrl = await AuthService().uploadAvatar(bytes, filename);
      if (mounted) {
        setState(() => _isUploadingAvatar = false);
        if (newUrl != null) {
          _showSnack("Đã cập nhật ảnh đại diện thành công!");
        } else {
          _showSnack("Không thể tải ảnh đại diện lên máy chủ.", isError: true);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingAvatar = false);
        _showSnack("Lỗi chọn ảnh: $e", isError: true);
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

  /// Chức năng #2: Đổi mật khẩu hoặc Thiết lập mật khẩu lần đầu (với Step-up OTP Gmail / Zalo)
  Future<void> _handleChangePassword() async {
    final user = AuthService().currentUser;
    final hasPassword = user?.hasPassword != false;
    final cur = _currentPasswordController.text.trim();
    final newP = _newPasswordController.text.trim();
    final conf = _confirmPasswordController.text.trim();

    if (hasPassword && cur.isEmpty) {
      _showSnack("Vui lòng nhập mật khẩu hiện tại.", isError: true);
      return;
    }
    if (newP.length < 6) {
      _showSnack("Mật khẩu mới phải có độ dài tối thiểu từ 6 ký tự.", isError: true);
      return;
    }
    if (newP != conf) {
      _showSnack("Xác nhận mật khẩu mới không khớp!", isError: true);
      return;
    }
    if (hasPassword && cur == newP) {
      _showSnack("Mật khẩu mới không được trùng với mật khẩu hiện tại.", isError: true);
      return;
    }

    final stepUpToken = await StepUpVerifySheet.show(
      context,
      purpose: 'CHANGE_PASSWORD',
      title: hasPassword ? 'Xác thực Đổi mật khẩu' : 'Xác thực Thiết lập mật khẩu',
      warningDetail:
          'Vui lòng xác thực OTP qua Gmail (mặc định) hoặc Zalo ZNS (tùy chọn) để bảo vệ thay đổi mật khẩu tài khoản.',
    );
    if (stepUpToken == null || !mounted) return;

    setState(() => _isChangingPassword = true);

    final res = await AuthService().changePassword(
      currentPassword: hasPassword ? cur : null,
      newPassword: newP,
      confirmPassword: conf,
      stepUpToken: stepUpToken,
    );

    if (mounted) {
      setState(() => _isChangingPassword = false);
      if (res['success'] == true) {
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
        _showSnack(res['message']?.toString() ?? "Cập nhật mật khẩu thành công!");
      } else {
        _showSnack(
          res['error']?.toString() ?? "Đổi mật khẩu thất bại.",
          isError: true,
        );
      }
    }
  }

  /// Chức năng #4: Chỉnh sửa Email / Số điện thoại định danh (có Step-up OTP)
  Future<void> _showUpdateContactDialog() async {
    final user = AuthService().currentUser;
    if (user == null) return;

    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (_) => _EditContactDialog(
        initialEmail: user.email,
        initialPhone: user.phoneNumber,
      ),
    );
    if (result == null || !mounted) return;

    final newEmail = result['email']?.trim() ?? '';
    final newPhone = result['phone']?.trim() ?? '';
    if (newEmail == user.email && newPhone == user.phoneNumber) return;

    final stepUpToken = await StepUpVerifySheet.show(
      context,
      purpose: 'UPDATE_CONTACT',
      title: 'Xác thực thay đổi Email / SĐT',
      warningDetail:
          'Số điện thoại và Email gắn trực tiếp với quyền sở hữu thiết bị IoT của bạn. Vui lòng xác thực OTP (Gmail hoặc Zalo) để cập nhật.',
    );
    if (stepUpToken == null || !mounted) return;

    setState(() => _isBusySecurity = true);
    final res = await AuthService().updateContact(
      email: newEmail != user.email ? newEmail : null,
      phoneNumber: newPhone != user.phoneNumber ? newPhone : null,
      stepUpToken: stepUpToken,
    );
    if (mounted) {
      setState(() => _isBusySecurity = false);
      if (res['success'] == true) {
        _showSnack(res['message']?.toString() ?? 'Đã cập nhật thông tin liên hệ!');
      } else {
        _showSnack(res['error']?.toString() ?? 'Không thể cập nhật liên hệ.', isError: true);
      }
    }
  }

  /// Chức năng #4: Liên kết / Hủy liên kết Google
  Future<void> _handleToggleGoogleLink() async {
    final user = AuthService().currentUser;
    if (user == null) return;

    if (user.googleLinked) {
      final stepUpToken = await StepUpVerifySheet.show(
        context,
        purpose: 'UNLINK_GOOGLE',
        title: 'Xác thực Hủy liên kết Google',
        warningDetail:
            'Sau khi hủy liên kết Google, bạn sẽ chỉ đăng nhập được bằng Email/SĐT và Mật khẩu. Vui lòng xác thực OTP để tiếp tục.',
        isDanger: true,
      );
      if (stepUpToken == null || !mounted) return;

      setState(() => _isBusySecurity = true);
      final res = await AuthService().unlinkGoogleAccount(stepUpToken: stepUpToken);
      if (mounted) {
        setState(() => _isBusySecurity = false);
        _showSnack(
          res['success'] == true
              ? (res['message']?.toString() ?? 'Đã hủy liên kết Google!')
              : (res['error']?.toString() ?? 'Không thể hủy liên kết Google.'),
          isError: res['success'] != true,
        );
      }
    } else {
      setState(() => _isBusySecurity = true);
      final res = await AuthService().linkGoogleAccount();
      if (mounted) {
        setState(() => _isBusySecurity = false);
        _showSnack(
          res['success'] == true
              ? (res['message']?.toString() ?? 'Đã liên kết Google thành công!')
              : (res['error']?.toString() ?? 'Liên kết Google thất bại.'),
          isError: res['success'] != true,
        );
      }
    }
  }

  /// Chức năng #5: Xóa tài khoản vĩnh viễn (Xác nhận cảnh báo + Step-up OTP Gmail / Zalo)
  Future<void> _handleDeleteAccountFlow() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => const _ConfirmDeleteAccountWarningDialog(),
    );
    if (confirmed != true || !mounted) return;

    final stepUpToken = await StepUpVerifySheet.show(
      context,
      purpose: 'DELETE_ACCOUNT',
      title: 'Xác thực Xóa tài khoản vĩnh viễn',
      warningDetail:
          'Xác thực OTP qua Gmail (mặc định) hoặc Zalo ZNS (tùy chọn) để xác nhận xóa vĩnh viễn tài khoản Austec của bạn. Hành động này không thể hoàn tác.',
      isDanger: true,
    );
    if (stepUpToken == null || !mounted) return;

    setState(() => _isBusySecurity = true);
    final res = await AuthService().deleteAccount(stepUpToken: stepUpToken);
    if (!mounted) return;
    setState(() => _isBusySecurity = false);

    if (res['success'] == true) {
      _showSnack(res['message']?.toString() ?? 'Tài khoản đã được xóa vĩnh viễn.');
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    } else {
      _showSnack(res['error']?.toString() ?? 'Không thể xóa tài khoản.', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;
    final hasPassword = user?.hasPassword != false;
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
            // 1. Avatar
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
                          ? const Center(
                              child: CircularProgressIndicator(
                                  color: AppTheme.cyanAccent, strokeWidth: 2))
                          : (user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty)
                              ? Image.network(
                                  user.avatarUrl!.startsWith('http')
                                      ? user.avatarUrl!
                                      : '${ApiConfig.baseUrl}${user.avatarUrl!}',
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) =>
                                      Icon(Icons.person, color: subTextCol, size: 48),
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
                          border: Border.all(
                            color: isDark ? const Color(0xFF141924) : Colors.white,
                            width: 2,
                          ),
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
                style: const TextStyle(
                    color: AppTheme.cyanAccent, fontSize: 10.5, fontWeight: FontWeight.bold),
              ),
            ),

            const SizedBox(height: 22),

            // 2. Hồ sơ người dùng + nút đổi Email/SĐT có Step-up OTP
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
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.badge_outlined, color: AppTheme.cyanAccent, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            "Hồ sơ người dùng",
                            style: TextStyle(
                                color: textCol, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        onPressed: _isBusySecurity ? null : _showUpdateContactDialog,
                        icon: const Icon(Icons.edit_outlined, size: 14),
                        label: const Text("Đổi Email / SĐT", style: TextStyle(fontSize: 11.5)),
                        style: TextButton.styleFrom(
                          foregroundColor: AppTheme.cyanAccent,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _buildProfileRow("Họ và tên", user?.fullName ?? "---", textCol, subTextCol),
                  Divider(color: cardBorder, height: 18),
                  _buildProfileRow("Email", user?.email ?? "---", textCol, subTextCol),
                  Divider(color: cardBorder, height: 18),
                  _buildProfileRow(
                    "Số điện thoại",
                    (user?.phoneNumber.isNotEmpty == true) ? user!.phoneNumber : "Chưa cập nhật",
                    textCol,
                    subTextCol,
                  ),
                  Divider(color: cardBorder, height: 18),
                  _buildProfileRow(
                    "Địa chỉ",
                    (user != null && user.address.isNotEmpty) ? user.address : "Chưa cập nhật",
                    textCol,
                    subTextCol,
                  ),
                  Divider(color: cardBorder, height: 18),
                  _buildProfileRow(
                    "Khu vực / Tỉnh",
                    (user != null && user.province.isNotEmpty) ? user.province : "Hà Nội",
                    textCol,
                    subTextCol,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // 3. Liên kết tài khoản Google (Gmail)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardBorder, width: 1.0),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFF4285F4).withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.g_mobiledata_rounded,
                        color: Color(0xFF4285F4), size: 28),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Tài khoản Google (Gmail)",
                          style: TextStyle(color: textCol, fontSize: 13.5, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.googleLinked == true
                              ? "Đã liên kết • Đăng nhập 1 chạm"
                              : "Chưa liên kết với Google",
                          style: TextStyle(
                            color: user?.googleLinked == true
                                ? AppTheme.emeraldSuccess
                                : subTextCol,
                            fontSize: 11.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  OutlinedButton(
                    onPressed: _isBusySecurity ? null : _handleToggleGoogleLink,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: user?.googleLinked == true
                          ? AppTheme.roseDanger
                          : AppTheme.cyanAccent,
                      side: BorderSide(
                        color: user?.googleLinked == true
                            ? AppTheme.roseDanger.withValues(alpha: 0.6)
                            : AppTheme.cyanAccent,
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      minimumSize: Size.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(
                      user?.googleLinked == true ? "Hủy liên kết" : "Liên kết",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // 4. Khối Đổi / Thiết lập mật khẩu (yêu cầu Step-up OTP Gmail / Zalo)
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
                        hasPassword ? "Đổi mật khẩu" : "Thiết lập mật khẩu lần đầu",
                        style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    hasPassword
                        ? "Yêu cầu xác thực OTP (Gmail hoặc Zalo ZNS) trước khi lưu mật khẩu mới."
                        : "Tài khoản tạo bằng Google chưa có mật khẩu. Thiết lập mật khẩu để có thể đăng nhập bằng SĐT/Email.",
                    style: TextStyle(color: subTextCol, fontSize: 11.5, height: 1.35),
                  ),
                  const SizedBox(height: 14),

                  if (hasPassword) ...[
                    _buildPasswordField(
                      controller: _currentPasswordController,
                      label: "Mật khẩu hiện tại",
                      obscureText: _obscureCurrent,
                      onToggleObscure: () => setState(() => _obscureCurrent = !_obscureCurrent),
                      isDark: isDark,
                    ),
                    const SizedBox(height: 12),
                  ],

                  _buildPasswordField(
                    controller: _newPasswordController,
                    label: "Mật khẩu mới (tối thiểu 6 ký tự)",
                    obscureText: _obscureNew,
                    onToggleObscure: () => setState(() => _obscureNew = !_obscureNew),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 12),

                  _buildPasswordField(
                    controller: _confirmPasswordController,
                    label: "Xác nhận mật khẩu mới",
                    obscureText: _obscureConfirm,
                    onToggleObscure: () => setState(() => _obscureConfirm = !_obscureConfirm),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 16),

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
                          : const Icon(Icons.verified_user_outlined, size: 18),
                      label: Text(
                        _isChangingPassword
                            ? "Đang xử lý..."
                            : (hasPassword ? "Cập nhật mật khẩu (Cần OTP)" : "Thiết lập mật khẩu (Cần OTP)"),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // 5. Khối Xóa Tài Khoản Vĩnh Viễn (Đặt ở phía dưới cùng màn Thông tin cá nhân)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppTheme.roseDanger.withValues(alpha: 0.35),
                  width: 1.0,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, color: AppTheme.roseDanger, size: 20),
                      SizedBox(width: 8),
                      Text(
                        "Xóa tài khoản vĩnh viễn",
                        style: TextStyle(
                          color: AppTheme.roseDanger,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    "Xóa vĩnh viễn tài khoản và dữ liệu cá nhân khỏi hệ thống Austec. Yêu cầu xác thực OTP (Gmail hoặc Zalo) và không còn thiết bị sở hữu chưa bàn giao.",
                    style: TextStyle(color: subTextCol, fontSize: 11.5, height: 1.35),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.roseDanger,
                        side: const BorderSide(color: AppTheme.roseDanger, width: 1.2),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: _isBusySecurity ? null : _handleDeleteAccountFlow,
                      icon: const Icon(Icons.delete_forever_rounded, size: 19),
                      label: const Text(
                        "Xóa tài khoản vĩnh viễn",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
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

class _EditContactDialog extends StatefulWidget {
  final String initialEmail;
  final String initialPhone;

  const _EditContactDialog({required this.initialEmail, required this.initialPhone});

  @override
  State<_EditContactDialog> createState() => _EditContactDialogState();
}

class _EditContactDialogState extends State<_EditContactDialog> {
  late final TextEditingController _emailCtrl;
  late final TextEditingController _phoneCtrl;

  @override
  void initState() {
    super.initState();
    _emailCtrl = TextEditingController(text: widget.initialEmail);
    _phoneCtrl = TextEditingController(text: widget.initialPhone);
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    return AlertDialog(
      backgroundColor: isDark ? const Color(0xFF141924) : Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(
        'Cập nhật Email / Số điện thoại',
        style: TextStyle(color: textCol, fontSize: 15, fontWeight: FontWeight.bold),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            style: TextStyle(color: textCol, fontSize: 13),
            decoration: const InputDecoration(
              labelText: 'Địa chỉ Gmail / Email',
              border: OutlineInputBorder(),
              isDense: true,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            style: TextStyle(color: textCol, fontSize: 13),
            decoration: const InputDecoration(
              labelText: 'Số điện thoại (nhận OTP Zalo)',
              border: OutlineInputBorder(),
              isDense: true,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Hủy')),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.brandBlue,
            foregroundColor: Colors.white,
          ),
          onPressed: () {
            Navigator.of(context).pop({
              'email': _emailCtrl.text.trim(),
              'phone': _phoneCtrl.text.trim(),
            });
          },
          child: const Text('Tiếp tục xác thực OTP'),
        ),
      ],
    );
  }
}

class _ConfirmDeleteAccountWarningDialog extends StatefulWidget {
  const _ConfirmDeleteAccountWarningDialog();

  @override
  State<_ConfirmDeleteAccountWarningDialog> createState() =>
      _ConfirmDeleteAccountWarningDialogState();
}

class _ConfirmDeleteAccountWarningDialogState extends State<_ConfirmDeleteAccountWarningDialog> {
  bool _understood = false;

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return AlertDialog(
      backgroundColor: isDark ? const Color(0xFF141924) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: AppTheme.roseDanger.withValues(alpha: 0.4)),
      ),
      title: const Row(
        children: [
          Icon(Icons.delete_forever_rounded, color: AppTheme.roseDanger, size: 22),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              "Xóa tài khoản vĩnh viễn",
              style: TextStyle(color: AppTheme.roseDanger, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.roseDanger.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.roseDanger.withValues(alpha: 0.3)),
            ),
            child: Text(
              "• Toàn bộ hồ sơ, lịch sử và quyền thành viên sẽ bị xóa vĩnh viễn, không thể khôi phục.\n"
              "• Nếu bạn đang là Chủ sở hữu thiết bị, cần chuyển giao hoặc hủy ghép nối hết thiết bị trước.\n"
              "• Bước tiếp theo yêu cầu xác thực OTP (Gmail hoặc Zalo).",
              style: TextStyle(color: textCol, fontSize: 12, height: 1.45),
            ),
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: () => setState(() => _understood = !_understood),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 22,
                  height: 22,
                  child: Checkbox(
                    value: _understood,
                    activeColor: AppTheme.roseDanger,
                    onChanged: (v) => setState(() => _understood = v ?? false),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "Tôi hiểu hành động này là vĩnh viễn và không thể hoàn tác.",
                    style: TextStyle(color: subTextCol, fontSize: 12, height: 1.35),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text("Hủy", style: TextStyle(color: subTextCol)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.roseDanger,
            foregroundColor: Colors.white,
            disabledBackgroundColor: AppTheme.roseDanger.withValues(alpha: 0.35),
          ),
          onPressed: _understood ? () => Navigator.of(context).pop(true) : null,
          child: const Text("Tiếp tục xác thực OTP"),
        ),
      ],
    );
  }
}
