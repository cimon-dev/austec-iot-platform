import '../domain/entities/chat_device_item.dart';

class ChatMessage {
  final String sender; // 'user' | 'cskh' | 'system'
  final String text;
  final String time;
  final bool isTelemetrySnapshot;
  final Map<String, dynamic>? telemetryData;
  final List<String> attachmentUrls;
  final ChatDeviceItem? selectedDevice;

  ChatMessage({
    required this.sender,
    required this.text,
    required this.time,
    this.isTelemetrySnapshot = false,
    this.telemetryData,
    this.attachmentUrls = const [],
    this.selectedDevice,
  });
}
