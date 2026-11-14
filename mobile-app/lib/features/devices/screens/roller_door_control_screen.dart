import 'package:flutter/material.dart';
import 'dart:async';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../chat/screens/chat_room_screen.dart';
import '../../chat/models/conversation_item.dart';
import '../../provisioning/screens/provisioning_screen.dart';
import 'device_history_screen.dart';
import 'device_settings_screen.dart';
import '../widgets/camera_webrtc_player.dart';
import '../../cskh/domain/entities/chat_device_item.dart';

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
          // Icon Xem lịch sử đặt bên trái Icon CSKH
          IconButton(
            icon: Icon(Icons.history_rounded, color: textCol, size: 22),
            tooltip: "Lịch sử điều khiển",
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => DeviceHistoryScreen(device: _device)),
              );
            },
          ),
          // Icon CSKH hỗ trợ trực tuyến (Mở màn chat CSKH thật)
          IconButton(
            icon: const Icon(Icons.support_agent_rounded, color: AppTheme.cyanAccent, size: 22),
            tooltip: "Hỗ trợ CSKH",
            onPressed: () {
              final chatDev = ChatDeviceItem(
                isOwned: true,
                hardwareId: _device.hardwareId,
                deviceName: _device.name,
                modelName: _device.modelName,
                categoryTag: _device.badgeText.isNotEmpty ? _device.badgeText : "AUSTEC",
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
                    initialPrompt: "Xin chào CSKH Austec! Tôi cần hỗ trợ kỹ thuật về thiết bị ${_device.name} (HWID: ${_device.hardwareId}).",
                  ),
                ),
              );
            },
          ),
          // Icon Cài đặt tham số
          if (_device.canConfig)
            IconButton(
              icon: Icon(Icons.settings_outlined, color: textCol, size: 22),
              tooltip: "Cài đặt thiết bị",
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (context) => DeviceSettingsScreen(device: _device)),
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
            // 1. Background Watermark Công Ty AUSTEC (Bao trùm toàn bộ màn hình từ đỉnh tới đáy)
            Positioned.fill(
              child: Image.asset(
                'assets/austec_banner_new.png',
                width: double.infinity,
                height: double.infinity,
                fit: BoxFit.cover,
                alignment: Alignment.center,
              ),
            ),
            Positioned.fill(
              child: Container(
                color: Colors.black.withValues(alpha: isDark ? 0.74 : 0.60),
              ),
            ),
            // 2. Nội dung hiển thị gói gọn và cân đối
            SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: constraints.maxHeight,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            // Logo & Slogan AUSTEC 2026 to, rõ ràng, căn giữa và không có nền trắng
                            Center(
                              child: Padding(
                                padding: const EdgeInsets.only(top: 2, bottom: 10),
                                child: Image.asset(
                                  'assets/austec_logo_2026.png',
                                  height: 48,
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),

                            // Banner Hướng Dẫn Ngoại Tuyến (rút gọn)
                            if (!_device.isOnline)
                              Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: AppTheme.amberWarning.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppTheme.amberWarning.withValues(alpha: 0.35)),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(Icons.bluetooth_audio_rounded, color: AppTheme.amberWarning, size: 16),
                                    SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        "Ngoại tuyến Wi-Fi • Điều khiển trực tiếp qua Bluetooth BLE tầm gần",
                                        style: TextStyle(color: AppTheme.amberWarning, fontSize: 11, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                            // 1. Khối cửa cuốn dài ra, bên dưới chứa 3 button Mở, Dừng, Đóng (only icon, no text)
                            _buildRollerDoorGraphicWithControls(cardBg, cardBorder),
                            const SizedBox(height: 10),

                            // 2. Phía dưới là 2 khối (Vị trí, Khóa an toàn trẻ em) ngang dài bằng nhau
                            _buildTwoEqualStatusBlocks(cardBg, cardBorder),
                            const SizedBox(height: 10),

                            // 3. Camera Giám Sát Cửa Cuốn
                            _buildDoorCameraSection(cardBg, cardBorder, textCol),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Khung mô phỏng nan cửa cuốn dài ra và chứa 3 nút Mở - Dừng - Đóng ở phía dưới
  Widget _buildRollerDoorGraphicWithControls(Color cardBg, Color cardBorder) {
    final isDark = AppTheme.isDarkMode;
    final closedFrac = (1.0 - (_currentPercent / 100.0)).clamp(0.0, 1.0);
    final isLocked = _device.isChildLockActive;

    return Container(
      width: double.infinity,
      height: 245,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder, width: 1.2),
      ),
      child: Stack(
        children: [
          // Ray dẫn hướng 2 bên
          Positioned(
            left: 12,
            top: 40,
            bottom: 74,
            width: 8,
            child: Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
          Positioned(
            right: 12,
            top: 40,
            bottom: 74,
            width: 8,
            child: Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),

          // Hộp lô cuốn phía trên
          Positioned(
            left: 10,
            right: 10,
            top: 8,
            height: 28,
            child: Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF18181B) : const Color(0xFFF4F4F5),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFE4E4E7)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.bolt, color: isDark ? Colors.white70 : Colors.black87, size: 13),
                  const SizedBox(width: 5),
                  Text(
                    "AUSTEC TURBO ROLLER",
                    style: TextStyle(
                      color: isDark ? Colors.white : Colors.black,
                      fontSize: 9.5,
                      letterSpacing: 1.2,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Nan cửa cuốn chuyển động
          Positioned(
            left: 22,
            right: 22,
            top: 40,
            bottom: 74,
            child: Stack(
              children: [
                // Không gian bên trong nhà (khi mở hé thấy không gian)
                Container(
                  decoration: BoxDecoration(
                    color: isDark ? Colors.black.withValues(alpha: 0.35) : const Color(0xFFFAFAFA),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Center(
                    child: Icon(Icons.home_outlined, size: 40, color: isDark ? Colors.white.withValues(alpha: 0.12) : Colors.black.withValues(alpha: 0.1)),
                  ),
                ),

                // Thân nan cửa cuốn hạ xuống / cuộn lên theo tỷ lệ thời gian thực
                FractionallySizedBox(
                  heightFactor: closedFrac,
                  alignment: Alignment.topCenter,
                  child: Container(
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(6)),
                      border: Border(
                        bottom: BorderSide(
                          color: isDark ? Colors.white : Colors.black,
                          width: 2.5,
                        ),
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: List.generate(
                        6,
                        (index) => Container(
                          height: 2.2,
                          margin: const EdgeInsets.symmetric(horizontal: 6),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFD4D4D8),
                            borderRadius: BorderRadius.circular(1),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Huy hiệu hiển thị % mở góc phải
          Positioned(
            right: 18,
            bottom: 78,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: isDark ? Colors.black.withValues(alpha: 0.85) : Colors.white.withValues(alpha: 0.95),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFE4E4E7),
                  width: 1.0,
                ),
              ),
              child: Text(
                "${_currentPercent.round()}%",
                style: const TextStyle(
                  color: AppTheme.cyanAccent,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),

          // VÙNG 3 BUTTON ĐIỀU KHIỂN (MỞ, DỪNG, ĐÓNG) NẰM TRONG PHÍA DƯỚI KHỐI CỬA CUỐN (ONLY ICON, NO TEXT)
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: 66,
            child: Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F141F) : const Color(0xFFF1F5F9),
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(15)),
                border: Border(top: BorderSide(color: cardBorder, width: 1.0)),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Opacity(
                opacity: isLocked ? 0.35 : 1.0,
                child: IgnorePointer(
                  ignoring: isLocked,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      // 1. NÚT MỞ CỬA - MÀU XANH LÁ (ONLY ICON)
                      _buildEmbeddedCircleBtn(
                        icon: Icons.arrow_upward_rounded,
                        isActive: _isOpening,
                        actionColor: const Color(0xFF10B981),
                        tooltip: "Mở cửa",
                        onTap: _startOpenDoor,
                      ),

                      // 2. NÚT DỪNG LẠI - MÀU VÀNG (ONLY ICON)
                      _buildEmbeddedCircleBtn(
                        icon: Icons.stop_rounded,
                        isActive: _isStopped && !_isOpening && !_isClosing,
                        actionColor: const Color(0xFFF59E0B),
                        tooltip: "Dừng cửa",
                        onTap: _stopDoor,
                      ),

                      // 3. NÚT ĐÓNG CỬA - MÀU XANH LAM (ONLY ICON)
                      _buildEmbeddedCircleBtn(
                        icon: Icons.arrow_downward_rounded,
                        isActive: _isClosing,
                        actionColor: const Color(0xFF2563EB),
                        tooltip: "Đóng cửa",
                        onTap: _startCloseDoor,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmbeddedCircleBtn({
    required IconData icon,
    required bool isActive,
    required Color actionColor,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    final isDark = AppTheme.isDarkMode;

    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        final pulseScale = isActive ? 1.0 + _pulseController.value * 0.05 : 1.0;

        return Transform.scale(
          scale: pulseScale,
          child: Tooltip(
            message: tooltip,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(25),
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isActive
                      ? actionColor
                      : actionColor.withValues(alpha: isDark ? 0.16 : 0.10),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isActive ? actionColor : actionColor.withValues(alpha: isDark ? 0.6 : 0.4),
                    width: isActive ? 2.0 : 1.2,
                  ),
                ),
                child: Icon(
                  icon,
                  color: isActive ? Colors.white : actionColor,
                  size: 26,
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  // 2 KHỐI NGANG DÀI BẰNG NHAU: VỊ TRÍ & KHÓA AN TOÀN TRẺ EM
  Widget _buildTwoEqualStatusBlocks(Color cardBg, Color cardBorder) {
    final isDark = AppTheme.isDarkMode;
    final isLocked = _device.isChildLockActive;
    const lockColor = Color(0xFFEF4444);

    String posDesc = "Đang dừng";
    Color posColor = const Color(0xFF10B981);
    IconData posIcon = Icons.door_sliding_outlined;

    if (_isOpening) {
      posDesc = "Đang mở...";
      posColor = const Color(0xFF10B981);
      posIcon = Icons.arrow_upward_rounded;
    } else if (_isClosing) {
      posDesc = "Đang đóng...";
      posColor = const Color(0xFF2563EB);
      posIcon = Icons.arrow_downward_rounded;
    } else if (_currentPercent >= 98) {
      posDesc = "Mở 100%";
      posColor = const Color(0xFF10B981);
      posIcon = Icons.check_circle_outline_rounded;
    } else if (_currentPercent <= 2) {
      posDesc = "Đã đóng kín";
      posColor = const Color(0xFF2563EB);
      posIcon = Icons.door_front_door_outlined;
    } else {
      posDesc = "Vị trí ${_currentPercent.round()}%";
      posColor = const Color(0xFFF59E0B);
      posIcon = Icons.pause_circle_outline_rounded;
    }

    return Row(
      children: [
        // 1. KHỐI VỊ TRÍ CỬA
        Expanded(
          child: Container(
            height: 72,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: cardBorder, width: 1.2),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: posColor.withValues(alpha: 0.16),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(posIcon, color: posColor, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        "VỊ TRÍ CỬA",
                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 9.5, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        "${_currentPercent.round()}%",
                        style: TextStyle(color: posColor, fontSize: 16, fontWeight: FontWeight.w900),
                      ),
                      Text(
                        posDesc,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white70, fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(width: 10),

        // 2. KHỐI KHÓA AN TOÀN TRẺ EM
        Expanded(
          child: InkWell(
            onTap: _toggleLock,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              height: 72,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isLocked ? lockColor.withValues(alpha: isDark ? 0.18 : 0.1) : cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isLocked ? lockColor : cardBorder,
                  width: isLocked ? 1.5 : 1.2,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: (isLocked ? lockColor : Colors.white24).withValues(alpha: 0.16),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isLocked ? Icons.lock_rounded : Icons.lock_open_rounded,
                      color: isLocked ? lockColor : Colors.white70,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          "KHÓA TRẺ EM",
                          style: TextStyle(color: AppTheme.textSecondary, fontSize: 9.5, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          isLocked ? "ĐANG KHÓA" : "MỞ KHÓA",
                          style: TextStyle(
                            color: isLocked ? lockColor : const Color(0xFF10B981),
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          isLocked ? "Bấm mở khóa" : "Bấm để khóa",
                          style: const TextStyle(color: Colors.white60, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  // 6. GIAO DIỆN CAMERA GIÁM SÁT CỬA CUỐN (THÊM / GỠ CAMERA THEO YÊU CẦU)
  Widget _buildDoorCameraSection(Color cardBg, Color cardBorder, Color textCol) {
    if (_linkedCameraHwId == null || _linkedCameraHwId!.isEmpty) {
      return _buildAddCameraButton(cardBg, cardBorder);
    }

    final isDark = AppTheme.isDarkMode;
    final linkedCam = _gateway.findByHardwareId(_linkedCameraHwId!);
    final camName = linkedCam?.name ?? "Camera ($_linkedCameraHwId)";

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: cardBorder, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tiêu đề & badge LIVE
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Icon(Icons.videocam_rounded, color: textCol, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            camName,
                            style: TextStyle(color: textCol, fontSize: 13.5, fontWeight: FontWeight.bold),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Text(
                            "Góc quan sát cửa cuốn",
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 10.5),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
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
          const SizedBox(height: 10),

          // Khung xem video camera chiếu vào cửa cuốn (hỗ trợ bấm vào để phóng to)
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: () => _showDoorCameraZoomDialog(camName),
              child: Container(
                height: 165,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.black,
                  border: Border.all(color: cardBorder),
                ),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (_linkedCameraHwId != null)
                      CameraWebRtcPlayer(
                        hardwareId: _linkedCameraHwId!,
                        isActive: true,
                      ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white24),
                        ),
                        child: const Icon(Icons.fullscreen_rounded, color: Colors.white, size: 18),
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
                              style: TextStyle(color: Colors.white70, fontSize: 9.5),
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
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    return InkWell(
      onTap: _showAddCameraBottomSheet,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: cardBorder, width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
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
                color: AppTheme.brandBlue.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.brandBlue.withValues(alpha: 0.3)),
              ),
              child: const Icon(Icons.add_a_photo_outlined, color: AppTheme.brandBlue, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Thêm camera giám sát",
                    style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 3),
                  const Text(
                    "Chiếu vào cửa cuốn để check xem đã khóa & đóng kín chưa",
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.brandBlue,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.add, color: Colors.white, size: 16),
                  SizedBox(width: 4),
                  Text(
                    "Thêm cam",
                    style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
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
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.surfaceDark : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(top: BorderSide(color: cardBorder, width: 1.5)),
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
            Row(
              children: [
                Icon(Icons.videocam_outlined, color: textCol, size: 22),
                const SizedBox(width: 8),
                Text(
                  "Chọn Camera Giám Sát Cửa Cuốn",
                  style: TextStyle(color: textCol, fontSize: 15, fontWeight: FontWeight.bold),
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
                  color: isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: cardBorder),
                ),
                child: Column(
                  children: [
                    Text(
                      "Bạn chưa có thiết bị camera nào trong tài khoản",
                      style: TextStyle(color: isDark ? Colors.white70 : Colors.black87, fontSize: 12),
                    ),
                    const SizedBox(height: 10),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.brandBlue,
                        foregroundColor: Colors.white,
                      ),
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
                        color: isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: cardBorder),
                      ),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppTheme.brandBlue.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.videocam_rounded, color: AppTheme.brandBlue, size: 20),
                        ),
                        title: Text(cam.name, style: TextStyle(color: textCol, fontSize: 13.5, fontWeight: FontWeight.bold)),
                        subtitle: Text("${cam.hardwareId} • ${cam.roomName}", style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                        trailing: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.brandBlue,
                            foregroundColor: Colors.white,
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
    final isDark = AppTheme.isDarkMode;
    final cardBorder = isDark ? const Color(0xFF3F3F46) : const Color(0xFFE4E4E7);

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
                border: Border.all(color: cardBorder, width: 1.5),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: InteractiveViewer(
                  minScale: 1.0,
                  maxScale: 6.0,
                  panEnabled: true,
                  scaleEnabled: true,
                  child: _linkedCameraHwId == null
                      ? const SizedBox.shrink()
                      : CameraWebRtcPlayer(
                          hardwareId: _linkedCameraHwId!,
                          isActive: true,
                        ),
                ),
              ),
            ),
            Positioned(
              top: 14,
              left: 14,
              right: 14,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.75),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Text(
                        "$camName • Soi khóa cửa cuốn (1x - 6x)",
                        style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.close_fullscreen_rounded, color: Colors.white, size: 20),
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
