import 'dart:async';
import 'package:flutter/material.dart';
import '../constants/app_theme.dart';

enum ToastType { success, error, warning, info }

class AppToast {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  static final GlobalKey<ScaffoldMessengerState> messengerKey = GlobalKey<ScaffoldMessengerState>();

  static OverlayEntry? _currentEntry;
  static Timer? _dismissTimer;

  static void showSuccess(String message, {Duration duration = const Duration(milliseconds: 2600)}) {
    show(message, type: ToastType.success, duration: duration);
  }

  static void showError(String message, {Duration duration = const Duration(milliseconds: 3200)}) {
    show(message, type: ToastType.error, duration: duration);
  }

  static void showWarning(String message, {Duration duration = const Duration(milliseconds: 2800)}) {
    show(message, type: ToastType.warning, duration: duration);
  }

  static void showInfo(String message, {Duration duration = const Duration(milliseconds: 2500)}) {
    show(message, type: ToastType.info, duration: duration);
  }

  static void show(
    String message, {
    ToastType type = ToastType.info,
    Duration duration = const Duration(milliseconds: 2600),
  }) {
    final overlayState = navigatorKey.currentState?.overlay;
    if (overlayState == null) {
      // Fallback to scaffold messenger if overlay not ready
      _showFallbackSnackBar(message, type, duration);
      return;
    }

    _dismissTimer?.cancel();
    _currentEntry?.remove();
    _currentEntry = null;

    final entry = OverlayEntry(
      builder: (context) => _ToastOverlayWidget(
        message: message,
        type: type,
        onDismiss: () {
          _dismissTimer?.cancel();
          _currentEntry?.remove();
          _currentEntry = null;
        },
      ),
    );

    _currentEntry = entry;
    overlayState.insert(entry);

    _dismissTimer = Timer(duration, () {
      _currentEntry?.remove();
      _currentEntry = null;
    });
  }

  static void _showFallbackSnackBar(String message, ToastType type, Duration duration) {
    final messenger = messengerKey.currentState;
    if (messenger == null) return;

    Color bg;
    Color fg;
    IconData icon;

    switch (type) {
      case ToastType.success:
        bg = AppTheme.emeraldSuccess;
        fg = Colors.black;
        icon = Icons.check_circle_rounded;
        break;
      case ToastType.error:
        bg = AppTheme.roseDanger;
        fg = Colors.white;
        icon = Icons.error_outline_rounded;
        break;
      case ToastType.warning:
        bg = AppTheme.amberWarning;
        fg = Colors.black;
        icon = Icons.warning_amber_rounded;
        break;
      case ToastType.info:
        bg = const Color(0xFF1E293B);
        fg = Colors.white;
        icon = Icons.info_outline_rounded;
        break;
    }

    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.only(bottom: 24, left: 16, right: 16),
        backgroundColor: bg,
        duration: duration,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        content: Row(
          children: [
            Icon(icon, color: fg, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: TextStyle(color: fg, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ToastOverlayWidget extends StatefulWidget {
  final String message;
  final ToastType type;
  final VoidCallback onDismiss;

  const _ToastOverlayWidget({
    required this.message,
    required this.type,
    required this.onDismiss,
  });

  @override
  State<_ToastOverlayWidget> createState() => _ToastOverlayWidgetState();
}

class _ToastOverlayWidgetState extends State<_ToastOverlayWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: AppMotion.normal,
    );
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: AppMotion.curve);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -0.35),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animCtrl, curve: AppMotion.curve));

    _animCtrl.forward();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  Color get _backgroundColor => AppTheme.dynamicSurfaceRaised;

  Color get _accentColor {
    switch (widget.type) {
      case ToastType.success:
        return AppTheme.emeraldSuccess;
      case ToastType.error:
        return AppTheme.roseDanger;
      case ToastType.warning:
        return AppTheme.amberWarning;
      case ToastType.info:
        return AppTheme.dynamicAccent;
    }
  }

  IconData get _icon {
    switch (widget.type) {
      case ToastType.success:
        return Icons.check_circle_rounded;
      case ToastType.error:
        return Icons.error_outline_rounded;
      case ToastType.warning:
        return Icons.warning_amber_rounded;
      case ToastType.info:
        return Icons.info_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final textPrimary = AppTheme.dynamicTextPrimary;
    final textMuted = AppTheme.dynamicTextMuted;

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
          child: SlideTransition(
            position: _slideAnim,
            child: FadeTransition(
              opacity: _fadeAnim,
              child: Material(
                color: Colors.transparent,
                child: GestureDetector(
                  onTap: widget.onDismiss,
                  onVerticalDragUpdate: (details) {
                    if (details.primaryDelta != null && details.primaryDelta! < -4) {
                      widget.onDismiss();
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
                    decoration: BoxDecoration(
                      color: _backgroundColor,
                      borderRadius: BorderRadius.circular(AppRadius.card),
                      border: Border.all(color: _accentColor.withValues(alpha: 0.45), width: 1.0),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: AppTheme.isDarkMode ? 0.35 : 0.10),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Icon(_icon, color: _accentColor, size: 20),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Text(
                            widget.message,
                            style: TextStyle(
                              color: textPrimary,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              height: 1.35,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        GestureDetector(
                          onTap: widget.onDismiss,
                          child: Icon(Icons.close_rounded, color: textMuted, size: 18),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

