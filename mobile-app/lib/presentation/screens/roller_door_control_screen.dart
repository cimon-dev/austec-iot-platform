import 'package:flutter/material.dart';
import 'dart:async';
import '../../core/constants/app_theme.dart';
import '../../core/models/device_model.dart';
import '../../core/services/iot_gateway_client.dart';
import 'device_history_screen.dart';
import 'device_settings_screen.dart';

class RollerDoorControlScreen extends StatefulWidget {
  final DeviceItem device;

  const RollerDoorControlScreen({super.key, required this.device});

  @override
  State<RollerDoorControlScreen> createState() => _RollerDoorControlScreenState();
}

class _RollerDoorControlScreenState extends State<RollerDoorControlScreen> with TickerProviderStateMixin {
  final IoTGatewayClient _gateway = IoTGatewayClient();
  late DeviceItem _device;

  // Trạng thái vận hành thực tế
  Timer? _travelTimer;
  double _currentPercent = 0.0;
  bool _isOpening = false;
  bool _isClosing = false;
  bool _isStopped = true;

  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _device = widget.device;
    _currentPercent = _device.positionPercent.toDouble();
    _isStopped = true;

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _travelTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  // 1. MỞ CỬA DẦN DẦN (Real-time Gradual Travel UP)
  void _startOpenDoor() {
    if (_device.isChildLockActive) {
      _showLockedWarning();
      return;
    }
    _travelTimer?.cancel();

    setState(() {
      _isOpening = true;
      _isClosing = false;
      _isStopped = false;
    });

    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "OPEN_DOOR");

    // Tốc độ di chuyển dựa trên timeout mở (mặc định 23s, mô phỏng mượt mà ~6-8s hoàn thành)
    const tickMs = 60;
    final totalTicks = (_device.openTimeoutSeconds * 1000 / tickMs).clamp(60, 160);
    final step = (100.0 - _currentPercent) / totalTicks;

    _travelTimer = Timer.periodic(const Duration(milliseconds: tickMs), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        _currentPercent += step;
        if (_currentPercent >= 100.0) {
          _currentPercent = 100.0;
          _isOpening = false;
          _isStopped = true;
          _travelTimer?.cancel();
          _device.positionPercent = 100;
        } else {
          _device.positionPercent = _currentPercent.round();
        }
      });
    });
  }

  // 2. ĐÓNG CỬA DẦN DẦN (Real-time Gradual Travel DOWN)
  void _startCloseDoor() {
    if (_device.isChildLockActive) {
      _showLockedWarning();
      return;
    }
    _travelTimer?.cancel();

    setState(() {
      _isClosing = true;
      _isOpening = false;
      _isStopped = false;
    });

    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "CLOSE_DOOR");

    const tickMs = 60;
    final totalTicks = (_device.closeTimeoutSeconds * 1000 / tickMs).clamp(60, 160);
    final step = _currentPercent / totalTicks;

    _travelTimer = Timer.periodic(const Duration(milliseconds: tickMs), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        _currentPercent -= step;
        if (_currentPercent <= 0.0) {
          _currentPercent = 0.0;
          _isClosing = false;
          _isStopped = true;
          _travelTimer?.cancel();
          _device.positionPercent = 0;
        } else {
          _device.positionPercent = _currentPercent.round();
        }
      });
    });
  }

  // 3. DỪNG CỬA NGAY TẠI VỊ TRÍ HIỆN TẠI (Immediate STOP)
  void _stopDoor() {
    _travelTimer?.cancel();
    setState(() {
      _isOpening = false;
      _isClosing = false;
      _isStopped = true;
      _device.positionPercent = _currentPercent.round();
    });

    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "STOP_DOOR");

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("Đã dừng cửa cuốn tại vị trí ${_currentPercent.round()}%"),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // 4. BẬT / TẮT KHÓA AN TOÀN TRẺ EM
  void _toggleLock() {
    _travelTimer?.cancel();
    setState(() {
      _device.isChildLockActive = !_device.isChildLockActive;
      _isOpening = false;
      _isClosing = false;
      _isStopped = true;
    });

    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "TOGGLE_CHILD_LOCK");

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_device.isChildLockActive
            ? "ĐÃ KHÓA AN TOÀN TRẺ EM! Vô hiệu hóa remote RF và nút bấm."
            : "ĐÃ MỞ KHÓA CỬA! Hệ thống sẵn sàng vận hành."),
        backgroundColor: _device.isChildLockActive ? AppTheme.amberWarning : AppTheme.emeraldSuccess,
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showLockedWarning() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Cửa đang KHÓA AN TOÀN! Vui lòng mở khóa trước khi điều khiển."),
        backgroundColor: AppTheme.amberWarning,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

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
              style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: AppTheme.emeraldSuccess,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  "Internet • ID: ${_device.hardwareId.replaceAll('amtuong', '')}",
                  style: const TextStyle(color: AppTheme.emeraldSuccess, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded, color: AppTheme.cyanAccent, size: 24),
            tooltip: "Lịch sử điều khiển",
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => DeviceHistoryScreen(device: _device)),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: AppTheme.cyanAccent, size: 24),
            tooltip: "Cài đặt thiết bị",
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => DeviceSettingsScreen(device: _device)),
              );
            },
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 1. TRỰC QUAN HÓA CỬA CUỐN CHUYỂN ĐỘNG DẦN DẦN (Nan cửa cuốn di chuyển mượt)
              _buildRollerDoorGraphic(cardBg, cardBorder),
              const SizedBox(height: 16),

              // 2. HUY HIỆU TRẠNG THÁI THỜI GIAN THỰC
              _buildDoorStatusBadge(),
              const SizedBox(height: 18),

              // 3. NÚT KHÓA AN TOÀN TRẺ EM
              _buildLockButton(cardBg, cardBorder),
              const SizedBox(height: 22),

              // 4. 3 NÚT BẤM LỚN TRỰC QUAN TRẠNG THÁI: MỞ - DỪNG - ĐÓNG
              _buildVisualControlButtons(),
              const SizedBox(height: 20),

              // 5. THẺ THÔNG SỐ VẬN HÀNH ĐỒNG BỘ
              _buildOperationalCard(cardBg, cardBorder, textCol),
            ],
          ),
        ),
      ),
    );
  }

  // Khung mô phỏng nan cửa cuốn di chuyển dần dần theo %
  Widget _buildRollerDoorGraphic(Color cardBg, Color cardBorder) {
    // Tỷ lệ đóng kín: 0% mở = closedFrac 1.0 (phủ kín); 100% mở = closedFrac 0.0 (cuộn hết lên trên)
    final closedFrac = (1.0 - (_currentPercent / 100.0)).clamp(0.0, 1.0);

    return Container(
      width: double.infinity,
      height: 250,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cardBorder, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: _isOpening
                ? AppTheme.cyanAccent.withValues(alpha: 0.18)
                : _isClosing
                    ? Colors.orangeAccent.withValues(alpha: 0.15)
                    : Colors.black.withValues(alpha: 0.2),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Stack(
        children: [
          // Ray dẫn hướng 2 bên
          Positioned(
            left: 18,
            top: 44,
            bottom: 16,
            width: 10,
            child: Container(
              decoration: BoxDecoration(color: Colors.grey[800], borderRadius: BorderRadius.circular(4)),
            ),
          ),
          Positioned(
            right: 18,
            top: 44,
            bottom: 16,
            width: 10,
            child: Container(
              decoration: BoxDecoration(color: Colors.grey[800], borderRadius: BorderRadius.circular(4)),
            ),
          ),

          // Hộp lô cuốn phía trên
          Positioned(
            left: 14,
            right: 14,
            top: 10,
            height: 38,
            child: Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF334155), Color(0xFF0F172A)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.6)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.bolt, color: AppTheme.cyanAccent, size: 14),
                  const SizedBox(width: 6),
                  const Text(
                    "AUSTEC TURBO ROLLER SYSTEM",
                    style: TextStyle(
                      color: AppTheme.cyanAccent,
                      fontSize: 10,
                      letterSpacing: 1.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Nan cửa cuốn chuyển động dần dần
          Positioned(
            left: 28,
            right: 28,
            top: 48,
            bottom: 16,
            child: Stack(
              children: [
                // Không gian bên trong nhà (khi mở hé thấy không gian)
                Container(
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.home_outlined, size: 54, color: Colors.white.withValues(alpha: 0.12)),
                        const SizedBox(height: 4),
                        Text(
                          "KHÔNG GIAN TRONG NHÀ",
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.15), fontSize: 9, letterSpacing: 1),
                        ),
                      ],
                    ),
                  ),
                ),

                // Thân nan cửa cuốn hạ xuống / cuộn lên theo tỷ lệ thời gian thực
                FractionallySizedBox(
                  heightFactor: closedFrac,
                  alignment: Alignment.topCenter,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.blueGrey[700]!,
                          Colors.blueGrey[800]!,
                          Colors.blueGrey[900]!,
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(6)),
                      border: Border(
                        bottom: BorderSide(
                          color: _isOpening
                              ? AppTheme.cyanAccent
                              : _isClosing
                                  ? Colors.orangeAccent
                                  : AppTheme.cardBorder,
                          width: 3.5,
                        ),
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: List.generate(
                        7,
                        (index) => Container(
                          height: 3,
                          margin: const EdgeInsets.symmetric(horizontal: 8),
                          decoration: BoxDecoration(
                            color: Colors.blueGrey[600],
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Huy hiệu hiển thị % mở trực quan số lớn ở góc phải
          Positioned(
            right: 24,
            bottom: 24,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: _isOpening
                      ? AppTheme.cyanAccent
                      : _isClosing
                          ? Colors.orangeAccent
                          : AppTheme.cyanAccent.withValues(alpha: 0.6),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.cyanAccent.withValues(alpha: 0.3),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Text(
                "${_currentPercent.round()}%",
                style: const TextStyle(
                  color: AppTheme.cyanAccent,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  fontFamily: "monospace",
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Huy hiệu trạng thái động
  Widget _buildDoorStatusBadge() {
    String text;
    Color color;
    IconData icon;

    if (_device.isChildLockActive) {
      text = "CỬA ĐANG KHÓA AN TOÀN TRẺ EM";
      color = AppTheme.amberWarning;
      icon = Icons.lock_rounded;
    } else if (_isOpening) {
      text = "CỬA ĐANG MỞ LÊN DẦN DẦN... (${_currentPercent.round()}%)";
      color = AppTheme.cyanAccent;
      icon = Icons.arrow_upward_rounded;
    } else if (_isClosing) {
      text = "CỬA ĐANG HẠ XUỐNG DẦN DẦN... (${_currentPercent.round()}%)";
      color = Colors.orangeAccent;
      icon = Icons.arrow_downward_rounded;
    } else if (_currentPercent >= 98) {
      text = "CỬA ĐANG MỞ HOÀN TOÀN (100%)";
      color = AppTheme.emeraldSuccess;
      icon = Icons.check_circle_outline_rounded;
    } else if (_currentPercent <= 2) {
      text = "CỬA ĐÃ ĐÓNG KÍN AN TOÀN (0%)";
      color = Colors.blueGrey;
      icon = Icons.door_front_door_outlined;
    } else {
      text = "CỬA ĐANG DỪNG Ở VỊ TRÍ ${_currentPercent.round()}%";
      color = AppTheme.amberWarning;
      icon = Icons.pause_circle_outline_rounded;
    }

    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        final isMoving = _isOpening || _isClosing;
        final borderAlpha = isMoving ? 0.4 + _pulseController.value * 0.4 : 0.4;

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withValues(alpha: borderAlpha), width: 1.2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 8),
              Text(
                text,
                style: TextStyle(color: color, fontSize: 12.5, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        );
      },
    );
  }

  // Nút Khóa An Toàn Trẻ Em
  Widget _buildLockButton(Color cardBg, Color cardBorder) {
    final isLocked = _device.isChildLockActive;

    return InkWell(
      onTap: _toggleLock,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 11),
        decoration: BoxDecoration(
          color: isLocked ? AppTheme.amberWarning.withValues(alpha: 0.15) : cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isLocked ? AppTheme.amberWarning : cardBorder,
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isLocked ? Icons.lock_rounded : Icons.lock_open_rounded,
              color: isLocked ? AppTheme.amberWarning : AppTheme.purpleAccent,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              isLocked ? "ĐANG KHÓA CỬA AN TOÀN (BẤM ĐỂ MỞ)" : "KHÓA AN TOÀN TRẺ EM",
              style: TextStyle(
                color: isLocked ? AppTheme.amberWarning : textColBased(isLocked),
                fontSize: 12.5,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color textColBased(bool locked) => AppTheme.cyanAccent;

  // 3 Nút Bấm Lớn Trực Quan: MỞ - DỪNG - ĐÓNG
  Widget _buildVisualControlButtons() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // 1. NÚT MỞ CỬA (ACTIVE KHI ĐANG MỞ)
        _buildActiveActionButton(
          label: _isOpening ? "ĐANG MỞ..." : AppTheme.t("open"),
          icon: Icons.arrow_upward_rounded,
          isActive: _isOpening,
          activeColor: AppTheme.cyanAccent,
          gradient: AppTheme.cyanGradient,
          onTap: _startOpenDoor,
        ),

        // 2. NÚT DỪNG LẠI (ACTIVE KHI ĐÃ DỪNG)
        _buildActiveActionButton(
          label: AppTheme.t("stop"),
          icon: Icons.stop_rounded,
          isActive: _isStopped && !_isOpening && !_isClosing,
          activeColor: AppTheme.amberWarning,
          gradient: AppTheme.amberGradient,
          onTap: _stopDoor,
        ),

        // 3. NÚT ĐÓNG CỬA (ACTIVE KHI ĐANG ĐÓNG)
        _buildActiveActionButton(
          label: _isClosing ? "ĐANG ĐÓNG..." : AppTheme.t("close"),
          icon: Icons.arrow_downward_rounded,
          isActive: _isClosing,
          activeColor: Colors.orangeAccent,
          gradient: const LinearGradient(
            colors: [Color(0xFF64748B), Color(0xFF334155)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          onTap: _startCloseDoor,
        ),
      ],
    );
  }

  Widget _buildActiveActionButton({
    required String label,
    required IconData icon,
    required bool isActive,
    required Color activeColor,
    required Gradient gradient,
    required VoidCallback onTap,
  }) {
    return Column(
      children: [
        AnimatedBuilder(
          animation: _pulseController,
          builder: (context, child) {
            final pulseScale = isActive ? 1.0 + _pulseController.value * 0.05 : 1.0;
            final glowAlpha = isActive ? 0.4 + _pulseController.value * 0.3 : 0.2;

            return Transform.scale(
              scale: pulseScale,
              child: InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(42),
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    gradient: gradient,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isActive ? Colors.white : Colors.transparent,
                      width: isActive ? 2.5 : 0,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: activeColor.withValues(alpha: glowAlpha),
                        blurRadius: isActive ? 22 : 12,
                        spreadRadius: isActive ? 3 : 1,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Icon(icon, color: Colors.white, size: 36),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            color: isActive ? activeColor : Colors.white,
            fontSize: 12.5,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  // Thẻ thông số vận hành
  Widget _buildOperationalCard(Color cardBg, Color cardBorder, Color textCol) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Mã phần cứng: ${_device.hardwareId}",
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 11.5),
              ),
              Text(
                "IP: ${_device.deviceIp}",
                style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11.5, fontFamily: "monospace"),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Divider(color: AppTheme.cardBorder, height: 1),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Timeout mở: ${_device.openTimeoutSeconds}s", style: TextStyle(color: textCol, fontSize: 11.5)),
              Text("Timeout đóng: ${_device.closeTimeoutSeconds}s", style: TextStyle(color: textCol, fontSize: 11.5)),
              Text("Remote RF: ${_device.rfRemoteCount} chiếc", style: const TextStyle(color: AppTheme.purpleAccent, fontSize: 11.5)),
            ],
          ),
        ],
      ),
    );
  }
}
