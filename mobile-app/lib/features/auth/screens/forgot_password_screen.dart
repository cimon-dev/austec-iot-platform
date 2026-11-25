import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/services/auth_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  final String initialIdentifier;
  const ForgotPasswordScreen({super.key, this.initialIdentifier = ''});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  late final TextEditingController _identifierController;
  final TextEditingController _otpController = TextEditingController();
  final TextEditingController _newPwdController = TextEditingController();
  final TextEditingController _confirmPwdController = TextEditingController();

  bool _stepVerify = false;
  Map<String, dynamic>? _channels;
  String _selectedChannel = 'EMAIL';
  String? _challengeId;
  bool _isLoading = false;
  bool _obscurePwd = true;
  String? _infoMsg;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _identifierController = TextEditingController(text: widget.initialIdentifier);
  }

  @override
  void dispose() {
    _identifierController.dispose();
    _otpController.dispose();
    _newPwdController.dispose();
    _confirmPwdController.dispose();
    super.dispose();
  }

  Future<void> _lookupAccount() async {
    final id = _identifierController.text.trim();
    if (id.isEmpty) {
      setState(() => _errorMsg = 'Vui lòng nhập Email hoặc Số điện thoại đã đăng ký.');
      return;
    }
    setState(() {
      _isLoading = true;
      _errorMsg = null;
      _infoMsg = null;
    });

    final res = await AuthService().forgotPasswordOptions(id);
    if (!mounted) return;
    setState(() => _isLoading = false);

    if (res['success'] == true && res['channels'] is Map) {
      setState(() {
        _channels = Map<String, dynamic>.from(res['channels'] as Map);
        _selectedChannel = 'EMAIL';
        _stepVerify = true;
      });
    } else {
      setState(() => _errorMsg = res['error']?.toString() ?? 'Không tìm thấy tài khoản.');
    }
  }

  Future<void> _sendOtp() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
      _infoMsg = null;
    });

    final res = await AuthService().requestForgotPasswordOtp(
      identifier: _identifierController.text.trim(),
      channel: _selectedChannel,
    );
    if (!mounted) return;
    setState(() => _isLoading = false);

    if (res['success'] == true) {
      setState(() {
        _challengeId = res['challengeId']?.toString();
        _infoMsg = res['message']?.toString() ?? 'Đã gửi mã OTP khôi phục!';
      });
    } else {
      setState(() => _errorMsg = res['error']?.toString() ?? 'Không thể gửi mã OTP.');
    }
  }

  Future<void> _submitReset() async {
    final code = _otpController.text.trim();
    final newPwd = _newPwdController.text;
    final confPwd = _confirmPwdController.text;

    if (code.length != 6) {
      setState(() => _errorMsg = 'Vui lòng nhập đủ mã OTP 6 chữ số.');
      return;
    }
    if (newPwd.length < 6) {
      setState(() => _errorMsg = 'Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPwd != confPwd) {
      setState(() => _errorMsg = 'Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    final res = await AuthService().confirmForgotPassword(
      identifier: _identifierController.text.trim(),
      code: code,
      newPassword: newPwd,
      confirmPassword: confPwd,
      challengeId: _challengeId,
    );

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (res['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res['message']?.toString() ?? 'Đặt lại mật khẩu thành công!'),
          backgroundColor: AppTheme.emeraldSuccess,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pop();
    } else {
      setState(() => _errorMsg = res['error']?.toString() ?? 'Không thể đặt lại mật khẩu.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final bg = AppTheme.dynamicBackground;
    final textPrimary = AppTheme.dynamicTextPrimary;
    final textSecondary = AppTheme.dynamicTextSecondary;
    final raised = AppTheme.dynamicSurfaceRaised;
    final hairline = AppTheme.dynamicHairline;
    final accent = AppTheme.dynamicAccent;

    final emailMap = _channels?['email'] as Map?;
    final zaloMap = _channels?['zalo'] as Map?;
    final bool zaloAvailable = zaloMap?['available'] == true;

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
          'Khôi phục mật khẩu',
          style: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Container(
            padding: const EdgeInsets.all(AppSpacing.xl),
            decoration: AppTheme.glassBox(radius: AppRadius.card),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _stepVerify ? 'Chọn kênh nhận OTP & Đặt mật khẩu mới' : 'Tìm tài khoản của bạn',
                  style: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  _stepVerify
                      ? 'Hệ thống hỗ trợ nhận mã qua Gmail (mặc định) hoặc Zalo ZNS (tùy chọn).'
                      : 'Nhập Email hoặc Số điện thoại bạn đã dùng để đăng ký Austec Smart Home.',
                  style: TextStyle(color: textSecondary, fontSize: 12.5, height: 1.4),
                ),
                const SizedBox(height: 16),

                if (_errorMsg != null) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.roseDanger.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(_errorMsg!, style: const TextStyle(color: AppTheme.roseDanger, fontSize: 12)),
                  ),
                ],
                if (_infoMsg != null) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.emeraldSuccess.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(_infoMsg!, style: const TextStyle(color: AppTheme.emeraldSuccess, fontSize: 12)),
                  ),
                ],

                if (!_stepVerify) ...[
                  TextField(
                    controller: _identifierController,
                    style: TextStyle(color: textPrimary, fontSize: 14),
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: 'Email hoặc số điện thoại',
                      filled: true,
                      fillColor: raised,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.control)),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.control),
                        borderSide: BorderSide(color: hairline),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 46,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: accent,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.control)),
                      ),
                      onPressed: _isLoading ? null : _lookupAccount,
                      child: _isLoading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text('Tiếp tục', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ] else ...[
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _selectedChannel = 'EMAIL'),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: _selectedChannel == 'EMAIL'
                                  ? accent.withValues(alpha: 0.14)
                                  : raised,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: _selectedChannel == 'EMAIL' ? accent : hairline,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Gmail (Mặc định)',
                                    style: TextStyle(color: textPrimary, fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 2),
                                Text(
                                  emailMap?['maskedTarget']?.toString() ?? 'Gmail',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: textSecondary, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Opacity(
                          opacity: zaloAvailable ? 1.0 : 0.5,
                          child: InkWell(
                            onTap: zaloAvailable ? () => setState(() => _selectedChannel = 'ZALO') : null,
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: _selectedChannel == 'ZALO' && zaloAvailable
                                    ? AppTheme.brandBlue.withValues(alpha: 0.14)
                                    : raised,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: _selectedChannel == 'ZALO' && zaloAvailable
                                      ? AppTheme.brandBlue
                                      : hairline,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Zalo ZNS',
                                      style: TextStyle(color: textPrimary, fontSize: 12, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 2),
                                  Text(
                                    zaloAvailable
                                        ? (zaloMap?['maskedTarget']?.toString() ?? 'Zalo')
                                        : 'Chưa kích hoạt',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(color: textSecondary, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _isLoading ? null : _sendOtp,
                    icon: const Icon(Icons.send_rounded, size: 16),
                    label: Text('Gửi mã OTP qua ${_selectedChannel == 'EMAIL' ? 'Gmail' : 'Zalo'}'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    style: TextStyle(color: textPrimary, fontSize: 16, letterSpacing: 6),
                    decoration: InputDecoration(
                      labelText: 'Mã OTP 6 chữ số',
                      counterText: '',
                      filled: true,
                      fillColor: raised,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.control)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _newPwdController,
                    obscureText: _obscurePwd,
                    style: TextStyle(color: textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      labelText: 'Mật khẩu mới (tối thiểu 6 ký tự)',
                      filled: true,
                      fillColor: raised,
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePwd ? Icons.visibility_off : Icons.visibility, size: 18),
                        onPressed: () => setState(() => _obscurePwd = !_obscurePwd),
                      ),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.control)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _confirmPwdController,
                    obscureText: _obscurePwd,
                    style: TextStyle(color: textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      labelText: 'Xác nhận mật khẩu mới',
                      filled: true,
                      fillColor: raised,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.control)),
                    ),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    height: 46,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: accent,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.control)),
                      ),
                      onPressed: _isLoading ? null : _submitReset,
                      child: _isLoading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text('Đặt lại mật khẩu', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

