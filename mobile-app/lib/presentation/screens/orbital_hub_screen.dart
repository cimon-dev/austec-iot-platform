import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../../core/constants/app_theme.dart';
import '../../core/models/device_model.dart';
import '../../core/services/iot_gateway_client.dart';
import 'provisioning_screen.dart';
import 'cskh_chat_screen.dart';
import 'family_sharing_screen.dart';

class OrbitalHubScreen extends StatefulWidget {
  const OrbitalHubScreen({super.key});

  @override
  State<OrbitalHubScreen> createState() => _OrbitalHubScreenState();
}

class _OrbitalHubScreenState extends State<OrbitalHubScreen> with SingleTickerProviderStateMixin {
  late AnimationController _rotationController;
  final IoTGatewayClient _gateway = IoTGatewayClient();
  int _selectedTabIndex = 0;
  bool _isAutoRotating = true;
  DeviceItem? _activeSheetDevice;
  bool _isActionExecuting = false;
  String _lastActionStatus = "";

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 40),
    )..repeat();
  }

  @override
  void dispose() {
    _rotationController.dispose();
    super.dispose();
  }

  void _open2ClickQuickSheet(DeviceItem device) {
    setState(() {
      _activeSheetDevice = device;
      _lastActionStatus = "";
    });

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => _build2ClickActionSheet(device),
    );
  }

  // 2-Click Action Dispatcher
  Future<void> _executeAction(String action, [Map<String, dynamic>? params]) async {
    if (_activeSheetDevice == null) return;
    setState(() {
      _isActionExecuting = true;
    });

    final res = await _gateway.sendCommand(
      hardwareId: _activeSheetDevice!.hardwareId,
      action: action,
      parameters: params,
    );

    setState(() {
      _isActionExecuting = false;
      _lastActionStatus = "${res.message} (${res.latencyMs}ms)";
    });

    // Provide haptic feedback visually & toast
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: AppTheme.emeraldSuccess, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  "${res.message} • ${res.latencyMs}ms",
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          backgroundColor: AppTheme.surfaceGlass,
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final devices = _gateway.devices;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        children: [
          // Background ambient gradient glows
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 320,
              height: 320,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [AppTheme.blueAccent.withOpacity(0.2), Colors.transparent],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 100,
            right: -100,
            child: Container(
              width: 360,
              height: 360,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [AppTheme.cyanAccent.withOpacity(0.15), Colors.transparent],
                ),
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Top App Bar
                _buildTopHeader(),

                // Center Orbital View or Content
                Expanded(
                  child: _selectedTabIndex == 0
                      ? _buildOrbitalSpaceView(devices)
                      : _selectedTabIndex == 1
                          ? const CskhChatScreen()
                          : _selectedTabIndex == 2
                              ? const FamilySharingScreen()
                              : _buildProfileSettings(),
                ),

                // Bottom Modern Glass Nav Bar
                _buildBottomNavBar(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Top Header with Weather and Pairing Button
  Widget _buildTopHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: AppTheme.cyanGradient,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.cyanAccent.withOpacity(0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Center(
                  child: Text(
                    "A",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "AUSTEC SMART HOME",
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppTheme.emeraldSuccess,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        "${_gateway.devices.length} Thiết bị trực tuyến • < 180ms",
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          // Add Device / QR BLE Pairing Button
          GestureDetector(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const ProvisioningScreen()),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: AppTheme.glassBox(
                color: AppTheme.cyanAccent.withOpacity(0.12),
                borderColor: AppTheme.cyanAccent.withOpacity(0.4),
                radius: 12,
                glow: true,
              ),
              child: const Row(
                children: [
                  Icon(Icons.qr_code_scanner, color: AppTheme.cyanAccent, size: 18),
                  SizedBox(width: 6),
                  Text(
                    "Ghép Nối",
                    style: TextStyle(
                      color: AppTheme.cyanAccent,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Central Orbital Hub UI
  Widget _buildOrbitalSpaceView(List<DeviceItem> devices) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final center = Offset(constraints.maxWidth / 2, constraints.maxHeight / 2 - 20);
        final radius = math.min(constraints.maxWidth, constraints.maxHeight) * 0.38;

        return Stack(
          alignment: Alignment.center,
          children: [
            // Orbital ring circles
            CustomPaint(
              size: Size(constraints.maxWidth, constraints.maxHeight),
              painter: OrbitalRingPainter(center: center, radius: radius),
            ),

            // Central Glowing Smart Home Hub Node
            Positioned(
              left: center.dx - 65,
              top: center.dy - 65,
              child: Container(
                width: 130,
                height: 130,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.surfaceGlass,
                  border: Border.all(color: AppTheme.cyanAccent.withOpacity(0.5), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.cyanAccent.withOpacity(0.2),
                      blurRadius: 30,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.home_rounded, color: AppTheme.cyanAccent, size: 36),
                    const SizedBox(height: 4),
                    const Text(
                      "NGÔI NHÀ",
                      style: TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.2,
                      ),
                    ),
                    Text(
                      "${devices.length} Thiết bị",
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Orbiting Satellite Nodes (Devices)
            AnimatedBuilder(
              animation: _rotationController,
              builder: (context, child) {
                final baseAngle = _isAutoRotating ? _rotationController.value * 2 * math.pi : 0.0;

                return Stack(
                  children: List.generate(devices.length, (index) {
                    final device = devices[index];
                    final angle = baseAngle + (index * 2 * math.pi / devices.length);
                    final dx = center.dx + radius * math.cos(angle) - 40;
                    final dy = center.dy + radius * math.sin(angle) - 40;

                    return Positioned(
                      left: dx,
                      top: dy,
                      child: GestureDetector(
                        onTap: () => _open2ClickQuickSheet(device),
                        child: _buildSatelliteDeviceNode(device),
                      ),
                    );
                  }),
                );
              },
            ),

            // Helper hint at the bottom
            Positioned(
              bottom: 20,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: AppTheme.glassBox(
                  color: AppTheme.surfaceGlass.withOpacity(0.85),
                  radius: 20,
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.touch_app, color: AppTheme.cyanAccent, size: 16),
                    SizedBox(width: 8),
                    Text(
                      "Chạm vệ tinh bất kỳ để kích hoạt 2-Click Quick Sheet",
                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  // Individual Satellite Node
  Widget _buildSatelliteDeviceNode(DeviceItem device) {
    IconData icon;
    Color accentColor;

    switch (device.category) {
      case DeviceCategory.rollerDoor:
        icon = Icons.garage_rounded;
        accentColor = AppTheme.cyanAccent;
        break;
      case DeviceCategory.smartLock:
        icon = Icons.lock_outline_rounded;
        accentColor = AppTheme.amberWarning;
        break;
      case DeviceCategory.smartUps:
        icon = Icons.bolt_rounded;
        accentColor = AppTheme.emeraldSuccess;
        break;
      case DeviceCategory.smartSocket:
        icon = Icons.power_rounded;
        accentColor = AppTheme.blueAccent;
        break;
      case DeviceCategory.sensor:
        icon = Icons.thermostat_rounded;
        accentColor = Colors.purpleAccent;
        break;
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppTheme.surfaceGlass,
            border: Border.all(color: accentColor.withOpacity(0.7), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: accentColor.withOpacity(0.25),
                blurRadius: 16,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Center(
            child: Icon(icon, color: accentColor, size: 30),
          ),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.7),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            device.name,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  // 2-Click Action Bottom Sheet
  Widget _build2ClickActionSheet(DeviceItem device) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder, width: 1.5)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 48,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.textMuted,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Device info header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    device.hardwareId,
                    style: const TextStyle(
                      color: AppTheme.cyanAccent,
                      fontSize: 12,
                      fontFamily: "monospace",
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    device.name,
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    device.modelName,
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.emeraldSuccess.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.emeraldSuccess.withOpacity(0.3)),
                ),
                child: Text(
                  device.stateSummary,
                  style: const TextStyle(
                    color: AppTheme.emeraldSuccess,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),
          const Divider(color: AppTheme.cardBorder, height: 1),
          const SizedBox(height: 20),

          // Dynamic 2-Click Controls depending on Category
          if (device.category == DeviceCategory.rollerDoor)
            _buildRollerDoor2ClickControls(device)
          else if (device.category == DeviceCategory.smartLock)
            _buildSmartLock2ClickControls(device)
          else if (device.category == DeviceCategory.smartUps)
            _buildUps2ClickControls(device)
          else if (device.category == DeviceCategory.smartSocket)
            _buildSocket2ClickControls(device)
          else
            _buildSensorTelemetries(device),

          const SizedBox(height: 16),
          // Latency & SLA footer
          Center(
            child: Text(
              "Độ trễ khứ hồi: < 200ms • Mã hóa MQTT TLS 1.3 • Hộp đen Kiểm toán",
              style: TextStyle(color: AppTheme.textMuted.withOpacity(0.8), fontSize: 10),
            ),
          ),
        ],
      ),
    );
  }

  // 1. Roller Door 2-Click: UP - STOP - DOWN + Child Lock
  Widget _buildRollerDoor2ClickControls(DeviceItem device) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildActionButton(
              label: "MỞ CỬA",
              icon: Icons.arrow_upward_rounded,
              gradient: AppTheme.cyanGradient,
              onTap: () => _executeAction("OPEN_DOOR"),
            ),
            _buildActionButton(
              label: "DỪNG LẠI",
              icon: Icons.stop_rounded,
              gradient: AppTheme.amberGradient,
              onTap: () => _executeAction("STOP_DOOR"),
            ),
            _buildActionButton(
              label: "ĐÓNG CỬA",
              icon: Icons.arrow_downward_rounded,
              gradient: const LinearGradient(colors: [Color(0xFF64748B), Color(0xFF334155)]),
              onTap: () => _executeAction("CLOSE_DOOR"),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Child lock toggle
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              "Khóa an toàn trẻ em (Vô hiệu hóa remote RF)",
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
            Switch(
              value: device.isChildLockActive,
              activeColor: AppTheme.cyanAccent,
              onChanged: (val) => _executeAction("TOGGLE_CHILD_LOCK"),
            ),
          ],
        ),
      ],
    );
  }

  // 2. Smart Lock 2-Click: Slide to unlock
  Widget _buildSmartLock2ClickControls(DeviceItem device) {
    return Column(
      children: [
        Container(
          height: 60,
          decoration: BoxDecoration(
            color: AppTheme.background,
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: AppTheme.cardBorder),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              GestureDetector(
                onTap: () => _executeAction(device.isLocked ? "UNLOCK_SLIDE" : "LOCK_SLIDE"),
                child: Container(
                  width: 54,
                  height: 54,
                  margin: const EdgeInsets.all(3),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: AppTheme.amberGradient,
                  ),
                  child: Icon(
                    device.isLocked ? Icons.lock_open_rounded : Icons.lock_rounded,
                    color: Colors.white,
                  ),
                ),
              ),
              Expanded(
                child: Center(
                  child: Text(
                    device.isLocked ? "Chạm để MỞ KHÓA MỘT CHẠM" : "Chạm để KHÓA CHỐT AN TOÀN",
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 54),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          "Mức pin khóa: ${device.batteryPercent}% • Nhật ký: Mở bằng vân tay lúc 19:42",
          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
        ),
      ],
    );
  }

  // 3. UPS 2-Click: Auto discharge toggle
  Widget _buildUps2ClickControls(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildActionButton(
          label: device.isDischarging ? "DỪNG XẢ BẢO DƯỠNG" : "XẢ PIN THÔNG MINH",
          icon: Icons.battery_charging_full_rounded,
          gradient: AppTheme.emeraldGradient,
          onTap: () => _executeAction("DISCHARGE_UPS"),
        ),
      ],
    );
  }

  // 4. Smart Socket 2-Click: Power Toggle
  Widget _buildSocket2ClickControls(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildActionButton(
          label: device.isSocketRelayOn ? "NGẮT NGUỒN ĐIỆN" : "BẬT NGUỒN ĐIỆN",
          icon: Icons.power_settings_new_rounded,
          gradient: device.isSocketRelayOn ? AppTheme.amberGradient : AppTheme.cyanGradient,
          onTap: () => _executeAction("TOGGLE_SOCKET"),
        ),
      ],
    );
  }

  // 5. Environmental Sensors
  Widget _buildSensorTelemetries(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildSensorStatCard("Nhiệt độ", "${device.temperature.toStringAsFixed(1)} °C", Icons.thermostat),
        _buildSensorStatCard("Độ ẩm", "${device.humidity.toStringAsFixed(0)} %", Icons.water_drop),
      ],
    );
  }

  Widget _buildSensorStatCard(String title, String val, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: AppTheme.glassBox(color: AppTheme.background, radius: 16),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.cyanAccent, size: 24),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
              Text(val, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  // Action Button Widget
  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required LinearGradient gradient,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: _isActionExecuting ? null : onTap,
      child: Container(
        width: 100,
        height: 80,
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 28),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Bottom Navigation Bar
  Widget _buildBottomNavBar() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: AppTheme.glassBox(
        color: AppTheme.surfaceGlass.withOpacity(0.95),
        radius: 24,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(Icons.hub_rounded, "Quỹ Đạo", 0),
          _buildNavItem(Icons.support_agent_rounded, "CSKH Trực Tuyến", 1),
          _buildNavItem(Icons.group_rounded, "Gia Đình", 2),
          _buildNavItem(Icons.person_rounded, "Cá Nhân", 3),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isSelected = _selectedTabIndex == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedTabIndex = index;
        });
      },
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: isSelected ? AppTheme.cyanAccent : AppTheme.textMuted,
            size: 22,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: isSelected ? AppTheme.cyanAccent : AppTheme.textMuted,
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileSettings() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Cài Đặt & Tài Khoản",
            style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: AppTheme.glassBox(),
            child: const Column(
              children: [
                ListTile(
                  leading: Icon(Icons.person_outline, color: AppTheme.cyanAccent),
                  title: Text("Nguyễn Văn Nam", style: TextStyle(color: Colors.white)),
                  subtitle: Text("nguyen.vannam@gmail.com • 0912345678", style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                ),
                Divider(color: AppTheme.cardBorder),
                ListTile(
                  leading: Icon(Icons.shield_outlined, color: AppTheme.emeraldSuccess),
                  title: Text("Bảo hành điện tử chính hãng", style: TextStyle(color: Colors.white)),
                  subtitle: Text("24 tháng kích hoạt tự động theo Hardware ID", style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Custom Painter for Orbital rings
class OrbitalRingPainter extends CustomPainter {
  final Offset center;
  final double radius;

  OrbitalRingPainter({required this.center, required this.radius});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppTheme.cyanAccent.withOpacity(0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    // Draw main orbit ring
    canvas.drawCircle(center, radius, paint);

    // Draw secondary outer dashed ring
    final outerPaint = Paint()
      ..color = AppTheme.blueAccent.withOpacity(0.08)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawCircle(center, radius * 1.25, outerPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
