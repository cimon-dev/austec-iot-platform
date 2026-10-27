import 'package:flutter/foundation.dart';

class ApiConfig {
  /// Cho phép cấu hình IP máy chủ động khi test trên iPhone / Android
  static String? customServerHost;

  /// Cấu hình địa chỉ IP máy chủ Backend tự động:
  /// - Khi mở qua Web: Tự động trỏ theo host trình duyệt hoặc localhost:4000
  /// - Khi test Native trên điện thoại Android/iOS qua WiFi nội bộ: Trỏ về IP 192.168.100.6:4000 (hoặc customServerHost)
  static String get baseUrl {
    if (customServerHost != null && customServerHost!.isNotEmpty) {
      return 'http://${customServerHost!}:4000';
    }
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host.isNotEmpty && host != 'localhost' && host != '127.0.0.1') {
        return 'http://$host:4000';
      }
      return 'http://localhost:4000';
    }
    return 'http://192.168.100.6:4000';
  }

  /// Địa chỉ WebSocket Chat realtime đồng bộ đa nền tảng
  static String get wsChatUrl {
    if (customServerHost != null && customServerHost!.isNotEmpty) {
      return 'ws://${customServerHost!}:4000/ws/chat';
    }
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host.isNotEmpty && host != 'localhost' && host != '127.0.0.1') {
        return 'ws://$host:4000/ws/chat';
      }
      return 'ws://localhost:4000/ws/chat';
    }
    return 'ws://192.168.100.6:4000/ws/chat';
  }
}

