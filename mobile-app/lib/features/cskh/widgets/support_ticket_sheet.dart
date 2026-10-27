import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../domain/entities/chat_device_item.dart';

class SupportTicketFormSheet extends StatefulWidget {
  final ChatDeviceItem? selectedDevice;
  final Function(String ticketId) onSubmitSuccess;
  const SupportTicketFormSheet({super.key, this.selectedDevice, required this.onSubmitSuccess});

  @override
  State<SupportTicketFormSheet> createState() => _SupportTicketFormSheetState();
}

class _SupportTicketFormSheetState extends State<SupportTicketFormSheet> {
  final TextEditingController _descController = TextEditingController();
  String _selectedType = "TECHNICAL";
  String _selectedReplyChannel = "PUSH";
  bool _isSubmitting = false;

  final Map<String, String> _typeLabels = {
    "TECHNICAL": "Sự cố kỹ thuật / Thiết bị không chạy",
    "SETUP": "Hướng dẫn cài đặt & Thêm thành viên",
    "WARRANTY": "Bảo hành linh kiện / Đổi mới",
    "RENEWAL": "Gia hạn gói dịch vụ 12/24 tháng",
    "FEEDBACK": "Góp ý chất lượng dịch vụ",
  };

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submitRequest() async {
    final desc = _descController.text.trim();
    if (desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Vui lòng nhập mô tả vấn đề bạn cần hỗ trợ!")),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final ticketId = "REQ-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}";
    final user = AuthService().currentUser;
    final dev = widget.selectedDevice ??
        (IoTGatewayClient().devices.isNotEmpty ? IoTGatewayClient().devices.first : null);

    try {
      await ApiClient().post('/api/cskh/requests', body: {
        'id': ticketId,
        'customerId': user?.id ?? 'USR-001',
        'customerName': user?.fullName ?? 'Khách Hàng Austec',
        'customerPhone': user?.phoneNumber ?? '0912345678',
        'customerEmail': user?.email ?? 'customer@austec.vn',
        'hardwareId': dev is ChatDeviceItem ? dev.hardwareId : (dev as dynamic)?.hardwareId ?? 'AT-DOOR-88239A01',
        'deviceName': dev is ChatDeviceItem ? dev.deviceName : (dev as dynamic)?.name ?? 'Cửa Cuốn Austec Smart',
        'requestType': _selectedType,
        'description': desc,
        'replyChannel': _selectedReplyChannel,
        'images': [],
        'status': 'PENDING',
      });
    } catch (_) {}

    if (mounted) {
      setState(() => _isSubmitting = false);
      Navigator.of(context).pop();
      widget.onSubmitSuccess(ticketId);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppTheme.emeraldSuccess,
          content: Text("Đã gửi phiếu hỗ trợ #$ticketId thành công tới Admin!"),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.assignment, color: AppTheme.cyanAccent, size: 20),
                    SizedBox(width: 8),
                    Text(
                      "GỬI PHIẾU YÊU CẦU HỖ TRỢ",
                      style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white60),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              "Nếu bạn không tiện chat trực tuyến, hãy gửi form yêu cầu này. Đội ngũ kỹ thuật CSKH sẽ xử lý và liên hệ lại cho bạn.",
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 11, height: 1.4),
            ),
            const SizedBox(height: 16),

            // Dropdown: Loại yêu cầu (Combobox)
            const Text("LOẠI YÊU CẦU HỖ TRỢ (COMBOBOX)", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedType,
                  dropdownColor: const Color(0xFF1E293B),
                  isExpanded: true,
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                  items: _typeLabels.entries.map((e) {
                    return DropdownMenuItem(value: e.key, child: Text(e.value));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedType = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Textfield: Mô tả
            const Text("MÔ TẢ CHI TIẾT SỰ CỐ / YÊU CẦU *", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            TextField(
              controller: _descController,
              maxLines: 3,
              style: const TextStyle(color: Colors.white, fontSize: 12),
              decoration: InputDecoration(
                hintText: "Mô tả hiện tượng, mã lỗi hoặc nhu cầu của bạn...",
                hintStyle: const TextStyle(color: AppTheme.textMuted),
                filled: true,
                fillColor: AppTheme.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
            const SizedBox(height: 14),

            // Kênh nhận phản hồi (Mặc định: Thông báo App PUSH)
            const Text("KÊNH PHẢN HỒI MONG MUỐN (MẶC ĐỊNH: THÔNG BÁO APP)", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Row(
              children: [
                _buildChannelOption("PUSH", "Thông báo App", Icons.notifications),
                const SizedBox(width: 8),
                _buildChannelOption("PHONE", "Gọi điện thoại", Icons.phone),
                const SizedBox(width: 8),
                _buildChannelOption("EMAIL", "Email", Icons.email),
              ],
            ),
            const SizedBox(height: 20),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.cyanAccent,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isSubmitting ? null : _submitRequest,
                child: _isSubmitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                    : const Text("GỬI PHIẾU HỖ TRỢ NGAY", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChannelOption(String val, String title, IconData icon) {
    final isSelected = _selectedReplyChannel == val;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedReplyChannel = val),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.cyanAccent.withValues(alpha: 0.15) : AppTheme.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? AppTheme.cyanAccent : AppTheme.cardBorder),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? AppTheme.cyanAccent : AppTheme.textMuted, size: 16),
              const SizedBox(height: 4),
              Text(
                title,
                style: TextStyle(
                  color: isSelected ? Colors.white : AppTheme.textSecondary,
                  fontSize: 10,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
