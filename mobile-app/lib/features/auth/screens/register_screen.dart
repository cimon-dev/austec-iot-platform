import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/services/auth_service.dart';
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
          content: Text(res.message ?? "Đăng ký tài khoản thành công!"),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          "ĐĂNG KÝ TÀI KHOẢN MỚI",
          style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 1.0),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    "Tạo Tài Khoản Khách Hàng",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    "Kích hoạt tài khoản để kết nối và điều khiển cửa cuốn từ xa",
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                  ),
                  const SizedBox(height: 20),

                  // Error Banner
                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppTheme.roseDanger.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.roseDanger.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: AppTheme.roseDanger, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: Colors.white, fontSize: 11),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Form Container
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceGlass,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.cardBorder),
                    ),
                    child: Column(
                      children: [
                        // Họ và tên
                        _buildInputField(
                          controller: _fullNameController,
                          label: "Họ và tên chủ hộ *",
                          hint: "Nguyễn Văn An",
                          icon: Icons.person_outline_rounded,
                        ),
                        const SizedBox(height: 14),

                        // Số điện thoại
                        _buildInputField(
                          controller: _phoneController,
                          label: "Số điện thoại liên hệ *",
                          hint: "0912 345 678",
                          icon: Icons.phone_android_rounded,
                          keyboardType: TextInputType.phone,
                        ),
                        const SizedBox(height: 14),

                        // Email
                        _buildInputField(
                          controller: _emailController,
                          label: "Địa chỉ Email *",
                          hint: "nguyenvana@gmail.com",
                          icon: Icons.mail_outline_rounded,
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 14),

                        // Tỉnh thành dropdown
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "Tỉnh / Thành phố lắp đặt",
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              decoration: BoxDecoration(
                                color: AppTheme.surface,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _selectedProvince,
                                  isExpanded: true,
                                  dropdownColor: AppTheme.surfaceDark,
                                  style: const TextStyle(color: Colors.white, fontSize: 12),
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
                        const SizedBox(height: 14),

                        // Địa chỉ
                        _buildInputField(
                          controller: _addressController,
                          label: "Địa chỉ lắp đặt / Nhà riêng",
                          hint: "Số 45 Lê Duẩn, P. Bến Nghé",
                          icon: Icons.location_on_outlined,
                        ),
                        const SizedBox(height: 14),

                        // Mật khẩu
                        TextField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          style: const TextStyle(color: Colors.white, fontSize: 12),
                          decoration: InputDecoration(
                            labelText: "Mật khẩu (Tối thiểu 6 ký tự) *",
                            labelStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppTheme.cyanAccent, size: 18),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                color: AppTheme.textMuted,
                                size: 16,
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                            filled: true,
                            fillColor: AppTheme.surface,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Xác nhận mật khẩu
                        TextField(
                          controller: _confirmPasswordController,
                          obscureText: _obscureConfirmPassword,
                          style: const TextStyle(color: Colors.white, fontSize: 12),
                          decoration: InputDecoration(
                            labelText: "Xác nhận lại mật khẩu *",
                            labelStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                            prefixIcon: const Icon(Icons.lock_reset_rounded, color: AppTheme.cyanAccent, size: 18),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                color: AppTheme.textMuted,
                                size: 16,
                              ),
                              onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                            ),
                            filled: true,
                            fillColor: AppTheme.surface,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Điều khoản
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              height: 24,
                              width: 24,
                              child: Checkbox(
                                value: _agreeTerms,
                                onChanged: (v) => setState(() => _agreeTerms = v ?? true),
                                activeColor: AppTheme.cyanAccent,
                                checkColor: Colors.black,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                "Tôi cam kết tuân thủ Điều khoản sử dụng và Chính sách bảo mật dữ liệu IoT Austec",
                                style: TextStyle(color: AppTheme.textSecondary, fontSize: 10),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Nút Đăng ký
                        SizedBox(
                          width: double.infinity,
                          height: 46,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.cyanAccent,
                              foregroundColor: Colors.black,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 4,
                            ),
                            onPressed: _isLoading ? null : _handleRegister,
                            child: _isLoading
                                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                                : const Text(
                                    "HOÀN TẤT ĐĂNG KÝ NGAY",
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Back to login
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        "Đã có tài khoản? ",
                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: const Text(
                          "Đăng nhập",
                          style: TextStyle(
                            color: AppTheme.cyanAccent,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            decoration: TextDecoration.underline,
                            decorationColor: AppTheme.cyanAccent,
                          ),
                        ),
                      ),
                    ],
                  ),
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
    return TextField(
      controller: controller,
      style: const TextStyle(color: Colors.white, fontSize: 12),
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
        labelStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
        prefixIcon: Icon(icon, color: AppTheme.cyanAccent, size: 18),
        filled: true,
        fillColor: AppTheme.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }
}
