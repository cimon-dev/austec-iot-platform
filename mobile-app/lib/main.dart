import 'package:flutter/material.dart';
import 'package:austec_iot_mobile/core/constants/api_config.dart';
import 'package:austec_iot_mobile/core/constants/app_theme.dart';
import 'package:austec_iot_mobile/core/services/auth_service.dart';
import 'package:austec_iot_mobile/features/devices/devices.dart';
import 'package:austec_iot_mobile/features/auth/auth.dart';

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
    try {
      await ApiConfig.loadCustomHost();
      await AuthService().init();
    } catch (_) {}
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
        primaryColor: AppTheme.cyanAccent,
        colorScheme: const ColorScheme.dark(
          primary: AppTheme.cyanAccent,
          secondary: AppTheme.blueAccent,
          surface: AppTheme.surface,
        ),
        useMaterial3: true,
      ),
      home: !_initialized
          ? const Scaffold(
              backgroundColor: AppTheme.background,
              body: Center(
                child: SizedBox(
                  width: 36,
                  height: 36,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: AppTheme.cyanAccent,
                  ),
                ),
              ),
            )
          : (AuthService().isLoggedIn
              ? const OrbitalHubScreen()
              : const LoginScreen()),
    );
  }
}
