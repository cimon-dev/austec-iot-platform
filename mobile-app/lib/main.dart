import 'package:flutter/material.dart';
import 'package:austec_iot_mobile/core/constants/api_config.dart';
import 'package:austec_iot_mobile/core/constants/app_theme.dart';
import 'package:austec_iot_mobile/core/services/auth_service.dart';
import 'package:austec_iot_mobile/core/services/iot_gateway_client.dart';
import 'package:austec_iot_mobile/features/devices/devices.dart';
import 'package:austec_iot_mobile/features/auth/auth.dart';
import 'package:austec_iot_mobile/features/splash/splash.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AustecIoTApp());
}

class AustecIoTApp extends StatefulWidget {
  const AustecIoTApp({super.key});

  @override
  State<AustecIoTApp> createState() => _AustecIoTAppState();
}

class _AustecIoTAppState extends State<AustecIoTApp> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final startTime = DateTime.now();
    try {
      await Future.wait([
        ApiConfig.loadCustomHost(),
        AuthService().init(),
        IoTGatewayClient().loadDevicesFromLocalCache(),
      ]);
    } catch (_) {}

    // Ensure a minimum splash screen duration of 1.2s for smooth radar sweep perception
    final elapsed = DateTime.now().difference(startTime);
    final remainingDelay = const Duration(milliseconds: 1200) - elapsed;
    if (remainingDelay > Duration.zero) {
      await Future.delayed(remainingDelay);
    }

    if (mounted) {
      setState(() => _initialized = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Austec Smart Home',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppTheme.background,
        primaryColor: AppTheme.textPrimary,
        colorScheme: const ColorScheme.dark(
          primary: AppTheme.textPrimary,
          secondary: AppTheme.textSecondary,
          surface: AppTheme.surface,
        ),
        useMaterial3: true,
      ),
      home: AnimatedSwitcher(
        duration: const Duration(milliseconds: 400),
        switchInCurve: Curves.easeIn,
        switchOutCurve: Curves.easeOut,
        child: !_initialized
            ? const AustecSplashScreen(key: ValueKey('splash'))
            : (AuthService().isLoggedIn
                ? const OrbitalHubScreen(key: ValueKey('hub'))
                : const LoginScreen(key: ValueKey('login'))),
      ),
    );
  }
}
