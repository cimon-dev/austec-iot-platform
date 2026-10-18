import 'package:flutter/material.dart';

class AppTheme {
  // Brand & Palette Tokens
  static const Color background = Color(0xFF070B14);
  static const Color surface = Color(0xFF0F172A);
  static const Color surfaceGlass = Color(0xCC131E36);
  static const Color cardBorder = Color(0xFF1E293B);
  static const Color cyanAccent = Color(0xFF00E5FF);
  static const Color blueAccent = Color(0xFF2563EB);
  static const Color emeraldSuccess = Color(0xFF10B981);
  static const Color amberWarning = Color(0xFFF59E0B);
  static const Color roseDanger = Color(0xFFF43F5E);
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  // Glassmorphic Decoration Helper
  static BoxDecoration glassBox({
    Color? color,
    Color? borderColor,
    double radius = 20,
    bool glow = false,
  }) {
    return BoxDecoration(
      color: color ?? surfaceGlass,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
        color: borderColor ?? cardBorder.withOpacity(0.8),
        width: 1.2,
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.35),
          blurRadius: 16,
          offset: const Offset(0, 8),
        ),
        if (glow)
          BoxShadow(
            color: cyanAccent.withOpacity(0.15),
            blurRadius: 24,
            spreadRadius: 2,
          ),
      ],
    );
  }

  // Neon Gradient for primary action buttons
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
}
