import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import 'device_history_screen.dart';
import 'device_settings_screen.dart';
import '../../cskh/screens/cskh_chat_screen.dart';
import '../../cskh/domain/entities/chat_device_item.dart';

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

  @override
  void initState() {
    super.initState();
    _device = widget.device;
    _isMeterOn = _device.currentProperties['is_meter_on'] != false;
    _powerLimitW = (_device.currentProperties['power_limit_w'] as num?)?.toInt() ?? 4500;
  }

  void _handleReset() {
    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "RESET");
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Đã gửi mã lệnh 0 (RESET) xuống phần cứng công tơ điện tử"),
        backgroundColor: AppTheme.brandBlue,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _handleTogglePowerSetting() {
    setState(() {
      _isSettingPower = !_isSettingPower;
    });
    if (!_isSettingPower) {
      _device.currentProperties['power_limit_w'] = _powerLimitW;
      _gateway.updateDeviceProperties(_device.hardwareId, {'power_limit_w': _powerLimitW});
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Đã lưu ngưỡng công suất: $_powerLimitW W lên máy chủ và gửi xuống phần cứng"),
          backgroundColor: AppTheme.emeraldSuccess,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _adjustPower(int delta) {
    if (!_isSettingPower) return;
    setState(() {
      _powerLimitW = (_powerLimitW + delta).clamp(500, 15000);
    });
  }

  void _startHoldingOk() {
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
    setState(() {
      _isMeterOn = false;
      _isSettingPower = false;
      _device.currentProperties['is_meter_on'] = false;
    });
    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "METER_POWER_OFF");
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Đã giữ > 5s: Đã tắt công tơ điện tử, gửi mã lệnh 1 xuống phần cứng!"),
        backgroundColor: AppTheme.crimsonDanger,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _turnOnMeter() {
    setState(() {
      _isMeterOn = true;
      _device.currentProperties['is_meter_on'] = true;
    });
    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "METER_POWER_ON");
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Đã bật công tơ điện tử, gửi mã lệnh 2 xuống phần cứng!"),
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
              "${_device.roomName} • ${_device.hardwareId}",
              style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5, fontFamily: "monospace"),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          // 1. Icon Biểu đồ Dashboard tiêu thụ điện (riêng cho Công tơ điện tử)
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
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => CskhChatScreen(
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
      body: Stack(
        children: [
          // NỀN MỜ CÔNG TY (AUSTEC BANNER WATERMARK)
          Positioned.fill(
            child: Opacity(
              opacity: isDark ? 0.16 : 0.08,
              child: Image.asset(
                "assets/austec_banner_new.png",
                fit: BoxFit.cover,
              ),
            ),
          ),

          // NỘI DUNG CHÍNH (GÓI GỌN TRỌN VẸN TRONG 1 MÀN HÌNH KHÔNG CUỘN)
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                children: [
                  // 1. LOGO & SLOGAN 2026 (Theo AUSTEC - 2026.pdf)
                  SizedBox(
                    height: 38,
                    child: Image.asset(
                      "assets/austec_logo_2026.png",
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Text(
                        "AUSTEC - Smart Technology for Modern Spaces",
                        style: TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

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
    );
  }

  // Giao diện khi công tơ đang TẮT (Chỉ hiện duy nhất nút Bật)
  Widget _buildMeterOffState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFEF4444).withValues(alpha: 0.12),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4), width: 2),
            ),
            child: const Icon(Icons.power_off_rounded, color: Color(0xFFEF4444), size: 48),
          ),
          const SizedBox(height: 18),
          const Text(
            "Thiết bị đang tắt",
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          const Text(
            "Rơ-le công tơ đã ngắt toàn bộ phụ tải điện an toàn",
            style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: 220,
            height: 48,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.emeraldSuccess,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.power_settings_new_rounded),
              label: const Text("Nhấn để bật thiết bị", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              onPressed: _turnOnMeter,
            ),
          ),
        ],
      ),
    );
  }

  // Màn hình hiển thị LCD & Bàn phím điều khiển công tơ
  Widget _buildMeterDisplay(bool isDark, Color textCol) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Thân đồng hồ công tơ LCD
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF141824),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF26324A), width: 1.5),
            boxShadow: const [
              BoxShadow(color: Colors.black45, blurRadius: 12, offset: Offset(0, 4)),
            ],
          ),
          child: Column(
            children: [
              // Màn hình hiển thị LCD dạ quang kỹ thuật số
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFF0A1926),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF1C3A5A), width: 1.5),
                ),
                child: Column(
                  children: [
                    // Dòng 1: kWh
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        const Text("kWh", style: TextStyle(color: Color(0xFF4ADE80), fontSize: 16, fontWeight: FontWeight.bold, fontFamily: "monospace")),
                        const Text(
                          "0123.45",
                          style: TextStyle(
                            color: Color(0xFF4ADE80),
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 3,
                            fontFamily: "monospace",
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: Color(0xFF16324D), height: 16),
                    // Dòng 2: Điện áp V
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("ĐIỆN ÁP", style: TextStyle(color: Color(0xFF67E8F9), fontSize: 11, fontWeight: FontWeight.bold)),
                        const Text(
                          "220.5 V",
                          style: TextStyle(color: Color(0xFF67E8F9), fontSize: 24, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    // Dòng 3: Dòng điện A & Công suất
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("DÒNG TẢI", style: TextStyle(color: Color(0xFFFDE047), fontSize: 11, fontWeight: FontWeight.bold)),
                        const Text(
                          "12.4 A",
                          style: TextStyle(color: Color(0xFFFDE047), fontSize: 24, fontWeight: FontWeight.bold, fontFamily: "monospace"),
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
                  _buildLedIndicator("POWER", Colors.green, true),
                  const SizedBox(width: 32),
                  _buildLedIndicator("STATUS", _isSettingPower ? Colors.amber : Colors.green, true),
                ],
              ),

              const SizedBox(height: 14),

              // Chế độ Cài đặt công suất hiển thị khi nhấn OK
              if (_isSettingPower) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.amberWarning.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.amberWarning),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "CÀI ĐẶT CÔNG SUẤT BẢO VỆ:",
                        style: TextStyle(color: AppTheme.amberWarning, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        "$_powerLimitW W",
                        style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900, fontFamily: "monospace"),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // 4 Nút bấm vật lý: UP, DOWN, OK, RESET
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
            "Nhấn OK 1 lần để cài công suất • Giữ OK > 5s để tắt công tơ • RESET gửi mã 0",
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textMuted, fontSize: 10.5),
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
            color: isOn ? color : Colors.grey[800],
            shape: BoxShape.circle,
            boxShadow: isOn
                ? [BoxShadow(color: color.withValues(alpha: 0.6), blurRadius: 6, spreadRadius: 1)]
                : null,
          ),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: Color(0xFF8E99B0), fontSize: 9.5, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildPhysicalMeterButton(String label, IconData icon, VoidCallback onTap, {bool isDanger = false}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 65,
        height: 44,
        decoration: BoxDecoration(
          color: isDanger ? const Color(0xFF7F1D1D) : const Color(0xFF1E2638),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isDanger ? const Color(0xFFEF4444) : const Color(0xFF334155)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 16),
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
        width: 65,
        height: 44,
        decoration: BoxDecoration(
          color: _isHoldingOk ? AppTheme.amberWarning : AppTheme.brandBlue,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.white30),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check, color: Colors.white, size: 16),
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

