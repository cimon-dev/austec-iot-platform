import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../models/chat_message.dart';

class ChatMessageBubble extends StatelessWidget {
  final ChatMessage message;
  final VoidCallback? onImageTap;
  final Function(String imageUrl)? onZoomImage;

  const ChatMessageBubble({
    super.key,
    required this.message,
    this.onImageTap,
    this.onZoomImage,
  });

  @override
  Widget build(BuildContext context) {
    if (message.isTelemetrySnapshot && message.telemetryData != null) {
      return _buildTelemetrySnapshotBubble(message.telemetryData!, message.time);
    }

    final isMe = message.sender == "user";

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
        decoration: BoxDecoration(
          color: isMe ? AppTheme.blueAccent : AppTheme.surfaceGlass,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isMe ? AppTheme.cyanAccent.withValues(alpha: 0.3) : AppTheme.cardBorder,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Attached Device Badge in bubble
            if (message.selectedDevice != null) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  color: isMe ? Colors.white.withValues(alpha: 0.12) : AppTheme.cyanAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isMe ? Colors.white24 : AppTheme.cyanAccent.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      message.selectedDevice!.isOwned ? Icons.verified : Icons.shopping_bag_outlined,
                      color: isMe ? Colors.white : AppTheme.cyanAccent,
                      size: 14,
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        "${message.selectedDevice!.deviceName} (${message.selectedDevice!.isOwned ? 'Đã sở hữu' : 'Tư vấn mới'})",
                        style: TextStyle(
                          color: isMe ? Colors.white : AppTheme.cyanAccent,
                          fontSize: 10.5,
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

            // Attached Images in bubble
            if (message.attachmentUrls.isNotEmpty) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: message.attachmentUrls.map((imgUrl) {
                    return GestureDetector(
                      onTap: () => onZoomImage?.call(imgUrl),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          width: 140,
                          height: 100,
                          color: Colors.black26,
                          child: Image.network(
                            imgUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(Icons.image, color: Colors.white54),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],

            Text(
              message.text,
              style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.bottomRight,
              child: Text(
                message.time,
                style: TextStyle(
                  color: isMe ? Colors.white70 : AppTheme.textMuted,
                  fontSize: 9.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTelemetrySnapshotBubble(Map<String, dynamic> data, String time) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        width: 300,
        decoration: AppTheme.glassBox(
          color: AppTheme.cyanAccent.withValues(alpha: 0.08),
          borderColor: AppTheme.cyanAccent.withValues(alpha: 0.5),
          radius: 16,
          glow: true,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.monitor_heart, color: AppTheme.cyanAccent, size: 17),
                SizedBox(width: 6),
                Text(
                  "GÓI CHẨN ĐOÁN VIỄN THÁM (WS)",
                  style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _buildParamRow("Hardware ID", data["hardwareId"]),
            _buildParamRow("Trạng thái", data["doorState"]),
            _buildParamRow("Mức Pin", data["battery"]),
            _buildParamRow("Tín hiệu WiFi", data["wifiRssi"]),
            _buildParamRow("Dòng động cơ", data["currentA"]),
            _buildParamRow("Bản Firmware", data["firmware"]),
            _buildParamRow("Gói dịch vụ", data["subscription"] ?? "Có thời hạn"),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.bottomRight,
              child: Text(time, style: const TextStyle(color: AppTheme.textMuted, fontSize: 9.5)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildParamRow(String label, dynamic val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10.5)),
          Text(
            "$val",
            style: const TextStyle(color: Colors.white, fontSize: 10.5, fontFamily: "monospace", fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
