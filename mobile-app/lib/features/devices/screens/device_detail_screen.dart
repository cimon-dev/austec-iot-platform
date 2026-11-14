import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../chat/models/conversation_item.dart';
import '../../chat/screens/chat_room_screen.dart';
import '../../cskh/domain/entities/chat_device_item.dart';
import '../widgets/camera_webrtc_player.dart';
import 'camera_landscape_fullscreen_viewer.dart';
import 'device_history_screen.dart';
import 'device_settings_screen.dart';

class DeviceDetailScreen extends StatefulWidget {
  final DeviceItem device;

  final bool isAlreadyStreaming;

  const DeviceDetailScreen({super.key, required this.device, this.isAlreadyStreaming = false});

  @override
  State<DeviceDetailScreen> createState() => _DeviceDetailScreenState();
}

class _DeviceDetailScreenState extends State<DeviceDetailScreen> {
  final IoTGatewayClient _gateway = IoTGatewayClient();
  late DeviceItem _device;
  bool _isBusy = false;
  bool _isStreamActive = true;
  int _streamReloadNonce = 0;

  @override
  void initState() {
    super.initState();
    _device = widget.device;

    if (_device.category == DeviceCategory.camera) {
      if (!widget.isAlreadyStreaming) {
        // Chỉ gửi mã 13 nếu chưa phát stream từ trước
        _gateway.sendCommand(hardwareId: _device.hardwareId, action: "STREAM_START");
      }
    }
  }

  @override
  void dispose() {
    if (!widget.isAlreadyStreaming && _device.category == DeviceCategory.camera) {
      // Dừng stream nếu màn hình này tự phát stream
      _gateway.sendCommand(hardwareId: _device.hardwareId, action: "STREAM_STOP");
    }
    super.dispose();
  }

  Future<void> _triggerAction(String action, [Map<String, dynamic>? params]) async {
    // 1. Phản hồi giao diện tức thì 0ms (Optimistic UI Update)
    if (action == "TOGGLE_RELAY" || action == "TURN_ON" || action == "TURN_OFF") {
      final target = action == "TURN_ON" ? true : (action == "TURN_OFF" ? false : !_device.isRelayOn);
      setState(() {
        _device.isRelayOn = target;
      });
    } else if (action == "TOGGLE_CHILD_LOCK") {
      setState(() {
        _device.isChildLockActive = !_device.isChildLockActive;
      });
    }

    setState(() => _isBusy = true);
    final res = await _gateway.sendCommand(
      hardwareId: _device.hardwareId,
      action: action,
      parameters: params,
    );
    if (mounted) {
      setState(() {
        _isBusy = false;
        _device = _gateway.findByHardwareId(_device.hardwareId) ?? _device;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("${res.message} • ${res.latencyMs}ms"),
          backgroundColor: AppTheme.surfaceGlass,
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _openCameraFullscreen() async {
    final switchedDev = await Navigator.of(context).push<DeviceItem>(
      MaterialPageRoute(
        builder: (ctx) => CameraLandscapeFullscreenViewer(
          initialDevice: _device,
          gateway: _gateway,
        ),
      ),
    );
    if (switchedDev != null && switchedDev.hardwareId != _device.hardwareId && mounted) {
      setState(() {
        _device = switchedDev;
        _streamReloadNonce++;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _device.name,
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              "${_device.roomName} • ${_device.hardwareId}",
              style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontFamily: "monospace"),
            ),
          ],
        ),
        actions: [
          // 1. Icon Lịch Sử đặt bên trái Icon CSKH
          if (_device.canViewHistory)
            IconButton(
              icon: const Icon(Icons.history_rounded, color: Colors.white, size: 22),
              tooltip: "Xem lịch sử",
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (context) => DeviceHistoryScreen(device: _device)),
                );
              },
            ),
          // 2. Icon CSKH (Mở trực tiếp ChatRoomScreen phòng CSKH thật)
          IconButton(
            icon: const Icon(Icons.support_agent_rounded, color: AppTheme.cyanAccent, size: 22),
            tooltip: "Chat CSKH về thiết bị này",
            onPressed: () {
              final chatDev = ChatDeviceItem(
                isOwned: true,
                hardwareId: widget.device.hardwareId,
                deviceName: widget.device.name,
                modelName: widget.device.modelName,
                categoryTag: widget.device.badgeText.isNotEmpty ? widget.device.badgeText : "AUSTEC",
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
                    initialPrompt: "Xin chào CSKH Austec! Tôi cần hỗ trợ kỹ thuật về thiết bị ${widget.device.name} (HWID: ${widget.device.hardwareId}).",
                  ),
                ),
              );
            },
          ),
          // 3. Icon Cài Đặt Tham Số
          if (_device.canConfig)
            IconButton(
              icon: const Icon(Icons.settings_outlined, color: Colors.white, size: 22),
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
            // Background Watermark Công Ty AUSTEC (Bao trùm toàn bộ màn hình từ mép trên tới đáy)
            Positioned.fill(
              child: Image.asset(
                'assets/austec_banner_new.png',
                width: double.infinity,
                height: double.infinity,
                fit: BoxFit.cover,
                alignment: Alignment.center,
              ),
            ),
            // Lớp phủ tối nhẹ để thẻ và thông tin nổi bật sắc nét
            Positioned.fill(
              child: Container(
                color: Colors.black.withValues(alpha: 0.74),
              ),
            ),
            // Nội dung hiển thị
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
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Logo & Slogan AUSTEC 2026 to, rõ ràng, căn giữa, không nền trắng
                            Center(
                              child: Padding(
                                padding: const EdgeInsets.only(top: 2, bottom: 12),
                                child: Image.asset(
                                  'assets/austec_logo_2026.png',
                                  height: 48,
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),

                            // Thẻ Thông Tin Tổng Quan & Bảo Hành Điện Tử
                            _buildWarrantyAndStatusCard(),
                            const SizedBox(height: 12),

                            // Bảng Điều Khiển Chuyên Sâu Tùy Theo Danh Mục (ẨN KHI KHÔNG CÓ QUYỀN ĐIỀU KHIỂN)
                            if (_device.canPerformControl) ...[
                              if (_device.category == DeviceCategory.rollerDoor)
                                _buildRollerDoorDetailedControls()
                              else if (_device.category == DeviceCategory.lightSwitch)
                                _buildLightSwitchDetailedControls()
                              else if (_device.category == DeviceCategory.camera)
                                _buildCameraDetailedControls()
                              else if (_device.category == DeviceCategory.environment)
                                _buildSensorDetailedControls()
                              else if (_device.category == DeviceCategory.energyManage)
                                _buildUpsDetailedControls()
                              else
                                _buildLockDetailedControls(),
                            ] else ...[
                              _buildRestrictedPermissionBanner(),
                            ],
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

  Widget _buildRestrictedPermissionBanner() {
    final isScheduleLimit = !_device.isWithinAllowedSchedule;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: (isScheduleLimit ? AppTheme.amberWarning : const Color(0xFFEF4444)).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: (isScheduleLimit ? AppTheme.amberWarning : const Color(0xFFEF4444)).withValues(alpha: 0.35),
          width: 1.2,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: (isScheduleLimit ? AppTheme.amberWarning : const Color(0xFFEF4444)).withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isScheduleLimit ? Icons.schedule_rounded : Icons.lock_outline_rounded,
              color: isScheduleLimit ? AppTheme.amberWarning : const Color(0xFFEF4444),
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isScheduleLimit ? "Ngoài khung giờ được phép điều khiển" : "Quyền điều khiển đã bị tạm khóa",
                  style: TextStyle(
                    color: isScheduleLimit ? AppTheme.amberWarning : const Color(0xFFEF4444),
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isScheduleLimit
                      ? "Chủ nhà chỉ cho phép điều khiển trong khung giờ ${_device.accessStartTime} - ${_device.accessEndTime}."
                      : "Tài khoản của bạn là thành viên phụ và chưa được chủ nhà cấp quyền điều khiển thiết bị này.",
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 11.5,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 1. Thẻ Bảo Hành & Trạng Thái (Chuẩn Solid, Gọn Gàng)
  Widget _buildWarrantyAndStatusCard() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF141924),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF26324A), width: 1.2),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _device.isOnline ? AppTheme.emeraldSuccess : const Color(0xFF71717A),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _device.isOnline ? "KẾT NỐI TRỰC TUYẾN" : "NGOẠI TUYẾN (BLE KHẢ DỤNG)",
                    style: TextStyle(
                      color: _device.isOnline ? AppTheme.emeraldSuccess : const Color(0xFF71717A),
                      fontSize: 11.5,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF27272A),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF3F3F46)),
                ),
                child: Text(
                  _device.modelName,
                  style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),

          // Banner Hướng Dẫn Ngoại Tuyến (rút gọn)
          if (!_device.isOnline) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF1E2024),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF26324A)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.bluetooth_searching_rounded, color: Colors.white, size: 15),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Ngoại tuyến Wi-Fi. Đến gần (< 15m) để điều khiển trực tiếp qua BLE.",
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 10.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 8),
          const Divider(color: Color(0xFF26324A), height: 1),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Mã BH: ${_device.warrantyCode}",
                style: const TextStyle(color: Colors.white70, fontSize: 11, fontFamily: "monospace"),
              ),
              Text(
                "Hạn BH: ${_device.warrantyUntil.length >= 10 ? _device.warrantyUntil.substring(0, 10) : _device.warrantyUntil}",
                style: const TextStyle(color: Colors.white70, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 2. Chi Tiết Cửa Cuốn
  Widget _buildRollerDoorDetailedControls() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "ĐIỀU KHIỂN HÀNH TRÌNH CỬA CUỐN",
          style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF141924),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF26324A), width: 1.2),
          ),
          child: Column(
            children: [
              // Thanh hiển thị trực quan % mở cửa
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Trạng thái: ${_device.stateSummary}",
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "${_device.positionPercent}%",
                    style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Thanh Slider trực quan Monochrome
              SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  activeTrackColor: Colors.white,
                  inactiveTrackColor: AppTheme.cardBorder,
                  thumbColor: Colors.white,
                  thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
                  overlayColor: Colors.white.withValues(alpha: 0.1),
                ),
                child: Slider(
                  value: _device.positionPercent.toDouble(),
                  min: 0,
                  max: 100,
                  divisions: 20,
                  label: "${_device.positionPercent}%",
                  onChanged: (val) {
                    setState(() => _device.positionPercent = val.toInt());
                  },
                  onChangeEnd: (val) {
                    _triggerAction("SET_POSITION", {"position": val.toInt()});
                  },
                ),
              ),

              const SizedBox(height: 16),

              // Cụm 3 nút chính Mở (Xanh lá) - Dừng (Vàng) - Đóng (Xanh lam)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildPrimaryActionButton(
                    label: "MỞ CỬA",
                    icon: Icons.arrow_upward_rounded,
                    color: const Color(0xFF10B981),
                    onTap: () => _triggerAction("OPEN_DOOR"),
                  ),
                  _buildPrimaryActionButton(
                    label: "DỪNG LẠI",
                    icon: Icons.stop_rounded,
                    color: const Color(0xFFF59E0B),
                    onTap: () => _triggerAction("STOP_DOOR"),
                  ),
                  _buildPrimaryActionButton(
                    label: "ĐÓNG CỬA",
                    icon: Icons.arrow_downward_rounded,
                    color: const Color(0xFF3B82F6),
                    onTap: () => _triggerAction("CLOSE_DOOR"),
                  ),
                ],
              ),

              const SizedBox(height: 18),
              const Divider(color: AppTheme.cardBorder, height: 1),
              const SizedBox(height: 16),

              // Các nút vị trí nhanh
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildQuickPresetButton("Mở hé 20%", 20),
                  _buildQuickPresetButton("Mở 50%", 50),
                  _buildQuickPresetButton("Mở hé 75%", 75),
                  _buildQuickPresetButton("Đóng 0%", 0),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),
        const Text(
          "CÀI ĐẶT AN TOÀN & TAY ĐIỀU KHIỂN RF",
          style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF141924),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF26324A), width: 1.2),
          ),
          child: Column(
            children: [
              // Khóa an toàn trẻ em
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Khóa An Toàn Trẻ Em", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                      Text("Vô hiệu hóa toàn bộ remote RF chống bấm nhầm", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                    ],
                  ),
                  Switch(
                    value: _device.isChildLockActive,
                    activeThumbColor: Colors.white,
                    activeTrackColor: AppTheme.crimsonDanger,
                    onChanged: (val) => _triggerAction("TOGGLE_CHILD_LOCK"),
                  ),
                ],
              ),
              const Divider(color: AppTheme.cardBorder, height: 20),

              // Quản lý Remote RF
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Remote RF Đã Gán: ${_device.rfRemoteCount} tay cầm",
                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      const Text("Học lệnh RF_setup / Xóa RF_clear từ xa", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                    ],
                  ),
                  Row(
                    children: [
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.cyanAccent,
                          side: const BorderSide(color: AppTheme.cyanAccent),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () => _triggerAction("RF_PAIR_NEW"),
                        child: const Text("Học Lệnh", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.roseDanger,
                          side: const BorderSide(color: AppTheme.roseDanger),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () => _triggerAction("RF_CLEAR_ALL"),
                        child: const Text("Xóa Hết", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),
        const Text(
          "THÔNG SỐ VIỄN THÁM BO MẠCH THỰC TẾ",
          style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF141924),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF26324A), width: 1.2),
          ),
          child: Column(
            children: [
              _buildTelemetryRow("Điện áp nguồn bo mạch", "${_device.acVoltage.toStringAsFixed(1)} VAC (Ổn định)", Icons.bolt),
              _buildTelemetryRow("Dòng tải động cơ kéo", "${_device.motorCurrentA.toStringAsFixed(2)} A (Bình thường)", Icons.speed),
              _buildTelemetryRow("Cường độ sóng WiFi RSSI", "-56 dBm (Rất tốt)", Icons.wifi),
              _buildTelemetryRow("Cảm biến chống xô kẹt", "Trạng thái sẵn sàng (HIGH)", Icons.security),
            ],
          ),
        ),
      ],
    );
  }

  // 3. Chi Tiết Ổ Cắm Thông Minh & Chiếu Sáng (Mặt ổ cắm điện thực tế + Công tắc gạt cơ học ON/OFF)
  Widget _buildLightSwitchDetailedControls() {
    final isOn = _device.isRelayOn;
    const onColor = Color(0xFF10B981); // ON: Xanh lá (Đang cấp điện)
    const offColor = Color(0xFFEF4444); // OFF: Đỏ (Đã ngắt điện an toàn)
    final switchColor = isOn ? onColor : offColor;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF141924),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: switchColor.withValues(alpha: 0.45),
          width: 1.2,
        ),
      ),
      child: Column(
        children: [
          // MẶT Ổ CẮM ĐIỆN VỚI CÔNG TẮC GẠT BÊN CẠNH
          GestureDetector(
            onTap: () => _triggerAction(isOn ? "TURN_OFF" : "TURN_ON"),
            child: Container(
              width: double.infinity,
              height: 180,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E2536), Color(0xFF111520)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF2C394F), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.5),
                    blurRadius: 14,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  // 4 Ốc vít bo góc
                  Positioned(top: 2, left: 2, child: _buildPlateScrew()),
                  Positioned(top: 2, right: 2, child: _buildPlateScrew()),
                  Positioned(bottom: 2, left: 2, child: _buildPlateScrew()),
                  Positioned(bottom: 2, right: 2, child: _buildPlateScrew()),

                  // Bên trái: Lỗ cắm điện; Bên phải: Công tắc gạt
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Row(
                      children: [
                        // BÊN TRÁI: HÌNH DÁNG Ổ CẮM 3 CHẤU TIÊU CHUẨN
                        Expanded(
                          flex: 5,
                          child: Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F131D),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFF253043), width: 1.2),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text(
                                  "AUSTEC POWER",
                                  style: TextStyle(
                                    color: Color(0xFF6B7280),
                                    fontSize: 8,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                // Lỗ cắm tròn trung tâm
                                Container(
                                  width: 68,
                                  height: 68,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: const Color(0xFF0A0D14),
                                    border: Border.all(color: const Color(0xFF1F2937), width: 2),
                                  ),
                                  child: Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      // Chấu tiếp địa phía trên
                                      Positioned(
                                        top: 9,
                                        child: Container(
                                          width: 7,
                                          height: 9,
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF4B5563),
                                            borderRadius: BorderRadius.circular(2),
                                          ),
                                        ),
                                      ),
                                      // 2 lỗ cắm chính tròn
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Container(
                                            width: 11,
                                            height: 11,
                                            decoration: const BoxDecoration(
                                              color: Colors.black,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 20),
                                          Container(
                                            width: 11,
                                            height: 11,
                                            decoration: const BoxDecoration(
                                              color: Colors.black,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                        ],
                                      ),
                                      // Chấu tiếp địa phía dưới
                                      Positioned(
                                        bottom: 9,
                                        child: Container(
                                          width: 7,
                                          height: 9,
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF4B5563),
                                            borderRadius: BorderRadius.circular(2),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  "16A • 250V~",
                                  style: TextStyle(color: Color(0xFF4B5563), fontSize: 7.5, fontFamily: "monospace"),
                                ),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(width: 14),

                        // BÊN PHẢI: CÔNG TẮC GẠT (ROCKER SWITCH ĐỔI MÀU THEO TRẠNG THÁI)
                        Expanded(
                          flex: 4,
                          child: Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F131D),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: switchColor.withValues(alpha: 0.6),
                                width: 1.5,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                // Thân công tắc gạt 2 nấc
                                Container(
                                  width: 58,
                                  height: 84,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF161B26),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFF2B364A), width: 1.5),
                                    boxShadow: [
                                      BoxShadow(
                                        color: switchColor.withValues(alpha: 0.25),
                                        blurRadius: 8,
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    children: [
                                      // Nấc ON (nằm phía trên)
                                      Expanded(
                                        child: AnimatedContainer(
                                          duration: const Duration(milliseconds: 200),
                                          decoration: BoxDecoration(
                                            color: isOn ? onColor : const Color(0xFF1E2638),
                                            borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                                            border: Border(bottom: BorderSide(color: Colors.black.withValues(alpha: 0.4))),
                                          ),
                                          child: Center(
                                            child: Text(
                                              "ON",
                                              style: TextStyle(
                                                color: isOn ? Colors.white : const Color(0xFF6B7280),
                                                fontSize: 11,
                                                fontWeight: FontWeight.w900,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                      // Nấc OFF (nằm phía dưới)
                                      Expanded(
                                        child: AnimatedContainer(
                                          duration: const Duration(milliseconds: 200),
                                          decoration: BoxDecoration(
                                            color: !isOn ? offColor : const Color(0xFF1E2638),
                                            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(6)),
                                          ),
                                          child: Center(
                                            child: Text(
                                              "OFF",
                                              style: TextStyle(
                                                color: !isOn ? Colors.white : const Color(0xFF6B7280),
                                                fontSize: 11,
                                                fontWeight: FontWeight.w900,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 8),
                                // Đèn LED trạng thái
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: switchColor,
                                    boxShadow: [
                                      BoxShadow(
                                        color: switchColor,
                                        blurRadius: 6,
                                        spreadRadius: 1,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 14),

          // DÒNG TRẠNG THÁI & HƯỚNG DẪN
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(shape: BoxShape.circle, color: switchColor),
              ),
              const SizedBox(width: 8),
              Text(
                isOn ? "ĐANG CẤP NGUỒN ĐIỆN (BẬT)" : "ĐÃ NGẮT NGUỒN ĐIỆN AN TOÀN (TẮT)",
                style: TextStyle(
                  color: switchColor,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            "Chạm vào công tắc gạt để Bật / Tắt nguồn điện",
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _buildPlateScrew() {
    return Container(
      width: 7,
      height: 7,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFF2C384F),
        border: Border.all(color: const Color(0xFF4B5563), width: 0.8),
      ),
      child: Center(
        child: Container(
          width: 3.5,
          height: 1,
          color: const Color(0xFF9CA3AF),
        ),
      ),
    );
  }

  // 4. Chi Tiết Camera (Tối Giản, Không Viền Mờ, Không Endpoint Kỹ Thuật Rối Mắt)
  Widget _buildCameraDetailedControls() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF141924),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF26324A), width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.black,
                border: Border.all(color: const Color(0xFF26324A)),
              ),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: CameraWebRtcPlayer(
                      hardwareId: _device.hardwareId,
                      isActive: _isStreamActive,
                      reloadNonce: _streamReloadNonce,
                    ),
                  ),
                  Positioned(
                    top: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0xFFEF4444), borderRadius: BorderRadius.circular(6)),
                      child: const Text("LIVE", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: InkWell(
                      onTap: _openCameraFullscreen,
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.75),
                          shape: BoxShape.circle,
                          border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.7)),
                        ),
                        child: const Icon(Icons.fullscreen_rounded, color: AppTheme.cyanAccent, size: 20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.brandBlue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 0,
                  ),
                  icon: const Icon(Icons.play_arrow_rounded, size: 18),
                  label: const Text("Bật Stream", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  onPressed: () {
                    _triggerAction("STREAM_START");
                    setState(() {
                      _isStreamActive = true;
                      _streamReloadNonce++;
                    });
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white70,
                    side: const BorderSide(color: Color(0xFF3F3F46)),
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.stop_rounded, size: 18),
                  label: const Text("Dừng", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  onPressed: () {
                    _triggerAction("STREAM_STOP");
                    setState(() => _isStreamActive = false);
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.cyanAccent,
                    side: const BorderSide(color: AppTheme.cyanAccent),
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.camera_alt, size: 18),
                  label: const Text("Chụp", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  onPressed: () => _triggerAction("TAKE_SNAPSHOT"),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 5. Chi Tiết Cảm Biến
  Widget _buildSensorDetailedControls() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF141924),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF26324A), width: 1.2),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSensorBigMetric("Nhiệt Độ", "${_device.temperature.toStringAsFixed(1)}°C", Icons.thermostat, AppTheme.amberWarning),
              _buildSensorBigMetric("Độ Ẩm", "${_device.humidity.toStringAsFixed(0)}%", Icons.water_drop, AppTheme.cyanAccent),
              _buildSensorBigMetric("Không Khí", "AQI ${_device.airQualityAqi}", Icons.air, AppTheme.emeraldSuccess),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            "Mức pin trạm cảm biến: ${_device.batteryPercent}% • Tự động kích hoạt thông gió khi nồm ẩm",
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
          ),
        ],
      ),
    );
  }

  // 6. Chi Tiết Lưu Điện UPS
  Widget _buildUpsDetailedControls() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF141924),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF26324A), width: 1.2),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Xả Pin Bảo Dưỡng Tự Động", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                  Text(_device.isDischarging ? "Đang chạy chu trình xả ắc quy" : "Đang duy trì điện lưới 220V", style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                ],
              ),
              Switch(
                value: _device.isDischarging,
                activeThumbColor: AppTheme.emeraldSuccess,
                onChanged: (val) => _triggerAction("TOGGLE_DISCHARGE"),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildTelemetryRow("Điện áp ắc quy", "${_device.batteryVoltage.toStringAsFixed(1)} VDC", Icons.battery_charging_full),
          _buildTelemetryRow("Mức dung lượng lưu trữ", "${_device.batteryPercent}% (Còn ~48 giờ)", Icons.bolt),
          _buildTelemetryRow("Điện áp lưới ngõ vào", "${_device.acVoltage.toStringAsFixed(0)} VAC (Sóng Sin chuẩn)", Icons.power),
        ],
      ),
    );
  }

  // 7. Chi Tiết Khóa Masaru
  Widget _buildLockDetailedControls() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF141924),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF26324A), width: 1.2),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: () => _triggerAction("TOGGLE_LOCK"),
            child: Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF27272A),
                border: Border.all(color: const Color(0xFF3F3F46), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.25),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Icon(_device.isLocked ? Icons.lock_rounded : Icons.lock_open_rounded, color: Colors.white, size: 38),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _device.isLocked ? "CỬA ĐANG KHÓA AN TOÀN" : "CỬA ĐANG MỞ KHÓA",
            style: TextStyle(
              color: _device.isLocked ? const Color(0xFFEF4444) : const Color(0xFF10B981),
              fontSize: 13,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 6),
          Text("Nhật ký: ${_device.lastUnlockUser}", style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildQuickPresetButton(String label, int targetPos) {
    final isCurrent = _device.positionPercent == targetPos;
    return GestureDetector(
      onTap: () => _triggerAction("SET_POSITION", {"position": targetPos}),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isCurrent ? Colors.white : const Color(0xFF1E2024),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isCurrent ? Colors.white : AppTheme.cardBorder),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isCurrent ? Colors.black : AppTheme.textSecondary,
            fontSize: 11,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildPrimaryActionButton({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
    Color color = AppTheme.brandBlue,
  }) {
    return GestureDetector(
      onTap: _isBusy ? null : onTap,
      child: Container(
        width: 95,
        height: 75,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.16),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.45), width: 1.2),
          boxShadow: [
            BoxShadow(color: color.withValues(alpha: 0.15), blurRadius: 6, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTelemetryRow(String title, String val, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.white70, size: 16),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
            ],
          ),
          Text(
            val,
            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold, fontFamily: "monospace"),
          ),
        ],
      ),
    );
  }

  Widget _buildSensorBigMetric(String title, String val, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 26),
        const SizedBox(height: 6),
        Text(val, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        Text(title, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10)),
      ],
    );
  }
}
