import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../family_sharing/screens/family_sharing_screen.dart';

class DeviceSettingsScreen extends StatefulWidget {
  final DeviceItem device;

  const DeviceSettingsScreen({super.key, required this.device});

  @override
  State<DeviceSettingsScreen> createState() => _DeviceSettingsScreenState();
}

class _DeviceSettingsScreenState extends State<DeviceSettingsScreen> {
  final IoTGatewayClient _gateway = IoTGatewayClient();
  late TextEditingController _nameController;

  late int _openTimeout;
  late int _closeTimeout;
  late bool _isAutoSchedule;
  late bool _isAccessLimit;
  late String _accessStartTime;
  late String _accessEndTime;
  late List<bool> _accessDays;

  // Danh sách lịch trình mẫu
  final List<Map<String, dynamic>> _schedules = [
    {
      "title": "Mở thông gió buổi sáng",
      "time": "06:30",
      "days": "T2 - T6",
      "action": "Mở 20%",
      "enabled": true,
    },
    {
      "title": "Đóng an toàn ban đêm",
      "time": "22:30",
      "days": "Hàng ngày",
      "action": "Đóng 0%",
      "enabled": true,
    },
  ];

  bool _isSaving = false;
  bool _isDeleting = false;
  final Map<String, dynamic> _dynamicPropValues = {};

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.device.name);
    _openTimeout = widget.device.openTimeoutSeconds;
    _closeTimeout = widget.device.closeTimeoutSeconds;
    _isAutoSchedule = widget.device.isAutoScheduleActive;
    _isAccessLimit = widget.device.isAccessLimitActive;
    _accessStartTime = widget.device.accessStartTime;
    _accessEndTime = widget.device.accessEndTime;
    _accessDays = List<bool>.from(widget.device.accessDays);

    // Nạp giá trị ban đầu cho các thuộc tính Mẫu thương phẩm
    for (final p in widget.device.assignedProperties) {
      final key = (p['propertyKey'] ?? '').toString();
      if (key.isNotEmpty) {
        _dynamicPropValues[key] = widget.device.currentProperties[key];
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _saveSettings() async {
    if (_isSaving) return;
    setState(() => _isSaving = true);

    final newName = _nameController.text.trim();
    widget.device.name = newName;
    widget.device.openTimeoutSeconds = _openTimeout;
    widget.device.closeTimeoutSeconds = _closeTimeout;
    widget.device.isAutoScheduleActive = _isAutoSchedule;
    widget.device.isAccessLimitActive = _isAccessLimit;
    widget.device.accessStartTime = _accessStartTime;
    widget.device.accessEndTime = _accessEndTime;
    widget.device.accessDays = _accessDays;

    final Map<String, dynamic> propsToSave = {
      'open_timeout': _openTimeout,
      'close_timeout': _closeTimeout,
      'is_auto_schedule': _isAutoSchedule,
      'access_limit': _isAccessLimit,
      'access_start': _accessStartTime,
      'access_end': _accessEndTime,
      'access_days': _accessDays,
      ..._dynamicPropValues,
    };

    // 1. Gọi API đổi tên
    final nameOk = await _gateway.updateDeviceName(widget.device.hardwareId, newName);
    // 2. Gọi API cập nhật thông số thuộc tính
    final propOk = await _gateway.updateDeviceProperties(widget.device.hardwareId, propsToSave);

    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(nameOk || propOk ? Icons.check_circle_outline : Icons.info_outline, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text(nameOk || propOk
                  ? "Đã lưu cấu hình thiết bị lên CSDL Cloud thành công!"
                  : "Đã lưu cấu hình cục bộ (ngoại tuyến)!"),
            ],
          ),
          backgroundColor: nameOk || propOk ? AppTheme.emeraldSuccess : AppTheme.blueAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pop();
    }
  }

  void _showUnpairDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surfaceDark : Colors.white,
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppTheme.crimsonDanger),
            SizedBox(width: 8),
            Text("Hủy ghép nối thiết bị", style: TextStyle(color: AppTheme.crimsonDanger, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          "Bạn có chắc muốn xóa và hủy ghép nối thiết bị '${widget.device.name}' (${widget.device.hardwareId}) khỏi tài khoản?",
          style: TextStyle(color: AppTheme.isDarkMode ? AppTheme.textSecondary : Colors.grey[700]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Hủy"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.crimsonDanger, foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.of(ctx).pop();
              setState(() => _isDeleting = true);
              final ok = await _gateway.unpairDevice(widget.device.hardwareId);
              if (mounted) {
                setState(() => _isDeleting = false);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(ok
                        ? "Đã xóa và hủy ghép nối thiết bị thành công!"
                        : "Đã gỡ thiết bị khỏi danh sách."),
                    backgroundColor: AppTheme.crimsonDanger,
                  ),
                );
                Navigator.of(context).pop();
              }
            },
            child: const Text("Xác nhận Xóa"),
          ),
        ],
      ),
    );
  }

  Future<void> _pickTime({required bool isStart}) async {
    final currentStr = isStart ? _accessStartTime : _accessEndTime;
    final parts = currentStr.split(":");
    final initialTime = TimeOfDay(
      hour: int.tryParse(parts[0]) ?? (isStart ? 8 : 17),
      minute: int.tryParse(parts.length > 1 ? parts[1] : "00") ?? 0,
    );

    final picked = await showTimePicker(
      context: context,
      initialTime: initialTime,
      builder: (context, child) {
        final isDark = AppTheme.isDarkMode;
        return Theme(
          data: ThemeData(
            colorScheme: ColorScheme.dark(
              primary: isDark ? Colors.white : Colors.black,
              surface: AppTheme.surface,
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final formatted =
          "${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}";
      setState(() {
        if (isStart) {
          _accessStartTime = formatted;
        } else {
          _accessEndTime = formatted;
        }
      });
    }
  }

  void _openRfRemoteSheet() {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppTheme.surfaceDark : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Quản Lý Tay Cầm RF",
                    style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: textCol),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildRemoteItem("Tay cầm 1 (Chính)", "Mã: RF-433-A834", true),
              const SizedBox(height: 8),
              _buildRemoteItem("Tay cầm 2 (Phụ gara)", "Mã: RF-433-B912", true),
              const SizedBox(height: 8),
              _buildRemoteItem("Tay cầm 3 (Dự phòng)", "Mã: RF-433-C001", false),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("Đang ở chế độ ghép nối... Nhấn nút bất kỳ trên Remote mới."),
                        backgroundColor: AppTheme.blueAccent,
                      ),
                    );
                  },
                  icon: Icon(Icons.add, color: textCol),
                  label: Text("Học lệnh Remote mới", style: TextStyle(color: textCol)),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFE4E4E7)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRemoteItem(String name, String code, bool isActive) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
      ),
      child: Row(
        children: [
          Icon(Icons.radio_button_checked, color: isActive ? (isDark ? Colors.white : Colors.black) : AppTheme.textMuted, size: 20),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: TextStyle(color: textCol, fontWeight: FontWeight.bold, fontSize: 13)),
              Text(code, style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontFamily: "monospace")),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: isActive ? AppTheme.emeraldSuccess.withValues(alpha: 0.15) : (isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              isActive ? "Đang bật" : "Đã khóa",
              style: TextStyle(
                color: isActive ? AppTheme.emeraldSuccess : AppTheme.textMuted,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final daysOfWeek = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final iconCol = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    final isRollerDoor = widget.device.category == DeviceCategory.rollerDoor;
    final isWallDoor = isRollerDoor && (
      widget.device.hardwareId.toLowerCase().contains('amtuong') ||
      widget.device.hardwareId.toLowerCase().contains('eco') ||
      widget.device.modelCode.toLowerCase().contains('eco')
    );
    final hasRfRemote = isRollerDoor && !isWallDoor;
    final isSmartMetter = widget.device.category == DeviceCategory.energyManage ||
      widget.device.modelCode.contains('SmartMetter') ||
      widget.device.hardwareId.contains('SmartMetter');

    return Scaffold(
      backgroundColor: bgCol,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: textCol, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          "Cài Đặt ${widget.device.categoryDisplayName}",
          style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        actions: [
          _isSaving
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: textCol),
                    ),
                  ),
                )
              : TextButton(
                  onPressed: _saveSettings,
                  child: const Text(
                    "Lưu",
                    style: TextStyle(color: AppTheme.brandBlue, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // CARD 1: THÔNG TIN THIẾT BỊ
            _buildSectionHeader("THÔNG TIN THIẾT BỊ"),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: _cardBox(isDark),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: _nameController,
                    style: TextStyle(color: textCol, fontWeight: FontWeight.w600, fontSize: 14),
                    decoration: InputDecoration(
                      labelText: "Tên thiết bị hiển thị",
                      labelStyle: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                      filled: true,
                      fillColor: isDark ? AppTheme.surface.withValues(alpha: 0.6) : Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.brandBlue, width: 1.5),
                      ),
                      prefixIcon: Icon(Icons.door_sliding_outlined, color: iconCol, size: 20),
                    ),
                  ),
                  const SizedBox(height: 14),
                  _buildMetaRow("Mã phần cứng (Hardware ID)", widget.device.hardwareId, isCode: true),
                  const SizedBox(height: 10),
                  _buildMetaRow("Dòng thiết bị", widget.device.categoryDisplayName),
                  const SizedBox(height: 10),
                  _buildMetaRow("Địa chỉ IP nội bộ", widget.device.deviceIp, isCode: true),
                  const SizedBox(height: 10),
                  _buildMetaRow("Trạng thái kết nối", widget.device.isOnline ? "Trực tuyến (Online)" : "Ngoại tuyến", isStatus: true),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // CARD 2: CÀI ĐẶT THỜI GIAN TIMEOUT (CHỈ DÀNH CHO CỬA CUỐN)
            if (isRollerDoor) ...[
              _buildSectionHeader("HIỆU CHUẨN THỜI GIAN HÀNH TRÌNH"),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: _cardBox(isDark),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Timeout Mở
                    _buildTimeoutStepper(
                      title: "Thời gian MỞ CỬA (Giây)",
                      value: _openTimeout,
                      quickOptions: [15, 20, 23, 30],
                      color: AppTheme.brandBlue,
                      onChanged: (val) => setState(() => _openTimeout = val),
                    ),
                    const SizedBox(height: 16),
                    Divider(color: isDark ? const Color(0xFF26324A) : AppTheme.lightBorder, height: 1),
                    const SizedBox(height: 16),

                    // Timeout Đóng
                    _buildTimeoutStepper(
                      title: "Thời gian ĐÓNG CỬA (Giây)",
                      value: _closeTimeout,
                      quickOptions: [15, 20, 25, 30],
                      color: AppTheme.brandBlue,
                      onChanged: (val) => setState(() => _closeTimeout = val),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // CÀI ĐẶT RIÊNG CHO CÔNG TƠ ĐIỆN TỬ CHỐNG GIẬT
            if (isSmartMetter) ...[
              _buildSectionHeader("CÀI ĐẶT CÔNG SUẤT VÀ BẢO VỆ ĐIỆN TỬ"),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: _cardBox(isDark),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text("Giới hạn công suất ngắt điện", style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.bold)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.brandBlue.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppTheme.brandBlue.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            "${(_dynamicPropValues['power_limit_w'] ?? 4500)} W",
                            style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Slider(
                      value: ((_dynamicPropValues['power_limit_w'] as num?)?.toDouble() ?? 4500.0).clamp(1000.0, 10000.0),
                      min: 1000.0,
                      max: 10000.0,
                      divisions: 18,
                      activeColor: AppTheme.cyanAccent,
                      inactiveColor: isDark ? const Color(0xFF26324A) : Colors.grey[300],
                      onChanged: (val) {
                        setState(() => _dynamicPropValues['power_limit_w'] = val.round());
                      },
                    ),
                    const SizedBox(height: 10),
                    Divider(color: isDark ? const Color(0xFF26324A) : AppTheme.lightBorder, height: 1),
                    const SizedBox(height: 10),
                    _buildMetaRow("Ngưỡng cắt điện áp cao (Mã 13)", "260 VAC", isCode: true),
                    const SizedBox(height: 8),
                    _buildMetaRow("Ngưỡng cắt điện áp thấp (Mã 14)", "170 VAC", isCode: true),
                    const SizedBox(height: 8),
                    _buildMetaRow("Dòng rò ngắt chống giật (Mã 12)", "30 mA", isCode: true),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // CARD 3: LỊCH TRÌNH TỰ ĐỘNG
            _buildSectionHeader("LỊCH TRÌNH TỰ ĐỘNG"),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: _cardBox(isDark),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "Kích hoạt lịch trình tự động",
                        style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      Switch(
                        value: _isAutoSchedule,
                        activeThumbColor: Colors.white,
                        activeTrackColor: AppTheme.brandBlue,
                        onChanged: (val) => setState(() => _isAutoSchedule = val),
                      ),
                    ],
                  ),
                  if (_isAutoSchedule) ...[
                    const SizedBox(height: 14),
                    ..._schedules.map((s) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: isDark ? AppTheme.surface.withValues(alpha: 0.5) : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.alarm, color: iconCol, size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(s["title"], style: TextStyle(color: textCol, fontWeight: FontWeight.bold, fontSize: 13)),
                                    Text("${s["time"]} • ${s["days"]} • ${s["action"]}",
                                        style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                                  ],
                                ),
                              ),
                              Switch(
                                value: s["enabled"] as bool,
                                activeThumbColor: Colors.white,
                                activeTrackColor: AppTheme.brandBlue,
                                onChanged: (val) => setState(() => s["enabled"] = val),
                              ),
                            ],
                          ),
                        )),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Chức năng thêm lịch tùy biến")),
                          );
                        },
                        icon: const Icon(Icons.add, size: 16, color: AppTheme.brandBlue),
                        label: const Text("Thêm mốc lịch trình mới", style: TextStyle(color: AppTheme.brandBlue, fontSize: 12, fontWeight: FontWeight.w600)),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: AppTheme.brandBlue.withValues(alpha: 0.4)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // CARD 4: GIỚI HẠN THỜI GIAN SỬ DỤNG (ACCESS CONTROL)
            _buildSectionHeader("KIỂM SOÁT THỜI GIAN TRUY CẬP"),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: _cardBox(isDark),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Giới hạn quyền người dùng phụ",
                          style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold)),
                      Switch(
                        value: _isAccessLimit,
                        activeThumbColor: Colors.white,
                        activeTrackColor: AppTheme.brandBlue,
                        onChanged: (val) => setState(() => _isAccessLimit = val),
                      ),
                    ],
                  ),
                  if (_isAccessLimit) ...[
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => _pickTime(isStart: true),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: isDark ? AppTheme.surface : Colors.white,
                                border: Border.all(color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFE4E4E7)),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                children: [
                                  Text("TỪ GIỜ", style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 3),
                                  Text(_accessStartTime,
                                      style: TextStyle(color: textCol, fontSize: 18, fontWeight: FontWeight.bold, fontFamily: "monospace")),
                                ],
                              ),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          child: Icon(Icons.arrow_forward, color: AppTheme.textMuted, size: 18),
                        ),
                        Expanded(
                          child: InkWell(
                            onTap: () => _pickTime(isStart: false),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: isDark ? AppTheme.surface : Colors.white,
                                border: Border.all(color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFE4E4E7)),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                children: [
                                  Text("ĐẾN GIỜ", style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 3),
                                  Text(_accessEndTime,
                                      style: TextStyle(color: textCol, fontSize: 18, fontWeight: FontWeight.bold, fontFamily: "monospace")),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: List.generate(daysOfWeek.length, (idx) {
                        final isSelected = _accessDays[idx];
                        return InkWell(
                          onTap: () => setState(() => _accessDays[idx] = !_accessDays[idx]),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            width: 44,
                            height: 38,
                            decoration: BoxDecoration(
                              color: isSelected ? AppTheme.brandBlue : (isDark ? AppTheme.surface : const Color(0xFFF1F5F9)),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: isSelected ? AppTheme.brandBlue : (isDark ? AppTheme.cardBorder : AppTheme.lightBorder)),
                            ),
                            child: Center(
                              child: Text(
                                daysOfWeek[idx],
                                style: TextStyle(
                                  color: isSelected ? Colors.white : AppTheme.textMuted,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // CARD 5: TAY CẦM RF VÀ CHIA SẺ
            _buildSectionHeader("KẾT NỐI VÀ CHIA SẺ"),
            Container(
              decoration: _cardBox(isDark),
              child: Column(
                children: [
                  if (hasRfRemote) ...[
                    ListTile(
                      leading: Icon(Icons.radio_button_checked, color: iconCol, size: 22),
                      title: Text("Tay cầm điều khiển RF", style: TextStyle(color: textCol, fontWeight: FontWeight.w600, fontSize: 14)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.brandBlue.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              "${widget.device.rfRemoteCount} remote",
                              style: const TextStyle(color: AppTheme.brandBlue, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Icon(Icons.arrow_forward_ios, size: 14, color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary),
                        ],
                      ),
                      onTap: _openRfRemoteSheet,
                    ),
                    Divider(color: isDark ? const Color(0xFF26324A) : AppTheme.lightBorder, height: 1),
                  ],
                  ListTile(
                    leading: Icon(Icons.group_outlined, color: iconCol, size: 22),
                    title: Text("Phân quyền thành viên", style: TextStyle(color: textCol, fontWeight: FontWeight.w600, fontSize: 14)),
                    trailing: Icon(Icons.arrow_forward_ios, size: 14, color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary),
                    onTap: () {
                      Navigator.of(context).push(MaterialPageRoute(
                        builder: (context) => FamilySharingScreen(
                          initialDevice: widget.device,
                          initialHardwareId: widget.device.hardwareId,
                        ),
                      ));
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // CARD 6: THUỘC TÍNH MẪU THƯƠNG PHẨM (DYNAMIC SCHEMA TỪ WEB ADMIN)
            _buildDynamicPropertiesCard(isDark, textCol),
            const SizedBox(height: 20),

            // NÚT LƯU CẤU HÌNH LỚN Ở CUỐI TRANG
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _isSaving ? null : _saveSettings,
                icon: _isSaving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.check_circle_outline, color: Colors.white, size: 20),
                label: Text(
                  _isSaving ? "ĐANG LƯU CẤU HÌNH..." : "LƯU TẤT CẢ CẤU HÌNH",
                  style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.brandBlue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
              ),
            ),
            const SizedBox(height: 12),

            // NÚT HỦY GHÉP NỐI & XÓA THIẾT BỊ
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: _isDeleting ? null : _showUnpairDialog,
                icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.crimsonDanger, size: 20),
                label: Text(
                  _isDeleting ? "ĐANG GỠ BỎ..." : "HỦY GHÉP NỐI & XÓA THIẾT BỊ",
                  style: const TextStyle(color: AppTheme.crimsonDanger, fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.crimsonDanger, width: 1.2),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
            const SizedBox(height: 48),
          ],
        ),
      ),
    ),
  );
}

  Widget _buildDynamicPropertiesCard(bool isDark, Color textCol) {
    final assigned = widget.device.assignedProperties;
    if (assigned.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader("THUỘC TÍNH MẪU THƯƠNG PHẨM (${widget.device.modelName})"),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: _cardBox(isDark),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ...assigned.map((p) {
                final key = (p['propertyKey'] ?? '').toString();
                final name = (p['displayName'] ?? key).toString();
                final unit = (p['unit'] ?? '').toString();
                final widgetType = (p['uiWidgetType'] ?? '').toString().toLowerCase();
                final isCtrl = p['isControllable'] == true;
                final val = _dynamicPropValues[key] ?? widget.device.currentProperties[key];

                if (widgetType == 'toggle') {
                  final bool active = val == true || val == 'true' || val == 1 || val == '1';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.surface.withValues(alpha: 0.5) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(name, style: TextStyle(color: textCol, fontWeight: FontWeight.bold, fontSize: 13)),
                        ),
                        Switch(
                          value: active,
                          activeThumbColor: Colors.white,
                          activeTrackColor: AppTheme.brandBlue,
                          onChanged: isCtrl
                              ? (newVal) {
                                  setState(() => _dynamicPropValues[key] = newVal);
                                }
                              : null,
                        ),
                      ],
                    ),
                  );
                }

                if (widgetType == 'slider') {
                  final double min = (p['minVal'] as num?)?.toDouble() ?? 0.0;
                  final double max = (p['maxVal'] as num?)?.toDouble() ?? 100.0;
                  final double current = (val as num?)?.toDouble() ?? min;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.surface.withValues(alpha: 0.5) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(name, style: TextStyle(color: textCol, fontWeight: FontWeight.bold, fontSize: 13)),
                            Text("${current.toInt()} $unit", style: const TextStyle(color: AppTheme.brandBlue, fontWeight: FontWeight.bold, fontFamily: "monospace")),
                          ],
                        ),
                        Slider(
                          value: current.clamp(min, max),
                          min: min,
                          max: max,
                          divisions: (max - min).toInt() > 0 ? (max - min).toInt() : 10,
                          activeColor: AppTheme.brandBlue,
                          onChanged: isCtrl
                              ? (newVal) {
                                  setState(() => _dynamicPropValues[key] = newVal.toInt());
                                }
                              : null,
                        ),
                      ],
                    ),
                  );
                }

                // Default display (read-only status badge / telemetry)
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.surface.withValues(alpha: 0.4) : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(name, style: TextStyle(color: textCol, fontSize: 12.5, fontWeight: FontWeight.w500)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.brandBlue.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppTheme.brandBlue.withValues(alpha: 0.2)),
                        ),
                        child: Text(
                          "${val ?? '--'} $unit".trim(),
                          style: const TextStyle(color: AppTheme.brandBlue, fontWeight: FontWeight.bold, fontSize: 12, fontFamily: "monospace"),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTimeoutStepper({
    required String title,
    required int value,
    required List<int> quickOptions,
    required Color color,
    required ValueChanged<int> onChanged,
  }) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.bold)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.brandBlue.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.brandBlue.withValues(alpha: 0.25)),
              ),
              child: Text(
                "$value giây",
                style: const TextStyle(color: AppTheme.brandBlue, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: "monospace"),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.remove_circle_outline),
              color: AppTheme.textMuted,
              onPressed: () {
                if (value > 5) onChanged(value - 1);
              },
            ),
            Expanded(
              child: Slider(
                value: value.toDouble().clamp(5.0, 60.0),
                min: 5.0,
                max: 60.0,
                divisions: 55,
                activeColor: AppTheme.brandBlue,
                inactiveColor: isDark ? AppTheme.cardBorder : Colors.grey[300],
                onChanged: (val) => onChanged(val.round()),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              color: AppTheme.brandBlue,
              onPressed: () {
                if (value < 60) onChanged(value + 1);
              },
            ),
          ],
        ),
        Row(
          children: [
            Text("Chọn nhanh: ", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
            ...quickOptions.map((opt) {
              final isChosen = opt == value;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: InkWell(
                  onTap: () => onChanged(opt),
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isChosen ? AppTheme.brandBlue : (isDark ? AppTheme.surface : const Color(0xFFF1F5F9)),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: isChosen ? AppTheme.brandBlue : (isDark ? AppTheme.cardBorder : AppTheme.lightBorder)),
                    ),
                    child: Text(
                      "${opt}s",
                      style: TextStyle(
                        color: isChosen ? Colors.white : AppTheme.textMuted,
                        fontSize: 10.5,
                        fontWeight: isChosen ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ],
    );
  }

  BoxDecoration _cardBox(bool isDark) {
    return BoxDecoration(
      color: isDark ? const Color(0xFF141924) : Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: isDark ? const Color(0xFF26324A) : const Color(0xFFE2E8F0), width: 1.2),
    );
  }

  Widget _buildSectionHeader(String title) {
    final isDark = AppTheme.isDarkMode;
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: TextStyle(
          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
          fontSize: 11.5,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.6,
        ),
      ),
    );
  }

  Widget _buildMetaRow(String label, String value, {bool isStatus = false, bool isCode = false}) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: AppTheme.textMuted, fontSize: 12.5)),
        Text(
          value,
          style: TextStyle(
            color: isStatus
                ? AppTheme.emeraldSuccess
                : textCol,
            fontSize: 12.5,
            fontWeight: isStatus ? FontWeight.bold : FontWeight.w600,
            fontFamily: isCode ? "monospace" : null,
          ),
        ),
      ],
    );
  }
}
