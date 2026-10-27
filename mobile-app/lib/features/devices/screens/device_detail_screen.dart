import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../cskh/cskh.dart';

class DeviceDetailScreen extends StatefulWidget {
  final DeviceItem device;

  const DeviceDetailScreen({super.key, required this.device});

  @override
  State<DeviceDetailScreen> createState() => _DeviceDetailScreenState();
}

class _DeviceDetailScreenState extends State<DeviceDetailScreen> {
  final IoTGatewayClient _gateway = IoTGatewayClient();
  late DeviceItem _device;
  bool _isBusy = false;

  @override
  void initState() {
    super.initState();
    _device = widget.device;
  }

  Future<void> _triggerAction(String action, [Map<String, dynamic>? params]) async {
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

            // Bảng Điều Khiển Chuyên Sâu Tùy Theo Danh Mục
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

            const SizedBox(height: 24),

            // Hộp Đen Kiểm Toán & Nhật Ký Hoạt Động
            _buildAuditLogsSection(),
          ],
        ),
      ),
    );
  }

  // 1. Thẻ Bảo Hành & Trạng Thái
  Widget _buildWarrantyAndStatusCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: AppTheme.glassBox(glow: true),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _device.isOnline ? AppTheme.emeraldSuccess : AppTheme.roseDanger,
                      boxShadow: [
                        BoxShadow(
                          color: (_device.isOnline ? AppTheme.emeraldSuccess : AppTheme.roseDanger).withValues(alpha: 0.6),
                          blurRadius: 8,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _device.isOnline ? "KẾT NỐI TRỰC TUYẾN" : "NGOẠI TUYẾN",
                    style: TextStyle(
                      color: _device.isOnline ? AppTheme.emeraldSuccess : AppTheme.roseDanger,
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
                  color: AppTheme.cyanAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.3)),
                ),
                child: Text(
                  _device.modelName,
                  style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
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
                    style: const TextStyle(color: AppTheme.emeraldSuccess, fontSize: 12, fontWeight: FontWeight.bold),
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
                    style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "${_device.positionPercent}%",
                    style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Thanh Slider trực quan
              SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  activeTrackColor: AppTheme.cyanAccent,
                  inactiveTrackColor: AppTheme.cardBorder,
                  thumbColor: Colors.white,
                  thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
                  overlayColor: AppTheme.cyanAccent.withValues(alpha: 0.2),
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

              // Cụm 3 nút chính Mở - Dừng - Đóng
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildPrimaryActionButton(
                    label: "MỞ CỬA",
                    icon: Icons.arrow_upward_rounded,
                    gradient: AppTheme.cyanGradient,
                    onTap: () => _triggerAction("OPEN_DOOR"),
                  ),
                  _buildPrimaryActionButton(
                    label: "DỪNG LẠI",
                    icon: Icons.stop_rounded,
                    gradient: AppTheme.amberGradient,
                    onTap: () => _triggerAction("STOP_DOOR"),
                  ),
                  _buildPrimaryActionButton(
                    label: "ĐÓNG CỬA",
                    icon: Icons.arrow_downward_rounded,
                    gradient: const LinearGradient(colors: [Color(0xFF64748B), Color(0xFF334155)]),
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
                    activeThumbColor: AppTheme.cyanAccent,
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

  // 3. Chi Tiết Chiếu Sáng
  Widget _buildLightSwitchDetailedControls() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: AppTheme.glassBox(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Công Tắc Tổng", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              Switch(
                value: _device.isRelayOn,
                activeThumbColor: AppTheme.cyanAccent,
                onChanged: (val) => _triggerAction("TOGGLE_RELAY"),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(color: AppTheme.cardBorder),
          const SizedBox(height: 10),
          const Text("Các kênh Rơ-le độc lập:", style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
          const SizedBox(height: 10),
          ...List.generate(_device.subChannels.length, (idx) {
            final isOn = _device.subChannels[idx];
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: isOn ? AppTheme.cyanAccent.withValues(alpha: 0.08) : AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isOn ? AppTheme.cyanAccent.withValues(alpha: 0.4) : AppTheme.cardBorder),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.lightbulb, color: isOn ? AppTheme.amberWarning : AppTheme.textMuted, size: 20),
                      const SizedBox(width: 10),
                      Text("Kênh Rơ-le #${idx + 1}", style: const TextStyle(color: Colors.white, fontSize: 13)),
                    ],
                  ),
                  Switch(
                    value: isOn,
                    activeThumbColor: AppTheme.amberWarning,
                    onChanged: (val) => _triggerAction("TOGGLE_SUB_CHANNEL", {"channelIndex": idx}),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
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
          Container(
            height: 180,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.4)),
            ),
            child: Stack(
              children: [
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.videocam_rounded, color: AppTheme.cyanAccent, size: 48),
                      const SizedBox(height: 8),
                      Text("LIVE STREAM • ${_device.streamResolution}", style: const TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
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
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
                icon: const Icon(Icons.camera_alt),
                label: const Text("Chụp Ảnh", style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Đã lưu ảnh snapshot vào thư viện!")));
                },
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _device.isAlarmActive ? AppTheme.roseDanger : AppTheme.amberWarning,
                  foregroundColor: Colors.white,
                ),
                icon: const Icon(Icons.warning_amber),
                label: Text(_device.isAlarmActive ? "Tắt Báo Động" : "Bật Còi Hú", style: const TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () => _triggerAction("TOGGLE_ALARM"),
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
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: _device.isLocked ? AppTheme.amberGradient : AppTheme.emeraldGradient,
                boxShadow: [
                  BoxShadow(
                    color: (_device.isLocked ? AppTheme.amberWarning : AppTheme.emeraldSuccess).withValues(alpha: 0.4),
                    blurRadius: 20,
                    spreadRadius: 4,
                  ),
                ],
              ),
              child: Icon(_device.isLocked ? Icons.lock_rounded : Icons.lock_open_rounded, color: Colors.white, size: 44),
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
            Icon(Icons.history_edu_rounded, color: AppTheme.cyanAccent, size: 20),
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
                  backgroundColor: log.isAlert ? AppTheme.roseDanger.withValues(alpha: 0.2) : AppTheme.blueAccent.withValues(alpha: 0.2),
                  radius: 16,
                  child: Icon(
                    log.isAlert ? Icons.warning_rounded : Icons.check_circle_outline,
                    color: log.isAlert ? AppTheme.roseDanger : AppTheme.cyanAccent,
                    size: 18,
                  ),
                ),
                title: Text(
                  log.action,
                  style: TextStyle(color: log.isAlert ? AppTheme.roseDanger : Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
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
          color: isCurrent ? AppTheme.cyanAccent.withValues(alpha: 0.18) : AppTheme.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isCurrent ? AppTheme.cyanAccent : AppTheme.cardBorder),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isCurrent ? AppTheme.cyanAccent : AppTheme.textSecondary,
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
    required LinearGradient gradient,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: _isBusy ? null : onTap,
      child: Container(
        width: 95,
        height: 75,
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.35), blurRadius: 8, offset: const Offset(0, 4)),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 26),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
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
              Icon(icon, color: AppTheme.cyanAccent, size: 16),
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
