import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/widgets/austec_ui.dart';

class AustecSplashScreen extends StatefulWidget {
  final VoidCallback? onInitialized;
  final Widget? destination;

  const AustecSplashScreen({
    super.key,
    this.onInitialized,
    this.destination,
  });

  @override
  State<AustecSplashScreen> createState() => _AustecSplashScreenState();
}

class _AustecSplashScreenState extends State<AustecSplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _enterController;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _enterController = AnimationController(
      vsync: this,
      duration: AppMotion.normal,
    );
    _fadeAnimation = CurvedAnimation(
      parent: _enterController,
      curve: AppMotion.curve,
    );
    _enterController.forward();
  }

  @override
  void dispose() {
    _enterController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bg = AppTheme.dynamicBackground;
    final surface = AppTheme.dynamicSurface;
    final hairline = AppTheme.dynamicHairline;
    final textPrimary = AppTheme.dynamicTextPrimary;
    final textMuted = AppTheme.dynamicTextMuted;

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Spacer(flex: 2),
                  Container(
                    width: 84,
                    height: 84,
                    decoration: BoxDecoration(
                      color: surface,
                      shape: BoxShape.circle,
                      border: Border.all(color: hairline, width: 1.0),
                    ),
                    child: ClipOval(
                      child: Image.asset(
                        'assets/logo-app.png',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Image.asset(
                          'assets/logo-app.webp',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Icon(
                            Icons.door_sliding_rounded,
                            color: textPrimary,
                            size: 36,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Image.asset(
                    'assets/austec_logo_text_transparent.png',
                    height: 40,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => Text(
                      'Austec Smart Home',
                      style: TextStyle(
                        color: textPrimary,
                        fontSize: 22,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Điều khiển cửa cuốn và thiết bị điện tử',
                    style: TextStyle(
                      color: textMuted,
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  const Spacer(flex: 3),
                  SizedBox(
                    width: 120,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      child: LinearProgressIndicator(
                        minHeight: 3,
                        backgroundColor: hairline,
                        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.dynamicAccent),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const AustecStatusDot(isOnline: true, size: 6),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        'Đang khởi tạo kết nối',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: textMuted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
