import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/constants/app_theme.dart';
import 'presentation/screens/orbital_hub_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppTheme.background,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
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
          background: AppTheme.background,
        ),
        fontFamily: 'Inter',
        useMaterial3: true,
      ),
      home: const OrbitalHubScreen(),
    );
  }
}
