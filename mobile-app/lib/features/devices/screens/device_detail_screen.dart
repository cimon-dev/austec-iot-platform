import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../cskh/cskh.dart';
import '../../provisioning/screens/provisioning_screen.dart';

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
  int _snapshotKey = DateTime.now().millisecondsSinceEpoch;
  Timer? _snapshotRefreshTimer;

  @override
  void initState() {
    super.initState();
    _device = widget.device;

    if (_device.category == DeviceCategory.camera) {
      if (!widget.isAlreadyStreaming) {
        // Chỉ gửi mã 13 nếu chưa phát stream từ trước
        _gateway.sendCommand(hardwareId: _device.hardwareId, action: "STREAM_START");
      }
      _snapshotRefreshTimer = Timer.periodic(const Duration(milliseconds: 1500), (timer) {
        if (mounted) {
          setState(() {
            _snapshotKey = DateTime.now().millisecondsSinceEpoch;
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _snapshotRefreshTimer?.cancel();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
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
          IconButton(
            icon: const Icon(Icons.headset_mic_outlined, color: AppTheme.cyanAccent),
            tooltip: "Chat CSKH về thiết bị này",
            onPressed: () {
              final chatDev = ChatDeviceItem(
                isOwned: true,
                hardwareId: widget.device.hardwareId,
                deviceName: widget.device.name,
                modelName: widget.device.modelName,
                categoryTag: widget.device.badgeText.isNotEmpty ? widget.device.badgeText : "AUSTEC",
              );
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => Scaffold(
                    backgroundColor: AppTheme.background,
                    appBar: AppBar(
                      backgroundColor: Colors.transparent,
                      elevation: 0,
                      leading: IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new, size: 20),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                      title: Text(
                        "Hỗ trợ kỹ thuật: ${widget.device.name}",
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ),
                    body: SafeArea(
                      child: CskhChatScreen(
                        initialDevice: chatDev,
                        initialPrompt: "Xin chào CSKH Austec! Tôi cần hỗ trợ kỹ thuật về thiết bị ${widget.device.name} (HWID: ${widget.device.hardwareId}).",
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thẻ Thông Tin Tổng Quan & Bảo Hành Điện Tử
            _buildWarrantyAndStatusCard(),
            const SizedBox(height: 20),

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

            const SizedBox(height: 24),

            // Hộp Đen Kiểm Toán & Nhật Ký Hoạt Động (ẨN KHI KHÔNG CÓ QUYỀN canViewHistory)
            if (_device.canViewHistory)
              _buildAuditLogsSection(),
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

  // 1. Thẻ Bảo Hành & Trạng Thái
  Widget _buildWarrantyAndStatusCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: AppTheme.glassBox(),
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
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF27272A),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.cardBorder),
                ),
                child: Text(
                  _device.modelName,
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),

          // Banner Hướng Dẫn Ngoại Tuyến (Offline Proximity BLE Guide)
          if (!_device.isOnline) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E2024),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Column(
                children: [
                  const Row(
                    children: [
                      Icon(Icons.bluetooth_searching_rounded, color: Colors.white, size: 18),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          "Thiết bị đang Ngoại tuyến Wi-Fi. Bạn có thể đến gần (< 10-15m) và bật Bluetooth để điều khiển trực tiếp qua BLE.",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            height: 1.3,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 32,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppTheme.cardBorder),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.wifi_password, size: 14, color: Colors.white),
                      label: const Text(
                        "Cấu Hình Lại Mạng Wi-Fi (Nạp lại BLE)",
                        style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (context) => const ProvisioningScreen()),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 14),
          const Divider(color: AppTheme.cardBorder, height: 1),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Mã Bảo Hành Điện Tử", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                  Text(
                    _device.warrantyCode,
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text("Thời Hạn Chính Hãng", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                  Text(
                    _device.warrantyUntil,
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
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
          padding: const EdgeInsets.all(20),
          decoration: AppTheme.glassBox(),
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
          padding: const EdgeInsets.all(18),
          decoration: AppTheme.glassBox(),
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
          padding: const EdgeInsets.all(18),
          decoration: AppTheme.glassBox(),
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

  // 3. Chi Tiết Ổ Cắm Thông Minh & Chiếu Sáng (Chuẩn Firmware ocammoi)
  Widget _buildLightSwitchDetailedControls() {
    final isOn = _device.isRelayOn;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Card Điều Khiển Rơ-le Chính
        Container(
          padding: const EdgeInsets.all(20),
          decoration: AppTheme.glassBox(),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isOn ? AppTheme.cyanAccent.withValues(alpha: 0.15) : AppTheme.surface,
                          border: Border.all(
                            color: isOn ? AppTheme.cyanAccent : AppTheme.cardBorder,
                            width: 1.5,
                          ),
                          boxShadow: isOn
                              ? [
                                  BoxShadow(
                                    color: AppTheme.cyanAccent.withValues(alpha: 0.35),
                                    blurRadius: 14,
                                    spreadRadius: 2,
                                  ),
                                ]
                              : null,
                        ),
                        child: Icon(
                          isOn ? Icons.power_settings_new_rounded : Icons.power_off_rounded,
                          color: isOn ? AppTheme.cyanAccent : AppTheme.textMuted,
                          size: 30,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Text(
                        isOn ? "ĐANG BẬT" : "ĐANG TẮT",
                        style: TextStyle(
                          color: isOn ? AppTheme.cyanAccent : Colors.white70,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                  Transform.scale(
                    scale: 1.35,
                    child: Switch(
                      value: isOn,
                      activeThumbColor: Colors.white,
                      activeTrackColor: AppTheme.cyanAccent,
                      inactiveThumbColor: Colors.white60,
                      inactiveTrackColor: AppTheme.surface,
                      onChanged: (val) {
                        _triggerAction(val ? "TURN_ON" : "TURN_OFF");
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              const Divider(color: AppTheme.cardBorder, height: 1),
              const SizedBox(height: 16),

              // Chỉ đúng 2 nút BẬT và TẮT tối giản, không số, không mô tả
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      icon: const Icon(Icons.power_settings_new_rounded, size: 20),
                      label: const Text("BẬT", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 0.8)),
                      onPressed: () => _triggerAction("TURN_ON"),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      icon: const Icon(Icons.power_off_rounded, size: 20),
                      label: const Text("TẮT", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 0.8)),
                      onPressed: () => _triggerAction("TURN_OFF"),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // CÀI ĐẶT AN TOÀN & TAY ĐIỀU KHIỂN RF (Giống hệt dạng cửa cuốn)
        const Text(
          "CÀI ĐẶT AN TOÀN & TAY ĐIỀU KHIỂN RF",
          style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: AppTheme.glassBox(),
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
                        onPressed: () => _triggerAction("RF_SETUP"),
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
                        onPressed: () => _triggerAction("RF_CLEAR"),
                        child: const Text("Xóa Hết", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // 4. Chi Tiết Camera
  Widget _buildCameraDetailedControls() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: AppTheme.glassBox(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.black,
                border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.4)),
              ),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Image.network(
                      "${ApiConfig.baseUrl}/api/devices/${_device.hardwareId}/camera/snapshot?t=$_snapshotKey",
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.videocam_rounded, color: AppTheme.cyanAccent, size: 48),
                            const SizedBox(height: 8),
                            Text("LIVE STREAM • ${_device.streamResolution}", style: const TextStyle(color: Colors.white70, fontSize: 12)),
                            const SizedBox(height: 4),
                            const Text("Đang chờ khung hình từ ESP32-CAM...", style: TextStyle(color: Colors.white38, fontSize: 11)),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: AppTheme.roseDanger, borderRadius: BorderRadius.circular(6)),
                      child: const Text("REC LIVE", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
                icon: const Icon(Icons.play_arrow_rounded),
                label: const Text("Bật Stream", style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () {
                  _triggerAction("STREAM_START");
                  setState(() => _snapshotKey = DateTime.now().millisecondsSinceEpoch);
                },
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.blueGrey, foregroundColor: Colors.white),
                icon: const Icon(Icons.stop_rounded),
                label: const Text("Dừng", style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () => _triggerAction("STREAM_STOP"),
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.purpleAccent, foregroundColor: Colors.white),
                icon: const Icon(Icons.camera_alt),
                label: const Text("Chụp", style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () {
                  _triggerAction("TAKE_SNAPSHOT");
                  setState(() => _snapshotKey = DateTime.now().millisecondsSinceEpoch);
                },
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
      padding: const EdgeInsets.all(20),
      decoration: AppTheme.glassBox(),
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
          const SizedBox(height: 16),
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
      padding: const EdgeInsets.all(20),
      decoration: AppTheme.glassBox(),
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
      padding: const EdgeInsets.all(20),
      decoration: AppTheme.glassBox(),
      child: Column(
        children: [
          GestureDetector(
            onTap: () => _triggerAction("TOGGLE_LOCK"),
            child: Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF27272A),
                border: Border.all(color: AppTheme.cardBorder, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.25),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Icon(_device.isLocked ? Icons.lock_rounded : Icons.lock_open_rounded, color: Colors.white, size: 40),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _device.isLocked ? "CHẠM ĐỂ MỞ KHÓA MỘT CHẠM" : "CHẠM ĐỂ KHÓA CHỐT AN TOÀN",
            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text("Nhật ký: ${_device.lastUnlockUser}", style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
        ],
      ),
    );
  }

  // 8. Hộp Đen Kiểm Toán
  Widget _buildAuditLogsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.history_edu_rounded, color: Colors.white, size: 20),
            SizedBox(width: 8),
            Text(
              "HỘP ĐEN KIỂM TOÁN & LỊCH SỬ HOẠT ĐỘNG",
              style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 0.5),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          decoration: AppTheme.glassBox(),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _device.auditLogs.length,
            separatorBuilder: (_, __) => const Divider(color: AppTheme.cardBorder, height: 1),
            itemBuilder: (context, index) {
              final log = _device.auditLogs[index];
              return ListTile(
                dense: true,
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFF27272A),
                  radius: 16,
                  child: Icon(
                    log.isAlert ? Icons.warning_rounded : Icons.check_circle_outline,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
                title: Text(
                  log.action,
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                ),
                subtitle: Text("Kích hoạt bởi: ${log.triggeredBy}", style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                trailing: Text(log.time, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10, fontFamily: "monospace")),
              );
            },
          ),
        ),
      ],
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
