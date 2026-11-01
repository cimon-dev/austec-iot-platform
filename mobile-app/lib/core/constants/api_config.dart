import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Quản lý tập trung địa chỉ API & WebSocket cho toàn bộ ứng dụng Mobile Austec IoT
class ApiConfig {
  /// URL Backend Cloud đã deploy trên Render
  /// Có thể override khi build/run: flutter run --dart-define=API_URL=https://...
  static const String defaultCloudUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://austec-backend.onrender.com',
  );

  /// Cho phép cấu hình URL/IP máy chủ tùy chọn lưu trên máy (lưu trong SharedPreferences)
  static String? customServerHost;

  /// Địa chỉ IP LAN máy chủ dev hiện tại trên mạng Wi-Fi
  static const String defaultLocalLanUrl = 'http://192.168.100.6:4000';
  static const String defaultEmulatorUrl = 'http://10.0.2.2:4000';
  static const String defaultLocalhostUrl = 'http://127.0.0.1:4000';

  /// Nạp URL máy chủ đã lưu từ SharedPreferences
  static Future<void> loadCustomHost() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      customServerHost = prefs.getString('custom_server_host');
    } catch (_) {}
  }

  /// Cập nhật URL/IP máy chủ mới và lưu vào bộ nhớ máy
  /// Nếu truyền null hoặc rỗng hoặc trùng defaultCloudUrl => Xóa custom để dùng mặc định Cloud
  static Future<void> setCustomHost(String? host) async {
    final cleaned = host?.trim();
    if (cleaned == null || cleaned.isEmpty || cleaned == defaultCloudUrl) {
      customServerHost = null;
    } else {
      customServerHost = cleaned;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      if (customServerHost != null && customServerHost!.isNotEmpty) {
        await prefs.setString('custom_server_host', customServerHost!);
      } else {
        await prefs.remove('custom_server_host');
      }
    } catch (_) {}
  }

  /// Chuẩn hoá địa chỉ server thông minh:
  /// - Full URL (https://... hoặc http://...): Giữ nguyên giao thức, bỏ dấu gạch chéo cuối
  /// - Domain cloud (vd: xxx.onrender.com): Tự động thêm https://, KHÔNG ép cổng 4000
  /// - IP local kèm port (vd: 192.168.100.6:4000): Tự động thêm http://
  /// - IP local thuần (vd: 192.168.100.6 hoặc localhost): Tự động thêm http:// và :4000
  static String formatBaseUrl(String input) {
    var raw = input.trim().replaceAll(RegExp(r'/+$'), '');
    if (raw.endsWith('/api')) {
      raw = raw.substring(0, raw.length - 4);
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }

    // Nếu là tên miền Cloud (Render, Vercel, hoặc domain thông thường không phải IP)
    final isLikelyDomain = raw.contains('.onrender.com') ||
        (!raw.contains(':') && raw.contains('.') && !RegExp(r'^\d').hasMatch(raw));

    if (isLikelyDomain) {
      return 'https://$raw';
    }

    // Nếu là IP có kèm cổng
    if (raw.contains(':')) {
      return 'http://$raw';
    }

    // Nếu là IP thuần hoặc localhost chưa có cổng
    return 'http://$raw:4000';
  }

  /// Cấu hình địa chỉ HTTP Backend:
  /// 1. Nếu người dùng nhập custom host => Dùng custom đã format
  /// 2. Khi chạy Flutter Web => Tự động nhận diện host trình duyệt
  /// 3. Mặc định toàn hệ thống => Backend Render Cloud (hoặc LAN nếu override)
  static String get baseUrl {
    if (customServerHost != null && customServerHost!.isNotEmpty) {
      return formatBaseUrl(customServerHost!);
    }
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host.isNotEmpty && host != 'localhost' && host != '127.0.0.1') {
        return formatBaseUrl(host);
      }
    }
    return defaultCloudUrl.isNotEmpty ? defaultCloudUrl : defaultLocalLanUrl;
  }

  /// Địa chỉ WebSocket Chat realtime đồng bộ đa nền tảng:
  /// - Nếu baseUrl là https:// => Dùng wss://.../ws/chat (Render SSL an toàn)
  /// - Nếu baseUrl là http:// => Dùng ws://.../ws/chat (Local dev)
  static String get wsChatUrl {
    final base = baseUrl;
    if (base.startsWith('https://')) {
      return base.replaceFirst('https://', 'wss://') + '/ws/chat';
    }
    if (base.startsWith('http://')) {
      return base.replaceFirst('http://', 'ws://') + '/ws/chat';
    }
    return 'ws://$base/ws/chat';
  }

  /// Kiểm tra xem hiện tại đang kết nối qua Cloud (Render) hay Local LAN
  static bool get isUsingCloud {
    final lower = baseUrl.toLowerCase();
    return lower.startsWith('https://') || lower.contains('onrender.com');
  }

  /// Nhãn hiển thị trạng thái kết nối
  static String get connectionBadgeText {
    if (isUsingCloud) return 'Render Cloud';
    if (baseUrl.contains('192.168.100.6')) return 'LAN 192.168.100.6';
    if (baseUrl.contains('10.0.2.2')) return 'Android Emulator';
    return 'Local Dev';
  }
}
