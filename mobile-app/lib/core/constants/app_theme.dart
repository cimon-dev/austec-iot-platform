import 'package:flutter/material.dart';

/// 4px Spacing Scale (unslop Pass 1)
class AppSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double xxxl = 32.0;
}

/// Nested Radius System (unslop Pass 7: inner = outer - padding, min 6)
class AppRadius {
  static const double sm = 6.0;
  static const double inner = 8.0;
  static const double control = 10.0;
  static const double card = 16.0;
  static const double panel = 20.0;
}

/// Disciplined Motion Tokens (unslop Pass 9: one easing curve, no bounce/loop)
class AppMotion {
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 220);
  static const Curve curve = Curves.easeOutCubic;
}

class AppTheme {
  // Reactive ThemeMode notifier so all 22 screens rebuild cleanly on Dark/Light toggle
  static final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier<ThemeMode>(ThemeMode.dark);

  static bool get isDarkMode => themeNotifier.value == ThemeMode.dark;
  static set isDarkMode(bool value) {
    final next = value ? ThemeMode.dark : ThemeMode.light;
    if (themeNotifier.value != next) {
      themeNotifier.value = next;
    }
  }

  static void toggleTheme() {
    isDarkMode = !isDarkMode;
  }

  static String currentLang = 'vi'; // 'vi' or 'en'

  // =========================================================================
  // GRAPHITE NEUTRAL RAMP — DARK (Industrial instrument panel, zero color wash)
  // =========================================================================
  static const Color darkBackground = Color(0xFF0D1015);
  static const Color darkSurface = Color(0xFF151A22);
  static const Color darkSurfaceRaised = Color(0xFF1C232E);
  static const Color darkSurfaceGlass = Color(0xFF151A22);
  static const Color darkCardBorder = Color(0xFF252D3A);

  // =========================================================================
  // GRAPHITE NEUTRAL RAMP — LIGHT (Crisp architectural neutral, high contrast)
  // =========================================================================
  static const Color lightBackground = Color(0xFFF6F7F9);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceRaised = Color(0xFFEEF1F5);
  static const Color lightSurfaceGlass = Color(0xFFFFFFFF);
  static const Color lightCardBorder = Color(0xFFE2E6EC);
  static const Color lightBorder = Color(0xFFE2E6EC);

  // 3 Text Roles — Dark & Light
  static const Color textPrimary = Color(0xFFF3F5F8);
  static const Color textSecondary = Color(0xFF9BA4B2);
  static const Color textMuted = Color(0xFF6B7484);

  static const Color lightTextPrimary = Color(0xFF11161F);
  static const Color lightTextSecondary = Color(0xFF525D6F);
  static const Color lightTextMuted = Color(0xFF7B8596);

  // Legacy aliases (kept const-compatible for untouched call sites)
  static const Color surfaceDark = darkSurface;
  static const Color background = darkBackground;
  static const Color surface = darkSurface;
  static const Color surfaceGlass = darkSurface;
  static const Color cardBorder = darkCardBorder;

  // =========================================================================
  // SINGLE DISCIPLINED ACCENT + TONED SEMANTICS (Contrast >= 4.5:1)
  // =========================================================================
  static const Color brandBlue = Color(0xFF2563EB);
  static const Color brandBlueDark = Color(0xFF3B82F6);
  static const Color brandBlueLight = Color(0xFF1D4ED8);
  static const Color cyanAccent = Color(0xFF3B82F6);
  static const Color blueAccent = Color(0xFF2563EB);

  static const Color emeraldSuccess = Color(0xFF16A34A);
  static const Color amberWarning = Color(0xFFD97706);
  static const Color roseDanger = Color(0xFFDC2626);
  static const Color crimsonDanger = Color(0xFFDC2626);
  static const Color purpleAccent = Color(0xFF64748B); // Toned neutral (no slop purple)

  // Dynamic Theme Getters
  static Color get dynamicBackground => isDarkMode ? darkBackground : lightBackground;
  static Color get dynamicSurface => isDarkMode ? darkSurface : lightSurface;
  static Color get dynamicSurfaceRaised => isDarkMode ? darkSurfaceRaised : lightSurfaceRaised;
  static Color get dynamicSurfaceGlass => isDarkMode ? darkSurface : lightSurface;
  static Color get dynamicCardBorder => isDarkMode ? darkCardBorder : lightCardBorder;
  static Color get dynamicHairline => isDarkMode
      ? Colors.white.withValues(alpha: 0.08)
      : Colors.black.withValues(alpha: 0.08);
  static Color get dynamicTextPrimary => isDarkMode ? textPrimary : lightTextPrimary;
  static Color get dynamicTextSecondary => isDarkMode ? textSecondary : lightTextSecondary;
  static Color get dynamicTextMuted => isDarkMode ? textMuted : lightTextMuted;
  static Color get dynamicAccent => isDarkMode ? brandBlueDark : brandBlueLight;

  // Quiet Card Decoration (Zero glow, zero colored shadow, hairline border)
  static BoxDecoration glassBox({
    Color? color,
    Color? borderColor,
    double radius = AppRadius.card,
    bool glow = false,
  }) {
    return BoxDecoration(
      color: color ?? dynamicSurface,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
        color: borderColor ?? dynamicHairline,
        width: 1.0,
      ),
      boxShadow: isDarkMode
          ? null
          : [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
    );
  }

  // Tabular figures helper for numbers, telemetry, prices, timestamps
  static TextStyle tabular(TextStyle base) {
    return base.copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
  }

  // Quiet neutral-tone gradients kept only for legacy callers (no multi-hue rainbow slop)
  static const LinearGradient cyanGradient = LinearGradient(
    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const LinearGradient amberGradient = LinearGradient(
    colors: [Color(0xFFD97706), Color(0xFFB45309)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const LinearGradient emeraldGradient = LinearGradient(
    colors: [Color(0xFF16A34A), Color(0xFF15803D)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const LinearGradient purpleGradient = LinearGradient(
    colors: [Color(0xFF1C232E), Color(0xFF151A22)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static ThemeData buildDarkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBackground,
      primaryColor: brandBlueDark,
      dividerColor: Colors.white.withValues(alpha: 0.08),
      colorScheme: const ColorScheme.dark(
        primary: brandBlueDark,
        onPrimary: Colors.white,
        secondary: textSecondary,
        surface: darkSurface,
        onSurface: textPrimary,
        error: roseDanger,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: darkBackground,
        foregroundColor: textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: CardThemeData(
        color: darkSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
          side: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkSurfaceRaised,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.control),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.10)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.control),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.10)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.control),
          borderSide: const BorderSide(color: brandBlueDark, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: brandBlueDark,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(0, 44),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.control),
          ),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          minimumSize: const Size(0, 44),
          side: BorderSide(color: Colors.white.withValues(alpha: 0.14)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.control),
          ),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: darkSurfaceRaised,
        contentTextStyle: const TextStyle(color: textPrimary, fontSize: 13, fontWeight: FontWeight.w500),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.control)),
      ),
    );
  }

  static ThemeData buildLightTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: lightBackground,
      primaryColor: brandBlueLight,
      dividerColor: Colors.black.withValues(alpha: 0.08),
      colorScheme: const ColorScheme.light(
        primary: brandBlueLight,
        onPrimary: Colors.white,
        secondary: lightTextSecondary,
        surface: lightSurface,
        onSurface: lightTextPrimary,
        error: roseDanger,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: lightBackground,
        foregroundColor: lightTextPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: TextStyle(
          color: lightTextPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: CardThemeData(
        color: lightSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
          side: BorderSide(color: Colors.black.withValues(alpha: 0.08)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: lightSurfaceRaised,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.control),
          borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.10)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.control),
          borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.10)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.control),
          borderSide: const BorderSide(color: brandBlueLight, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: brandBlueLight,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(0, 44),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.control),
          ),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: lightTextPrimary,
          minimumSize: const Size(0, 44),
          side: BorderSide(color: Colors.black.withValues(alpha: 0.14)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.control),
          ),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: lightTextPrimary,
        contentTextStyle: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.control)),
      ),
    );
  }

  // Bilingual Dictionary (Sentence case, clean copy)
  static final Map<String, Map<String, String>> _dict = {
    'welcome': {'vi': 'Xin chào', 'en': 'Hello'},
    'my_home': {'vi': 'Nhà của tôi', 'en': 'My home'},
    'location': {'vi': 'Vị trí', 'en': 'Location'},
    'temp': {'vi': 'Nhiệt độ', 'en': 'Temp'},
    'humidity': {'vi': 'Độ ẩm', 'en': 'Humidity'},
    'deg': {'vi': '°C', 'en': '°C'},
    'control': {'vi': 'Điều khiển', 'en': 'Control'},
    'shop': {'vi': 'Gian hàng', 'en': 'Store'},
    'chat': {'vi': 'Tin nhắn', 'en': 'Chat'},
    'care': {'vi': 'Cài đặt', 'en': 'Settings'},
    'support': {'vi': 'Hỗ trợ', 'en': 'Support'},
    'pairing': {'vi': 'Ghép nối', 'en': 'Pairing'},
    'add_device': {'vi': 'Thêm thiết bị', 'en': 'Add device'},
    'devices': {'vi': 'thiết bị', 'en': 'devices'},
    'dark_mode': {'vi': 'Giao diện tối', 'en': 'Dark mode'},
    'light_mode': {'vi': 'Giao diện sáng', 'en': 'Light mode'},
    'search_device': {'vi': 'Tìm thiết bị', 'en': 'Search'},
    'notifications': {'vi': 'Thông báo', 'en': 'Notifications'},
    'rename_device': {'vi': 'Đổi tên thiết bị', 'en': 'Rename device'},
    'delete_device': {'vi': 'Xóa thiết bị', 'en': 'Delete device'},
    'details': {'vi': 'Chi tiết', 'en': 'Details'},
    'cancel': {'vi': 'Hủy', 'en': 'Cancel'},
    'save': {'vi': 'Lưu', 'en': 'Save'},
    'doors': {'vi': 'Cửa cuốn', 'en': 'Doors'},
    'doors_sub': {'vi': 'Cửa cuốn Austec', 'en': 'Roller doors'},
    'energy': {'vi': 'Năng lượng', 'en': 'Energy'},
    'energy_sub': {'vi': 'Công tơ & Pin BMS', 'en': 'Meter & BMS'},
    'environment': {'vi': 'Môi trường', 'en': 'Environment'},
    'environment_sub': {'vi': 'Cảm biến không khí', 'en': 'Sensors'},
    'others': {'vi': 'Thiết bị khác', 'en': 'Other'},
    'others_sub': {'vi': 'Khóa & điều khiển', 'en': 'Locks & relays'},
    'data': {'vi': 'Phân tích', 'en': 'Analytics'},
    'data_sub': {'vi': 'Thống kê vận hành', 'en': 'Data analytics'},
    'light': {'vi': 'Ổ cắm & đèn', 'en': 'Switches'},
    'light_sub': {'vi': 'Chiếu sáng & đóng cắt', 'en': 'Lights & relays'},
    'camera': {'vi': 'Camera', 'en': 'Camera'},
    'camera_sub': {'vi': 'Giám sát an ninh', 'en': 'Security'},
    'settings': {'vi': 'Cài đặt thiết bị', 'en': 'Device settings'},
    'history': {'vi': 'Lịch sử điều khiển', 'en': 'Control history'},
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
