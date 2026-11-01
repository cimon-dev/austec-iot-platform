import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../models/chat_attachment.dart';

class AttachmentSelectionSheet extends StatefulWidget {
  final Function(ChatAttachment attachment) onAttachmentSelected;
  final VoidCallback? onAttachTelemetry;
  final bool showTelemetryOption;

  const AttachmentSelectionSheet({
    super.key,
    required this.onAttachmentSelected,
    this.onAttachTelemetry,
    this.showTelemetryOption = true,
  });

  @override
  State<AttachmentSelectionSheet> createState() => _AttachmentSelectionSheetState();
}

class _AttachmentSelectionSheetState extends State<AttachmentSelectionSheet> {
  int _selectedTab = 0; // 0: Ảnh, 1: Video, 2: Tệp tài liệu

  final List<Map<String, dynamic>> _sampleImages = [
    {
      'title': 'Nan cửa bị kẹt / Lệch ray',
      'desc': 'Ảnh chụp nan cửa cuốn bị cong vênh kẹt ray',
      'url': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
      'size': 245000,
      'mime': 'image/jpeg',
    },
    {
      'title': 'Đèn LED bo mạch báo lỗi đỏ',
      'desc': 'Ảnh chụp bo điều khiển Austec nhấp nháy đèn cảnh báo',
      'url': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop&q=80',
      'size': 189000,
      'mime': 'image/jpeg',
    },
    {
      'title': 'Màn hình khóa thông minh',
      'desc': 'Ảnh chụp hiển thị trạng thái thiết bị Austec Smart',
      'url': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
      'size': 312000,
      'mime': 'image/jpeg',
    },
  ];

  final List<Map<String, dynamic>> _sampleVideos = [
    {
      'title': 'Video mô tả motor cửa cuốn kêu rè',
      'desc': 'Video hiện trường ghi lại âm thanh động cơ khi vận hành',
      'url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'size': 4200000,
      'mime': 'video/mp4',
    },
    {
      'title': 'Video thử nghiệm cảm biến an toàn chống xô',
      'desc': 'Video kiểm tra phản hồi dừng khẩn cấp khi gặp vật cản',
      'url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'size': 3800000,
      'mime': 'video/mp4',
    },
  ];

  final List<Map<String, dynamic>> _sampleFiles = [
    {
      'title': 'So_do_dau_noi_bo_mach_A900.pdf',
      'desc': 'Tài liệu hướng dẫn sơ đồ chân tín hiệu motor',
      'url': 'https://austec.vn/docs/so-do-dau-noi-a900.pdf',
      'size': 1420000,
      'mime': 'application/pdf',
    },
    {
      'title': 'Bien_ban_kiem_tra_ky_thuat_austec.docx',
      'desc': 'Biên bản ghi nhận thông số hiện trường lắp đặt',
      'url': 'https://austec.vn/docs/bien-ban-kiem-tra.docx',
      'size': 680000,
      'mime': 'application/msword',
    },
    {
      'title': 'Bao_gia_linh_kien_thay_the.xlsx',
      'desc': 'Bảng tra cứu mã phụ kiện chính hãng Austec 2026',
      'url': 'https://austec.vn/docs/bao-gia-linh-kien.xlsx',
      'size': 512000,
      'mime': 'application/vnd.ms-excel',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder, width: 1.2)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.attachment_rounded, color: AppTheme.cyanAccent, size: 22),
                  SizedBox(width: 8),
                  Text(
                    "ĐÍNH KÈM TỆP & ĐA PHƯƠNG TIỆN",
                    style: TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),

          // Nút Telemetry Snapshot nếu có
          if (widget.showTelemetryOption && widget.onAttachTelemetry != null) ...[
            InkWell(
              onTap: () {
                widget.onAttachTelemetry!();
                Navigator.of(context).pop();
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.cyanAccent.withValues(alpha: 0.2),
                      AppTheme.purpleAccent.withValues(alpha: 0.15),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.sensors_rounded, color: AppTheme.cyanAccent, size: 22),
                    SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Đính kèm thông số kỹ thuật thiết bị (Snapshot)",
                            style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            "Tự động kẹp trạng thái motor, mã lỗi và viễn thám cho kỹ thuật viên",
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 10.5),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.add_circle, color: AppTheme.cyanAccent, size: 20),
                  ],
                ),
              ),
            ),
          ],

          // Category Tabs: Ảnh, Video, Tệp
          Row(
            children: [
              _buildTabButton(0, Icons.photo_library_rounded, "Hình ảnh (R2)"),
              const SizedBox(width: 8),
              _buildTabButton(1, Icons.videocam_rounded, "Video (R2)"),
              const SizedBox(width: 8),
              _buildTabButton(2, Icons.folder_rounded, "Tệp tin (R2)"),
            ],
          ),
          const SizedBox(height: 12),

          // Content List
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 280),
            child: SingleChildScrollView(
              child: Column(
                children: [
                  if (_selectedTab == 0) ..._buildImageItems(),
                  if (_selectedTab == 1) ..._buildVideoItems(),
                  if (_selectedTab == 2) ..._buildFileItems(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton(int index, IconData icon, String label) {
    final isSelected = _selectedTab == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedTab = index),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.cyanAccent.withValues(alpha: 0.2) : AppTheme.surfaceGlass,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppTheme.cyanAccent : AppTheme.cardBorder,
              width: 1.2,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: isSelected ? AppTheme.cyanAccent : Colors.white60),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.white70,
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildImageItems() {
    return _sampleImages.map((s) {
      return Container(
        margin: const EdgeInsets.only(bottom: 8),
        child: InkWell(
          onTap: () {
            widget.onAttachmentSelected(ChatAttachment(
              url: s['url']!,
              name: s['title']!,
              size: s['size']!,
              mimeType: s['mime']!,
              mediaType: 'image',
            ));
            Navigator.of(context).pop();
          },
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.surfaceGlass,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.cardBorder),
            ),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(s['url']!, width: 44, height: 44, fit: BoxFit.cover),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s['title']!, style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                      Text(s['desc']!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_upward_rounded, color: AppTheme.cyanAccent, size: 20),
              ],
            ),
          ),
        ),
      );
    }).toList();
  }

  List<Widget> _buildVideoItems() {
    return _sampleVideos.map((s) {
      return Container(
        margin: const EdgeInsets.only(bottom: 8),
        child: InkWell(
          onTap: () {
            widget.onAttachmentSelected(ChatAttachment(
              url: s['url']!,
              name: s['title']!,
              size: s['size']!,
              mimeType: s['mime']!,
              mediaType: 'video',
            ));
            Navigator.of(context).pop();
          },
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.surfaceGlass,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.purpleAccent.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.videocam_rounded, color: AppTheme.purpleAccent, size: 24),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s['title']!, style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                      Text(s['desc']!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_upward_rounded, color: AppTheme.purpleAccent, size: 20),
              ],
            ),
          ),
        ),
      );
    }).toList();
  }

  List<Widget> _buildFileItems() {
    return _sampleFiles.map((s) {
      return Container(
        margin: const EdgeInsets.only(bottom: 8),
        child: InkWell(
          onTap: () {
            widget.onAttachmentSelected(ChatAttachment(
              url: s['url']!,
              name: s['title']!,
              size: s['size']!,
              mimeType: s['mime']!,
              mediaType: 'file',
            ));
            Navigator.of(context).pop();
          },
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.surfaceGlass,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.cyanAccent.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.description_rounded, color: AppTheme.cyanAccent, size: 24),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s['title']!, style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                      Text(s['desc']!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_upward_rounded, color: AppTheme.cyanAccent, size: 20),
              ],
            ),
          ),
        ),
      );
    }).toList();
  }
}
