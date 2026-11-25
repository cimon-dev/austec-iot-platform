import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../devices/screens/orbital_hub_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  String _selectedProvince = "Hà Nội";
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _agreeTerms = true;
  bool _isLoading = false;
  String? _errorMessage;

  final List<String> _provinces = [
    "Hà Nội",
    "TP. Hồ Chí Minh",
    "Đà Nẵng",
    "Hải Phòng",
    "Cần Thơ",
    "Bình Dương",
    "Đồng Nai",
    "Quảng Ninh",
    "Khác",
  ];

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    final fullName = _fullNameController.text.trim();
    final phone = _phoneController.text.trim();
    final email = _emailController.text.trim();
    final address = _addressController.text.trim();
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (fullName.isEmpty || phone.isEmpty || email.isEmpty) {
      setState(() => _errorMessage = "Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Email");
      return;
    }

    if (password.length < 6) {
      setState(() => _errorMessage = "Mật khẩu phải có độ dài tối thiểu 6 ký tự");
      return;
    }

    if (password != confirmPassword) {
      setState(() => _errorMessage = "Mật khẩu xác nhận không trùng khớp");
      return;
    }

    if (!_agreeTerms) {
      setState(() => _errorMessage = "Vui lòng chấp thuận Điều khoản dịch vụ Austec Smart IoT");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await AuthService().register(
      fullName: fullName,
      phoneNumber: phone,
      email: email,
      password: password,
      address: address,
      province: _selectedProvince,
    );

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (res.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res.message ?? "Đăng ký tài khoản thành công"),
          backgroundColor: AppTheme.emeraldSuccess,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const OrbitalHubScreen()),
        (route) => false,
      );
    } else {
      setState(() => _errorMessage = res.error ?? "Đăng ký thất bại");
    }
  }

  Future<void> _handleGoogleRegister() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await AuthService().signInWithGoogle();
    if (!mounted) return;
    setState(() => _isLoading = false);

    if (res.success) {
      IoTGatewayClient().clearAllDevices();
      await IoTGatewayClient().fetchDevicesFromBackend(token: res.user?.token);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res.message ?? "Đăng ký bằng Google thành công!"),
          backgroundColor: AppTheme.emeraldSuccess,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const OrbitalHubScreen()),
        (route) => false,
      );
    } else {
      setState(() => _errorMessage = res.error ?? "Đăng ký bằng Google thất bại");
    }
  }

  @override
  Widget build(BuildContext context) {
    final bg = AppTheme.dynamicBackground;
    final surface = AppTheme.dynamicSurface;
    final raised = AppTheme.dynamicSurfaceRaised;
    final hairline = AppTheme.dynamicHairline;
    final textPrimary = AppTheme.dynamicTextPrimary;
    final textSecondary = AppTheme.dynamicTextSecondary;
    final textMuted = AppTheme.dynamicTextMuted;
    final accent = AppTheme.dynamicAccent;

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: bg,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: textPrimary, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          "Đăng ký tài khoản",
          style: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl, vertical: AppSpacing.md),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    "Tạo tài khoản khách hàng",
                    style: TextStyle(
                      color: textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    "Kích hoạt tài khoản để kết nối và điều khiển thiết bị từ xa",
                    style: TextStyle(color: textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppTheme.roseDanger.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(AppRadius.control),
                        border: Border.all(color: AppTheme.roseDanger.withValues(alpha: 0.35)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: AppTheme.roseDanger, size: 18),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: TextStyle(color: textPrimary, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                  ],

                  Container(
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    decoration: AppTheme.glassBox(radius: AppRadius.card),
                    child: Column(
                      children: [
                        _buildInputField(
                          controller: _fullNameController,
                          label: "Họ và tên chủ hộ *",
                          hint: "Nguyễn Văn An",
                          icon: Icons.person_outline_rounded,
                        ),
                        const SizedBox(height: AppSpacing.md),

                        _buildInputField(
                          controller: _phoneController,
                          label: "Số điện thoại *",
                          hint: "0912 345 678",
                          icon: Icons.phone_android_rounded,
                          keyboardType: TextInputType.phone,
                        ),
                        const SizedBox(height: AppSpacing.md),

                        _buildInputField(
                          controller: _emailController,
                          label: "Email *",
                          hint: "nguyenvana@gmail.com",
                          icon: Icons.mail_outline_rounded,
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: AppSpacing.md),

                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Tỉnh / Thành phố lắp đặt",
                              style: TextStyle(color: textMuted, fontSize: 12),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                              decoration: BoxDecoration(
                                color: raised,
                                borderRadius: BorderRadius.circular(AppRadius.control),
                                border: Border.all(color: hairline),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _selectedProvince,
                                  isExpanded: true,
                                  dropdownColor: surface,
                                  style: TextStyle(color: textPrimary, fontSize: 14),
                                  items: _provinces.map((p) {
                                    return DropdownMenuItem<String>(
                                      value: p,
                                      child: Text(p),
                                    );
                                  }).toList(),
                                  onChanged: (val) {
                                    if (val != null) setState(() => _selectedProvince = val);
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.md),

                        _buildInputField(
                          controller: _addressController,
                          label: "Địa chỉ lắp đặt",
                          hint: "Số 45 Lê Duẩn, P. Bến Nghé",
                          icon: Icons.location_on_outlined,
                        ),
                        const SizedBox(height: AppSpacing.md),

                        TextField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          style: TextStyle(color: textPrimary, fontSize: 14),
                          decoration: InputDecoration(
                            labelText: "Mật khẩu (tối thiểu 6 ký tự) *",
                            labelStyle: TextStyle(color: textMuted, fontSize: 13),
                            prefixIcon: Icon(Icons.lock_outline_rounded, color: textMuted, size: 18),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                color: textMuted,
                                size: 18,
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                            filled: true,
                            fillColor: raised,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.control),
                              borderSide: BorderSide(color: hairline),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.control),
                              borderSide: BorderSide(color: hairline),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.control),
                              borderSide: BorderSide(color: accent, width: 1.5),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.md),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        TextField(
                          controller: _confirmPasswordController,
                          obscureText: _obscureConfirmPassword,
                          style: TextStyle(color: textPrimary, fontSize: 14),
                          decoration: InputDecoration(
                            labelText: "Xác nhận mật khẩu *",
                            labelStyle: TextStyle(color: textMuted, fontSize: 13),
                            prefixIcon: Icon(Icons.lock_reset_rounded, color: textMuted, size: 18),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                color: textMuted,
                                size: 18,
                              ),
                              onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                            ),
                            filled: true,
                            fillColor: raised,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.control),
                              borderSide: BorderSide(color: hairline),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.control),
                              borderSide: BorderSide(color: hairline),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.control),
                              borderSide: BorderSide(color: accent, width: 1.5),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.md),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              height: 24,
                              width: 24,
                              child: Checkbox(
                                value: _agreeTerms,
                                onChanged: (v) => setState(() => _agreeTerms = v ?? true),
                                activeColor: accent,
                                checkColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(
                                "Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật dữ liệu Austec",
                                style: TextStyle(color: textSecondary, fontSize: 12, height: 1.35),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.xl),

                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: accent,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.control)),
                            ),
                            onPressed: _isLoading ? null : _handleRegister,
                            child: _isLoading
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text(
                                    "Hoàn tất đăng ký",
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                  ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: textPrimary,
                              side: BorderSide(color: hairline),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.control)),
                            ),
                            onPressed: _isLoading ? null : _handleGoogleRegister,
                            icon: const Icon(Icons.g_mobiledata_rounded,
                                color: Color(0xFF4285F4), size: 26),
                            label: Text(
                              "Đăng ký nhanh bằng Google (Gmail)",
                              style: TextStyle(
                                color: textPrimary,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "Đã có tài khoản? ",
                        style: TextStyle(color: textSecondary, fontSize: 13),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: Text(
                          "Đăng nhập",
                          style: TextStyle(
                            color: accent,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
  }) {
    final raised = AppTheme.dynamicSurfaceRaised;
    final hairline = AppTheme.dynamicHairline;
    final textPrimary = AppTheme.dynamicTextPrimary;
    final textMuted = AppTheme.dynamicTextMuted;
    final accent = AppTheme.dynamicAccent;

    return TextField(
      controller: controller,
      style: TextStyle(color: textPrimary, fontSize: 14),
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        hintStyle: TextStyle(color: textMuted, fontSize: 13),
        labelStyle: TextStyle(color: textMuted, fontSize: 13),
        prefixIcon: Icon(icon, color: textMuted, size: 18),
        filled: true,
        fillColor: raised,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.control),
          borderSide: BorderSide(color: hairline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.control),
          borderSide: BorderSide(color: hairline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.control),
          borderSide: BorderSide(color: accent, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.md),
      ),
    );
  }
}
