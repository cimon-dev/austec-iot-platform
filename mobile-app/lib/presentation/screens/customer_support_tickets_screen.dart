import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../core/constants/app_theme.dart';
import '../../core/constants/api_config.dart';
import '../../core/services/auth_service.dart';

class CustomerSupportTicketItem {
  final String id;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final String? customerEmail;
  final String? hardwareId;
  final String? deviceName;
  final String requestType;
  final String description;
  final List<String> images;
  final String replyChannel;
  final String status; // PENDING | PROCESSING | RESOLVED | REJECTED
  final String? adminResponse;
  final String? respondedAt;
  final String createdAt;

  CustomerSupportTicketItem({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    this.customerEmail,
    this.hardwareId,
    this.deviceName,
    required this.requestType,
    required this.description,
    this.images = const [],
    required this.replyChannel,
    required this.status,
    this.adminResponse,
    this.respondedAt,
    required this.createdAt,
  });

  factory CustomerSupportTicketItem.fromJson(Map<String, dynamic> json) {
    List<String> imgs = [];
    if (json['images'] is List) {
      imgs = List<String>.from(json['images'].map((e) => e.toString()));
    }
    return CustomerSupportTicketItem(
      id: json['id'] ?? 'REQ-0000',
      customerId: json['customerId'] ?? '',
      customerName: json['customerName'] ?? 'Khách Hàng',
      customerPhone: json['customerPhone'] ?? '',
      customerEmail: json['customerEmail'],
      hardwareId: json['hardwareId'],
      deviceName: json['deviceName'] ?? 'Thiết bị Austec',
      requestType: json['requestType'] ?? 'TECHNICAL',
      description: json['description'] ?? '',
      images: imgs,
      replyChannel: json['replyChannel'] ?? 'PUSH',
      status: json['status'] ?? 'PENDING',
      adminResponse: json['adminResponse'],
      respondedAt: json['respondedAt'],
      createdAt: json['createdAt'] ?? '',
    );
  }
}

class CustomerSupportTicketsScreen extends StatefulWidget {
  const CustomerSupportTicketsScreen({super.key});

  @override
  State<CustomerSupportTicketsScreen> createState() => _CustomerSupportTicketsScreenState();
}

class _CustomerSupportTicketsScreenState extends State<CustomerSupportTicketsScreen> {
  List<CustomerSupportTicketItem> _tickets = [];
  bool _isLoading = true;
  String _filterStatus = "ALL"; // ALL | PENDING | PROCESSING | RESOLVED

  @override
  void initState() {
    super.initState();
    _fetchMyTickets();
  }

  Future<void> _fetchMyTickets() async {
    setState(() => _isLoading = true);
    final token = AuthService().token ?? 'austec-customer-token';

    try {
      final res = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/cskh/requests'),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['requests'] is List) {
          final List list = data['requests'];
          final user = AuthService().currentUser;
          final userPhone = user?.phoneNumber.replaceAll(RegExp(r'[\s.-]'), '') ?? '';
          final userId = user?.id ?? '';

          final parsed = list
              .map((item) => CustomerSupportTicketItem.fromJson(item))
              .where((t) {
                // If demo user or phone matches or id matches, or show all for demo
                if (userPhone.isEmpty && userId.isEmpty) return true;
                final tPhone = t.customerPhone.replaceAll(RegExp(r'[\s.-]'), '');
                return t.customerId == userId || tPhone == userPhone || t.customerId.startsWith('USR-');
              })
              .toList();

          if (mounted) {
            setState(() {
              _tickets = parsed;
              _isLoading = false;
            });
          }
          return;
        }
      }
    } catch (_) {}

    // Fallback sample data if backend unreachable
    if (mounted) {
      setState(() {
        _tickets = [
          CustomerSupportTicketItem(
            id: "REQ-1001",
            customerId: AuthService().currentUser?.id ?? "USR-008712",
            customerName: AuthService().currentUser?.fullName ?? "Khách hàng",
            customerPhone: AuthService().currentUser?.phoneNumber ?? "0944 102 588",
            hardwareId: "amtuong1994",
            deviceName: "Cửa cuốn Gara Đức Mạnh",
            requestType: "TECHNICAL",
            description: "Cửa cuốn khi bấm đóng từ xa thỉnh thoảng khựng lại 1-2 giây rồi mới tiếp tục đóng hết hành trình. Nhờ kỹ thuật kiểm tra log motor và sensor chống xô.",
            images: [
              "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80"
            ],
            replyChannel: "PUSH",
            status: "PROCESSING",
            adminResponse: "Kỹ thuật đã kiểm tra telemetry. Dòng tải bình thường, đề xuất hẹn kỹ thuật viên qua kiểm tra ray trượt lúc 17h30 chiều mai.",
            respondedAt: "2026-10-21 14:15",
            createdAt: "2026-10-21 09:30",
          ),
          CustomerSupportTicketItem(
            id: "REQ-1003",
            customerId: "USR-001928",
            customerName: "Nguyễn Văn Nam",
            customerPhone: "0912 345 678",
            hardwareId: "AT-DOOR-88239A",
            deviceName: "Cửa Cuốn Austec Titadoor Super",
            requestType: "RENEWAL",
            description: "Tôi muốn gia hạn thêm gói dịch vụ 24 tháng cho thiết bị cửa cuốn nhà tôi và xuất hóa đơn VAT điện tử công ty.",
            replyChannel: "PUSH",
            status: "RESOLVED",
            adminResponse: "Đã tạo đơn gia hạn 24 tháng và gửi link thanh toán + hóa đơn điện tử về thông báo app.",
            respondedAt: "2026-10-21 15:45",
            createdAt: "2026-10-20 16:00",
          ),
        ];
        _isLoading = false;
      });
    }
  }

  void _openTicketDetails(CustomerSupportTicketItem ticket) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _TicketDetailSheet(ticket: ticket),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    final filtered = _tickets.where((t) {
      if (_filterStatus == "ALL") return true;
      return t.status == _filterStatus;
    }).toList();

    return Scaffold(
      backgroundColor: isDark ? AppTheme.background : AppTheme.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: textCol, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          "Phiếu Yêu Cầu Hỗ Trợ",
          style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.cyanAccent),
            tooltip: "Làm mới",
            onPressed: _fetchMyTickets,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip("ALL", "Tất cả (${_tickets.length})"),
                  const SizedBox(width: 8),
                  _buildFilterChip("PENDING", "Chờ tiếp nhận"),
                  const SizedBox(width: 8),
                  _buildFilterChip("PROCESSING", "Đang xử lý"),
                  const SizedBox(width: 8),
                  _buildFilterChip("RESOLVED", "Đã giải quyết"),
                ],
              ),
            ),
          ),

          // List of Tickets
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.cyanAccent))
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.assignment_outlined, size: 54, color: AppTheme.textMuted.withValues(alpha: 0.5)),
                            const SizedBox(height: 12),
                            Text(
                              "Chưa có phiếu yêu cầu nào",
                              style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              "Khi bạn gửi form yêu cầu hỗ trợ, các phiếu sẽ hiển thị tại đây để bạn tiện theo dõi.",
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchMyTickets,
                        color: AppTheme.cyanAccent,
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (ctx, idx) {
                            final t = filtered[idx];
                            return _buildTicketCard(t, isDark, textCol);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String val, String label) {
    final isSelected = _filterStatus == val;
    return GestureDetector(
      onTap: () => setState(() => _filterStatus = val),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.cyanAccent.withValues(alpha: 0.18) : AppTheme.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppTheme.cyanAccent : AppTheme.cardBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? AppTheme.cyanAccent : AppTheme.textSecondary,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildTicketCard(CustomerSupportTicketItem t, bool isDark, Color textCol) {
    Color statusColor;
    String statusText;
    switch (t.status) {
      case "PROCESSING":
        statusColor = AppTheme.blueAccent;
        statusText = "ĐANG XỬ LÝ";
        break;
      case "RESOLVED":
        statusColor = AppTheme.emeraldSuccess;
        statusText = "ĐÃ GIẢI QUYẾT";
        break;
      case "REJECTED":
        statusColor = AppTheme.roseDanger;
        statusText = "TỪ CHỐI";
        break;
      default:
        statusColor = AppTheme.amberWarning;
        statusText = "CHỜ TIẾP NHẬN";
    }

    String typeLabel;
    switch (t.requestType) {
      case "TECHNICAL":
        typeLabel = "SỰ CỐ KỸ THUẬT";
        break;
      case "SETUP":
        typeLabel = "CÀI ĐẶT & THÊM THÀNH VIÊN";
        break;
      case "WARRANTY":
        typeLabel = "BẢO HÀNH LINH KIỆN";
        break;
      case "RENEWAL":
        typeLabel = "GIA HẠN DỊCH VỤ";
        break;
      default:
        typeLabel = "GÓP Ý DỊCH VỤ";
    }

    return InkWell(
      onTap: () => _openTicketDetails(t),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row: Mã phiếu & Trạng thái
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      t.id,
                      style: const TextStyle(
                        color: AppTheme.cyanAccent,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.purpleAccent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        typeLabel,
                        style: const TextStyle(
                          color: AppTheme.purpleAccent,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    statusText,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 9.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Description preview
            Text(
              t.description,
              style: TextStyle(color: textCol, fontSize: 12.5, height: 1.4),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 10),

            // Device & Date footer
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.devices, size: 13, color: AppTheme.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      t.deviceName ?? "Thiết bị Austec",
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 10.5),
                    ),
                  ],
                ),
                Text(
                  t.createdAt,
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 10.5, fontFamily: 'monospace'),
                ),
              ],
            ),

            // Admin response badge if responded
            if (t.adminResponse != null && t.adminResponse!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.emeraldSuccess.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.emeraldSuccess.withValues(alpha: 0.3)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle_outline, color: AppTheme.emeraldSuccess, size: 14),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        "Kỹ thuật viên Austec đã gửi phản hồi (Bấm để xem)",
                        style: TextStyle(
                          color: AppTheme.emeraldSuccess,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// Modal Sheet: Chi Tiết Đầy Đủ Phiếu Yêu Cầu Hỗ Trợ
class _TicketDetailSheet extends StatelessWidget {
  final CustomerSupportTicketItem ticket;
  const _TicketDetailSheet({required this.ticket});

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    String statusText;
    switch (ticket.status) {
      case "PROCESSING":
        statusColor = AppTheme.blueAccent;
        statusText = "Đang xử lý";
        break;
      case "RESOLVED":
        statusColor = AppTheme.emeraldSuccess;
        statusText = "Đã giải quyết";
        break;
      case "REJECTED":
        statusColor = AppTheme.roseDanger;
        statusText = "Từ chối";
        break;
      default:
        statusColor = AppTheme.amberWarning;
        statusText = "Chờ tiếp nhận";
    }

    return Container(
      height: MediaQuery.of(context).size.height * 0.78,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder)),
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        ticket.id,
                        style: const TextStyle(
                          color: AppTheme.cyanAccent,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          statusText,
                          style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    "Ngày gửi: ${ticket.createdAt}",
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 10.5),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white70),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const Divider(color: AppTheme.cardBorder, height: 20),

          // Scrollable Body
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Info Box
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.cardBorder),
                    ),
                    child: Column(
                      children: [
                        _buildRow("Thiết bị liên quan:", ticket.deviceName ?? "Thiết bị Austec"),
                        if (ticket.hardwareId != null && ticket.hardwareId!.isNotEmpty)
                          _buildRow("Hardware ID:", ticket.hardwareId!),
                        _buildRow("Kênh nhận phản hồi:", "Thông báo đẩy qua ứng dụng (Push App)"),
                        _buildRow("Người gửi:", ticket.customerName),
                        _buildRow("Số điện thoại:", ticket.customerPhone),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Customer Description
                  const Text(
                    "NỘI DUNG YÊU CẦU CỦA BẠN",
                    style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceGlass,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.cardBorder),
                    ),
                    child: Text(
                      ticket.description,
                      style: const TextStyle(color: Colors.white, fontSize: 12.5, height: 1.5),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Attached Images (if any)
                  if (ticket.images.isNotEmpty) ...[
                    Text(
                      "HÌNH ẢNH HIỆN TRƯỜNG ĐÍNH KÈM (${ticket.images.length})",
                      style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: ticket.images.map((img) {
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            width: 100,
                            height: 80,
                            color: Colors.black26,
                            child: Image.network(img, fit: BoxFit.cover),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // CSKH / Admin Response Box
                  const Text(
                    "PHẢN HỒI TỪ TRUNG TÂM CSKH AUSTEC",
                    style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 10.5, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.emeraldSuccess.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.emeraldSuccess.withValues(alpha: 0.3)),
                    ),
                    child: ticket.adminResponse != null && ticket.adminResponse!.isNotEmpty
                        ? Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.support_agent, color: AppTheme.emeraldSuccess, size: 16),
                                  const SizedBox(width: 6),
                                  const Text(
                                    "Kỹ thuật viên CSKH Austec",
                                    style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 11.5, fontWeight: FontWeight.bold),
                                  ),
                                  const Spacer(),
                                  if (ticket.respondedAt != null)
                                    Text(
                                      ticket.respondedAt!,
                                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 9.5, fontFamily: 'monospace'),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                ticket.adminResponse!,
                                style: const TextStyle(color: Colors.white, fontSize: 12.5, height: 1.45),
                              ),
                            ],
                          )
                        : const Row(
                            children: [
                              Icon(Icons.hourglass_top, color: AppTheme.amberWarning, size: 16),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  "Kỹ thuật viên Austec đã tiếp nhận phiếu và đang xử lý. Chúng tôi sẽ phản hồi sớm nhất qua thông báo ứng dụng.",
                                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 11.5),
                                ),
                              ),
                            ],
                          ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
