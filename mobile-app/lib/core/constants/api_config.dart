import 'package:flutter/foundation.dart';

class ApiConfig {
  /// Cấu hình địa chỉ IP máy chủ Backend tự động:
  /// - Khi mở qua trình duyệt Safari/Chrome trên điện thoại (VD: 192.168.1.237:8080):
  ///   Tự động trỏ về đúng IP máy chủ http://192.168.1.237:4000
  /// - Khi test trên PC localhost: Trỏ về http://localhost:4000
  /// - Khi test Native trên điện thoại Android/iOS qua WiFi nội bộ: Trỏ về IP 192.168.1.237:4000
  static String get baseUrl {
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host.isNotEmpty && host != 'localhost' && host != '127.0.0.1') {
        return 'http://$host:4000';
      }
      return 'http://localhost:4000';
    }
    return 'http://192.168.1.237:4000';
  }

  /// Địa chỉ WebSocket Chat realtime đồng bộ đa nền tảng
  static String get wsChatUrl {
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host.isNotEmpty && host != 'localhost' && host != '127.0.0.1') {
        return 'ws://$host:4000/ws/chat';
      }
      return 'ws://localhost:4000/ws/chat';
    }
    return 'ws://192.168.1.237:4000/ws/chat';
  }
}

