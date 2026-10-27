import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import 'device_detail_screen.dart';
import '../../provisioning/screens/provisioning_screen.dart';
import 'roller_door_control_screen.dart';

class CategoryDeviceListSheet extends StatefulWidget {
  final CategoryMeta categoryMeta;

  const CategoryDeviceListSheet({super.key, required this.categoryMeta});

  @override
  State<CategoryDeviceListSheet> createState() => _CategoryDeviceListSheetState();
}

class _CategoryDeviceListSheetState extends State<CategoryDeviceListSheet> {
  final IoTGatewayClient _gateway = IoTGatewayClient();
  bool _isProcessing = false;

  Future<void> _executePreviewAction(DeviceItem device, String action, [Map<String, dynamic>? params]) async {
    setState(() => _isProcessing = true);
    final res = await _gateway.sendCommand(
      hardwareId: device.hardwareId,
      action: action,
      parameters: params,
    );
    if (mounted) {
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("${res.message} • ${res.latencyMs}ms"),
          backgroundColor: AppTheme.isDarkMode ? AppTheme.surfaceGlass : Colors.grey[800],
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showRenameDialog(DeviceItem device) {
    final controller = TextEditingController(text: device.name);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surfaceDark : Colors.white,
        title: Text(
          AppTheme.t("rename_device"),
          style: TextStyle(color: AppTheme.isDarkMode ? Colors.white : Colors.black),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(color: AppTheme.isDarkMode ? Colors.white : Colors.black),
          decoration: InputDecoration(
            labelText: "Tên thiết bị mới",
            labelStyle: const TextStyle(color: AppTheme.cyanAccent),
            enabledBorder: OutlineInputBorder(
              borderSide: BorderSide(color: AppTheme.isDarkMode ? AppTheme.cardBorder : Colors.grey[300]!),
            ),
            focusedBorder: const OutlineInputBorder(
              borderSide: BorderSide(color: AppTheme.cyanAccent),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(AppTheme.t("cancel")),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                _gateway.updateDeviceName(device.hardwareId, controller.text.trim());
                setState(() {});
                Navigator.of(ctx).pop();
              }
            },
            child: Text(AppTheme.t("save")),
          ),
        ],
      ),
    );
  }

  void _showDeleteDialog(DeviceItem device) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surfaceDark : Colors.white,
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: AppTheme.crimsonDanger),
            const SizedBox(width: 8),
            Text(
              AppTheme.t("delete_device"),
              style: TextStyle(color: AppTheme.isDarkMode ? Colors.white : Colors.black),
            ),
          ],
        ),
        content: Text(
          "Bạn có chắc muốn xóa thiết bị '${device.name}' (${device.hardwareId}) khỏi tài khoản?",
          style: TextStyle(color: AppTheme.isDarkMode ? AppTheme.textSecondary : Colors.grey[700]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(AppTheme.t("cancel")),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.crimsonDanger, foregroundColor: Colors.white),
            onPressed: () {
              _gateway.removeDevice(device.hardwareId);
              setState(() {});
              Navigator.of(ctx).pop();
            },
            child: Text(AppTheme.t("delete_device")),
          ),
        ],
      ),
    );
  }

  void _navigateToDetail(DeviceItem device) {
    if (device.category == DeviceCategory.rollerDoor) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (context) => RollerDoorControlScreen(device: device)),
      ).then((_) => setState(() {}));
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (context) => DeviceDetailScreen(device: device)),
      ).then((_) => setState(() {}));
    }
  }

  @override
  Widget build(BuildContext context) {
    final devices = _gateway.getDevicesByCategory(widget.categoryMeta.category);
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
      decoration: BoxDecoration(
        color: bgCol,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        border: Border(
          top: BorderSide(
            color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder,
            width: 1.5,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? AppTheme.textMuted : Colors.grey[400],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Header danh mục
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: widget.categoryMeta.neonColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: widget.categoryMeta.neonColor.withValues(alpha: 0.4)),
                      ),
                      child: Image.asset(widget.categoryMeta.assetPath, fit: BoxFit.contain),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.categoryMeta.title,
                          style: TextStyle(
                            color: widget.categoryMeta.neonColor,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                          ),
                        ),
                        Text(
                          "${widget.categoryMeta.subtitle} • ${devices.length} ${AppTheme.t("devices")}",
                          style: TextStyle(
                            color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                // Nút Thêm thiết bị vào danh mục
                IconButton(
                  icon: const Icon(Icons.add_circle_outline, color: AppTheme.cyanAccent),
                  tooltip: AppTheme.t("add_device"),
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (context) => const ProvisioningScreen()),
                    ).then((_) => setState(() {}));
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),
          Divider(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder, height: 1),

          // Danh Sách Thiết Bị Sở Hữu
          Expanded(
            child: devices.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.devices_other,
                          color: (isDark ? AppTheme.textMuted : Colors.grey).withValues(alpha: 0.5),
                          size: 48,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          "Chưa có thiết bị nào trong danh mục này",
                          style: TextStyle(color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary),
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
                          icon: const Icon(Icons.add),
                          label: Text(AppTheme.t("add_device")),
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (context) => const ProvisioningScreen()),
                            ).then((_) => setState(() {}));
                          },
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: devices.length,
                    itemBuilder: (context, index) {
                      final dev = devices[index];
                      return _buildDeviceCard(dev, isDark, textCol);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceCard(DeviceItem device, bool isDark, Color textCol) {
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tiêu đề thiết bị & 3-dots popup menu
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Icon đại diện
              Container(
                width: 44,
                height: 44,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.cyanAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.3)),
                ),
                child: Icon(
                  device.category == DeviceCategory.rollerDoor
                      ? Icons.roller_shades_closed_outlined
                      : Icons.device_hub_rounded,
                  color: AppTheme.cyanAccent,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),

              // Tên & Nhãn ÂM TƯỜNG + Hardware ID
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.emeraldSuccess,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            device.name,
                            style: TextStyle(
                              color: textCol,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.purpleAccent.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            "ÂM TƯỜNG",
                            style: TextStyle(
                              color: AppTheme.purpleAccent,
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          device.hardwareId.replaceAll('amtuong', ''),
                          style: const TextStyle(
                            color: AppTheme.cyanAccent,
                            fontSize: 11,
                            fontFamily: "monospace",
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Trạng thái tóm tắt
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.emeraldSuccess.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.emeraldSuccess.withValues(alpha: 0.3)),
                ),
                child: Text(
                  device.stateSummary,
                  style: const TextStyle(
                    color: AppTheme.emeraldSuccess,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),

              // 3-dots popup menu (Đổi tên, Xóa thiết bị)
              PopupMenuButton<String>(
                icon: Icon(
                  Icons.more_vert,
                  color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                  size: 20,
                ),
                color: isDark ? AppTheme.surfaceDark : Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                onSelected: (value) {
                  if (value == 'rename') {
                    _showRenameDialog(device);
                  } else if (value == 'delete') {
                    _showDeleteDialog(device);
                  }
                },
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'rename',
                    child: Row(
                      children: [
                        const Icon(Icons.edit_outlined, size: 18, color: AppTheme.cyanAccent),
                        const SizedBox(width: 8),
                        Text(AppTheme.t("rename_device"), style: TextStyle(color: textCol)),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        const Icon(Icons.delete_outline, size: 18, color: AppTheme.crimsonDanger),
                        const SizedBox(width: 8),
                        Text(AppTheme.t("delete_device"), style: const TextStyle(color: AppTheme.crimsonDanger)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),

          // DẢI THÔNG TIN QUẢN TRỊ: TRẠNG THÁI ON/OFF, AI SỞ HỮU, NGÀY GIA HẠN/BẢO HÀNH
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 4),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.surface.withValues(alpha: 0.6) : AppTheme.lightBackground,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // 1. Trạng thái ON / OFF
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: device.isOnline ? AppTheme.emeraldSuccess : Colors.grey,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      device.isOnline ? "ON" : "OFF",
                      style: TextStyle(
                        color: device.isOnline ? AppTheme.emeraldSuccess : Colors.grey,
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                // 2. Ai sở hữu
                Row(
                  children: [
                    const Icon(Icons.person_outline_rounded, size: 13, color: AppTheme.cyanAccent),
                    const SizedBox(width: 4),
                    Text(
                      device.ownerName,
                      style: TextStyle(
                        color: isDark ? Colors.white70 : Colors.black87,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                // 3. Ngày gia hạn / bảo hành
                Row(
                  children: [
                    const Icon(Icons.calendar_month_rounded, size: 12, color: AppTheme.amberWarning),
                    const SizedBox(width: 4),
                    Text(
                      "Hạn: ${device.warrantyUntil.length >= 10 ? device.warrantyUntil.substring(0, 10) : device.warrantyUntil}",
                      style: TextStyle(
                        color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),
          Divider(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder, height: 1),
          const SizedBox(height: 12),

          // 4 Nút Bấm Preview Điều Khiển Nhanh
          if (device.category == DeviceCategory.rollerDoor)
            _buildRollerDoorPreviewButtons(device)
          else if (device.category == DeviceCategory.lightSwitch)
            _buildLightSwitchPreviewButtons(device)
          else if (device.category == DeviceCategory.camera)
            _buildCameraPreviewButtons(device)
          else if (device.category == DeviceCategory.environment)
            _buildSensorPreviewStats(device)
          else if (device.category == DeviceCategory.energyManage)
            _buildUpsPreviewButtons(device)
          else
            _buildLockPreviewButtons(device),

          const SizedBox(height: 12),

          // Nút Chuyển Vào Màn Hình Chi Tiết
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => _navigateToDetail(device),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.tune_rounded, color: AppTheme.cyanAccent, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    AppTheme.t("details"),
                    style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.cyanAccent, size: 12),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 1. Cửa cuốn 4 preview buttons: KHÓA, MỞ, DỪNG, ĐÓNG (như ảnh 02b1a042-72b5-4938-86b5-a7a5c803018a.jpg)
  Widget _buildRollerDoorPreviewButtons(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // 1. Khóa
        _buildCompactActionButton(
          label: AppTheme.t("lock"),
          icon: device.isChildLockActive ? Icons.lock_rounded : Icons.lock_open_rounded,
          color: device.isChildLockActive ? AppTheme.amberWarning : AppTheme.purpleAccent,
          onTap: () => _executePreviewAction(device, "TOGGLE_CHILD_LOCK"),
        ),
        // 2. Mở
        _buildCompactActionButton(
          label: AppTheme.t("open"),
          icon: Icons.arrow_upward_rounded,
          color: AppTheme.cyanAccent,
          onTap: () => _executePreviewAction(device, "OPEN_DOOR"),
        ),
        // 3. Dừng
        _buildCompactActionButton(
          label: AppTheme.t("stop"),
          icon: Icons.stop_rounded,
          color: AppTheme.amberWarning,
          onTap: () => _executePreviewAction(device, "STOP_DOOR"),
        ),
        // 4. Đóng
        _buildCompactActionButton(
          label: AppTheme.t("close"),
          icon: Icons.arrow_downward_rounded,
          color: Colors.blueGrey,
          onTap: () => _executePreviewAction(device, "CLOSE_DOOR"),
        ),
      ],
    );
  }

  Widget _buildCompactActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: _isProcessing ? null : onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 72,
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  // 2. Chiếu sáng Preview buttons
  Widget _buildLightSwitchPreviewButtons(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildCompactActionButton(
          label: "BẬT TẤT CẢ",
          icon: Icons.lightbulb_rounded,
          color: AppTheme.cyanAccent,
          onTap: () => _executePreviewAction(device, "TURN_ON"),
        ),
        _buildCompactActionButton(
          label: "TẮT TẤT CẢ",
          icon: Icons.lightbulb_outline_rounded,
          color: Colors.grey,
          onTap: () => _executePreviewAction(device, "TURN_OFF"),
        ),
      ],
    );
  }

  // 3. Camera Preview buttons
  Widget _buildCameraPreviewButtons(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildCompactActionButton(
          label: "XEM TRỰC TIẾP",
          icon: Icons.videocam_rounded,
          color: AppTheme.cyanAccent,
          onTap: () => _executePreviewAction(device, "STREAM_START"),
        ),
        _buildCompactActionButton(
          label: "CHỤP ẢNH",
          icon: Icons.camera_alt_rounded,
          color: AppTheme.purpleAccent,
          onTap: () => _executePreviewAction(device, "TAKE_SNAPSHOT"),
        ),
      ],
    );
  }

  // 4. Môi trường Preview
  Widget _buildSensorPreviewStats(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatChip(Icons.thermostat_rounded, "Nhiệt độ", "31.5 °C", AppTheme.amberWarning),
        _buildStatChip(Icons.water_drop_rounded, "Độ ẩm", "65 %", AppTheme.cyanAccent),
        _buildStatChip(Icons.air_rounded, "AQI", "42 Tốt", AppTheme.emeraldSuccess),
      ],
    );
  }

  // 5. Năng lượng UPS Preview
  Widget _buildUpsPreviewButtons(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatChip(Icons.battery_charging_full_rounded, "Pin dự phòng", "92%", AppTheme.emeraldSuccess),
        _buildStatChip(Icons.bolt_rounded, "Điện lưới", "220V Ổn định", AppTheme.cyanAccent),
      ],
    );
  }

  // 6. Khóa an toàn / Khác
  Widget _buildLockPreviewButtons(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildCompactActionButton(
          label: "MỞ KHÓA",
          icon: Icons.lock_open_rounded,
          color: AppTheme.emeraldSuccess,
          onTap: () => _executePreviewAction(device, "UNLOCK"),
        ),
        _buildCompactActionButton(
          label: "KHÓA LẠI",
          icon: Icons.lock_rounded,
          color: AppTheme.amberWarning,
          onTap: () => _executePreviewAction(device, "LOCK"),
        ),
      ],
    );
  }

  Widget _buildStatChip(IconData icon, String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 9.5)),
              Text(value, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }
}
