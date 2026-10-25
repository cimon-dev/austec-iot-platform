import 'package:flutter/material.dart';
import '../../core/constants/app_theme.dart';
import '../../core/models/device_model.dart';
import '../../core/services/iot_gateway_client.dart';
import '../../core/services/auth_service.dart';
import 'device_settings_screen.dart';
import 'roller_door_control_screen.dart';
import 'device_detail_screen.dart';

class DeviceManagementCenterScreen extends StatefulWidget {
  const DeviceManagementCenterScreen({super.key});

  @override
  State<DeviceManagementCenterScreen> createState() => _DeviceManagementCenterScreenState();
}

class _DeviceManagementCenterScreenState extends State<DeviceManagementCenterScreen> {
  final IoTGatewayClient _gateway = IoTGatewayClient();
  String _selectedCategoryFilter = "ALL"; // 'ALL', 'rollerDoor', 'lightSwitch', ...
  String? _transferOtp;

  void _showRenameDialog(DeviceItem device) {
    final controller = TextEditingController(text: device.name);
    final isDark = AppTheme.isDarkMode;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppTheme.surfaceDark : Colors.white,
        title: Text(
          "Đổi Tên Quản Trị",
          style: TextStyle(color: isDark ? Colors.white : Colors.black, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Mã phần cứng: ${device.hardwareId}",
              style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontFamily: "monospace"),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              style: TextStyle(color: isDark ? Colors.white : Colors.black),
              decoration: InputDecoration(
                labelText: "Tên hiển thị mới",
                labelStyle: const TextStyle(color: AppTheme.cyanAccent),
                enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: isDark ? AppTheme.cardBorder : Colors.grey[300]!)),
                focusedBorder: const OutlineInputBorder(borderSide: BorderSide(color: AppTheme.cyanAccent)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Hủy"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                _gateway.updateDeviceName(device.hardwareId, controller.text.trim());
                setState(() {});
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Đã cập nhật tên thiết bị thành công")),
                );
              }
            },
            child: const Text("Lưu thay đổi"),
          ),
        ],
      ),
    );
  }

  void _showAssignRoomDialog(DeviceItem device) {
    final isDark = AppTheme.isDarkMode;
    final rooms = ["Mặt tiền nhà phố", "Gara tầng 1", "Phòng khách", "Sân thượng", "Kho hàng"];

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppTheme.surfaceDark : Colors.white,
        title: Text("Gán Khu Vực / Vị Trí", style: TextStyle(color: isDark ? Colors.white : Colors.black, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: rooms.map((room) {
            final isCurrent = device.roomName == room;
            return ListTile(
              title: Text(room, style: TextStyle(color: isDark ? Colors.white : Colors.black, fontSize: 13)),
              trailing: isCurrent ? const Icon(Icons.check, color: AppTheme.cyanAccent) : null,
              onTap: () {
                setState(() {
                  // In mock we can't edit final roomName directly, but acknowledge
                });
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text("Đã gán thiết bị vào khu vực '$room'")),
                );
              },
            );
          }).toList(),
        ),
      ),
    );
  }

  void _checkFirmwareOta(DeviceItem device) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surfaceDark : Colors.white,
        title: Row(
          children: [
            const Icon(Icons.system_update_alt_rounded, color: AppTheme.cyanAccent),
            const SizedBox(width: 8),
            Text(
              "Kiểm Tra Firmware OTA",
              style: TextStyle(color: AppTheme.isDarkMode ? Colors.white : Colors.black, fontSize: 15),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Thiết bị: ${device.name} (${device.hardwareId})"),
            const SizedBox(height: 6),
            const Text("Phiên bản hiện tại: v2.4.1-esp32s3"),
            const SizedBox(height: 4),
            const Row(
              children: [
                Icon(Icons.check_circle, color: AppTheme.emeraldSuccess, size: 16),
                SizedBox(width: 6),
                Text(
                  "Bo mạch đang chạy phiên bản mới nhất!",
                  style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Đóng"),
          ),
        ],
      ),
    );
  }

  void _triggerEmergencyLockdown() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surfaceDark : Colors.white,
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppTheme.amberWarning),
            SizedBox(width: 8),
            Text("KHÓA KHẨN CẤP TOÀN BỘ CỬA", style: TextStyle(color: AppTheme.amberWarning, fontSize: 14)),
          ],
        ),
        content: const Text(
          "Hành động này sẽ gửi lệnh bảo mật khóa toàn bộ cửa cuốn trong nhà và vô hiệu hóa tất cả remote RF cầm tay. Bạn có chắc chắn?",
          style: TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text("Hủy")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.amberWarning, foregroundColor: Colors.black),
            onPressed: () {
              for (final dev in _gateway.devices) {
                if (dev.category == DeviceCategory.rollerDoor) {
                  _gateway.sendCommand(hardwareId: dev.hardwareId, action: "TOGGLE_CHILD_LOCK");
                }
              }
              Navigator.of(ctx).pop();
              setState(() {});
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text("Đã kích hoạt Khóa Khẩn Cấp toàn bộ cửa cuốn thành công!"),
                  backgroundColor: AppTheme.amberWarning,
                ),
              );
            },
            child: const Text("Kích Hoạt Khóa"),
          ),
        ],
      ),
    );
  }

  void _generateTransferOwnershipOtp() {
    setState(() => _transferOtp = "889241");
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surfaceDark : Colors.white,
        title: const Text("Chuyển Giao Quyền Sở Hữu", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              "Mã OTP chuyển nhượng có hiệu lực trong 15 phút. Người mua mới mở App Austec và quét mã này để nhận toàn quyền quản trị:",
              style: TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.cyanAccent),
              ),
              child: Text(
                _transferOtp!,
                style: const TextStyle(
                  color: AppTheme.cyanAccent,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 8,
                  fontFamily: "monospace",
                ),
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Đã hiểu"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    final devices = _selectedCategoryFilter == "ALL"
        ? _gateway.devices
        : _gateway.devices.where((d) => d.category.name == _selectedCategoryFilter).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Thẻ Người Quản Trị Hệ Thống (Master Admin)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark
                    ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                    : [Colors.white, const Color(0xFFF1F5F9)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: AppTheme.cyanGradient,
                  ),
                  child: const Center(
                    child: Icon(Icons.shield_rounded, color: Colors.white, size: 26),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Builder(builder: (context) {
                      final currentUser = AuthService().currentUser;
                      final currentUserName = (currentUser != null && currentUser.fullName.isNotEmpty)
                          ? currentUser.fullName
                          : (currentUser?.email.isNotEmpty == true ? currentUser!.email : 'Khách Hàng Austec');
                      final currentUserPhone = (currentUser != null && currentUser.phoneNumber.isNotEmpty)
                          ? currentUser.phoneNumber
                          : '0988.xxx.888';

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                currentUserName,
                                style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  "CHỦ SỞ HỮU",
                                  style: TextStyle(color: AppTheme.cyanAccent, fontSize: 9, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            "Tài khoản: ${currentUser?.email ?? 'austec.user'} • SĐT: $currentUserPhone",
                            style: TextStyle(color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary, fontSize: 11),
                          ),
                        ],
                      );
                    }),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // 2. Thống kê KPI Hệ Thống (Executive Dashboard)
          Row(
            children: [
              Expanded(
                child: _buildKpiBox(
                  title: "Tổng Thiết Bị",
                  value: "${_gateway.devices.length}",
                  sub: "7 Trực tuyến",
                  icon: Icons.devices_rounded,
                  color: AppTheme.cyanAccent,
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildKpiBox(
                  title: "Công Suất Lưới",
                  value: "3.46 kW",
                  sub: "Ổn định 220V",
                  icon: Icons.bolt_rounded,
                  color: AppTheme.amberWarning,
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildKpiBox(
                  title: "Bảo Hành Điện Tử",
                  value: "7/7 Máy",
                  sub: "24 Tháng",
                  icon: Icons.verified_user_rounded,
                  color: AppTheme.emeraldSuccess,
                  isDark: isDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 3. Nút Tác Vụ Quản Trị Nhanh (Khóa khẩn cấp / Chuyển giao)
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: _triggerEmergencyLockdown,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.amberWarning.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.amberWarning.withValues(alpha: 0.4)),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.lock_person_rounded, color: AppTheme.amberWarning, size: 16),
                        SizedBox(width: 6),
                        Text(
                          "Khóa Khẩn Cấp Toàn Bộ Cửa",
                          style: TextStyle(color: AppTheme.amberWarning, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: _generateTransferOwnershipOtp,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 10),
                  decoration: BoxDecoration(
                    color: AppTheme.purpleAccent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.purpleAccent.withValues(alpha: 0.4)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.qr_code_2_rounded, color: AppTheme.purpleAccent, size: 16),
                      SizedBox(width: 4),
                      Text(
                        "Chuyển nhượng",
                        style: TextStyle(color: AppTheme.purpleAccent, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 4. Bộ lọc danh mục thiết bị
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip("Tất cả (${_gateway.devices.length})", "ALL", isDark),
                _buildFilterChip("Cửa cuốn", "rollerDoor", isDark),
                _buildFilterChip("Chiếu sáng", "lightSwitch", isDark),
                _buildFilterChip("Camera", "camera", isDark),
                _buildFilterChip("Môi trường", "environment", isDark),
                _buildFilterChip("Lưu điện UPS", "energyManage", isDark),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // 5. Danh Sách Quản Trị Từng Thiết Bị Của Người Dùng
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: devices.length,
            itemBuilder: (context, index) {
              final dev = devices[index];
              return _buildManagedDeviceCard(dev, isDark, textCol, cardBg, cardBorder);
            },
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildKpiBox({
    required String title,
    required String value,
    required String sub,
    required IconData icon,
    required Color color,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary, fontSize: 10),
              ),
              Icon(icon, color: color, size: 14),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.bold),
          ),
          Text(
            sub,
            style: TextStyle(color: isDark ? AppTheme.textMuted : AppTheme.lightTextSecondary, fontSize: 9),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, bool isDark) {
    final isSelected = _selectedCategoryFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategoryFilter = value),
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.cyanAccent.withValues(alpha: 0.15) : (isDark ? AppTheme.surface : AppTheme.lightSurface),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppTheme.cyanAccent : (isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? AppTheme.cyanAccent : (isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary),
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildManagedDeviceCard(DeviceItem dev, bool isDark, Color textCol, Color cardBg, Color cardBorder) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppTheme.cyanAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  dev.category == DeviceCategory.rollerDoor
                      ? Icons.roller_shades_closed_outlined
                      : dev.category == DeviceCategory.camera
                          ? Icons.videocam_rounded
                          : Icons.device_hub_rounded,
                  color: AppTheme.cyanAccent,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          dev.name,
                          style: TextStyle(color: textCol, fontSize: 13.5, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.emeraldSuccess),
                        ),
                      ],
                    ),
                    Text(
                      "${dev.roomName} • ID: ${dev.hardwareId}",
                      style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5, fontFamily: "monospace"),
                    ),
                  ],
                ),
              ),
              // Menu quản trị
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, size: 18),
                onSelected: (val) {
                  if (val == 'rename') _showRenameDialog(dev);
                  if (val == 'room') _showAssignRoomDialog(dev);
                  if (val == 'ota') _checkFirmwareOta(dev);
                  if (val == 'settings') {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (context) => DeviceSettingsScreen(device: dev)),
                    );
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'rename', child: Text("✏️ Đổi tên hiển thị")),
                  const PopupMenuItem(value: 'room', child: Text("🏷️ Gán khu vực / phòng")),
                  const PopupMenuItem(value: 'ota', child: Text("🔄 Kiểm tra Firmware OTA")),
                  const PopupMenuItem(value: 'settings', child: Text("⚙️ Cài đặt thông số")),
                ],
              ),
            ],
          ),
          // Dải thông tin quản trị: Trạng thái ON/OFF, Ai sở hữu, Ngày gia hạn/Bảo hành
          Container(
            margin: const EdgeInsets.only(top: 8, bottom: 4),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.surface.withValues(alpha: 0.5) : AppTheme.lightBackground,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: dev.isOnline ? AppTheme.emeraldSuccess : Colors.grey,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      dev.isOnline ? "ON" : "OFF",
                      style: TextStyle(
                        color: dev.isOnline ? AppTheme.emeraldSuccess : Colors.grey,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    const Icon(Icons.person_outline_rounded, size: 12, color: AppTheme.cyanAccent),
                    const SizedBox(width: 3),
                    Text(
                      dev.ownerName,
                      style: TextStyle(
                        color: isDark ? Colors.white70 : Colors.black87,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    const Icon(Icons.calendar_month_rounded, size: 11, color: AppTheme.amberWarning),
                    const SizedBox(width: 3),
                    Text(
                      "Hạn: ${dev.warrantyUntil.length >= 10 ? dev.warrantyUntil.substring(0, 10) : dev.warrantyUntil}",
                      style: TextStyle(
                        color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                        fontSize: 9.5,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          const Divider(height: 1),
          const SizedBox(height: 8),

          // Các nút thao tác nhanh
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Gói: ${dev.subscriptionStatus == 'ACTIVE' ? '24 Tháng' : 'Hết hạn'}",
                style: TextStyle(color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary, fontSize: 10),
              ),
              Row(
                children: [
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      minimumSize: const Size(0, 28),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(Icons.tune_rounded, size: 13, color: AppTheme.cyanAccent),
                    label: const Text("Cài Đặt", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5)),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (context) => DeviceSettingsScreen(device: dev)),
                      );
                    },
                  ),
                  const SizedBox(width: 6),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.cyanAccent,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      minimumSize: const Size(0, 28),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(Icons.settings_remote_rounded, size: 13),
                    label: const Text("Điều Khiển", style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                    onPressed: () {
                      if (dev.category == DeviceCategory.rollerDoor) {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (context) => RollerDoorControlScreen(device: dev)),
                        );
                      } else {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (context) => DeviceDetailScreen(device: dev)),
                        );
                      }
                    },
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
