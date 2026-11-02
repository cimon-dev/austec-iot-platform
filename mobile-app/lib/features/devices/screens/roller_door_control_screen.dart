import 'package:flutter/material.dart';
import 'dart:async';
import '../../../core/constants/app_theme.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../provisioning/screens/provisioning_screen.dart';
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

  // Quản lý Camera giám sát liên kết với cửa cuốn
  String? _linkedCameraHwId;
  Timer? _doorCamSnapshotTimer;
  int _doorCamSnapshotKey = DateTime.now().millisecondsSinceEpoch;

  late AnimationController _pulseController;

  StreamSubscription<DeviceItem>? _deviceUpdateSub;

  @override
  void initState() {
    super.initState();
    _device = widget.device;
    _currentPercent = _device.positionPercent.toDouble();
    _isOpening = _device.isMoving && _device.movingDirection == 'up';
    _isClosing = _device.isMoving && _device.movingDirection == 'down';
    _isStopped = !_device.isMoving;

    _deviceUpdateSub = _gateway.onDeviceUpdated.listen((updatedDev) {
      if (updatedDev.hardwareId == _device.hardwareId && mounted) {
        setState(() {
          _device = updatedDev;
          _currentPercent = updatedDev.positionPercent.toDouble();
          _isOpening = updatedDev.isMoving && updatedDev.movingDirection == 'up';
          _isClosing = updatedDev.isMoving && updatedDev.movingDirection == 'down';
          _isStopped = !updatedDev.isMoving;
        });
      }
    });

    _linkedCameraHwId = _device.currentProperties['linked_camera_id']?.toString();
    if (_linkedCameraHwId != null && _linkedCameraHwId!.isNotEmpty) {
      _gateway.sendCommand(hardwareId: _linkedCameraHwId!, action: "STREAM_START");
      _doorCamSnapshotTimer = Timer.periodic(const Duration(milliseconds: 1500), (timer) {
        if (mounted) {
          setState(() {
            _doorCamSnapshotKey = DateTime.now().millisecondsSinceEpoch;
          });
        }
      });
    }

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _deviceUpdateSub?.cancel();
    _travelTimer?.cancel();
    _doorCamSnapshotTimer?.cancel();
    _pulseController.dispose();

    if (_linkedCameraHwId != null && _linkedCameraHwId!.isNotEmpty) {
      _gateway.sendCommand(hardwareId: _linkedCameraHwId!, action: "STREAM_STOP");
    }

    super.dispose();
  }

  // 1. MỞ CỬA DẦN DẦN (Đồng bộ ngầm toàn hệ thống)
  void _startOpenDoor() {
    if (_device.isChildLockActive) {
      _showLockedWarning();
      return;
    }

    setState(() {
      _isOpening = true;
      _isClosing = false;
      _isStopped = false;
    });

    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "OPEN_DOOR");
    _notifyBleIfOffline("mở cửa");
  }

  // 2. ĐÓNG CỬA DẦN DẦN (Đồng bộ ngầm toàn hệ thống)
  void _startCloseDoor() {
    if (_device.isChildLockActive) {
      _showLockedWarning();
      return;
    }

    setState(() {
      _isClosing = true;
      _isOpening = false;
      _isStopped = false;
    });

    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "CLOSE_DOOR");
    _notifyBleIfOffline("đóng cửa");
  }

  // 3. DỪNG CỬA NGAY TẠI VỊ TRÍ HIỆN TẠI (Immediate STOP)
  void _stopDoor() {
    setState(() {
      _isOpening = false;
      _isClosing = false;
      _isStopped = true;
      _device.positionPercent = _currentPercent.round();
    });

    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "STOP_DOOR");
    _notifyBleIfOffline("dừng cửa");
  }

  // 4. BẬT / TẮT KHÓA AN TOÀN TRẺ EM
  void _toggleLock() {
    setState(() {
      _isOpening = false;
      _isClosing = false;
      _isStopped = true;
    });

    _gateway.sendCommand(hardwareId: _device.hardwareId, action: "TOGGLE_CHILD_LOCK");
    _notifyBleIfOffline("chuyển khóa an toàn");
  }

  void _notifyBleIfOffline(String actionName) {
    if (!_device.isOnline && mounted) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.bluetooth_audio_rounded, color: Colors.black, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  "Đang $actionName qua Bluetooth BLE tầm gần...",
                  style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ],
          ),
          backgroundColor: AppTheme.amberWarning,
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
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
                  decoration: BoxDecoration(
                    color: _device.isOnline ? AppTheme.emeraldSuccess : AppTheme.amberWarning,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  _device.isOnline
                      ? "Trực tuyến Cloud • ID: ${_device.hardwareId.replaceAll('amtuong', '')}"
                      : "Ngoại tuyến Wi-Fi • Chế độ BLE",
                  style: TextStyle(
                    color: _device.isOnline ? AppTheme.emeraldSuccess : AppTheme.amberWarning,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
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
              // Banner Hướng Dẫn Ngoại Tuyến (Offline Proximity BLE Guide)
              if (!_device.isOnline)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppTheme.amberWarning.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.amberWarning.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: AppTheme.amberWarning.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.bluetooth_searching_rounded, color: AppTheme.amberWarning, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "Thiết bị đang Ngoại tuyến Wi-Fi",
                              style: TextStyle(
                                color: AppTheme.amberWarning,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              "Vui lòng đến gần hộp điều khiển (phạm vi < 10 - 15m) và bật Bluetooth trên điện thoại. Bạn vẫn có thể Mở/Đóng/Dừng cửa trực tiếp qua sóng BLE ngoại tuyến.",
                              style: TextStyle(
                                color: isDark ? Colors.white.withValues(alpha: 0.85) : Colors.black87,
                                fontSize: 11.5,
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

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
              const SizedBox(height: 20),

              // 6. CAMERA GIÁM SÁT CỬA CUỐN (THÊM / GỠ CAMERA THEO DÕI & CHECK KHÓA)
              _buildDoorCameraSection(cardBg, cardBorder, textCol),
              const SizedBox(height: 24),
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
    final isLocked = _device.isChildLockActive;

    return Opacity(
      opacity: isLocked ? 0.35 : 1.0,
      child: IgnorePointer(
        ignoring: isLocked,
        child: Row(
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
        ),
      ),
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

  // 6. GIAO DIỆN CAMERA GIÁM SÁT CỬA CUỐN (THÊM / GỠ CAMERA THEO YÊU CẦU)
  Widget _buildDoorCameraSection(Color cardBg, Color cardBorder, Color textCol) {
    if (_linkedCameraHwId == null || _linkedCameraHwId!.isEmpty) {
      return _buildAddCameraButton(cardBg, cardBorder);
    }

    final linkedCam = _gateway.findByHardwareId(_linkedCameraHwId!);
    final camName = linkedCam?.name ?? "AI Camera ($_linkedCameraHwId)";

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppTheme.cyanAccent.withValues(alpha: 0.12),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tiêu đề & badge LIVE
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.4)),
                    ),
                    child: const Icon(Icons.videocam_rounded, color: AppTheme.cyanAccent, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        camName,
                        style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      const Text(
                        "Camera hướng góc cửa cuốn • Check khóa",
                        style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: AppTheme.emeraldSuccess.withValues(alpha: 0.4)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.circle, color: AppTheme.emeraldSuccess, size: 8),
                    SizedBox(width: 4),
                    Text(
                      "LIVE",
                      style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Khung xem video camera chiếu vào cửa cuốn (hỗ trợ bấm vào để phóng to)
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: InkWell(
              onTap: () => _showDoorCameraZoomDialog(camName),
              child: Container(
                height: 180,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.black,
                  border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.3)),
                ),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.network(
                      "${ApiConfig.baseUrl}/api/devices/$_linkedCameraHwId/camera/snapshot?t=$_doorCamSnapshotKey",
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.videocam_rounded, color: AppTheme.cyanAccent, size: 40),
                            const SizedBox(height: 6),
                            const Text(
                              "Đang kết nối luồng camera cửa cuốn...",
                              style: TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          shape: BoxShape.circle,
                          border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                        ),
                        child: const Icon(Icons.fullscreen_rounded, color: AppTheme.cyanAccent, size: 18),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        color: Colors.black.withValues(alpha: 0.65),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "Góc chiếu cửa cuốn",
                              style: TextStyle(color: Colors.white70, fontSize: 10),
                            ),
                            Text(
                              "Chạm để phóng to xem khóa",
                              style: TextStyle(color: AppTheme.cyanAccent, fontSize: 9.5),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Nút gỡ camera khỏi cửa cuốn (Có dialog xác nhận hỏi lại trước khi gỡ)
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.crimsonDanger,
                side: BorderSide(color: AppTheme.crimsonDanger.withValues(alpha: 0.7)),
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: const Icon(Icons.link_off_rounded, size: 16),
              label: const Text(
                "Gỡ camera khỏi cửa cuốn",
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
              onPressed: () => _showUnlinkConfirmationDialog(camName),
            ),
          ),
        ],
      ),
    );
  }

  // Nút Thêm Camera Giám Sát Cửa Cuốn
  Widget _buildAddCameraButton(Color cardBg, Color cardBorder) {
    return InkWell(
      onTap: _showAddCameraBottomSheet,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5), width: 1.4),
          boxShadow: [
            BoxShadow(
              color: AppTheme.cyanAccent.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.4)),
              ),
              child: const Icon(Icons.add_a_photo_outlined, color: AppTheme.cyanAccent, size: 24),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Thêm camera giám sát",
                    style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 3),
                  Text(
                    "Chiếu vào cửa cuốn để check xem đã khóa & đóng kín chưa",
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.cyanAccent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.add, color: Colors.black, size: 16),
                  SizedBox(width: 4),
                  Text(
                    "Thêm cam",
                    style: TextStyle(color: Colors.black, fontSize: 11.5, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Modal chọn camera người dùng sở hữu để gán vào cửa cuốn
  void _showAddCameraBottomSheet() {
    final cameras = _gateway.getDevicesByCategory(DeviceCategory.camera);
    final isDark = AppTheme.isDarkMode;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.surfaceDark : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(top: BorderSide(color: AppTheme.cyanAccent.withValues(alpha: 0.5), width: 1.5)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(color: Colors.grey[500], borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),
            const Row(
              children: [
                Icon(Icons.videocam_outlined, color: AppTheme.cyanAccent, size: 22),
                SizedBox(width: 8),
                Text(
                  "Chọn Camera Giám Sát Cửa Cuốn",
                  style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              "Chọn camera đang chiếu vào cửa cuốn này để kiểm tra khóa an toàn",
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 11.5),
            ),
            const SizedBox(height: 16),
            if (cameras.isEmpty) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceGlass,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.cardBorder),
                ),
                child: Column(
                  children: [
                    const Text(
                      "Bạn chưa có thiết bị camera nào trong tài khoản",
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const SizedBox(height: 10),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
                      icon: const Icon(Icons.add),
                      label: const Text("Ghép nối camera mới"),
                      onPressed: () async {
                        Navigator.of(ctx).pop();
                        await Navigator.of(context).push(
                          MaterialPageRoute(builder: (context) => const ProvisioningScreen()),
                        );
                        await _gateway.fetchDevicesFromBackend();
                        if (mounted) setState(() {});
                      },
                    ),
                  ],
                ),
              ),
            ] else ...[
              ConstrainedBox(
                constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.4),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: cameras.length,
                  itemBuilder: (context, index) {
                    final cam = cameras[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceGlass,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.3)),
                      ),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.videocam_rounded, color: AppTheme.cyanAccent, size: 20),
                        ),
                        title: Text(cam.name, style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.bold)),
                        subtitle: Text("${cam.hardwareId} • ${cam.roomName}", style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                        trailing: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.cyanAccent,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            minimumSize: const Size(0, 32),
                          ),
                          onPressed: () {
                            Navigator.of(ctx).pop();
                            _linkCamera(cam);
                          },
                          child: const Text("Liên kết", style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _linkCamera(DeviceItem cam) {
    setState(() {
      _linkedCameraHwId = cam.hardwareId;
      _device.currentProperties['linked_camera_id'] = cam.hardwareId;
    });

    _gateway.updateDeviceProperties(_device.hardwareId, {'linked_camera_id': cam.hardwareId});
    _gateway.sendCommand(hardwareId: cam.hardwareId, action: "STREAM_START");

    _doorCamSnapshotTimer?.cancel();
    _doorCamSnapshotTimer = Timer.periodic(const Duration(milliseconds: 1500), (timer) {
      if (mounted) {
        setState(() {
          _doorCamSnapshotKey = DateTime.now().millisecondsSinceEpoch;
        });
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("Đã liên kết camera '${cam.name}' với cửa cuốn này thành công!"),
        backgroundColor: AppTheme.emeraldSuccess,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // Dialog xác nhận hỏi lại trước khi gỡ camera
  void _showUnlinkConfirmationDialog(String camName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surfaceDark : Colors.white,
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppTheme.crimsonDanger),
            SizedBox(width: 8),
            Text("Gỡ camera giám sát?"),
          ],
        ),
        content: Text(
          "Bạn có chắc chắn muốn gỡ camera '$camName' khỏi cửa cuốn này không? Bạn có thể thêm lại camera bất cứ lúc nào.",
          style: TextStyle(color: AppTheme.isDarkMode ? AppTheme.textSecondary : Colors.grey[700]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Hủy"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.crimsonDanger, foregroundColor: Colors.white),
            onPressed: () {
              Navigator.of(ctx).pop();
              _unlinkCamera();
            },
            child: const Text("Gỡ camera"),
          ),
        ],
      ),
    );
  }

  void _unlinkCamera() {
    if (_linkedCameraHwId != null) {
      _gateway.sendCommand(hardwareId: _linkedCameraHwId!, action: "STREAM_STOP");
    }

    _doorCamSnapshotTimer?.cancel();

    setState(() {
      _linkedCameraHwId = null;
      _device.currentProperties.remove('linked_camera_id');
    });

    _gateway.updateDeviceProperties(_device.hardwareId, {'linked_camera_id': null});

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Đã gỡ camera khỏi cửa cuốn."),
        backgroundColor: AppTheme.blueAccent,
        duration: Duration(seconds: 2),
      ),
    );
  }

  // Phóng to camera giám sát cửa cuốn để soi chi tiết khóa
  void _showDoorCameraZoomDialog(String camName) {
    if (_linkedCameraHwId == null) return;
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 20),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: double.infinity,
              constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.78),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.cyanAccent, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.cyanAccent.withValues(alpha: 0.35),
                    blurRadius: 24,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: InteractiveViewer(
                  minScale: 1.0,
                  maxScale: 6.0,
                  panEnabled: true,
                  scaleEnabled: true,
                  child: Image.network(
                    "${ApiConfig.baseUrl}/api/devices/$_linkedCameraHwId/camera/snapshot?t=$_doorCamSnapshotKey",
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => const Center(
                      child: Text("Đang kết nối camera...", style: TextStyle(color: Colors.white70)),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              top: 14,
              left: 16,
              right: 16,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.75),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                    ),
                    child: Text(
                      "$camName • Soi khóa cửa cuốn (1x - 6x)",
                      style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_fullscreen_rounded, color: Colors.white, size: 22),
                    style: IconButton.styleFrom(backgroundColor: Colors.black.withValues(alpha: 0.75)),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
            ),
            Positioned(
              bottom: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.75),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  "Chụm / Mở 2 ngón tay để soi cận cảnh chốt khóa cửa cuốn",
                  style: TextStyle(color: Colors.white70, fontSize: 11),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
