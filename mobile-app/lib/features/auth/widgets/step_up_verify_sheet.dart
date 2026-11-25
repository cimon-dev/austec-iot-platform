import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/services/auth_service.dart';

/// BottomSheet xác thực Step-up OTP dùng chung toàn Mobile App (2 Option: Gmail mặc định + Zalo ZNS tùy chọn)
class StepUpVerifySheet extends StatefulWidget {
  final String purpose;
  final String title;
  final String warningDetail;
  final String? targetOverride;
  final bool isDanger;

  const StepUpVerifySheet({
    super.key,
    required this.purpose,
    required this.title,
    required this.warningDetail,
    this.targetOverride,
    this.isDanger = false,
  });

  /// Mở BottomSheet và trả về `stepUpToken` nếu người dùng xác thực thành công (hoặc `null` nếu hủy)
  static Future<String?> show(
    BuildContext context, {
    required String purpose,
    required String title,
    required String warningDetail,
    String? targetOverride,
    bool isDanger = false,
  }) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StepUpVerifySheet(
        purpose: purpose,
        title: title,
        warningDetail: warningDetail,
        targetOverride: targetOverride,
        isDanger: isDanger,
      ),
    );
  }

  @override
  State<StepUpVerifySheet> createState() => _StepUpVerifySheetState();
}

class _StepUpVerifySheetState extends State<StepUpVerifySheet> {
  final TextEditingController _otpController = TextEditingController();
  Map<String, dynamic>? _channels;
  String _selectedChannel = 'EMAIL';
  String? _challengeId;
  bool _otpSent = false;
  bool _isSending = false;
  bool _isConfirming = false;
  int _cooldown = 0;
  Timer? _timer;
  String? _infoMsg;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _loadChannels();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _loadChannels() async {
    final ch = await AuthService().getVerifyChannels();
    if (mounted) {
      setState(() => _channels = ch);
    }
  }

  void _startCooldown(int seconds) {
    _timer?.cancel();
    setState(() => _cooldown = seconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted || _cooldown <= 1) {
        t.cancel();
        if (mounted) setState(() => _cooldown = 0);
      } else {
        setState(() => _cooldown -= 1);
      }
    });
  }

  Future<void> _sendOtp() async {
    setState(() {
      _isSending = true;
      _errorMsg = null;
      _infoMsg = null;
    });

    final res = await AuthService().requestStepUpOtp(
      purpose: widget.purpose,
      channel: _selectedChannel,
      targetOverride: widget.targetOverride,
    );

    if (!mounted) return;
    setState(() => _isSending = false);

    if (res['success'] == true) {
      setState(() {
        _otpSent = true;
        _challengeId = res['challengeId']?.toString();
        _infoMsg = res['message']?.toString() ?? 'Đã gửi mã OTP 6 chữ số!';
      });
      _startCooldown((res['cooldownSeconds'] as num?)?.toInt() ?? 45);
    } else {
      setState(() => _errorMsg = res['error']?.toString() ?? 'Không thể gửi mã OTP.');
    }
  }

  Future<void> _confirmOtp() async {
    final code = _otpController.text.trim();
    if (code.length != 6) {
      setState(() => _errorMsg = 'Vui lòng nhập đủ mã OTP 6 chữ số.');
      return;
    }

    setState(() {
      _isConfirming = true;
      _errorMsg = null;
    });

    final res = await AuthService().confirmStepUpOtp(
      purpose: widget.purpose,
      code: code,
      challengeId: _challengeId,
    );

    if (!mounted) return;
    setState(() => _isConfirming = false);

    if (res['success'] == true && res['stepUpToken'] != null) {
      Navigator.of(context).pop(res['stepUpToken'].toString());
    } else {
      setState(() => _errorMsg = res['error']?.toString() ?? 'Mã OTP không chính xác.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final sheetBg = isDark ? const Color(0xFF141924) : Colors.white;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
    final borderCol = isDark ? const Color(0xFF26324A) : const Color(0xFFE2E8F0);
    final accentCol = widget.isDanger ? AppTheme.roseDanger : AppTheme.brandBlue;

    final emailMap = _channels?['email'] as Map?;
    final zaloMap = _channels?['zalo'] as Map?;
    final emailTarget = (widget.targetOverride != null && widget.targetOverride!.contains('@'))
        ? widget.targetOverride!
        : (emailMap?['maskedTarget']?.toString() ?? 'Gmail tài khoản');

    final bool zaloAvailable = zaloMap?['available'] == true;
    final bool zaloEnabledOnServer = zaloMap?['enabledOnServer'] == true;
    final bool zaloHasPhone = zaloMap?['hasPhone'] == true;
    final String zaloSubtitle = _channels == null
        ? 'Đang kiểm tra...'
        : !zaloEnabledOnServer
            ? 'Tùy chọn thêm (chưa bật key Zalo ZNS)'
            : !zaloHasPhone
                ? 'Tài khoản chưa có số điện thoại'
                : 'Gửi OTP về Zalo ${zaloMap?['maskedTarget'] ?? ''}';

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: sheetBg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(color: borderCol),
        ),
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: subTextCol.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Icon(
                      widget.isDanger ? Icons.warning_amber_rounded : Icons.verified_user_rounded,
                      color: accentCol,
                      size: 22,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.title,
                        style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: subTextCol, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: (widget.isDanger ? AppTheme.roseDanger : AppTheme.amberWarning)
                        .withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: (widget.isDanger ? AppTheme.roseDanger : AppTheme.amberWarning)
                          .withValues(alpha: 0.32),
                    ),
                  ),
                  child: Text(
                    widget.warningDetail,
                    style: TextStyle(color: textCol, fontSize: 12, height: 1.4),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Chọn kênh nhận mã xác thực OTP:',
                  style: TextStyle(color: subTextCol, fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),

                // Option 1: Gmail (Luôn có sẵn)
                InkWell(
                  onTap: () => setState(() => _selectedChannel = 'EMAIL'),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _selectedChannel == 'EMAIL'
                          ? AppTheme.cyanAccent.withValues(alpha: 0.10)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _selectedChannel == 'EMAIL' ? AppTheme.cyanAccent : borderCol,
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.mail_outline_rounded, color: AppTheme.cyanAccent, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    'Xác thực qua Gmail',
                                    style: TextStyle(
                                      color: textCol,
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'Mặc định',
                                      style: TextStyle(
                                        color: AppTheme.emeraldSuccess,
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              Text(emailTarget, style: TextStyle(color: subTextCol, fontSize: 11.5)),
                            ],
                          ),
                        ),
                        if (_selectedChannel == 'EMAIL')
                          const Icon(Icons.check_circle, color: AppTheme.cyanAccent, size: 18),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                // Option 2: Zalo ZNS (Tùy chọn thêm)
                Opacity(
                  opacity: zaloAvailable ? 1.0 : 0.55,
                  child: InkWell(
                    onTap: zaloAvailable ? () => setState(() => _selectedChannel = 'ZALO') : null,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _selectedChannel == 'ZALO' && zaloAvailable
                            ? AppTheme.brandBlue.withValues(alpha: 0.12)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _selectedChannel == 'ZALO' && zaloAvailable
                              ? AppTheme.brandBlue
                              : borderCol,
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.chat_bubble_outline_rounded,
                              color: AppTheme.brandBlue, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      'Xác thực qua Zalo ZNS',
                                      style: TextStyle(
                                        color: textCol,
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: AppTheme.brandBlue.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: const Text(
                                        'Tùy chọn',
                                        style: TextStyle(
                                          color: AppTheme.brandBlue,
                                          fontSize: 9.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                Text(zaloSubtitle, style: TextStyle(color: subTextCol, fontSize: 11.5)),
                              ],
                            ),
                          ),
                          if (_selectedChannel == 'ZALO' && zaloAvailable)
                            const Icon(Icons.check_circle, color: AppTheme.brandBlue, size: 18),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                SizedBox(
                  height: 42,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.cyanAccent,
                      side: const BorderSide(color: AppTheme.cyanAccent),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: (_isSending || _cooldown > 0) ? null : _sendOtp,
                    icon: _isSending
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send_rounded, size: 16),
                    label: Text(
                      _cooldown > 0
                          ? 'Gửi lại mã sau ${_cooldown}s'
                          : (_otpSent
                              ? 'Gửi lại mã qua ${_selectedChannel == 'EMAIL' ? 'Gmail' : 'Zalo'}'
                              : 'Gửi mã OTP qua ${_selectedChannel == 'EMAIL' ? 'Gmail' : 'Zalo'}'),
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),

                if (_infoMsg != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.emeraldSuccess.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      _infoMsg!,
                      style: const TextStyle(color: AppTheme.emeraldSuccess, fontSize: 12),
                    ),
                  ),
                ],
                if (_errorMsg != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.roseDanger.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      _errorMsg!,
                      style: const TextStyle(color: AppTheme.roseDanger, fontSize: 12),
                    ),
                  ),
                ],

                const SizedBox(height: 12),
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: textCol,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 10,
                    fontFamily: 'monospace',
                  ),
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: '000000',
                    counterText: '',
                    hintStyle: TextStyle(color: subTextCol.withValues(alpha: 0.45)),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF0E131D) : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: borderCol),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: accentCol, width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  height: 46,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accentCol,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    onPressed: (_isConfirming || _otpController.text.trim().length != 6)
                        ? null
                        : _confirmOtp,
                    child: _isConfirming
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Text(
                            'Xác nhận OTP & Tiếp tục',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

