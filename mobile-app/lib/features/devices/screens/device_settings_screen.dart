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
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _saveSettings() {
    widget.device.name = _nameController.text.trim();
    widget.device.openTimeoutSeconds = _openTimeout;
    widget.device.closeTimeoutSeconds = _closeTimeout;
    widget.device.isAutoScheduleActive = _isAutoSchedule;
    widget.device.isAccessLimitActive = _isAccessLimit;
    widget.device.accessStartTime = _accessStartTime;
    widget.device.accessEndTime = _accessEndTime;
    widget.device.accessDays = _accessDays;

    _gateway.renameDevice(widget.device.hardwareId, widget.device.name);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            Icon(Icons.check_circle_outline, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text("Đã lưu cấu hình thiết bị thành công!"),
          ],
        ),
        backgroundColor: AppTheme.emeraldSuccess,
        behavior: SnackBarBehavior.floating,
      ),
    );
    Navigator.of(context).pop();
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
        return Theme(
          data: ThemeData(
            colorScheme: ColorScheme.dark(
              primary: AppTheme.cyanAccent,
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
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
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
                  const Text(
                    "Quản Lý Tay Cầm RF",
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: AppTheme.textMuted),
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
                  icon: const Icon(Icons.add, color: AppTheme.cyanAccent),
                  label: const Text("Học lệnh Remote mới", style: TextStyle(color: AppTheme.cyanAccent)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTheme.cyanAccent),
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.surfaceGlass,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Row(
        children: [
          Icon(Icons.radio_button_checked, color: isActive ? AppTheme.cyanAccent : AppTheme.textMuted, size: 20),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
              Text(code, style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontFamily: "monospace")),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: isActive ? AppTheme.emeraldSuccess.withValues(alpha: 0.15) : AppTheme.cardBorder,
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
          "Cài Đặt Cửa Cuốn",
          style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _saveSettings,
            child: const Text(
              "Lưu",
              style: TextStyle(color: AppTheme.cyanAccent, fontWeight: FontWeight.bold, fontSize: 15),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
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
                        borderSide: const BorderSide(color: AppTheme.cyanAccent),
                      ),
                      prefixIcon: const Icon(Icons.door_sliding_outlined, color: AppTheme.cyanAccent, size: 20),
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

            // CARD 2: CÀI ĐẶT THỜI GIAN TIMEOUT (CALIBRATION)
            _buildSectionHeader("HIỆU CHUẨN THỜI GIAN HÀNH TRÌNH (TIMEOUT)"),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: _cardBox(isDark),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Thời gian motor hoạt động hết 1 hành trình để tính toán % vị trí cửa chính xác:",
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                  const SizedBox(height: 16),

                  // Timeout Mở
                  _buildTimeoutStepper(
                    title: "Thời gian MỞ CỬA (Giây)",
                    value: _openTimeout,
                    quickOptions: [15, 20, 23, 30],
                    color: AppTheme.cyanAccent,
                    onChanged: (val) => setState(() => _openTimeout = val),
                  ),
                  const SizedBox(height: 16),
                  Divider(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder, height: 1),
                  const SizedBox(height: 16),

                  // Timeout Đóng
                  _buildTimeoutStepper(
                    title: "Thời gian ĐÓNG CỬA (Giây)",
                    value: _closeTimeout,
                    quickOptions: [15, 20, 25, 30],
                    color: Colors.orangeAccent,
                    onChanged: (val) => setState(() => _closeTimeout = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // CARD 3: LỊCH TRÌNH TỰ ĐỘNG
            _buildSectionHeader("LỊCH TRÌNH TỰ ĐỘNG THEO GIỜ"),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: _cardBox(isDark),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Kích hoạt lịch trình tự động",
                            style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "Cửa tự đóng/mở theo các khung giờ cài đặt",
                            style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                          ),
                        ],
                      ),
                      Switch(
                        value: _isAutoSchedule,
                        activeThumbColor: AppTheme.cyanAccent,
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
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppTheme.cyanAccent.withValues(alpha: 0.12),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.alarm, color: AppTheme.cyanAccent, size: 16),
                              ),
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
                                activeThumbColor: AppTheme.cyanAccent,
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
                        icon: const Icon(Icons.add, size: 16, color: AppTheme.cyanAccent),
                        label: const Text("Thêm mốc lịch trình mới", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 12)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppTheme.cyanAccent, style: BorderStyle.solid),
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
            _buildSectionHeader("KIỂM SOÁT THỜI GIAN TRUY CẬP (ACCESS LIMIT)"),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: _cardBox(isDark),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("Giới hạn quyền người dùng phụ",
                              style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 2),
                          Text("Chỉ cho phép mở cửa trong khung giờ cho phép",
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                        ],
                      ),
                      Switch(
                        value: _isAccessLimit,
                        activeThumbColor: AppTheme.blueAccent,
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
                                border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                children: [
                                  Text("TỪ GIỜ", style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 3),
                                  Text(_accessStartTime,
                                      style: TextStyle(color: textCol, fontSize: 18, fontWeight: FontWeight.bold, fontFamily: "monospace")),
                                  const SizedBox(height: 2),
                                  const Text("Chạm để đổi", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 9.5)),
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
                                border: Border.all(color: AppTheme.roseDanger.withValues(alpha: 0.5)),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                children: [
                                  Text("ĐẾN GIỜ", style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 3),
                                  Text(_accessEndTime,
                                      style: TextStyle(color: textCol, fontSize: 18, fontWeight: FontWeight.bold, fontFamily: "monospace")),
                                  const SizedBox(height: 2),
                                  const Text("Chạm để đổi", style: TextStyle(color: AppTheme.roseDanger, fontSize: 9.5)),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text("Ngày trong tuần được phép:", style: TextStyle(color: textCol, fontSize: 12, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
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
                              color: isSelected ? AppTheme.blueAccent.withValues(alpha: 0.25) : (isDark ? AppTheme.surface : Colors.grey[200]),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: isSelected ? AppTheme.blueAccent : (isDark ? AppTheme.cardBorder : AppTheme.lightBorder)),
                            ),
                            child: Center(
                              child: Text(
                                daysOfWeek[idx],
                                style: TextStyle(
                                  color: isSelected ? AppTheme.cyanAccent : AppTheme.textMuted,
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
                  ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppTheme.cyanAccent.withValues(alpha: 0.15),
                      child: const Icon(Icons.radio_button_checked, color: AppTheme.cyanAccent),
                    ),
                    title: Text("Tay cầm điều khiển RF", style: TextStyle(color: textCol, fontWeight: FontWeight.w600, fontSize: 14)),
                    subtitle: Text("${widget.device.rfRemoteCount} remote đang hoạt động", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.cyanAccent),
                    onTap: _openRfRemoteSheet,
                  ),
                  Divider(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder, height: 1),
                  ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppTheme.blueAccent.withValues(alpha: 0.15),
                      child: const Icon(Icons.group_outlined, color: AppTheme.blueAccent),
                    ),
                    title: Text("Phân quyền thành viên", style: TextStyle(color: textCol, fontWeight: FontWeight.w600, fontSize: 14)),
                    subtitle: Text("Quản lý tài khoản được phép điều khiển", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.blueAccent),
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
            const SizedBox(height: 24),

            // NÚT LƯU CẤU HÌNH LỚN Ở CUỐI TRANG
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _saveSettings,
                icon: const Icon(Icons.save_outlined, color: Colors.white, size: 20),
                label: const Text(
                  "LƯU TẤT CẢ CẤU HÌNH",
                  style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.blueAccent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 4,
                ),
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
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
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: color.withValues(alpha: 0.4)),
              ),
              child: Text(
                "$value giây",
                style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: "monospace"),
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
                activeColor: color,
                inactiveColor: isDark ? AppTheme.cardBorder : Colors.grey[300],
                onChanged: (val) => onChanged(val.round()),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              color: color,
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
                      color: isChosen ? color.withValues(alpha: 0.2) : (isDark ? AppTheme.surface : Colors.grey[200]),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: isChosen ? color : (isDark ? AppTheme.cardBorder : AppTheme.lightBorder)),
                    ),
                    child: Text(
                      "${opt}s",
                      style: TextStyle(
                        color: isChosen ? color : AppTheme.textMuted,
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
      color: isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
          blurRadius: 10,
          offset: const Offset(0, 3),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Row(
        children: [
          Container(width: 3.5, height: 14, color: AppTheme.cyanAccent, margin: const EdgeInsets.only(right: 8)),
          Text(title, style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.6)),
        ],
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
                : isCode
                    ? AppTheme.cyanAccent
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
