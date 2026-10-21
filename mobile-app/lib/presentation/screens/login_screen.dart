import 'package:flutter/material.dart';
import '../../core/constants/app_theme.dart';
import '../../core/services/auth_service.dart';
import 'orbital_hub_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _identifierController = TextEditingController(text: "nguyenvana@gmail.com");
  final TextEditingController _passwordController = TextEditingController(text: "Austec123!@#");
  bool _obscurePassword = true;
  bool _rememberMe = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final identifier = _identifierController.text.trim();
    final password = _passwordController.text;

    if (identifier.isEmpty) {
      setState(() => _errorMessage = "Vui lòng nhập Email hoặc Số điện thoại");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await AuthService().login(
      identifier: identifier,
      password: password,
    );

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (res.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res.message ?? "Đăng nhập thành công!"),
          backgroundColor: AppTheme.emeraldSuccess,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const OrbitalHubScreen()),
      );
    } else {
      setState(() => _errorMessage = res.error ?? "Đăng nhập thất bại");
    }
  }

  Future<void> _handleBiometricLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await AuthService().biometricLogin();

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (res.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Xác thực Sinh trắc học FaceID thành công!"),
          backgroundColor: AppTheme.cyanAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const OrbitalHubScreen()),
      );
    } else {
      setState(() => _errorMessage = res.error ?? "Xác thực sinh trắc học không thành công");
    }
  }

  void _selectDemoAccount(String name, String email, String phone) {
    setState(() {
      _identifierController.text = email;
      _passwordController.text = "Austec123!@#";
      _errorMessage = null;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("Đã nạp tài khoản mẫu: $name"),
        duration: const Duration(seconds: 1),
        backgroundColor: AppTheme.blueAccent,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Emblem & Branding
                  Center(
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.cyanAccent.withValues(alpha: 0.25),
                                blurRadius: 30,
                                spreadRadius: 6,
                              ),
                            ],
                          ),
                        ),
                        Container(
                          width: 68,
                          height: 68,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: const LinearGradient(
                              colors: [AppTheme.cyanAccent, AppTheme.blueAccent],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 1.5),
                          ),
                          child: const Icon(
                            Icons.door_sliding_rounded,
                            color: Colors.black,
                            size: 36,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  const Text(
                    "AUSTEC SMART HOME",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2.0,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    "Hệ sinh thái điều khiển cửa cuốn & Thiết bị IoT",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Error banner
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
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Glassmorphic Form Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceGlass,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          "ĐĂNG NHẬP",
                          style: TextStyle(
                            color: AppTheme.cyanAccent,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Identifier field
                        TextField(
                          controller: _identifierController,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          keyboardType: TextInputType.emailAddress,
                          decoration: InputDecoration(
                            labelText: "Email hoặc Số điện thoại",
                            labelStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                            prefixIcon: const Icon(Icons.alternate_email_rounded, color: AppTheme.cyanAccent, size: 18),
                            filled: true,
                            fillColor: AppTheme.surface,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Password field
                        TextField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: InputDecoration(
                            labelText: "Mật khẩu bảo mật",
                            labelStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppTheme.cyanAccent, size: 18),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                color: AppTheme.textMuted,
                                size: 18,
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                            filled: true,
                            fillColor: AppTheme.surface,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Options row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                SizedBox(
                                  height: 24,
                                  width: 24,
                                  child: Checkbox(
                                    value: _rememberMe,
                                    onChanged: (v) => setState(() => _rememberMe = v ?? true),
                                    activeColor: AppTheme.cyanAccent,
                                    checkColor: Colors.black,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Text("Ghi nhớ", style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                              ],
                            ),
                            TextButton(
                              onPressed: () {
                                showDialog(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    backgroundColor: AppTheme.surface,
                                    title: const Text("Khôi phục mật khẩu", style: TextStyle(color: Colors.white, fontSize: 14)),
                                    content: const Text(
                                      "Vui lòng liên hệ Hotline CSKH 1900 8823 hoặc dùng mã OTP gửi về Số điện thoại đã kích hoạt để đặt lại mật khẩu.",
                                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                    ),
                                    actions: [
                                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Đã hiểu")),
                                    ],
                                  ),
                                );
                              },
                              style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero),
                              child: const Text("Quên mật khẩu?", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 11)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),

                        // Submit Button
                        SizedBox(
                          height: 46,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.cyanAccent,
                              foregroundColor: Colors.black,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 4,
                              shadowColor: AppTheme.cyanAccent.withValues(alpha: 0.4),
                            ),
                            onPressed: _isLoading ? null : _handleLogin,
                            child: _isLoading
                                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                                : const Text(
                                    "ĐĂNG NHẬP NGAY",
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Biometric button
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 11),
                          ),
                          onPressed: _isLoading ? null : _handleBiometricLogin,
                          icon: const Icon(Icons.fingerprint_rounded, color: AppTheme.cyanAccent, size: 20),
                          label: const Text(
                            "Đăng nhập bằng FaceID / Vân tay",
                            style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Quick Demo Accounts
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.surface.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.cardBorder.withValues(alpha: 0.5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.bolt_rounded, color: AppTheme.amberWarning, size: 14),
                            SizedBox(width: 6),
                            Text(
                              "TÀI KHOẢN MẪU TEST NHANH (1-CLICK):",
                              style: TextStyle(color: AppTheme.amberWarning, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: [
                            _buildDemoChip("Nguyễn Văn An", "nguyenvana@gmail.com", "0912345678"),
                            _buildDemoChip("Lê Văn Thành", "le.vanthanh@gmail.com", "0987654321"),
                            _buildDemoChip("Tạ Thị Hoan", "thanhhoan151191@gmail.com", "0979031573"),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Register link
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        "Chưa có tài khoản Austec? ",
                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                      ),
                      GestureDetector(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const RegisterScreen()),
                          );
                        },
                        child: const Text(
                          "Đăng ký ngay",
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

  Widget _buildDemoChip(String name, String email, String phone) {
    return GestureDetector(
      onTap: () => _selectDemoAccount(name, email, phone),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: AppTheme.surfaceGlass,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.3)),
        ),
        child: Text(
          name,
          style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
