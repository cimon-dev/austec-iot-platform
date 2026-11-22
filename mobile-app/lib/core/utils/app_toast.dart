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
      duration: const Duration(milliseconds: 260),
    );
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -0.6),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutBack));

    _animCtrl.forward();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  Color get _backgroundColor {
    switch (widget.type) {
      case ToastType.success:
        return const Color(0xFF064E3B);
      case ToastType.error:
        return const Color(0xFF881337);
      case ToastType.warning:
        return const Color(0xFF78350F);
      case ToastType.info:
        return const Color(0xFF0F172A);
    }
  }

  Color get _borderColor {
    switch (widget.type) {
      case ToastType.success:
        return AppTheme.emeraldSuccess;
      case ToastType.error:
        return AppTheme.roseDanger;
      case ToastType.warning:
        return AppTheme.amberWarning;
      case ToastType.info:
        return AppTheme.cyanAccent;
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
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
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
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: _backgroundColor.withValues(alpha: 0.96),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: _borderColor.withValues(alpha: 0.85), width: 1.3),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.55),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Icon(_icon, color: _borderColor, size: 22),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            widget.message,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              height: 1.35,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: widget.onDismiss,
                          child: const Icon(Icons.close_rounded, color: Colors.white60, size: 18),
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

