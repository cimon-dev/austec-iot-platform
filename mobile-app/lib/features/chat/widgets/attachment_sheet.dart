import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../../../core/constants/app_theme.dart';
import '../models/chat_attachment.dart';
import '../services/chat_service.dart';

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
  final ImagePicker _imagePicker = ImagePicker();
  final ChatService _chatService = ChatService();

  int _selectedTab = 0; // 0: Kho ảnh & Camera, 1: Video, 2: Tệp tài liệu
  bool _isUploading = false;
  String _uploadStatusText = "";
  String? _uploadError;

  // Dữ liệu mẫu dự phòng & test nhanh hiện trường
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

  // ==========================================
  // XỬ LÝ CHỌN VÀ UPLOAD THẬT TỪ THIẾT BỊ LÊN R2
  // ==========================================

  Future<void> _uploadAndDispatch({
    required Uint8List bytes,
    required String filename,
    required String defaultMediaType,
  }) async {
    setState(() {
      _isUploading = true;
      _uploadStatusText = "Đang tải $filename lên Cloudflare R2...";
      _uploadError = null;
    });

    try {
      final attachment = await _chatService.uploadAttachment(bytes, filename);
      if (!mounted) return;

      if (attachment != null) {
        widget.onAttachmentSelected(attachment);
        Navigator.of(context).pop();
      } else {
        setState(() {
          _isUploading = false;
          _uploadError = "Không thể tải lên Cloudflare R2. Vui lòng kiểm tra kết nối mạng!";
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isUploading = false;
        _uploadError = "Lỗi tải tệp: $e";
      });
    }
  }

  /// 1. Mở Kho ảnh / Thư viện ảnh (iOS Photos / Android Gallery)
  Future<void> _pickImageFromGallery() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 85,
      );
      if (image == null) return;
      final bytes = await image.readAsBytes();
      await _uploadAndDispatch(
        bytes: bytes,
        filename: image.name,
        defaultMediaType: 'image',
      );
    } catch (e) {
      setState(() => _uploadError = "Lỗi mở kho ảnh: $e");
    }
  }

  /// 2. Chụp ảnh trực tiếp từ Camera
  Future<void> _takePhotoWithCamera() async {
    try {
      final XFile? photo = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 85,
      );
      if (photo == null) return;
      final bytes = await photo.readAsBytes();
      final filename = photo.name.isNotEmpty ? photo.name : 'camera_${DateTime.now().millisecondsSinceEpoch}.jpg';
      await _uploadAndDispatch(
        bytes: bytes,
        filename: filename,
        defaultMediaType: 'image',
      );
    } catch (e) {
      setState(() => _uploadError = "Lỗi mở máy ảnh: $e");
    }
  }

  /// 3. Mở Kho video / Thư viện video (iOS Photos / Android Gallery)
  Future<void> _pickVideoFromGallery() async {
    try {
      final XFile? video = await _imagePicker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(minutes: 5),
      );
      if (video == null) return;
      final bytes = await video.readAsBytes();
      await _uploadAndDispatch(
        bytes: bytes,
        filename: video.name,
        defaultMediaType: 'video',
      );
    } catch (e) {
      setState(() => _uploadError = "Lỗi mở thư viện video: $e");
    }
  }

  /// 4. Quay video trực tiếp bằng Camera
  Future<void> _recordVideoWithCamera() async {
    try {
      final XFile? video = await _imagePicker.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(minutes: 5),
      );
      if (video == null) return;
      final bytes = await video.readAsBytes();
      final filename = video.name.isNotEmpty ? video.name : 'video_${DateTime.now().millisecondsSinceEpoch}.mp4';
      await _uploadAndDispatch(
        bytes: bytes,
        filename: filename,
        defaultMediaType: 'video',
      );
    } catch (e) {
      setState(() => _uploadError = "Lỗi quay video: $e");
    }
  }

  /// 5. Mở Trình chọn tệp hệ thống (iOS Files app / Android Storage)
  Future<void> _pickDocumentFile() async {
    try {
      final List<PlatformFile> files = await FilePicker.pickFiles(
        type: FileType.any,
      );
      if (files.isEmpty) return;

      final file = files.first;
      final bytes = await file.readAsBytes();

      await _uploadAndDispatch(
        bytes: bytes,
        filename: file.name,
        defaultMediaType: 'file',
      );
    } catch (e) {
      setState(() => _uploadError = "Lỗi mở trình chọn tệp: $e");
    }
  }

  // ==========================================
  // GIAO DIỆN CHỌN TỆP LUXURY DARK GLASSMORPHISM
  // ==========================================

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

          // Loading Progress khi đang upload lên Cloudflare R2
          if (_isUploading) ...[
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.surfaceGlass,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
              ),
              child: Row(
                children: [
                  const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(AppTheme.cyanAccent),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _uploadStatusText,
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          "Lưu trữ mã hóa đám mây Cloudflare R2 an toàn",
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 10.5),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Thông báo lỗi nếu upload thất bại
          if (_uploadError != null) ...[
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.roseDanger.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.roseDanger),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, color: AppTheme.roseDanger, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _uploadError!,
                      style: const TextStyle(color: Colors.white, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Nút Telemetry Snapshot nếu có
          if (widget.showTelemetryOption && widget.onAttachTelemetry != null) ...[
            InkWell(
              onTap: _isUploading
                  ? null
                  : () {
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

          // ==========================================
          // ACTION BUTTONS LỰA CHỌN TỆP THẬT TRỰC TIẾP
          // ==========================================
          Row(
            children: [
              _buildActionButton(
                icon: Icons.photo_library_rounded,
                label: "Kho ảnh",
                subLabel: "iPhone/Android",
                gradient: const [Color(0xFF06B6D4), Color(0xFF3B82F6)],
                onTap: _isUploading ? null : _pickImageFromGallery,
              ),
              const SizedBox(width: 8),
              _buildActionButton(
                icon: Icons.camera_alt_rounded,
                label: "Chụp ảnh",
                subLabel: "Camera",
                gradient: const [Color(0xFF8B5CF6), Color(0xFFEC4899)],
                onTap: _isUploading ? null : _takePhotoWithCamera,
              ),
              const SizedBox(width: 8),
              _buildActionButton(
                icon: Icons.videocam_rounded,
                label: "Video",
                subLabel: "Quay/Chọn",
                gradient: const [Color(0xFFF59E0B), Color(0xFFEF4444)],
                onTap: _isUploading ? null : () => _showVideoSourceDialog(),
              ),
              const SizedBox(width: 8),
              _buildActionButton(
                icon: Icons.folder_open_rounded,
                label: "Tệp tin",
                subLabel: "PDF/Word/ZIP",
                gradient: const [Color(0xFF10B981), Color(0xFF059669)],
                onTap: _isUploading ? null : _pickDocumentFile,
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Category Tabs: Xem mẫu tham khảo nhanh
          Row(
            children: [
              _buildTabButton(0, Icons.photo_library_outlined, "Mẫu Ảnh"),
              const SizedBox(width: 8),
              _buildTabButton(1, Icons.videocam_outlined, "Mẫu Video"),
              const SizedBox(width: 8),
              _buildTabButton(2, Icons.description_outlined, "Mẫu Tài liệu"),
            ],
          ),
          const SizedBox(height: 10),

          // Content List mẫu
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 200),
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

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required String subLabel,
    required List<Color> gradient,
    required VoidCallback? onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                gradient[0].withValues(alpha: 0.22),
                gradient[1].withValues(alpha: 0.12),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: gradient[0].withValues(alpha: 0.4), width: 1.2),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: gradient[0].withValues(alpha: 0.25),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 20, color: gradient[0]),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                subLabel,
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 9.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showVideoSourceDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                "CHỌN NGUỒN VIDEO ĐÍNH KÈM",
                style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 14),
              ListTile(
                leading: const Icon(Icons.video_library_rounded, color: AppTheme.cyanAccent),
                title: const Text("Chọn từ Kho video (Thư viện)", style: TextStyle(color: Colors.white, fontSize: 13)),
                subtitle: const Text("Lấy video có sẵn trong bộ nhớ thiết bị", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _pickVideoFromGallery();
                },
              ),
              const Divider(color: AppTheme.cardBorder, height: 1),
              ListTile(
                leading: const Icon(Icons.videocam_rounded, color: AppTheme.purpleAccent),
                title: const Text("Quay video mới bằng Camera", style: TextStyle(color: Colors.white, fontSize: 13)),
                subtitle: const Text("Ghi lại hiện trường sự cố thực tế", style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _recordVideoWithCamera();
                },
              ),
            ],
          ),
        ),
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
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.cyanAccent.withValues(alpha: 0.15) : AppTheme.surfaceGlass,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppTheme.cyanAccent : AppTheme.cardBorder,
              width: 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: isSelected ? AppTheme.cyanAccent : Colors.white60),
              const SizedBox(width: 5),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.white70,
                  fontSize: 10.5,
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
        margin: const EdgeInsets.only(bottom: 6),
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
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: AppTheme.surfaceGlass,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.cardBorder),
            ),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(s['url']!, width: 40, height: 40, fit: BoxFit.cover),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s['title']!, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      Text(s['desc']!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 9.5)),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_upward_rounded, color: AppTheme.cyanAccent, size: 18),
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
        margin: const EdgeInsets.only(bottom: 6),
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
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: AppTheme.surfaceGlass,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.purpleAccent.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.videocam_rounded, color: AppTheme.purpleAccent, size: 22),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s['title']!, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      Text(s['desc']!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 9.5)),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_upward_rounded, color: AppTheme.purpleAccent, size: 18),
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
        margin: const EdgeInsets.only(bottom: 6),
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
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: AppTheme.surfaceGlass,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.cyanAccent.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.description_rounded, color: AppTheme.cyanAccent, size: 22),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s['title']!, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      Text(s['desc']!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 9.5)),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_upward_rounded, color: AppTheme.cyanAccent, size: 18),
              ],
            ),
          ),
        ),
      );
    }).toList();
  }
}
