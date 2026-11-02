import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../models/chat_message_model.dart';
import '../models/chat_attachment.dart';

class ChatBubble extends StatelessWidget {
  final ChatMessageModel message;

  const ChatBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    if (message.isSystem) {
      return _buildSystemMessage();
    }

    final isMe = message.isMe;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 12),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            _buildAvatar(),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMe && message.senderName.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 2),
                    child: Text(
                      message.senderName,
                      style: const TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    gradient: isMe
                        ? AppTheme.cyanGradient
                        : (message.senderRole == 'CSKH'
                            ? LinearGradient(
                                colors: [
                                  AppTheme.purpleAccent.withValues(alpha: 0.25),
                                  const Color(0xFF1E1B4B),
                                ],
                              )
                            : LinearGradient(
                                colors: [
                                  AppTheme.surfaceGlass,
                                  const Color(0xFF1E293B),
                                ],
                              )),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMe ? 16 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 16),
                    ),
                    border: Border.all(
                      color: isMe
                          ? AppTheme.cyanAccent.withValues(alpha: 0.5)
                          : (message.senderRole == 'CSKH'
                              ? AppTheme.purpleAccent.withValues(alpha: 0.5)
                              : AppTheme.cardBorder),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Nội dung văn bản
                      if (message.content.isNotEmpty) ...[
                        Text(
                          message.content,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 13.5,
                            fontWeight: isMe ? FontWeight.w500 : FontWeight.normal,
                            height: 1.35,
                          ),
                        ),
                      ],

                      // Danh sách tệp/ảnh/video đính kèm
                      if (message.attachments.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        ...message.attachments.map((att) => _buildAttachmentItem(context, att)),
                      ],

                      // Snapshot viễn thám kỹ thuật nếu có
                      if (message.isDeviceSnapshot) ...[
                        const SizedBox(height: 8),
                        _buildTelemetrySnapshot(),
                      ],

                      // Thời gian & Trạng thái gửi
                      const SizedBox(height: 4),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            message.timeFormatted,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.6),
                              fontSize: 9.5,
                            ),
                          ),
                          if (isMe) ...[
                            const SizedBox(width: 4),
                            message.isSending
                                ? const SizedBox(
                                    width: 10,
                                    height: 10,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 1.5,
                                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white70),
                                    ),
                                  )
                                : const Icon(Icons.done_all, color: Colors.white70, size: 12),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _openImageViewer(BuildContext context, String imageUrl, String imageName) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black.withValues(alpha: 0.8),
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.close_rounded, color: Colors.white, size: 24),
              onPressed: () => Navigator.of(context).pop(),
            ),
            title: Text(
              imageName,
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
              overflow: TextOverflow.ellipsis,
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.download_rounded, color: AppTheme.cyanAccent),
                tooltip: "Mở liên kết gốc",
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text("Liên kết ảnh: $imageUrl"),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
            ],
          ),
          body: Center(
            child: InteractiveViewer(
              panEnabled: true,
              minScale: 0.8,
              maxScale: 4.0,
              child: Image.network(
                imageUrl,
                fit: BoxFit.contain,
                loadingBuilder: (ctx, child, progress) {
                  if (progress == null) return child;
                  return Center(
                    child: CircularProgressIndicator(
                      value: progress.expectedTotalBytes != null
                          ? progress.cumulativeBytesLoaded / progress.expectedTotalBytes!
                          : null,
                      color: AppTheme.cyanAccent,
                    ),
                  );
                },
                errorBuilder: (_, __, ___) => const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.broken_image, color: Colors.white54, size: 48),
                    SizedBox(height: 8),
                    Text("Không thể tải hình ảnh", style: TextStyle(color: Colors.white54, fontSize: 12)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSystemMessage() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      alignment: Alignment.center,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
        ),
        child: Text(
          message.content,
          style: const TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 11,
            fontStyle: FontStyle.italic,
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar() {
    final isCSKH = message.senderRole == 'CSKH';
    final initial = message.senderName.isNotEmpty ? message.senderName[0].toUpperCase() : 'A';

    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: isCSKH ? AppTheme.purpleGradient : AppTheme.cyanGradient,
        border: Border.all(
          color: isCSKH ? AppTheme.purpleAccent : AppTheme.cyanAccent,
          width: 1.2,
        ),
      ),
      child: Center(
        child: isCSKH
            ? const Icon(Icons.support_agent_rounded, color: Colors.white, size: 18)
            : Text(
                initial,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
      ),
    );
  }

  Widget _buildAttachmentItem(BuildContext context, ChatAttachment att) {
    if (att.mediaType == 'image') {
      return GestureDetector(
        onTap: () => _openImageViewer(context, att.url, att.name),
        child: Container(
          margin: const EdgeInsets.only(top: 4),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Stack(
              children: [
                Image.network(
                  att.url,
                  width: 220,
                  height: 150,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    width: 220,
                    height: 100,
                    color: Colors.black38,
                    child: const Center(
                      child: Icon(Icons.broken_image, color: Colors.white54),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 6,
                  right: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.zoom_in_rounded, size: 12, color: Colors.white70),
                        SizedBox(width: 3),
                        Text("Chạm xem to", style: TextStyle(color: Colors.white70, fontSize: 8.5)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (att.mediaType == 'video') {
      return Container(
        margin: const EdgeInsets.only(top: 4),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.35),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: AppTheme.purpleAccent.withValues(alpha: 0.3),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.play_arrow_rounded, color: AppTheme.purpleAccent, size: 24),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    att.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "Video • ${att.formattedSize}",
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // Default: File document
    return Container(
      margin: const EdgeInsets.only(top: 4),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppTheme.cyanAccent.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.insert_drive_file_rounded, color: AppTheme.cyanAccent, size: 20),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  att.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                Text(
                  "Tài liệu • ${att.formattedSize}",
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
                ),
              ],
            ),
          ),
          const Icon(Icons.download_rounded, color: Colors.white70, size: 18),
        ],
      ),
    );
  }

  Widget _buildTelemetrySnapshot() {
    final meta = message.metadata;
    final hwId = meta['hardwareId'] ?? 'AT-DOOR-88239A01';
    final model = meta['model'] ?? 'Cửa cuốn Austec Titadoor';
    final status = meta['isOnline'] == true || meta['status'] == 'ONLINE' ? 'Trực tuyến' : 'Ngoại tuyến';

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.sensors_rounded, color: AppTheme.cyanAccent, size: 14),
              SizedBox(width: 4),
              Text(
                "THÔNG SỐ VIỄN THÁM THIẾT BỊ (SNAPSHOT)",
                style: TextStyle(
                  color: AppTheme.cyanAccent,
                  fontSize: 9.5,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            "$model ($hwId)",
            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
          ),
          Text(
            "Trạng thái: $status • Tín hiệu sóng: -65 dBm",
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
          ),
        ],
      ),
    );
  }
}
