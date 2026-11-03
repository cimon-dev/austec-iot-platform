import 'dart:math' as math;
import 'package:flutter/material.dart';

class AustecRadarSweepPainter extends CustomPainter {
  final double sweepAngle;

  AustecRadarSweepPainter({required this.sweepAngle});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    // 1. Concentric orbital circles
    final circlePaint = Paint()
      ..color = const Color(0xFF38BDF8).withValues(alpha: 0.18)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    canvas.drawCircle(center, radius * 0.35, circlePaint);
    canvas.drawCircle(center, radius * 0.65, circlePaint);
    canvas.drawCircle(center, radius * 0.95, circlePaint);

    // Outer border ring
    final outerRingPaint = Paint()
      ..color = const Color(0xFF38BDF8).withValues(alpha: 0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    canvas.drawCircle(center, radius, outerRingPaint);

    // 2. Crosshair guide ticks
    final tickPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.2)
      ..strokeWidth = 1.0;
    canvas.drawLine(Offset(center.dx - radius, center.dy), Offset(center.dx - radius + 8, center.dy), tickPaint);
    canvas.drawLine(Offset(center.dx + radius - 8, center.dy), Offset(center.dx + radius, center.dy), tickPaint);
    canvas.drawLine(Offset(center.dx, center.dy - radius), Offset(center.dx, center.dy - radius + 8), tickPaint);
    canvas.drawLine(Offset(center.dx, center.dy + radius - 8), Offset(center.dx, center.dy + radius), tickPaint);

    // 3. Rotating Radar Sweep (360 continuous gradient arc)
    final sweepPaint = Paint()
      ..shader = SweepGradient(
        center: Alignment.center,
        startAngle: 0.0,
        endAngle: math.pi / 2,
        colors: [
          Colors.transparent,
          const Color(0xFF00E5FF).withValues(alpha: 0.04),
          const Color(0xFF00E5FF).withValues(alpha: 0.22),
          const Color(0xFF38BDF8).withValues(alpha: 0.45),
        ],
        transform: GradientRotation(sweepAngle),
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, radius, sweepPaint);

    // 4. Sweeping leading line
    final linePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.85)
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round;
    final leadingAngle = sweepAngle + math.pi / 2;
    final endX = center.dx + radius * math.cos(leadingAngle);
    final endY = center.dy + radius * math.sin(leadingAngle);
    canvas.drawLine(center, Offset(endX, endY), linePaint);

    // 5. Constellation node dots along orbital paths
    final nodePaint = Paint()
      ..color = const Color(0xFF38BDF8).withValues(alpha: 0.75)
      ..style = PaintingStyle.fill;
    final whiteDotPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    final List<Offset> nodes = [
      Offset(center.dx + radius * 0.35 * math.cos(1.2), center.dy + radius * 0.35 * math.sin(1.2)),
      Offset(center.dx + radius * 0.65 * math.cos(2.8), center.dy + radius * 0.65 * math.sin(2.8)),
      Offset(center.dx + radius * 0.95 * math.cos(4.4), center.dy + radius * 0.95 * math.sin(4.4)),
      Offset(center.dx + radius * 0.65 * math.cos(5.6), center.dy + radius * 0.65 * math.sin(5.6)),
    ];

    for (final node in nodes) {
      canvas.drawCircle(node, 3.0, nodePaint);
      canvas.drawCircle(node, 1.2, whiteDotPaint);
    }

    // 6. Glowing core center
    canvas.drawCircle(center, 4.5, Paint()..color = const Color(0xFF00E5FF).withValues(alpha: 0.6));
    canvas.drawCircle(center, 2.0, whiteDotPaint);
  }

  @override
  bool shouldRepaint(covariant AustecRadarSweepPainter oldDelegate) =>
      oldDelegate.sweepAngle != sweepAngle;
}

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
    with TickerProviderStateMixin {
  late final AnimationController _radarController;
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _radarController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.96, end: 1.04).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _radarController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background graphic overlay
          Positioned.fill(
            child: Opacity(
              opacity: 0.18,
              child: Image.asset(
                'assets/austec_banner_bg.png',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          ),

          // Deep radial vignette
          Container(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.center,
                radius: 1.2,
                colors: [
                  Colors.transparent,
                  const Color(0xFF070B14).withValues(alpha: 0.8),
                  const Color(0xFF070B14),
                ],
              ),
            ),
          ),

          // Foreground Content
          SafeArea(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Spacer(flex: 3),

                  // Brand Logo with Breathing Animation
                  ScaleTransition(
                    scale: _pulseAnimation,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Austec Logo Header
                        Image.asset(
                          'assets/austec_logo_text_transparent.png',
                          height: 48,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Image.asset(
                            'assets/logo.png',
                            height: 48,
                            fit: BoxFit.contain,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Your space · Our technology',
                          style: TextStyle(
                            fontFamily: 'serif',
                            fontStyle: FontStyle.italic,
                            fontSize: 13,
                            color: Colors.white.withValues(alpha: 0.72),
                            letterSpacing: 0.6,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 44),

                  // 360° Radar Sweep Animation
                  AnimatedBuilder(
                    animation: _radarController,
                    builder: (context, _) {
                      return CustomPaint(
                        size: const Size(200, 200),
                        painter: AustecRadarSweepPainter(
                          sweepAngle: _radarController.value * 2 * math.pi,
                        ),
                      );
                    },
                  ),

                  const Spacer(flex: 3),

                  // Connection status indicator
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFF00E5FF),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'ĐANG KHỞI ĐỘNG HỆ SINH THÁI IOT',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.5,
                          color: Colors.white.withValues(alpha: 0.45),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
