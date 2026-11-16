import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../chat/models/conversation_item.dart';
import '../../chat/screens/chat_room_screen.dart';
import '../../cskh/domain/entities/chat_device_item.dart';
import 'device_history_screen.dart';
import 'device_settings_screen.dart';

class SmartMetterDetailScreen extends StatefulWidget {
  final DeviceItem device;

  const SmartMetterDetailScreen({super.key, required this.device});

  @override
  State<SmartMetterDetailScreen> createState() => _SmartMetterDetailScreenState();
}

class _SmartMetterDetailScreenState extends State<SmartMetterDetailScreen> {
  final IoTGatewayClient _gateway = IoTGatewayClient();
  late DeviceItem _device;

  bool _isMeterOn = true;
  bool _isSettingPower = false;
  int _powerLimitW = 4500;
  Timer? _longPressTimer;
  int _longPressSeconds = 0;
  bool _isHoldingOk = false;
  StreamSubscription? _deviceUpdateSub;

  @override
  void initState() {
    super.initState();
    _device = widget.device;
    _syncProperties();
    _deviceUpdateSub = _gateway.onDeviceUpdated.listen((_) {
      final updated = _gateway.findByHardwareId(_device.hardwareId);
      if (updated != null && mounted) {
        setState(() {
          _device = updated;
          _syncProperties();
        });
      }
    });
  }

  @override
  void dispose() {
    _deviceUpdateSub?.cancel();
    _longPressTimer?.cancel();
    super.dispose();
  }

  void _syncProperties() {
    final p = _device.currentProperties;
    _isMeterOn = p['relay_status'] == 'ON' || (p['relay_status'] == null && p['is_meter_on'] != false);
    final cfg = p['power_limit_w'] ?? p['p_warn_cfg'] ?? 4500;
    _powerLimitW = (cfg is num) ? cfg.toInt() : 4500;
  }

  double get _voltage => (_device.currentProperties['voltage'] as num?)?.toDouble() ?? 220.5;
  double get _current => (_device.currentProperties['current'] as num?)?.toDouble() ?? 0.0;
  double get _power => (_device.currentProperties['power'] as num?)?.toDouble() ?? 0.0;
  double get _totalKwh => (_device.currentProperties['total_kwh'] ?? _device.currentProperties['energy'] as num?)?.toDouble() ?? 0.0;
  double get _dailyKwh => (_device.currentProperties['daily_kwh'] as num?)?.toDouble() ?? 0.0;
  String? get _alarm => _device.currentProperties['alarm']?.toString();

  void _handleReset() {
    if (!_device.canPerformControl) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(!_device.canControl
              ? "Tài khoản của bạn đã bị chủ nhà giới hạn quyền điều khiển"
              : "Hiện ngoài khung giờ cho phép điều khiển (${_device.accessStartTime} - ${_device.accessEndTime})"),
          backgroundColor: AppTheme.amberWarning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "RESET");
    setState(() {
      _device.currentProperties['alarm'] = null;
      _device.currentProperties['relay_status'] = 'ON';
      _device.currentProperties['is_meter_on'] = true;
      _isMeterOn = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Đã gửi mã lệnh 0 (RESET): Xóa cảnh báo & đóng lại nguồn điện."),
        backgroundColor: AppTheme.brandBlue,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _handleTogglePowerSetting() {
    if (!_device.canConfig) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Bạn không có quyền thay đổi thông số cấu hình công tơ điện"),
          backgroundColor: AppTheme.amberWarning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() {
      _isSettingPower = !_isSettingPower;
    });
    if (!_isSettingPower) {
      _device.currentProperties['power_limit_w'] = _powerLimitW;
      _gateway.updateDeviceProperties(_device.hardwareId, {'power_limit_w': _powerLimitW});
      _gateway.sendCommand(
        hardwareId: _device.hardwareId,
        action: "CONFIG_POWER_LIMIT",
        parameters: {'power_limit': _powerLimitW},
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Đã lưu giới hạn công suất: $_powerLimitW W xuống công tơ điện tử!"),
          backgroundColor: AppTheme.emeraldSuccess,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _adjustPower(int delta) {
    if (!_isSettingPower || !_device.canConfig) return;
    setState(() {
      _powerLimitW = (_powerLimitW + delta).clamp(500, 15000);
    });
  }

  void _startHoldingOk() {
    if (!_device.canPerformControl) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(!_device.canControl
              ? "Tài khoản của bạn đã bị chủ nhà giới hạn quyền điều khiển"
              : "Hiện ngoài khung giờ cho phép điều khiển (${_device.accessStartTime} - ${_device.accessEndTime})"),
          backgroundColor: AppTheme.amberWarning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    _longPressSeconds = 0;
    _isHoldingOk = true;
    _longPressTimer?.cancel();
    _longPressTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _longPressSeconds++;
      if (_longPressSeconds >= 5) {
        timer.cancel();
        _isHoldingOk = false;
        _turnOffMeter();
      }
    });
  }

  void _stopHoldingOk() {
    if (_longPressSeconds < 5 && _isHoldingOk) {
      _longPressTimer?.cancel();
      _isHoldingOk = false;
      _handleTogglePowerSetting();
    }
  }

  void _turnOffMeter() {
    if (!_device.canPerformControl) return;

    setState(() {
      _isMeterOn = false;
      _isSettingPower = false;
      _device.currentProperties['is_meter_on'] = false;
      _device.currentProperties['relay_status'] = 'OFF';
    });
    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "METER_POWER_OFF");
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Đã giữ > 5s: Đã ngắt rơ-le công tơ điện tử an toàn (Lệnh 14)!"),
        backgroundColor: AppTheme.crimsonDanger,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _turnOnMeter() {
    if (!_device.canPerformControl) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(!_device.canControl
              ? "Tài khoản của bạn đã bị chủ nhà giới hạn quyền điều khiển"
              : "Hiện ngoài khung giờ cho phép điều khiển (${_device.accessStartTime} - ${_device.accessEndTime})"),
          backgroundColor: AppTheme.amberWarning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() {
      _isMeterOn = true;
      _device.currentProperties['is_meter_on'] = true;
      _device.currentProperties['relay_status'] = 'ON';
    });
    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "METER_POWER_ON");
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Đã bật nguồn điện công tơ điện tử (Lệnh 13)!"),
        backgroundColor: AppTheme.emeraldSuccess,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    return Scaffold(
      backgroundColor: bgCol,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: textCol, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          children: [
            Text(
              _device.name,
              style: TextStyle(color: textCol, fontSize: 15, fontWeight: FontWeight.bold),
            ),
            Text(
              "${_device.roomName.isNotEmpty ? '${_device.roomName} • ' : ''}${_device.hardwareId}",
              style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5, fontFamily: "monospace"),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          // 1. Icon Biểu đồ Dashboard tiêu thụ điện
          if (_device.canViewHistory)
            IconButton(
              icon: const Icon(Icons.bar_chart_rounded, color: AppTheme.cyanAccent, size: 22),
              tooltip: "Biểu đồ tiêu thụ điện",
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => DeviceHistoryScreen(device: _device, initialTabIndex: 0),
                  ),
                );
              },
            ),
          // 2. Icon Xem Lịch sử sự cố
          if (_device.canViewHistory)
            IconButton(
              icon: Icon(Icons.history_rounded, color: textCol, size: 22),
              tooltip: "Lịch sử sự cố",
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => DeviceHistoryScreen(device: _device, initialTabIndex: 1),
                  ),
                );
              },
            ),
          // 3. Icon Cài đặt tham số
          if (_device.canConfig)
            IconButton(
              icon: Icon(Icons.settings_outlined, color: textCol, size: 20),
              tooltip: "Cài đặt tham số",
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => DeviceSettingsScreen(device: _device),
                  ),
                );
              },
            ),
          // 4. Icon CSKH
          IconButton(
            icon: const Icon(Icons.headset_mic_outlined, color: AppTheme.cyanAccent, size: 20),
            tooltip: "Hỗ trợ CSKH",
            onPressed: () {
              final chatDev = ChatDeviceItem(
                isOwned: true,
                hardwareId: _device.hardwareId,
                deviceName: _device.name,
                modelName: _device.modelName,
                categoryTag: "CÔNG TƠ ĐIỆN",
              );
              final cskhConv = ConversationItem(
                id: 'cskh-conv-${AuthService().currentUser?.id ?? "usr-default"}',
                type: 'CSKH',
                title: 'HỖ TRỢ KỸ THUẬT & CSKH AUSTEC 24/7',
                avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
                lastMessage: 'Dạ em chào Quý khách! Kỹ thuật viên Austec đã sẵn sàng hỗ trợ trực tuyến 24/7.',
              );
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => ChatRoomScreen(
                    conversation: cskhConv,
                    initialDevice: chatDev,
                    initialPrompt: "Xin chào CSKH Austec! Tôi cần hỗ trợ kỹ thuật về Công tơ điện tử ${_device.name} (ID: ${_device.hardwareId}).",
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SizedBox.expand(
        child: Stack(
          fit: StackFit.expand,
          children: [
            // 1. Background Watermark Công Ty AUSTEC
            Positioned.fill(
              child: Image.asset(
                "assets/austec_banner_new.png",
                width: double.infinity,
                height: double.infinity,
                fit: BoxFit.cover,
                alignment: Alignment.center,
              ),
            ),
            // Lớp phủ tối sâu (88% dark / 78% light) giúp khối nổi bật rõ ràng, không bị chìm
            Positioned.fill(
              child: Container(
                color: Colors.black.withValues(alpha: isDark ? 0.88 : 0.78),
              ),
            ),

            // NỘI DUNG CHÍNH (GÓI GỌN TRỌN VẸN TRONG 1 MÀN HÌNH KHÔNG CUỘN)
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  children: [
                    // 1. LOGO & SLOGAN 2026 to rõ, căn giữa
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 2, bottom: 8),
                        child: Image.asset(
                          "assets/austec_logo_2026.png",
                          height: 44,
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),

                    // Cảnh báo nếu có sự cố rò điện hoặc quá dòng
                    if (_alarm != null && _alarm!.isNotEmpty) ...[
                      Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF7F1D1D),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFEF4444), width: 1.5),
                          boxShadow: const [
                            BoxShadow(color: Color(0x66EF4444), blurRadius: 10, spreadRadius: 1),
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                "CẢNH BÁO: $_alarm - Đã ngắt rơ-le an toàn!",
                                style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                              ),
                            ),
                            TextButton(
                              onPressed: _handleReset,
                              style: TextButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: const Color(0xFF991B1B),
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                minimumSize: const Size(0, 24),
                              ),
                              child: const Text("RESET", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10)),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // 2. KHUNG NỘI DUNG ĐIỀU KHIỂN CHÍNH
                    Expanded(
                      child: _isMeterOn
                          ? _buildMeterDisplay(isDark, textCol)
                          : _buildMeterOffState(),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Giao diện khi công tơ đang TẮT
  Widget _buildMeterOffState() {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        decoration: BoxDecoration(
          color: const Color(0xFF0F1523),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF1E2D4A), width: 2),
          boxShadow: const [
            BoxShadow(color: Colors.black54, blurRadius: 20, offset: Offset(0, 8)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFEF4444), width: 2),
              ),
              child: const Icon(Icons.power_off_rounded, color: Color(0xFFEF4444), size: 52),
            ),
            const SizedBox(height: 20),
            const Text(
              "CÔNG TƠ ĐANG NGẮT NGUỒN",
              style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900, letterSpacing: 0.5),
            ),
            const SizedBox(height: 8),
            const Text(
              "Rơ-le công tơ đã ngắt toàn bộ phụ tải điện an toàn.",
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 26),
            SizedBox(
              width: 230,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.emeraldSuccess,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 6,
                ),
                icon: const Icon(Icons.power_settings_new_rounded, size: 20),
                label: const Text("BẬT LẠI CÔNG TƠ ĐIỆN", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                onPressed: _turnOnMeter,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Màn hình hiển thị LCD & Bàn phím điều khiển công tơ
  Widget _buildMeterDisplay(bool isDark, Color textCol) {
    final kwhStr = _totalKwh > 0
        ? _totalKwh.toStringAsFixed(2).padLeft(7, '0')
        : "0000.00";
    final vStr = "${_voltage.toStringAsFixed(1)} V";
    final aStr = "${_current.toStringAsFixed(2)} A";
    final pStr = "${_power.toStringAsFixed(0)} W";
    final dayStr = "${_dailyKwh.toStringAsFixed(2)} kWh";

    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Thân đồng hồ công tơ LCD: Màu nền đậm sâu, viền dập nổi sắc nét
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0D1322),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF1E2D4A), width: 2),
            boxShadow: const [
              BoxShadow(color: Colors.black87, blurRadius: 24, spreadRadius: 2, offset: Offset(0, 10)),
            ],
          ),
          child: Column(
            children: [
              // Màn hình hiển thị LCD dạ quang kỹ thuật số (Màu kính LCD OLED đen sâu)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFF030712),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.6), width: 2),
                  boxShadow: const [
                    BoxShadow(color: Color(0x330284C7), blurRadius: 14, spreadRadius: 1),
                  ],
                ),
                child: Column(
                  children: [
                    // Dòng 1: kWh
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        const Text(
                          "kWh (TỔNG)",
                          style: TextStyle(color: Color(0xFF4ADE80), fontSize: 13, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                        ),
                        Text(
                          kwhStr,
                          style: const TextStyle(
                            color: Color(0xFF4ADE80),
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 3,
                            fontFamily: "monospace",
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: Color(0xFF162A45), height: 16, thickness: 1.2),
                    // Dòng 2: Điện áp V & Công suất P
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text("ĐIỆN ÁP", style: TextStyle(color: Color(0xFF67E8F9), fontSize: 10.5, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 2),
                            Text(
                              vStr,
                              style: const TextStyle(color: Color(0xFF67E8F9), fontSize: 22, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text("CÔNG SUẤT", style: TextStyle(color: Color(0xFFFB923C), fontSize: 10.5, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 2),
                            Text(
                              pStr,
                              style: const TextStyle(color: Color(0xFFFB923C), fontSize: 22, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Dòng 3: Dòng điện A & Sản lượng ngày
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text("DÒNG TẢI", style: TextStyle(color: Color(0xFFFDE047), fontSize: 10.5, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 2),
                            Text(
                              aStr,
                              style: const TextStyle(color: Color(0xFFFDE047), fontSize: 20, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text("HÔM NAY", style: TextStyle(color: Color(0xFFA78BFA), fontSize: 10.5, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 2),
                            Text(
                              dayStr,
                              style: const TextStyle(color: Color(0xFFA78BFA), fontSize: 20, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Đèn LED báo nguồn & Trạng thái
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildLedIndicator("NGUỒN", const Color(0xFF22C55E), true),
                  const SizedBox(width: 36),
                  _buildLedIndicator("RƠ-LE", _isMeterOn ? const Color(0xFF22C55E) : const Color(0xFFEF4444), true),
                  const SizedBox(width: 36),
                  _buildLedIndicator("CÀI ĐẶT", _isSettingPower ? const Color(0xFFF59E0B) : const Color(0xFF334155), _isSettingPower),
                ],
              ),

              const SizedBox(height: 14),

              // Chế độ Cài đặt công suất hiển thị khi nhấn OK
              if (_isSettingPower) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF78350F).withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "CÀI ĐẶT CÔNG SUẤT BẢO VỆ:",
                        style: TextStyle(color: Color(0xFFFDE047), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        "$_powerLimitW W",
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900, fontFamily: "monospace"),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // 4 Nút bấm vật lý: UP, DOWN, OK, RESET (Nền khối đậm, viền nổi, tương tác xúc giác)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildPhysicalMeterButton("UP", Icons.keyboard_arrow_up, () => _adjustPower(100)),
                  _buildPhysicalMeterButton("DOWN", Icons.keyboard_arrow_down, () => _adjustPower(-100)),
                  _buildOkButton(),
                  _buildPhysicalMeterButton("RESET", Icons.refresh, _handleReset, isDanger: true),
                ],
              ),
            ],
          ),
        ),

        // Chú thích ngắn gọn cho người dùng
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 8),
          child: Text(
            "Nhấn OK: Bật/Lưu cài công suất • Giữ OK > 5s: Tắt công tơ • RESET: Xóa cảnh báo & đóng điện",
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
          ),
        ),
      ],
    );
  }

  Widget _buildLedIndicator(String label, Color color, bool isOn) {
    return Column(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: isOn ? color : const Color(0xFF1E293B),
            shape: BoxShape.circle,
            boxShadow: isOn
                ? [BoxShadow(color: color.withValues(alpha: 0.8), blurRadius: 8, spreadRadius: 1)]
                : null,
          ),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildPhysicalMeterButton(String label, IconData icon, VoidCallback onTap, {bool isDanger = false}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 68,
        height: 46,
        decoration: BoxDecoration(
          color: isDanger ? const Color(0xFF991B1B) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isDanger ? const Color(0xFFEF4444) : const Color(0xFF475569), width: 1.5),
          boxShadow: const [
            BoxShadow(color: Colors.black45, blurRadius: 4, offset: Offset(0, 2)),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 17),
            const SizedBox(height: 1),
            Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildOkButton() {
    return GestureDetector(
      onTapDown: (_) => _startHoldingOk(),
      onTapUp: (_) => _stopHoldingOk(),
      onTapCancel: () {
        _longPressTimer?.cancel();
        _isHoldingOk = false;
      },
      child: Container(
        width: 68,
        height: 46,
        decoration: BoxDecoration(
          color: _isHoldingOk ? const Color(0xFFD97706) : const Color(0xFF2563EB),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: _isHoldingOk ? const Color(0xFFFBBF24) : const Color(0xFF60A5FA),
            width: 1.5,
          ),
          boxShadow: const [
            BoxShadow(color: Colors.black45, blurRadius: 4, offset: Offset(0, 2)),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check, color: Colors.white, size: 17),
            const SizedBox(height: 1),
            Text(
              _isHoldingOk ? "> ${_longPressSeconds}s" : "OK",
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
