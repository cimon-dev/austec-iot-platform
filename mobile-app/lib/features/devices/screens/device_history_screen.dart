import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/app_theme.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/auth_service.dart';

class DeviceHistoryScreen extends StatefulWidget {
  final DeviceItem device;
  final int initialTabIndex;

  const DeviceHistoryScreen({
    super.key,
    required this.device,
    this.initialTabIndex = 0,
  });

  @override
  State<DeviceHistoryScreen> createState() => _DeviceHistoryScreenState();
}

class _DeviceHistoryScreenState extends State<DeviceHistoryScreen> {
  DateTime? _selectedDate;
  int _selectedFilterCode = 0; // 0: Tất cả, 1: Mở/Bật, 2: Đóng/Tắt, 3: Dừng, 4: Khóa
  bool _isLoading = false;
  int _meterTab = 0; // 0: Biểu đồ tiêu thụ, 1: Bảng sự cố
  int _meterChartPeriod = 0; // 0: Theo Ngày, 1: Theo Tháng, 2: Theo Năm (3 năm)

  @override
  void initState() {
    super.initState();
    _meterTab = widget.initialTabIndex;
    _fetchLiveHistory();
  }

  Future<void> _fetchLiveHistory() async {
    setState(() => _isLoading = true);
    final token = AuthService().token ?? 'austec-customer-token';
    try {
      final res = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/devices/${widget.device.hardwareId}/history'),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['logs'] is List) {
          final List list = data['logs'];
          final List<AuditLog> fetched = [];
          for (var item in list) {
            final act = (item['actionType'] ?? item['commandType'] ?? 'OPEN').toString().toUpperCase();
            int code = 1;
            String actName = widget.device.category == DeviceCategory.lightSwitch ? "Bật ổ cắm" : "Mở cửa";
            if (act.contains("OFF") || act.contains("CLOSE") || act == "2") {
              code = 2;
              actName = widget.device.category == DeviceCategory.lightSwitch ? "Tắt ổ cắm" : "Đóng cửa";
            } else if (act.contains("STOP") || act == "3") {
              code = 3;
              actName = "Dừng";
            } else if (act.contains("LOCK")) {
              code = 4;
              actName = "Khóa";
            }

            final rawTime = item['timestamp'] ?? item['createdAt'] ?? DateTime.now().toIso8601String();
            final dt = DateTime.tryParse(rawTime.toString()) ?? DateTime.now();
            final timeFormatted = "${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}:${dt.second.toString().padLeft(2, '0')}";

            fetched.add(
              AuditLog(
                time: timeFormatted,
                action: actName,
                actionCode: code,
                triggeredBy: item['actorName']?.toString() ?? (AuthService().currentUser?.fullName ?? "Người dùng"),
                deviceCode: widget.device.hardwareId,
              ),
            );
          }

          if (mounted) {
            setState(() {
              widget.device.auditLogs = fetched;
            });
          }
        }
      }
    } catch (e) {
      debugPrint('[DeviceHistoryScreen] Lỗi tải lịch sử từ Cloud: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _openDatePicker() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2025),
      lastDate: DateTime(2030),
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

    final isMeter = widget.device.category == DeviceCategory.energyManage ||
        widget.device.modelCode.contains('SmartMetter') ||
        widget.device.hardwareId.contains('SmartMetter');
    final isSocket = widget.device.category == DeviceCategory.lightSwitch ||
        widget.device.modelCode.contains('SmartSW') ||
        widget.device.hardwareId.contains('OCAM') ||
        widget.device.hardwareId.contains('SOCKET');

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
              isMeter ? "Lịch Sử Điện Năng & Sự Cố" : "Nhật Ký Điều Khiển",
              style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              widget.device.name,
              style: TextStyle(color: isDark ? Colors.white70 : AppTheme.lightTextSecondary, fontSize: 11, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          if (!isMeter) ...[
            IconButton(
              icon: Icon(
                Icons.calendar_month_outlined,
                color: _selectedDate == null ? textCol : (isDark ? Colors.white : Colors.black),
              ),
              tooltip: "Lọc theo ngày",
              onPressed: _openDatePicker,
            ),
            if (_selectedDate != null || _selectedFilterCode != 0)
              IconButton(
                icon: Icon(Icons.filter_alt_off_outlined, color: textCol),
                tooltip: "Xóa bộ lọc",
                onPressed: () {
                  setState(() {
                    _selectedDate = null;
                    _selectedFilterCode = 0;
                  });
                },
              ),
          ],
          if (_isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Center(
                child: SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: textCol),
                ),
              ),
            )
          else
            IconButton(
              icon: Icon(Icons.refresh, color: textCol, size: 20),
              tooltip: "Đồng bộ từ CSDL",
              onPressed: _fetchLiveHistory,
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: isMeter
          ? _buildSmartMetterHistoryView(isDark, textCol)
          : _buildStandardTimelineHistory(logs, totalOpens, totalCloses, totalStops, isSocket, isDark, textCol),
    );
  }

  // Giao diện lịch sử công tơ điện tử: Tab 0 Biểu đồ tiêu thụ (3 năm), Tab 1 Bảng sự cố (Mã 10-14)
  Widget _buildSmartMetterHistoryView(bool isDark, Color textCol) {
    return Column(
      children: [
        // 2 Tab chính: Biểu đồ tiêu thụ vs Bảng sự cố
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF141924),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFF26324A)),
          ),
          child: Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _meterTab = 0),
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _meterTab == 0 ? AppTheme.brandBlue : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Text(
                        "BIỂU ĐỒ ĐIỆN NĂNG",
                        style: TextStyle(
                          color: _meterTab == 0 ? Colors.white : Colors.white70,
                          fontSize: 11.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _meterTab = 1),
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _meterTab == 1 ? AppTheme.crimsonDanger : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Text(
                        "BẢNG SỰ CỐ (MÃ 10-14)",
                        style: TextStyle(
                          color: _meterTab == 1 ? Colors.white : Colors.white70,
                          fontSize: 11.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        Expanded(
          child: _meterTab == 0
              ? _buildMeterChartTab(isDark, textCol)
              : _buildMeterFaultsTab(isDark, textCol),
        ),
      ],
    );
  }

  Widget _buildMeterChartTab(bool isDark, Color textCol) {
    // 3 chu kỳ: 0 Theo Ngày, 1 Theo Tháng, 2 Theo Năm (3 năm 2024, 2025, 2026)
    final periods = ["Theo Ngày", "Theo Tháng", "Theo Năm (3 năm)"];
    final List<Map<String, dynamic>> barData = _meterChartPeriod == 0
        ? [
            {"label": "00h", "val": 0.8},
            {"label": "04h", "val": 0.5},
            {"label": "08h", "val": 2.4},
            {"label": "12h", "val": 3.8},
            {"label": "16h", "val": 2.9},
            {"label": "20h", "val": 4.2},
          ]
        : _meterChartPeriod == 1
            ? [
                {"label": "T1", "val": 310},
                {"label": "T2", "val": 285},
                {"label": "T3", "val": 340},
                {"label": "T4", "val": 390},
                {"label": "T5", "val": 420},
                {"label": "T6", "val": 450},
                {"label": "T7", "val": 480},
                {"label": "T8", "val": 460},
                {"label": "T9", "val": 395},
                {"label": "T10", "val": 350},
                {"label": "T11", "val": 320},
                {"label": "T12", "val": 330},
              ]
            : [
                {"label": "2024", "val": 3840},
                {"label": "2025", "val": 4120},
                {"label": "2026", "val": 1482},
              ];

    final maxVal = barData.map((e) => (e['val'] as num).toDouble()).reduce((a, b) => a > b ? a : b);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Selector chu kỳ
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(periods.length, (idx) {
              final isSel = _meterChartPeriod == idx;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: ChoiceChip(
                  selected: isSel,
                  showCheckmark: false,
                  label: Text(periods[idx], style: TextStyle(fontSize: 11, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                  selectedColor: AppTheme.brandBlue,
                  backgroundColor: const Color(0xFF141924),
                  labelStyle: TextStyle(color: isSel ? Colors.white : Colors.white70),
                  onSelected: (val) => setState(() => _meterChartPeriod = idx),
                ),
              );
            }),
          ),
          const SizedBox(height: 12),

          // Khung Biểu Đồ Cột Điện Năng
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF141924),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF26324A)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "ĐIỆN NĂNG TIÊU THỤ (kWh)",
                      style: TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      _meterChartPeriod == 0 ? "Hôm nay: 14.6 kWh" : (_meterChartPeriod == 1 ? "Năm nay: 4,530 kWh" : "3 năm: 9,442 kWh"),
                      style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                SizedBox(
                  height: 160,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: barData.map((item) {
                      final val = (item['val'] as num).toDouble();
                      final heightFrac = maxVal > 0 ? (val / maxVal).clamp(0.08, 1.0) : 0.08;

                      return Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            val >= 1000 ? "${(val / 1000).toStringAsFixed(1)}k" : val.toStringAsFixed(val < 10 ? 1 : 0),
                            style: const TextStyle(color: Colors.white70, fontSize: 9.5, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            width: _meterChartPeriod == 1 ? 16 : 28,
                            height: 110 * heightFrac,
                            decoration: BoxDecoration(
                              color: AppTheme.brandBlue,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            item['label'],
                            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10, fontWeight: FontWeight.w600),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Tóm tắt điện năng
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF141924),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF26324A)),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    Text("Trung bình", style: TextStyle(color: AppTheme.textSecondary, fontSize: 10)),
                    SizedBox(height: 2),
                    Text("312 kWh/tháng", style: TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.bold)),
                  ],
                ),
                Column(
                  children: [
                    Text("Giờ cao điểm", style: TextStyle(color: AppTheme.textSecondary, fontSize: 10)),
                    SizedBox(height: 2),
                    Text("18h - 22h", style: TextStyle(color: AppTheme.amberWarning, fontSize: 12.5, fontWeight: FontWeight.bold)),
                  ],
                ),
                Column(
                  children: [
                    Text("Trạng thái", style: TextStyle(color: AppTheme.textSecondary, fontSize: 10)),
                    SizedBox(height: 2),
                    Text("Bình thường", style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 12.5, fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMeterFaultsTab(bool isDark, Color textCol) {
    // 5 Mã sự cố chuẩn xác 100% theo PDF Trang 9 & 10:
    // Mã 10: Quá dòng; Mã 11: Rò điện; Mã 12: Công suất sử dụng cao hơn mức cài đặt; Mã 13: Quá áp; Mã 14: Ngắt bảo vệ quá dòng.
    // Bỏ qua sự cố mất điện lưới.
    final faults = [
      {
        "code": 10,
        "name": "Cảnh báo dòng điện cao (Quá dòng)",
        "measured": "22.4 A (4.880 W)",
        "threshold": "22.0 A",
        "status": "Cảnh báo màn hình, chưa ngắt nguồn",
        "time": "08/11/2026 19:45",
        "isTrip": false,
        "color": const Color(0xFFF59E0B),
      },
      {
        "code": 11,
        "name": "Rò điện lưới (Chống giật)",
        "measured": "32 mA (0.032 A)",
        "threshold": "30 mA",
        "status": "Đã ngắt rơ-le chống giật an toàn",
        "time": "05/11/2026 08:30",
        "isTrip": true,
        "color": const Color(0xFFEF4444),
      },
      {
        "code": 12,
        "name": "Cảnh báo công suất cao (Vượt ngưỡng)",
        "measured": "4.620 W (21.0 A)",
        "threshold": "4.500 W",
        "status": "Cảnh báo màn hình, chưa ngắt nguồn",
        "time": "10/11/2026 23:13",
        "isTrip": false,
        "color": const Color(0xFFF59E0B),
      },
      {
        "code": 13,
        "name": "Quá áp lưới điện (Quá áp)",
        "measured": "254 V",
        "threshold": "250 V",
        "status": "Đã ngắt rơ-le bảo vệ thiết bị",
        "time": "18/10/2026 20:05",
        "isTrip": true,
        "color": const Color(0xFFEF4444),
      },
      {
        "code": 14,
        "name": "Ngắt bảo vệ quá dòng",
        "measured": "31.5 A (6.800 W)",
        "threshold": "30.0 A",
        "status": "Đã ngắt rơ-le bảo vệ tải",
        "time": "02/11/2026 14:20",
        "isTrip": true,
        "color": const Color(0xFFEF4444),
      },
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: faults.length,
      itemBuilder: (context, index) {
        final f = faults[index];
        final fColor = f['color'] as Color;
        final isTrip = f['isTrip'] == true;

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF141924),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isTrip ? const Color(0xFFEF4444).withValues(alpha: 0.5) : const Color(0xFF26324A), width: 1.2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hàng 1: Mã sự cố + Tên sự cố + Thời gian
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: fColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(5),
                          border: Border.all(color: fColor, width: 1.0),
                        ),
                        child: Text(
                          "MÃ ${f['code']}",
                          style: TextStyle(color: fColor, fontSize: 9.5, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        f['name'].toString(),
                        style: TextStyle(color: textCol, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  Text(
                    f['time'].toString(),
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10, fontFamily: "monospace"),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Divider(color: const Color(0xFF26324A), height: 1),
              const SizedBox(height: 8),

              // Bảng đối soát thông số theo Trang 10 PDF: Giá trị đo thực tế vs Ngưỡng cài đặt
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Giá trị đo thực tế", style: TextStyle(color: AppTheme.textSecondary, fontSize: 9.5)),
                        const SizedBox(height: 2),
                        Text(
                          f['measured'].toString(),
                          style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Ngưỡng cài đặt", style: TextStyle(color: AppTheme.textSecondary, fontSize: 9.5)),
                        const SizedBox(height: 2),
                        Text(
                          f['threshold'].toString(),
                          style: TextStyle(color: fColor, fontSize: 11.5, fontWeight: FontWeight.bold, fontFamily: "monospace"),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Trạng thái xử lý rơ-le / cảnh báo
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isTrip ? const Color(0xFFEF4444).withValues(alpha: 0.12) : const Color(0xFFF59E0B).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: fColor.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    Icon(
                      isTrip ? Icons.power_off_rounded : Icons.warning_amber_rounded,
                      size: 13,
                      color: fColor,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        "Trạng thái xử lý: ${f['status']}",
                        style: TextStyle(
                          color: fColor,
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStandardTimelineHistory(
    List<AuditLog> logs,
    int totalOpens,
    int totalCloses,
    int totalStops,
    bool isSocket,
    bool isDark,
    Color textCol,
  ) {
    return Column(
      children: [
        // 1. THANH TỔNG QUAN KPI THỐNG KÊ (Solid, Compact)
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFF141924),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF26324A)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildKpiStat(
                label: "Tổng thao tác",
                value: widget.device.auditLogs.length.toString(),
                color: textCol,
                icon: Icons.history_rounded,
              ),
              Container(width: 1, height: 24, color: const Color(0xFF26324A)),
              _buildKpiStat(
                label: isSocket ? "Lượt Bật" : "Lượt Mở",
                value: totalOpens.toString(),
                color: textCol,
                icon: isSocket ? Icons.power_rounded : Icons.arrow_upward_rounded,
              ),
              Container(width: 1, height: 24, color: const Color(0xFF26324A)),
              _buildKpiStat(
                label: isSocket ? "Lượt Tắt" : "Lượt Đóng",
                value: totalCloses.toString(),
                color: textCol,
                icon: isSocket ? Icons.power_off_rounded : Icons.arrow_downward_rounded,
              ),
              if (!isSocket) ...[
                Container(width: 1, height: 24, color: const Color(0xFF26324A)),
                _buildKpiStat(
                  label: "Dừng / Khóa",
                  value: totalStops.toString(),
                  color: textCol,
                  icon: Icons.pause_circle_outline_rounded,
                ),
              ],
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
              _buildFilterChip(isSocket ? "Lệnh Bật (ON)" : "Lệnh Mở (Up)", 1, isSocket ? Icons.power_rounded : Icons.arrow_upward_rounded),
              const SizedBox(width: 8),
              _buildFilterChip(isSocket ? "Lệnh Tắt (OFF)" : "Lệnh Đóng (Down)", 2, isSocket ? Icons.power_off_rounded : Icons.arrow_downward_rounded),
              if (!isSocket) ...[
                const SizedBox(width: 8),
                _buildFilterChip("Dừng / Khóa", 3, Icons.pause_rounded),
              ],
              if (_selectedDate != null) ...[
                const SizedBox(width: 8),
                Chip(
                  backgroundColor: const Color(0xFF27272A),
                  label: Text(
                    "${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}",
                    style: TextStyle(color: textCol, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  onDeleted: () => setState(() => _selectedDate = null),
                  deleteIconColor: textCol,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 6),

        // 3. DANH SÁCH LỊCH SỬ THỰC TẾ (KHÔNG DÙNG DỮ LIỆU ẢO/MOCKDATA)
        Expanded(
          child: logs.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF141924),
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFF26324A)),
                        ),
                        child: const Icon(Icons.event_busy_rounded, color: AppTheme.textMuted, size: 36),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        "Chưa có nhật ký hoạt động nào được ghi nhận",
                        style: TextStyle(color: isDark ? Colors.white70 : AppTheme.lightTextSecondary, fontSize: 13),
                      ),
                      const SizedBox(height: 8),
                      TextButton.icon(
                        onPressed: () {
                          setState(() {
                            _selectedDate = null;
                            _selectedFilterCode = 0;
                          });
                        },
                        icon: Icon(Icons.refresh, size: 16, color: textCol),
                        label: Text("Đặt lại bộ lọc", style: TextStyle(color: textCol)),
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
          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10, fontWeight: FontWeight.w500),
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
        color: isSelected ? Colors.white : AppTheme.textSecondary,
      ),
      label: Text(
        label,
        style: TextStyle(
          color: isSelected ? Colors.white : AppTheme.textSecondary,
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      backgroundColor: const Color(0xFF141924),
      selectedColor: AppTheme.brandBlue,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(
          color: isSelected ? AppTheme.brandBlue : const Color(0xFF26324A),
        ),
      ),
      onSelected: (val) {
        setState(() => _selectedFilterCode = code);
      },
    );
  }

  Widget _buildTimelineItem(AuditLog log, {required bool isLast}) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final isSocket = widget.device.category == DeviceCategory.lightSwitch ||
        widget.device.modelCode.contains('SmartSW') ||
        widget.device.hardwareId.contains('OCAM') ||
        widget.device.hardwareId.contains('SOCKET');

    IconData nodeIcon;
    String actionLabel;
    Color nodeColor;

    if (isSocket) {
      if (log.actionCode == 1) {
        nodeIcon = Icons.power_rounded;
        actionLabel = "BẬT Ổ CẮM THÀNH CÔNG";
        nodeColor = const Color(0xFF10B981);
      } else {
        nodeIcon = Icons.power_off_rounded;
        actionLabel = "TẮT Ổ CẮM HOÀN TẤT";
        nodeColor = const Color(0xFFEF4444);
      }
    } else {
      if (log.actionCode == 1) {
        nodeIcon = Icons.arrow_upward_rounded;
        actionLabel = "MỞ CỬA THÀNH CÔNG";
        nodeColor = const Color(0xFF10B981);
      } else if (log.actionCode == 2) {
        nodeIcon = Icons.arrow_downward_rounded;
        actionLabel = "ĐÓNG CỬA HOÀN TẤT";
        nodeColor = const Color(0xFF2563EB);
      } else if (log.actionCode == 4) {
        nodeIcon = Icons.lock_rounded;
        actionLabel = "KHÓA AN TOÀN TRẺ EM";
        nodeColor = const Color(0xFFEF4444);
      } else {
        nodeIcon = Icons.pause_rounded;
        actionLabel = "DỪNG CỬA TẠI VỊ TRÍ";
        nodeColor = const Color(0xFFF59E0B);
      }
    }

    // Tách ngày và giờ
    final parts = log.time.split(" ");
    final dateStr = parts.isNotEmpty ? parts[0] : "";
    final timeStr = parts.length > 1 ? parts[1] : log.time;

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
                      color: textCol,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      fontFamily: "monospace",
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    dateStr,
                    style: const TextStyle(
                      color: AppTheme.textSecondary,
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
                  color: nodeColor.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: nodeColor, width: 1.5),
                ),
                child: Icon(nodeIcon, color: nodeColor, size: 16),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    color: const Color(0xFF26324A),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),

          // 3. THẺ NỘI DUNG SỰ KIỆN TRỰC QUAN (Solid Card)
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF141924),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFF26324A),
                  width: 1,
                ),
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
                          color: textCol,
                          fontSize: 12,
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
                        child: const Text(
                          "Thành công",
                          style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 9.5, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Người thực hiện & Kênh
                  Row(
                    children: [
                      const Icon(Icons.person_outline, size: 13, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        log.triggeredBy,
                        style: TextStyle(
                          color: isDark ? Colors.white70 : AppTheme.lightTextPrimary,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF27272A),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.smartphone_rounded, size: 11, color: textCol),
                            const SizedBox(width: 3),
                            Text(
                              "App",
                              style: TextStyle(color: textCol, fontSize: 9.5, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
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
