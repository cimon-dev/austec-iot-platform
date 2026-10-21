import 'package:flutter/material.dart';
import 'core/constants/app_theme.dart';
import 'core/services/auth_service.dart';
import 'presentation/screens/orbital_hub_screen.dart';
import 'presentation/screens/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService().init();
  runApp(const AustecIoTApp());
}

class AustecIoTApp extends StatelessWidget {
  const AustecIoTApp({super.key});

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
      home: AuthService().isLoggedIn
          ? const OrbitalHubScreen()
          : const LoginScreen(),
    );
  }
}
