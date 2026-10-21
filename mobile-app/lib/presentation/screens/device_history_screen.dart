import 'package:flutter/material.dart';
import '../../core/constants/app_theme.dart';
import '../../core/models/device_model.dart';

class DeviceHistoryScreen extends StatefulWidget {
  final DeviceItem device;

  const DeviceHistoryScreen({super.key, required this.device});

  @override
  State<DeviceHistoryScreen> createState() => _DeviceHistoryScreenState();
}

class _DeviceHistoryScreenState extends State<DeviceHistoryScreen> {
  DateTime? _selectedDate;
  int _selectedFilterCode = 0; // 0: Tất cả, 1: Mở, 2: Đóng, 3: Dừng

  void _openDatePicker() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2025),
      lastDate: DateTime(2030),
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
      setState(() => _selectedDate = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    // Filter logs
    final logs = widget.device.auditLogs.where((l) {
      if (_selectedFilterCode != 0 && l.actionCode != _selectedFilterCode) {
        return false;
      }
      if (_selectedDate != null) {
        final datePrefix =
            "${_selectedDate!.day.toString().padLeft(2, '0')}/${_selectedDate!.month.toString().padLeft(2, '0')}/${_selectedDate!.year}";
        return l.time.startsWith(datePrefix);
      }
      return true;
    }).toList();

    final totalOpens = widget.device.auditLogs.where((l) => l.actionCode == 1).length;
    final totalCloses = widget.device.auditLogs.where((l) => l.actionCode == 2).length;
    final totalStops = widget.device.auditLogs.where((l) => l.actionCode == 3).length;

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
              "Nhật Ký Điều Khiển",
              style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              widget.device.name,
              style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(
              Icons.calendar_month_outlined,
              color: _selectedDate == null ? textCol : AppTheme.cyanAccent,
            ),
            tooltip: "Lọc theo ngày",
            onPressed: _openDatePicker,
          ),
          if (_selectedDate != null || _selectedFilterCode != 0)
            IconButton(
              icon: const Icon(Icons.filter_alt_off_outlined, color: AppTheme.amberWarning),
              tooltip: "Xóa bộ lọc",
              onPressed: () {
                setState(() {
                  _selectedDate = null;
                  _selectedFilterCode = 0;
                });
              },
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // 1. THANH TỔNG QUAN KPI THỐNG KÊ (Trực quan, dễ nắm bắt ngay)
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildKpiStat(
                  label: "Tổng thao tác",
                  value: widget.device.auditLogs.length.toString(),
                  color: AppTheme.blueAccent,
                  icon: Icons.history_rounded,
                ),
                Container(width: 1, height: 28, color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
                _buildKpiStat(
                  label: "Lượt Mở",
                  value: totalOpens.toString(),
                  color: AppTheme.cyanAccent,
                  icon: Icons.arrow_upward_rounded,
                ),
                Container(width: 1, height: 28, color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
                _buildKpiStat(
                  label: "Lượt Đóng",
                  value: totalCloses.toString(),
                  color: Colors.orangeAccent,
                  icon: Icons.arrow_downward_rounded,
                ),
                Container(width: 1, height: 28, color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
                _buildKpiStat(
                  label: "Dừng / Khóa",
                  value: totalStops.toString(),
                  color: AppTheme.roseDanger,
                  icon: Icons.pause_circle_outline_rounded,
                ),
              ],
            ),
          ),

          // 2. THANH LỌC NHANH (Filter Chips)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                _buildFilterChip("Tất cả", 0, Icons.list_alt_rounded),
                const SizedBox(width: 8),
                _buildFilterChip("Lệnh Mở (Up)", 1, Icons.arrow_upward_rounded),
                const SizedBox(width: 8),
                _buildFilterChip("Lệnh Đóng (Down)", 2, Icons.arrow_downward_rounded),
                const SizedBox(width: 8),
                _buildFilterChip("Dừng / Tạm dừng", 3, Icons.pause_rounded),
                if (_selectedDate != null) ...[
                  const SizedBox(width: 8),
                  Chip(
                    backgroundColor: AppTheme.cyanAccent.withValues(alpha: 0.15),
                    label: Text(
                      "${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}",
                      style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    onDeleted: () => setState(() => _selectedDate = null),
                    deleteIconColor: AppTheme.cyanAccent,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 6),

          // 3. DANH SÁCH LỊCH SỬ DẠNG TIMELINE TRỤC THỜI GIAN TRỰC QUAN
          Expanded(
            child: logs.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceGlass,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppTheme.cardBorder),
                          ),
                          child: const Icon(Icons.event_busy_rounded, color: AppTheme.textMuted, size: 40),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          "Không có dữ liệu trong khoảng này",
                          style: TextStyle(color: isDark ? Colors.white70 : AppTheme.lightTextSecondary, fontSize: 14),
                        ),
                        const SizedBox(height: 10),
                        TextButton.icon(
                          onPressed: () {
                            setState(() {
                              _selectedDate = null;
                              _selectedFilterCode = 0;
                            });
                          },
                          icon: const Icon(Icons.refresh, size: 16, color: AppTheme.cyanAccent),
                          label: const Text("Đặt lại tất cả bộ lọc", style: TextStyle(color: AppTheme.cyanAccent)),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: logs.length,
                    itemBuilder: (context, index) {
                      final log = logs[index];
                      final isLast = index == logs.length - 1;
                      return _buildTimelineItem(log, isLast: isLast);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiStat({
    required String label,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 13),
            const SizedBox(width: 4),
            Text(
              value,
              style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Widget _buildFilterChip(String label, int code, IconData icon) {
    final isSelected = _selectedFilterCode == code;
    return ChoiceChip(
      selected: isSelected,
      showCheckmark: false,
      avatar: Icon(
        icon,
        size: 14,
        color: isSelected ? Colors.white : AppTheme.textMuted,
      ),
      label: Text(
        label,
        style: TextStyle(
          color: isSelected ? Colors.white : AppTheme.textMuted,
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      backgroundColor: AppTheme.surfaceGlass,
      selectedColor: AppTheme.blueAccent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isSelected ? AppTheme.blueAccent : AppTheme.cardBorder,
        ),
      ),
      onSelected: (val) {
        setState(() => _selectedFilterCode = code);
      },
    );
  }

  Widget _buildTimelineItem(AuditLog log, {required bool isLast}) {
    Color nodeColor;
    Color nodeBg;
    IconData nodeIcon;
    String actionLabel;
    String channelName = "App Mobile";

    if (log.actionCode == 1) {
      // Mở cửa
      nodeColor = AppTheme.cyanAccent;
      nodeBg = AppTheme.cyanAccent.withValues(alpha: 0.18);
      nodeIcon = Icons.arrow_upward_rounded;
      actionLabel = "MỞ CỬA THÀNH CÔNG";
    } else if (log.actionCode == 2) {
      // Đóng cửa
      nodeColor = Colors.orangeAccent;
      nodeBg = Colors.orangeAccent.withValues(alpha: 0.18);
      nodeIcon = Icons.arrow_downward_rounded;
      actionLabel = "ĐÓNG CỬA HOÀN TẤT";
    } else {
      // Dừng cửa
      nodeColor = AppTheme.roseDanger;
      nodeBg = AppTheme.roseDanger.withValues(alpha: 0.18);
      nodeIcon = Icons.pause_rounded;
      actionLabel = "DỪNG CỬA TẠI VỊ TRÍ";
    }

    // Tách ngày và giờ
    final parts = log.time.split(" ");
    final dateStr = parts.isNotEmpty ? parts[0] : "";
    final timeStr = parts.length > 1 ? parts[1] : log.time;

    final isDark = AppTheme.isDarkMode;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. CỘT THỜI GIAN BÊN TRÁI
          SizedBox(
            width: 72,
            child: Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    timeStr,
                    style: TextStyle(
                      color: isDark ? Colors.white : AppTheme.lightTextPrimary,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      fontFamily: "monospace",
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    dateStr,
                    style: TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 9.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),

          // 2. TRỤC ĐỨNG TIMELINE VỚI NODE ICON
          Column(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: nodeBg,
                  shape: BoxShape.circle,
                  border: Border.all(color: nodeColor, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: nodeColor.withValues(alpha: 0.3),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: Icon(nodeIcon, color: nodeColor, size: 16),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          nodeColor.withValues(alpha: 0.5),
                          AppTheme.cardBorder,
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),

          // 3. THẺ NỘI DUNG SỰ KIỆN TRỰC QUAN (Glassmorphic Event Card)
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: nodeColor.withValues(alpha: 0.25),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        actionLabel,
                        style: TextStyle(
                          color: nodeColor,
                          fontSize: 12.5,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.4,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppTheme.emeraldSuccess.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.check, size: 10, color: AppTheme.emeraldSuccess),
                            SizedBox(width: 2),
                            Text(
                              "HMAC OK",
                              style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 9.5, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Người thực hiện & Kênh
                  Row(
                    children: [
                      Icon(Icons.person_outline, size: 13, color: AppTheme.textMuted),
                      const SizedBox(width: 4),
                      Text(
                        log.triggeredBy,
                        style: TextStyle(
                          color: isDark ? Colors.white70 : AppTheme.lightTextPrimary,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.surface.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.smartphone_rounded, size: 11, color: AppTheme.cyanAccent),
                            const SizedBox(width: 3),
                            Text(
                              channelName,
                              style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  // Mã thiết bị
                  Row(
                    children: [
                      Icon(Icons.door_sliding_outlined, size: 12, color: AppTheme.textMuted),
                      const SizedBox(width: 4),
                      Text(
                        "Cửa: ${log.deviceCode}",
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 10.5, fontFamily: "monospace"),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
