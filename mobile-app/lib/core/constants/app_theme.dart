import 'package:flutter/material.dart';

class AppTheme {
  // Theme state
  static bool isDarkMode = true;
  static String currentLang = 'vi'; // 'vi' or 'en'

  // Dark Palette (Pure Industrial Obsidian & Zinc - Zero Blue Tint)
  static const Color darkBackground = Color(0xFF090A0C);
  static const Color darkSurface = Color(0xFF141518);
  static const Color darkSurfaceGlass = Color(0xF2141518);
  static const Color darkCardBorder = Color(0xFF27272A);

  // Light Palette
  static const Color lightBackground = Color(0xFFF4F4F5);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceGlass = Color(0xF2FFFFFF);
  static const Color lightCardBorder = Color(0xFFE4E4E7);
  static const Color lightBorder = Color(0xFFE4E4E7);
  static const Color lightTextPrimary = Color(0xFF090A0C);
  static const Color lightTextSecondary = Color(0xFF52525B);
  static const Color surfaceDark = Color(0xFF141518);
  static const Color crimsonDanger = Color(0xFFDC2626);

  // Default Constant Colors (Const-compatible)
  static const Color background = darkBackground;
  static const Color surface = darkSurface;
  static const Color surfaceGlass = darkSurfaceGlass;
  static const Color cardBorder = darkCardBorder;
  static const Color textPrimary = Color(0xFFF4F4F5);
  static const Color textSecondary = Color(0xFFA1A1AA);
  static const Color textMuted = Color(0xFF71717A);

  // Accent Colors
  static const Color cyanAccent = Color(0xFFFFFFFF);
  static const Color blueAccent = Color(0xFF71717A);
  static const Color emeraldSuccess = Color(0xFF22C55E);
  static const Color amberWarning = Color(0xFFF59E0B);
  static const Color roseDanger = Color(0xFFDC2626);
  static const Color purpleAccent = Color(0xFFA1A1AA);

  // Dynamic Theme Getters based on isDarkMode
  static Color get dynamicBackground => isDarkMode ? darkBackground : lightBackground;
  static Color get dynamicSurface => isDarkMode ? darkSurface : lightSurface;
  static Color get dynamicSurfaceGlass => isDarkMode ? darkSurfaceGlass : lightSurfaceGlass;
  static Color get dynamicCardBorder => isDarkMode ? darkCardBorder : lightCardBorder;
  static Color get dynamicTextPrimary => isDarkMode ? textPrimary : lightTextPrimary;
  static Color get dynamicTextSecondary => isDarkMode ? textSecondary : lightTextSecondary;

  // Glassmorphic Decoration Helper (Zero Neon Blur / Glow)
  static BoxDecoration glassBox({
    Color? color,
    Color? borderColor,
    double radius = 18,
    bool glow = false,
  }) {
    return BoxDecoration(
      color: color ?? (isDarkMode ? darkSurface : lightSurface),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
        color: borderColor ?? (isDarkMode ? darkCardBorder : lightCardBorder),
        width: 1.0,
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: isDarkMode ? 0.25 : 0.05),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }

  // Gradients
  static const LinearGradient cyanGradient = LinearGradient(
    colors: [Color(0xFF00E5FF), Color(0xFF0072FF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient amberGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient emeraldGradient = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF059669)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient purpleGradient = LinearGradient(
    colors: [Color(0xFFA855F7), Color(0xFF6366F1)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Bilingual Dictionary (Anh / Việt)
  static final Map<String, Map<String, String>> _dict = {
    'welcome': {'vi': 'Xin chào', 'en': 'Hello'},
    'my_home': {'vi': 'NHÀ CỦA TÔI', 'en': 'MY HOME'},
    'location': {'vi': 'Vị trí', 'en': 'Location'},
    'temp': {'vi': 'Nhiệt độ', 'en': 'Temp'},
    'humidity': {'vi': 'Độ ẩm', 'en': 'Humidity'},
    'deg': {'vi': 'độ', 'en': '°C'},
    'control': {'vi': 'Điều khiển', 'en': 'Control'},
    'shop': {'vi': 'Gian hàng', 'en': 'Store'},
    'chat': {'vi': 'Tin nhắn', 'en': 'Chat'},
    'care': {'vi': 'Cá nhân & Quản trị', 'en': 'Management'},
    'support': {'vi': 'Chăm sóc', 'en': 'Support'},
    'pairing': {'vi': 'Ghép Nối', 'en': 'Pairing'},
    'add_device': {'vi': 'Thêm thiết bị', 'en': 'Add Device'},
    'devices': {'vi': 'thiết bị', 'en': 'devices'},
    'dark_mode': {'vi': 'Chế độ tối', 'en': 'Dark Mode'},
    'light_mode': {'vi': 'Chế độ sáng', 'en': 'Light Mode'},
    'search_device': {'vi': 'Tìm kiếm thiết bị', 'en': 'Search Device'},
    'notifications': {'vi': 'Thông báo hệ thống', 'en': 'Notifications'},
    'rename_device': {'vi': 'Đổi tên thiết bị', 'en': 'Rename Device'},
    'delete_device': {'vi': 'Xóa thiết bị', 'en': 'Delete Device'},
    'details': {'vi': 'Xem chi tiết', 'en': 'View Details'},
    'cancel': {'vi': 'Hủy', 'en': 'Cancel'},
    'save': {'vi': 'Lưu', 'en': 'Save'},
    'doors': {'vi': 'DOORS', 'en': 'DOORS'},
    'doors_sub': {'vi': 'CỬA CUỐN AUSTEC', 'en': 'AUSTEC ROLLER DOOR'},
    'energy': {'vi': 'ENERGY MANAGE', 'en': 'ENERGY MANAGE'},
    'energy_sub': {'vi': 'QUẢN LÝ NĂNG LƯỢNG', 'en': 'POWER MANAGEMENT'},
    'environment': {'vi': 'ENVIRONMENT', 'en': 'ENVIRONMENT'},
    'environment_sub': {'vi': 'CẢM BIẾN MÔI TRƯỜNG', 'en': 'WEATHER SENSORS'},
    'others': {'vi': 'OTHERS CONTROL', 'en': 'OTHERS CONTROL'},
    'others_sub': {'vi': 'THIẾT BỊ KHÁC', 'en': 'OTHER DEVICES'},
    'data': {'vi': 'DATA ANALYTICS', 'en': 'DATA ANALYTICS'},
    'data_sub': {'vi': 'PHÂN TÍCH DỮ LIỆU', 'en': 'DATA ANALYTICS'},
    'light': {'vi': 'LIGHT & SWITCH', 'en': 'LIGHT & SWITCH'},
    'light_sub': {'vi': 'CHIẾU SÁNG & ĐÓNG CẮT', 'en': 'LIGHTS & RELAYS'},
    'camera': {'vi': 'AI CAMERA', 'en': 'AI CAMERA'},
    'camera_sub': {'vi': 'CAMERA AN NINH AI', 'en': 'SECURITY CAM'},
    'settings': {'vi': 'Cài đặt thiết bị', 'en': 'Device Settings'},
    'history': {'vi': 'Lịch sử điều khiển', 'en': 'Control History'},
    'stopped': {'vi': 'Đã dừng', 'en': 'Stopped'},
    'opening': {'vi': 'Đang mở', 'en': 'Opening'},
    'closing': {'vi': 'Đang đóng', 'en': 'Closing'},
    'open': {'vi': 'Mở cửa', 'en': 'Open'},
    'stop': {'vi': 'Dừng', 'en': 'Stop'},
    'close': {'vi': 'Đóng cửa', 'en': 'Close'},
    'lock': {'vi': 'Khóa', 'en': 'Lock'},
    'rename': {'vi': 'Đổi tên', 'en': 'Rename'},
    'delete': {'vi': 'Xóa thiết bị', 'en': 'Delete device'},
  };

  static String t(String key) {
    return _dict[key]?[currentLang] ?? key;
  }
}
