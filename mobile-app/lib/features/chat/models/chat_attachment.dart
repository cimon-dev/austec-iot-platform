class ChatAttachment {
  final String url;
  final String name;
  final int size;
  final String mimeType;
  final String mediaType; // 'image', 'video', 'file'

  ChatAttachment({
    required this.url,
    required this.name,
    required this.size,
    required this.mimeType,
    required this.mediaType,
  });

  factory ChatAttachment.fromJson(Map<String, dynamic> json) {
    return ChatAttachment(
      url: (json['url'] ?? '').toString(),
      name: (json['filename'] ?? json['name'] ?? 'Tệp đính kèm').toString(),
      size: (json['size'] is num) ? (json['size'] as num).toInt() : 0,
      mimeType: (json['mimeType'] ?? 'application/octet-stream').toString(),
      mediaType: (json['mediaType'] ?? 'file').toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'url': url,
      'filename': name,
      'name': name,
      'size': size,
      'mimeType': mimeType,
      'mediaType': mediaType,
    };
  }

  String get formattedSize {
    if (size <= 0) return '';
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
