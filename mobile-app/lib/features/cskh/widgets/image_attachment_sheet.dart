import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';

class ImageAttachmentOptionsSheet extends StatelessWidget {
  final Function(String imageUrl) onImageSelected;
  const ImageAttachmentOptionsSheet({super.key, required this.onImageSelected});

  @override
  Widget build(BuildContext context) {
    final sampleImages = [
      {
        'title': 'Nan cửa bị kẹt / Lệch ray trượt',
        'desc': 'Ảnh mẫu hiện trường lỗi nan cửa cuốn',
        'url': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
      },
      {
        'title': 'Bo mạch motor nhấp nháy đèn đỏ',
        'desc': 'Ảnh chụp đèn LED báo lỗi bo điều khiển',
        'url': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop&q=80',
      },
      {
        'title': 'Khóa cửa báo lỗi nhận diện FaceID',
        'desc': 'Ảnh màn hình khóa hiển thị cảnh báo',
        'url': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
      },
    ];

    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.add_photo_alternate, color: AppTheme.cyanAccent, size: 20),
                  SizedBox(width: 8),
                  Text(
                    "ĐÍNH KÈM ẢNH HIỆN TRƯỜNG",
                    style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const Text(
            "Chọn hình ảnh mô tả hiện trường sự cố để kỹ thuật viên kiểm tra từ xa:",
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
          ),
          const SizedBox(height: 12),

          ...sampleImages.map((s) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () {
                  onImageSelected(s['url']!);
                  Navigator.of(context).pop();
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.cardBorder),
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
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
                      const Icon(Icons.add_circle_outline, color: AppTheme.cyanAccent, size: 20),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
