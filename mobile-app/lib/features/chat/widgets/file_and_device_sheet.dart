import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../../../core/constants/app_theme.dart';
import '../../cskh/domain/entities/chat_device_item.dart';
import '../models/chat_attachment.dart';
import '../services/chat_service.dart';

class FileAndDeviceSheet extends StatefulWidget {
  final Function(ChatAttachment attachment) onAttachmentSelected;
  final Function(ChatDeviceItem device) onDeviceSelected;

  const FileAndDeviceSheet({
    super.key,
    required this.onAttachmentSelected,
    required this.onDeviceSelected,
  });

  @override
  State<FileAndDeviceSheet> createState() => _FileAndDeviceSheetState();
}

class _FileAndDeviceSheetState extends State<FileAndDeviceSheet> {
  final ChatService _chatService = ChatService();
  bool _isUploading = false;
  String? _uploadStatus;

  // Danh mục thiết bị hệ thống sẵn có để hỏi tư vấn
  final List<ChatDeviceItem> _systemDevices = [
    ChatDeviceItem(
      isOwned: true,
      hardwareId: 'AT-DOOR-A900-8823',
      deviceName: 'Cửa cuốn Austec Titadoor A900 Super',
      modelName: 'Titadoor A900 Super',
      categoryTag: 'CỬA CUỐN ĐÃ LẮP ĐẶT',
      specs: {
        'Loại nan': 'Nan nhôm hợp kim 6063 T5',
        'Motor': 'Austec DC 800kg lõi đồng',
        'Tình trạng': 'Đang kết nối Cloud',
        'Bảo hành': 'Đến 10/2028',
      },
      imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&auto=format&fit=crop&q=80',
    ),
    ChatDeviceItem(
      isOwned: false,
      hardwareId: 'AT-HUB-PRO-4G',
      deviceName: 'Bộ Điều Khiển Trung Tâm Austec IoT Hub (Wi-Fi + 4G)',
      modelName: 'Austec Smart Hub Pro',
      categoryTag: 'THIẾT BỊ HỆ THỐNG MỚI',
      specs: {
        'Kết nối': 'Wi-Fi 2.4GHz + LTE 4G dự phòng',
        'Cảm biến': 'Tích hợp cảm biến nhiệt & khói',
        'Nguồn': '220V AC kèm Pin lưu điện',
      },
      price: 2850000,
      imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&auto=format&fit=crop&q=80',
    ),
    ChatDeviceItem(
      isOwned: false,
      hardwareId: 'AT-MOTOR-DC800',
      deviceName: 'Động Cơ Cửa Cuốn Austec DC 800KG Siêu Êm',
      modelName: 'Motor Austec DC-800',
      categoryTag: 'ĐỘNG CƠ & LINH KIỆN',
      specs: {
        'Tải trọng': '800 kg',
        'Công nghệ': 'Công nghệ giảm chấn tự dừng khi va chạm',
        'Điện áp': '24V DC an toàn điện',
      },
      price: 5200000,
      imageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&auto=format&fit=crop&q=80',
    ),
    ChatDeviceItem(
      isOwned: false,
      hardwareId: 'AT-SENSOR-SAFE01',
      deviceName: 'Cảm Biến Hồng Ngoại Đảo Chiều Chống Kẹt Austec',
      modelName: 'SafeSensor IR-01',
      categoryTag: 'CẢM BIẾN AN TOÀN',
      specs: {
        'Khoảng cách': 'Tối đa 12 mét',
        'Phản hồi': 'Dừng đảo chiều < 0.2 giây',
      },
      price: 850000,
      imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&auto=format&fit=crop&q=80',
    ),
    ChatDeviceItem(
      isOwned: false,
      hardwareId: 'AT-REMOTE-ROLLING',
      deviceName: 'Tay Điều Khiển Cầm Tay Mã Nhảy Chống Sao Chép',
      modelName: 'Rolling Code Remote 433MHz',
      categoryTag: 'PHỤ KIỆN ĐIỀU KHIỂN',
      specs: {
        'Tần số': '433.92 MHz Rolling Code',
        'Khoảng cách': '50 - 100 mét xuyên tường',
      },
      price: 350000,
      imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&auto=format&fit=crop&q=80',
    ),
  ];

  Future<void> _pickFile() async {
    try {
      final List<PlatformFile> files = await FilePicker.pickFiles(
        type: FileType.any,
      );

      if (files.isNotEmpty) {
        final file = files.first;
        final bytes = await file.readAsBytes();
        setState(() {
          _isUploading = true;
          _uploadStatus = "Đang tải tệp lên Cloudflare R2...";
        });

        final att = await _chatService.uploadAttachment(bytes, file.name);

        setState(() => _isUploading = false);

        if (att != null && mounted) {
          widget.onAttachmentSelected(att);
          Navigator.of(context).pop();
        } else if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Tải tệp lên máy chủ thất bại, vui lòng thử lại!")),
          );
        }
      }
    } catch (e) {
      debugPrint('[FileAndDeviceSheet] _pickFile error: $e');
      setState(() => _isUploading = false);
    }
  }

  void _showDeviceSelectionModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(top: BorderSide(color: AppTheme.cardBorder)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.precision_manufacturing_rounded, color: AppTheme.cyanAccent, size: 22),
                    SizedBox(width: 8),
                    Text(
                      "Chọn thiết bị cần tư vấn / hỗ trợ",
                      style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70),
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Expanded(
              child: ListView.separated(
                itemCount: _systemDevices.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (c, i) {
                  final dev = _systemDevices[i];
                  return InkWell(
                    onTap: () {
                      Navigator.of(ctx).pop(); // Đóng modal thiết bị
                      Navigator.of(context).pop(); // Đóng sheet chính
                      widget.onDeviceSelected(dev);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceGlass,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: dev.isOwned
                              ? AppTheme.cyanAccent.withValues(alpha: 0.5)
                              : AppTheme.cardBorder,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.black38,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              dev.isOwned ? Icons.door_sliding_rounded : Icons.sensors_rounded,
                              color: dev.isOwned ? AppTheme.cyanAccent : Colors.orange,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: dev.isOwned
                                            ? AppTheme.cyanAccent.withValues(alpha: 0.2)
                                            : Colors.orange.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        dev.categoryTag,
                                        style: TextStyle(
                                          color: dev.isOwned ? AppTheme.cyanAccent : Colors.orange,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    if (dev.hardwareId != null) ...[
                                      const SizedBox(width: 6),
                                      Text(
                                        dev.hardwareId!,
                                        style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
                                      ),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  dev.deviceName,
                                  style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.bold),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (dev.specs != null) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    dev.specs!.entries.map((e) => "${e.key}: ${e.value}").join(" • "),
                                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white38, size: 14),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder)),
      ),
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            "TÙY CHỌN ĐÍNH KÈM",
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0),
          ),
          const SizedBox(height: 14),

          if (_isUploading) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.surfaceGlass,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent),
                  ),
                  const SizedBox(width: 12),
                  Text(_uploadStatus ?? "Đang tải lên...", style: const TextStyle(color: Colors.white, fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],

          // Mục 1: Chọn File / Tệp tài liệu
          InkWell(
            onTap: _isUploading ? null : _pickFile,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.surfaceGlass,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFF1E293B),
                    ),
                    child: const Icon(Icons.insert_drive_file_rounded, color: AppTheme.cyanAccent, size: 24),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Tài liệu / Tệp tin", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                        SizedBox(height: 2),
                        Text("PDF, Word, Excel, ZIP...", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white38, size: 14),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Mục 2: Gửi thông tin thiết bị để tư vấn
          InkWell(
            onTap: _isUploading ? null : _showDeviceSelectionModal,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.surfaceGlass,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.purpleAccent.withValues(alpha: 0.4)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFF2E1065),
                    ),
                    child: const Icon(Icons.precision_manufacturing_rounded, color: AppTheme.purpleAccent, size: 24),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Thông tin thiết bị tư vấn", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                        SizedBox(height: 2),
                        Text("Chia sẻ thông số kỹ thuật thiết bị", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white38, size: 14),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
