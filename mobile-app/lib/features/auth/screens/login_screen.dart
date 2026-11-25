import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/biometric_auth_service.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../devices/screens/orbital_hub_screen.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';
import '../../../core/services/app_update_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _identifierController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _rememberMe = true;
  bool _isLoading = false;
  bool _biometricAvailable = false;
  bool _biometricEnabled = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadLastIdentifier();
    _loadBiometricStatus();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 1500), () {
        if (mounted) {
          AppUpdateService().checkForUpdatesAndPrompt(context);
        }
      });
    });
  }

  Future<void> _loadBiometricStatus() async {
    final hw = await BiometricAuthService().isHardwareAvailable();
    final enabled = await BiometricAuthService().isEnabled();
    if (mounted) {
      setState(() {
        _biometricAvailable = hw;
        _biometricEnabled = enabled;
      });
    }
  }

  Future<void> _loadLastIdentifier() async {
    try {
      final last = await AuthService().getLastIdentifier();
      if (mounted && last != null && last.isNotEmpty) {
        setState(() {
          _identifierController.text = last;
        });
      }
    } catch (_) {}
  }

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
      // Xóa sạch bộ nhớ thiết bị cũ và nạp thiết bị mới của đúng tài khoản vừa đăng nhập
      IoTGatewayClient().clearAllDevices();
      await IoTGatewayClient().fetchDevicesFromBackend(token: res.user?.token);
      if (!mounted) return;

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

  Future<void> _handleGoogleLogin() async {
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
          content: Text(res.message ?? "Đăng nhập bằng Google thành công!"),
          backgroundColor: AppTheme.emeraldSuccess,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const OrbitalHubScreen()),
      );
    } else {
      setState(() => _errorMessage = res.error ?? "Đăng nhập bằng Google thất bại");
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
      IoTGatewayClient().clearAllDevices();
      await IoTGatewayClient().fetchDevicesFromBackend(token: res.user?.token);
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res.message ?? "Xác thực sinh trắc học thành công!"),
          backgroundColor: AppTheme.cyanAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const OrbitalHubScreen()),
      );
    } else {
      setState(() => _errorMessage =
          res.error ?? "Xác thực sinh trắc học không thành công");
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl, vertical: AppSpacing.xl),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 68,
                      height: 68,
                      decoration: BoxDecoration(
                        color: surface,
                        shape: BoxShape.circle,
                        border: Border.all(color: hairline, width: 1.0),
                      ),
                      child: ClipOval(
                        child: Image.asset(
                          'assets/logo-app.png',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Image.asset(
                            'assets/logo-app.webp',
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Icon(
                              Icons.door_sliding_rounded,
                              color: textPrimary,
                              size: 32,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  Text(
                    "Austec Smart Home",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: textPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    "Điều khiển cửa cuốn, năng lượng và thiết bị IoT",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: textSecondary,
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.md, vertical: AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppTheme.roseDanger.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(AppRadius.control),
                        border: Border.all(
                            color: AppTheme.roseDanger.withValues(alpha: 0.35)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded,
                              color: AppTheme.roseDanger, size: 18),
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
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          "Đăng nhập",
                          style: TextStyle(
                            color: textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        TextField(
                          controller: _identifierController,
                          style: TextStyle(color: textPrimary, fontSize: 14),
                          keyboardType: TextInputType.emailAddress,
                          decoration: InputDecoration(
                            labelText: "Email hoặc số điện thoại",
                            labelStyle: TextStyle(color: textMuted, fontSize: 13),
                            prefixIcon: Icon(
                                Icons.alternate_email_rounded,
                                color: textMuted,
                                size: 18),
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
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.md, vertical: AppSpacing.md),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        TextField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          style: TextStyle(color: textPrimary, fontSize: 14),
                          decoration: InputDecoration(
                            labelText: "Mật khẩu",
                            labelStyle: TextStyle(color: textMuted, fontSize: 13),
                            prefixIcon: Icon(Icons.lock_outline_rounded,
                                color: textMuted, size: 18),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                                color: textMuted,
                                size: 18,
                              ),
                              onPressed: () => setState(
                                  () => _obscurePassword = !_obscurePassword),
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
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.md, vertical: AppSpacing.md),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),

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
                                    onChanged: (v) =>
                                        setState(() => _rememberMe = v ?? true),
                                    activeColor: accent,
                                    checkColor: Colors.white,
                                    shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(4)),
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Text("Ghi nhớ đăng nhập",
                                    style: TextStyle(
                                        color: textSecondary,
                                        fontSize: 12)),
                              ],
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ForgotPasswordScreen(
                                      initialIdentifier: _identifierController.text.trim(),
                                    ),
                                  ),
                                );
                              },
                              style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero),
                              child: Text("Quên mật khẩu?",
                                  style: TextStyle(
                                      color: accent,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500)),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.xl),

                        SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: accent,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppRadius.control)),
                            ),
                            onPressed: _isLoading ? null : _handleLogin,
                            child: _isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white))
                                : const Text(
                                    "Đăng nhập",
                                    style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600),
                                  ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        SizedBox(
                          height: 44,
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: textPrimary,
                              side: BorderSide(color: hairline),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppRadius.control)),
                            ),
                            onPressed: _isLoading ? null : _handleGoogleLogin,
                            icon: const Icon(Icons.g_mobiledata_rounded,
                                color: Color(0xFF4285F4), size: 26),
                            label: Text(
                              "Tiếp tục với Google (Gmail)",
                              style: TextStyle(
                                  color: textPrimary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),

                        if (_biometricAvailable) ...[
                          const SizedBox(height: AppSpacing.md),
                          SizedBox(
                            height: 44,
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: textPrimary,
                                side: BorderSide(
                                  color: _biometricEnabled ? accent : hairline,
                                ),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppRadius.control)),
                              ),
                              onPressed: _isLoading ? null : _handleBiometricLogin,
                              icon: Icon(
                                Icons.fingerprint_rounded,
                                color: _biometricEnabled ? accent : textSecondary,
                                size: 20,
                              ),
                              label: Text(
                                _biometricEnabled
                                    ? "Đăng nhập nhanh bằng Vân tay / FaceID"
                                    : "Đăng nhập bằng sinh trắc học",
                                style: TextStyle(
                                    color: textPrimary,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: AppSpacing.xxl),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "Chưa có tài khoản? ",
                        style: TextStyle(color: textSecondary, fontSize: 13),
                      ),
                      GestureDetector(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                                builder: (_) => const RegisterScreen()),
                          );
                        },
                        child: Text(
                          "Đăng ký",
                          style: TextStyle(
                            color: accent,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
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
}
