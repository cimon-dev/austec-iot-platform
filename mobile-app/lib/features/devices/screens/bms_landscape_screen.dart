import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';

class BmsLandscapeScreen extends StatefulWidget {
  final DeviceItem device;
  final int initialTab; // 0: 16 Cell, 1: Biểu đồ, 2: Sự cố, 3: Cài đặt

  const BmsLandscapeScreen({
    super.key,
    required this.device,
    this.initialTab = 0,
  });

  @override
  State<BmsLandscapeScreen> createState() => _BmsLandscapeScreenState();
}

class _BmsLandscapeScreenState extends State<BmsLandscapeScreen> {
  late int _activeTab;

  // Cài đặt tham số BMS mẫu
  double _ovCutoff = 3.650;
  double _ovRecover = 3.550;
  double _uvCutoff = 2.500;
  double _uvRecover = 2.800;
  double _balanceDelta = 0.015;
  bool _activeBalance = true;

  double _chargeOcpRms = 100.0;
  double _chargeOcpPeak = 120.0;
  double _dischargeOcpRms = 150.0;
  double _dischargeOcpPeak = 180.0;
  int _ratedCapacityAh = 280;

  double _tempChargeMax = 55.0;
  double _tempDischargeMax = 65.0;
  double _tempCutLow = 0.0;
  String _canAddress = "ID 01";
  String _bmsMode = "Nạp/Xả";

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _activeTab = widget.initialTab.clamp(0, 3);
    // Bắt buộc xoay ngang khi vào màn BMS
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }

  @override
  void dispose() {
    // Trả lại chiều dọc cho toàn bộ ứng dụng khi thoát
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);
    super.dispose();
  }

  void _handleBack() {
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        SystemChrome.setPreferredOrientations([
          DeviceOrientation.portraitUp,
        ]);
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF090A0E),
        body: SafeArea(
          child: Column(
            children: [
              // 1. TOP HEADER (Back button, Logo/Title, Status tag, System status)
              _buildTopHeader(),

              // 2. MAIN BODY (Content of selected tab)
              Expanded(
                child: _buildActiveTabContent(),
              ),

              // 3. BOTTOM TAB BAR (16 Cell, Biểu đồ, Sự cố, Cài đặt)
              _buildBottomTabBar(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopHeader() {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: const BoxDecoration(
        color: Color(0xFF10131A),
        border: Border(bottom: BorderSide(color: Color(0xFF222734), width: 1)),
      ),
      child: Row(
        children: [
          // Nút Quay lại màn trước
          InkWell(
            onTap: _handleBack,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF1E2433),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF2E384D)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 14),
                  SizedBox(width: 4),
                  Text("Quay lại", style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 14),

          // Tên sản phẩm & Tiêu đề Tab
          const Text(
            "AUSTEC",
            style: TextStyle(
              color: AppTheme.brandBlue,
              fontWeight: FontWeight.w900,
              fontSize: 16,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(width: 8),
          Container(width: 1, height: 16, color: Colors.white24),
          const SizedBox(width: 8),
          Text(
            _getTabTitle(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),

          const Spacer(),

          // Tag trạng thái
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(
              color: AppTheme.cyanAccent.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.6)),
            ),
            child: const Text(
              "ĐANG XẢ",
              style: TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 12),

          // Icon kết nối & Đồng hồ
          const Icon(Icons.wifi, color: Colors.white70, size: 15),
          const SizedBox(width: 6),
          const Icon(Icons.bluetooth, color: Colors.white70, size: 15),
          const SizedBox(width: 8),
          const Text(
            "13:45",
            style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, fontFamily: "monospace"),
          ),
        ],
      ),
    );
  }

  String _getTabTitle() {
    switch (_activeTab) {
      case 0:
        return "GIÁM SÁT 16 CELL PIN (LFP)";
      case 1:
        return "BIỂU ĐỒ ĐIỆN ÁP CELL";
      case 2:
        return "CẢNH BÁO & SỰ CỐ HỆ THỐNG";
      case 3:
        return "CÀI ĐẶT THÔNG SỐ BẢO VỆ";
      default:
        return "BMS SYSTEM";
    }
  }

  Widget _buildActiveTabContent() {
    switch (_activeTab) {
      case 0:
        return _build16CellTab();
      case 1:
        return _buildChartTab();
      case 2:
        return _buildFaultsTab();
      case 3:
        return _buildSettingsTab();
      default:
        return _build16CellTab();
    }
  }

  // ---------------------------------------------------------------------------
  // TAB 0: 16 CELL VIEW (Lưới 16 cell pin + Thông số tổng ở giữa)
  // ---------------------------------------------------------------------------
  Widget _build16CellTab() {
    final props = widget.device.currentProperties;
    final List<dynamic> cells = props['cells'] is List ? props['cells'] as List : [];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          // 8 Cell bên trái (Cell 1 - Cell 8)
          Expanded(
            flex: 5,
            child: _buildCellGrid(cells.take(8).toList(), 1),
          ),

          const SizedBox(width: 10),

          // Cột thông số tổng ở giữa
          Expanded(
            flex: 4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF121620),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF262D3D)),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildCenterParamBox("ĐIỆN ÁP TỔNG", "52.8 V", "16S | TB: 3.30V", AppTheme.cyanAccent),
                  const Divider(color: Color(0xFF222734), height: 1),
                  _buildCenterParamBox("DÒNG ĐIỆN", "-68.5 A", "Giới hạn: 150A", AppTheme.amberWarning),
                  const Divider(color: Color(0xFF222734), height: 1),
                  _buildCenterParamBox("NHIỆT ĐỘ CELL TB", "33.0°C", "Max: 34.5°C", AppTheme.emeraldSuccess),
                  const Divider(color: Color(0xFF222734), height: 1),
                  _buildCenterParamBox("LỆCH ÁP ΔV", "0.012 V", "Ngưỡng: 0.050V", Colors.white),
                ],
              ),
            ),
          ),

          const SizedBox(width: 10),

          // 8 Cell bên phải (Cell 9 - Cell 16)
          Expanded(
            flex: 5,
            child: _buildCellGrid(cells.skip(8).take(8).toList(), 9),
          ),
        ],
      ),
    );
  }

  Widget _buildCenterParamBox(String title, String val, String sub, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(title, style: const TextStyle(color: Color(0xFF8E99B0), fontSize: 9.5, fontWeight: FontWeight.bold)),
        const SizedBox(height: 1),
        Text(val, style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.w900, fontFamily: "monospace")),
        Text(sub, style: const TextStyle(color: Color(0xFF6B768E), fontSize: 8.5)),
      ],
    );
  }

  Widget _buildCellGrid(List<dynamic> list, int startNum) {
    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 6,
        mainAxisSpacing: 6,
        childAspectRatio: 2.15,
      ),
      itemCount: 8,
      itemBuilder: (context, index) {
        final cellNum = startNum + index;
        final data = index < list.length && list[index] is Map ? list[index] as Map : {};
        final double v = (data['v'] as num?)?.toDouble() ?? 3.301;
        final double a = (data['a'] as num?)?.toDouble() ?? -0.35;
        final double r = (data['r'] as num?)?.toDouble() ?? 3.550;
        final bool isWarn = data['status'] == 'WARN' || cellNum == 6 || cellNum == 12;

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0xFF131822),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: isWarn ? AppTheme.amberWarning : const Color(0xFF232B3B),
              width: isWarn ? 1.2 : 0.9,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("Cell $cellNum", style: const TextStyle(color: Color(0xFF8E99B0), fontSize: 9, fontWeight: FontWeight.bold)),
                  Icon(
                    isWarn ? Icons.warning_amber_rounded : Icons.check_circle_rounded,
                    color: isWarn ? AppTheme.amberWarning : AppTheme.emeraldSuccess,
                    size: 11,
                  ),
                ],
              ),
              Text(
                "${v.toStringAsFixed(3)} V",
                style: TextStyle(
                  color: isWarn ? AppTheme.amberWarning : Colors.white,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w900,
                  fontFamily: "monospace",
                ),
              ),
              Text(
                "${a.toStringAsFixed(2)}A  ${r.toStringAsFixed(3)}Ω",
                style: const TextStyle(color: Color(0xFF6B768E), fontSize: 8, fontFamily: "monospace"),
              ),
            ],
          ),
        );
      },
    );
  }

  // ---------------------------------------------------------------------------
  // TAB 1: BIỂU ĐỒ ĐIỆN ÁP 16 CELL (Visual Bar Chart)
  // ---------------------------------------------------------------------------
  Widget _buildChartTab() {
    final props = widget.device.currentProperties;
    final List<dynamic> cells = props['cells'] is List ? props['cells'] as List : [];

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 4),
      child: Column(
        children: [
          // Thống kê nhanh Min / Max / Lệch áp
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildChartStatBadge("CELL CAO NHẤT", "Cell 2 (3.303 V)", AppTheme.cyanAccent),
              _buildChartStatBadge("CELL THẤP NHẤT", "Cell 6 (3.291 V)", AppTheme.amberWarning),
              _buildChartStatBadge("CHÊNH LỆCH ΔV", "0.012 V (Chuẩn)", AppTheme.emeraldSuccess),
              _buildChartStatBadge("ĐIỆN ÁP TRUNG BÌNH", "3.301 V", Colors.white),
            ],
          ),
          const SizedBox(height: 8),

          // Vùng Biểu đồ Cột 16 Cell
          Expanded(
            child: Container(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
              decoration: BoxDecoration(
                color: const Color(0xFF10131A),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF222734)),
              ),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final barAreaHeight = constraints.maxHeight - 24;
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: List.generate(16, (i) {
                      final cellNum = i + 1;
                      final data = i < cells.length && cells[i] is Map ? cells[i] as Map : {};
                      final double v = (data['v'] as num?)?.toDouble() ?? (3.300 + (i % 3) * 0.001);
                      final bool isWarn = data['status'] == 'WARN' || cellNum == 6 || cellNum == 12;

                      // Tỷ lệ cột tương đối quanh mức 3.30V
                      final double ratio = ((v - 3.250) / 0.10).clamp(0.2, 0.95);
                      final double height = barAreaHeight * ratio;

                      return Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            v.toStringAsFixed(3),
                            style: TextStyle(
                              color: isWarn ? AppTheme.amberWarning : Colors.white70,
                              fontSize: 8,
                              fontFamily: "monospace",
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Container(
                            width: (constraints.maxWidth / 16) - 6,
                            height: height,
                            decoration: BoxDecoration(
                              color: isWarn ? AppTheme.amberWarning : AppTheme.cyanAccent,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "C$cellNum",
                            style: const TextStyle(color: Color(0xFF8E99B0), fontSize: 8.5, fontWeight: FontWeight.bold),
                          ),
                        ],
                      );
                    }),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChartStatBadge(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF131822),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFF232B3B)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text("$label: ", style: const TextStyle(color: Color(0xFF8E99B0), fontSize: 9)),
          Text(value, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold, fontFamily: "monospace")),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // TAB 2: CẢNH BÁO & SỰ CỐ HỆ THỐNG (Faults Table)
  // ---------------------------------------------------------------------------
  Widget _buildFaultsTab() {
    final props = widget.device.currentProperties;
    final List<dynamic> faults = props['faults'] is List ? props['faults'] as List : [];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Column(
        children: [
          // 3 Thẻ trạng thái KPI hàng trên
          Row(
            children: [
              Expanded(
                child: _buildFaultKpiCard("LỖI NGHIÊM TRỌNG", "1", const Color(0xFFEF4444), Icons.error_outline),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildFaultKpiCard("CẢNH BÁO", "2", const Color(0xFFF59E0B), Icons.warning_amber_rounded),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildFaultKpiCard("TRẠNG THÁI BẢO VỆ", "NGẮT XẢ", AppTheme.cyanAccent, Icons.security_rounded),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Bảng Danh sách Sự cố
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF10131A),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF222734)),
              ),
              child: Column(
                children: [
                  // Header bảng
                  Container(
                    height: 28,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: const BoxDecoration(
                      color: Color(0xFF161B26),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(8)),
                    ),
                    child: const Row(
                      children: [
                        SizedBox(width: 65, child: Text("Thời gian", style: TextStyle(color: Color(0xFF8E99B0), fontSize: 9.5, fontWeight: FontWeight.bold))),
                        SizedBox(width: 65, child: Text("Mã lỗi", style: TextStyle(color: Color(0xFF8E99B0), fontSize: 9.5, fontWeight: FontWeight.bold))),
                        Expanded(child: Text("Nội dung sự cố", style: TextStyle(color: Color(0xFF8E99B0), fontSize: 9.5, fontWeight: FontWeight.bold))),
                        SizedBox(width: 85, child: Text("Mức độ", style: TextStyle(color: Color(0xFF8E99B0), fontSize: 9.5, fontWeight: FontWeight.bold))),
                        SizedBox(width: 80, child: Text("Trạng thái", style: TextStyle(color: Color(0xFF8E99B0), fontSize: 9.5, fontWeight: FontWeight.bold))),
                      ],
                    ),
                  ),
                  const Divider(color: Color(0xFF222734), height: 1),

                  // Các hàng sự cố
                  Expanded(
                    child: ListView.separated(
                      padding: EdgeInsets.zero,
                      itemCount: faults.length,
                      separatorBuilder: (_, __) => const Divider(color: Color(0xFF1C222E), height: 1),
                      itemBuilder: (context, idx) {
                        final f = faults[idx] is Map ? faults[idx] as Map : {};
                        final time = f['time'] ?? '13:42:10';
                        final code = f['code'] ?? 'ERR_04';
                        final desc = f['desc'] ?? 'Quá dòng xả';
                        final level = f['level'] ?? 'Nghiêm trọng';
                        final status = f['status'] ?? 'Đang lỗi';
                        final isDanger = level == 'Nghiêm trọng';

                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          child: Row(
                            children: [
                              SizedBox(width: 65, child: Text(time, style: const TextStyle(color: Colors.white70, fontSize: 9.5, fontFamily: "monospace"))),
                              SizedBox(width: 65, child: Text(code, style: TextStyle(color: isDanger ? const Color(0xFFEF4444) : const Color(0xFFF59E0B), fontSize: 9.5, fontWeight: FontWeight.bold, fontFamily: "monospace"))),
                              Expanded(child: Text(desc, style: const TextStyle(color: Colors.white, fontSize: 10), overflow: TextOverflow.ellipsis)),
                              SizedBox(
                                width: 85,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: (isDanger ? const Color(0xFFEF4444) : const Color(0xFFF59E0B)).withValues(alpha: 0.18),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(level, textAlign: TextAlign.center, style: TextStyle(color: isDanger ? const Color(0xFFEF4444) : const Color(0xFFF59E0B), fontSize: 9, fontWeight: FontWeight.bold)),
                                ),
                              ),
                              const SizedBox(width: 6),
                              SizedBox(width: 74, child: Text(status, style: TextStyle(color: status == 'Đang lỗi' ? Colors.white70 : AppTheme.emeraldSuccess, fontSize: 9.5))),
                            ],
                          ),
                        );
                      },
                    ),
                  ),

                  // Thanh nút Xác nhận lỗi & Xóa lịch sử
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: const BoxDecoration(
                      color: Color(0xFF141822),
                      borderRadius: BorderRadius.vertical(bottom: Radius.circular(8)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white70,
                            side: const BorderSide(color: Color(0xFF2E384D)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            visualDensity: VisualDensity.compact,
                          ),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text("Đã gửi lệnh xác nhận lỗi xuống BMS")),
                            );
                          },
                          child: const Text("Xác nhận lỗi", style: TextStyle(fontSize: 10)),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFEF4444),
                            side: const BorderSide(color: Color(0xFFEF4444)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            visualDensity: VisualDensity.compact,
                          ),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text("Đã xóa lịch sử cảnh báo")),
                            );
                          },
                          child: const Text("Xóa lịch sử", style: TextStyle(fontSize: 10)),
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
    );
  }

  Widget _buildFaultKpiCard(String title, String val, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF121620),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: Color(0xFF8E99B0), fontSize: 9, fontWeight: FontWeight.bold)),
              Text(val, style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.w900)),
            ],
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // TAB 3: CÀI ĐẶT THÔNG SỐ BẢO VỆ (Protection Parameters)
  // ---------------------------------------------------------------------------
  Widget _buildSettingsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Khối 1: Điện áp Cell & Cân bằng
          _buildParamSectionHeader("ĐIỆN ÁP CELL & CÂN BẰNG"),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: _boxStyle(),
            child: Wrap(
              spacing: 10,
              runSpacing: 8,
              children: [
                _buildStepperItem("Quá áp ngắt sạc", _ovCutoff, "V", (v) => setState(() => _ovCutoff = v), 0.05),
                _buildStepperItem("Quá áp phục hồi", _ovRecover, "V", (v) => setState(() => _ovRecover = v), 0.05),
                _buildStepperItem("Thấp áp ngắt xả", _uvCutoff, "V", (v) => setState(() => _uvCutoff = v), 0.05),
                _buildStepperItem("Thấp áp phục hồi", _uvRecover, "V", (v) => setState(() => _uvRecover = v), 0.05),
                _buildStepperItem("Lệch áp cân bằng", _balanceDelta, "V", (v) => setState(() => _balanceDelta = v), 0.005),
                Container(
                  width: 140,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF161B26),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFF262D3D)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Cân bằng chủ động", style: TextStyle(color: Color(0xFF8E99B0), fontSize: 9)),
                      Switch(
                        value: _activeBalance,
                        activeThumbColor: AppTheme.cyanAccent,
                        onChanged: (val) => setState(() => _activeBalance = val),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Khối 2: Dòng điện & Công suất
          _buildParamSectionHeader("DÒNG ĐIỆN & CÔNG SUẤT"),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: _boxStyle(),
            child: Wrap(
              spacing: 10,
              runSpacing: 8,
              children: [
                _buildStepperItem("Quá dòng sạc RMS", _chargeOcpRms, "A", (v) => setState(() => _chargeOcpRms = v), 5.0),
                _buildStepperItem("Quá dòng sạc đỉnh", _chargeOcpPeak, "A", (v) => setState(() => _chargeOcpPeak = v), 5.0),
                _buildStepperItem("Quá dòng xả RMS", _dischargeOcpRms, "A", (v) => setState(() => _dischargeOcpRms = v), 5.0),
                _buildStepperItem("Quá dòng xả đỉnh", _dischargeOcpPeak, "A", (v) => setState(() => _dischargeOcpPeak = v), 5.0),
                _buildStepperItem("Dung lượng định mức", _ratedCapacityAh.toDouble(), "Ah", (v) => setState(() => _ratedCapacityAh = v.toInt()), 10.0),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Khối 3: Nhiệt độ & Giao tiếp
          _buildParamSectionHeader("NHIỆT ĐỘ & GIAO TIẾP"),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: _boxStyle(),
            child: Wrap(
              spacing: 10,
              runSpacing: 8,
              children: [
                _buildStepperItem("Nhiệt độ sạc tối đa", _tempChargeMax, "°C", (v) => setState(() => _tempChargeMax = v), 1.0),
                _buildStepperItem("Nhiệt độ xả tối đa", _tempDischargeMax, "°C", (v) => setState(() => _tempDischargeMax = v), 1.0),
                _buildStepperItem("Nhiệt ngắt thấp nhất", _tempCutLow, "°C", (v) => setState(() => _tempCutLow = v), 1.0),
                _buildValueDisplayItem("Địa chỉ CAN/RS485", _canAddress),
                _buildValueDisplayItem("Chế độ hoạt động", _bmsMode),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // 2 Nút hành động: Khôi phục mặc định & Lưu cài đặt
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white70,
                  side: const BorderSide(color: Color(0xFF2E384D)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                ),
                onPressed: () {
                  setState(() {
                    _ovCutoff = 3.650;
                    _ovRecover = 3.550;
                    _uvCutoff = 2.500;
                    _uvRecover = 2.800;
                    _balanceDelta = 0.015;
                    _activeBalance = true;
                    _chargeOcpRms = 100.0;
                    _dischargeOcpRms = 150.0;
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Đã khôi phục thông số mặc định của nhà máy")),
                  );
                },
                child: const Text("Khôi phục mặc định", style: TextStyle(fontSize: 11)),
              ),
              const SizedBox(width: 10),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.brandBlue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
                icon: _isSaving
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_rounded, size: 16),
                label: const Text("Lưu Cài Đặt BMS", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                onPressed: _isSaving
                    ? null
                    : () async {
                        setState(() => _isSaving = true);
                        await Future.delayed(const Duration(milliseconds: 600));
                        if (mounted) {
                          setState(() => _isSaving = false);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              backgroundColor: AppTheme.emeraldSuccess,
                              content: Text("Đã lưu thông số bảo vệ xuống phần cứng BMS thành công!"),
                            ),
                          );
                        }
                      },
              ),
            ],
          ),
          const SizedBox(height: 14),
        ],
      ),
    );
  }

  Widget _buildParamSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4, left: 2),
      child: Text(
        title,
        style: const TextStyle(color: Color(0xFF8E99B0), fontSize: 9.5, fontWeight: FontWeight.bold, letterSpacing: 0.5),
      ),
    );
  }

  BoxDecoration _boxStyle() {
    return BoxDecoration(
      color: const Color(0xFF10131A),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: const Color(0xFF222734)),
    );
  }

  Widget _buildStepperItem(String label, double val, String unit, Function(double) onChanged, double step) {
    return Container(
      width: 135,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF161B26),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFF262D3D)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF8E99B0), fontSize: 8.5)),
          const SizedBox(height: 2),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "${val.toStringAsFixed(step < 0.01 ? 3 : (step < 1 ? 2 : 1))} $unit",
                style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold, fontFamily: "monospace"),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  InkWell(
                    onTap: () => onChanged(val - step),
                    child: const Icon(Icons.remove_circle_outline, color: Color(0xFF8E99B0), size: 16),
                  ),
                  const SizedBox(width: 4),
                  InkWell(
                    onTap: () => onChanged(val + step),
                    child: const Icon(Icons.add_circle_outline, color: AppTheme.cyanAccent, size: 16),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildValueDisplayItem(String label, String value) {
    return Container(
      width: 135,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF161B26),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFF262D3D)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF8E99B0), fontSize: 8.5)),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 3. BOTTOM TAB BAR (16 Cell, Biểu đồ, Sự cố, Cài đặt)
  // ---------------------------------------------------------------------------
  Widget _buildBottomTabBar() {
    return Container(
      height: 46,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: const BoxDecoration(
        color: Color(0xFF10131A),
        border: Border(top: BorderSide(color: Color(0xFF222734), width: 1)),
      ),
      child: Row(
        children: [
          _buildNavTabButton(0, "[16 Cell]", Icons.grid_view_rounded),
          const SizedBox(width: 8),
          _buildNavTabButton(1, "[Biểu đồ]", Icons.bar_chart_rounded),
          const SizedBox(width: 8),
          _buildNavTabButton(2, "[Sự cố]", Icons.warning_amber_rounded),
          const SizedBox(width: 8),
          _buildNavTabButton(3, "[Cài đặt]", Icons.settings_outlined),
        ],
      ),
    );
  }

  Widget _buildNavTabButton(int idx, String label, IconData icon) {
    final bool isSelected = _activeTab == idx;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _activeTab = idx),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.brandBlue : const Color(0xFF181E2B),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? AppTheme.brandBlue : const Color(0xFF262D3D),
              width: 1.1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: isSelected ? Colors.white : const Color(0xFF8E99B0), size: 14),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : const Color(0xFF8E99B0),
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

