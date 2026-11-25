import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

class BiometricAuthResult {
  final bool success;
  final String? token;
  final String? identifier;
  final String? error;

  const BiometricAuthResult({
    required this.success,
    this.token,
    this.identifier,
    this.error,
  });
}

/// Quản lý xác thực Sinh trắc học thực tế (Vân tay / FaceID) kết hợp Android Keystore / iOS Keychain
class BiometricAuthService {
  static final BiometricAuthService _instance = BiometricAuthService._internal();
  factory BiometricAuthService() => _instance;
  BiometricAuthService._internal();

  static const _keyEnabled = 'austec_bio_enabled';
  static const _keyToken = 'austec_bio_token';
  static const _keyIdentifier = 'austec_bio_identifier';
  static const _keyDisplayName = 'austec_bio_display_name';

  final LocalAuthentication _localAuth = LocalAuthentication();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
  );

  /// Kiểm tra phần cứng điện thoại có hỗ trợ & đã cài đặt sinh trắc học chưa
  Future<bool> isHardwareAvailable() async {
    if (kIsWeb) return false;
    try {
      final isSupported = await _localAuth.isDeviceSupported();
      final canCheck = await _localAuth.canCheckBiometrics;
      if (!isSupported && !canCheck) return false;
      final available = await _localAuth.getAvailableBiometrics();
      return available.isNotEmpty || isSupported;
    } catch (e) {
      debugPrint('[BiometricAuthService] isHardwareAvailable error: $e');
      return false;
    }
  }

  /// Kiểm tra người dùng đã bật đăng nhập nhanh bằng sinh trắc học và có token đã lưu chưa
  Future<bool> isEnabled() async {
    if (kIsWeb) return false;
    try {
      final flag = await _secureStorage.read(key: _keyEnabled);
      final tok = await _secureStorage.read(key: _keyToken);
      return flag == 'true' && tok != null && tok.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  Future<String?> getSavedDisplayName() async {
    try {
      return await _secureStorage.read(key: _keyDisplayName);
    } catch (_) {
      return null;
    }
  }

  /// Kích hoạt sinh trắc học: yêu cầu quét Vân tay / FaceID thật rồi mới lưu JWT vào Secure Storage
  Future<BiometricAuthResult> enable({
    required String token,
    required String identifier,
    required String displayName,
  }) async {
    if (kIsWeb) {
      return const BiometricAuthResult(
        success: false,
        error: 'Trình duyệt Web không hỗ trợ sinh trắc học thiết bị.',
      );
    }
    final available = await isHardwareAvailable();
    if (!available) {
      return const BiometricAuthResult(
        success: false,
        error: 'Thiết bị chưa hỗ trợ hoặc chưa thiết lập Vân tay / FaceID trong Cài đặt máy.',
      );
    }

    try {
      final didAuth = await _localAuth.authenticate(
        localizedReason: 'Xác nhận Vân tay / FaceID để bật đăng nhập nhanh Austec Smart Home',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );
      if (!didAuth) {
        return const BiometricAuthResult(
          success: false,
          error: 'Bạn đã hủy hoặc xác thực sinh trắc học không thành công.',
        );
      }

      await _secureStorage.write(key: _keyEnabled, value: 'true');
      await _secureStorage.write(key: _keyToken, value: token);
      await _secureStorage.write(key: _keyIdentifier, value: identifier);
      await _secureStorage.write(key: _keyDisplayName, value: displayName);

      return BiometricAuthResult(success: true, token: token, identifier: identifier);
    } on PlatformException catch (e) {
      return BiometricAuthResult(
        success: false,
        error: 'Lỗi cảm biến sinh trắc học: ${e.message ?? e.code}',
      );
    } catch (e) {
      return BiometricAuthResult(success: false, error: 'Không thể kích hoạt sinh trắc học: $e');
    }
  }

  /// Tự động cập nhật token mới nhất vào Secure Storage nếu người dùng đã bật sinh trắc học
  Future<void> syncTokenIfEnabled({
    required String token,
    required String identifier,
    required String displayName,
  }) async {
    if (kIsWeb) return;
    try {
      final flag = await _secureStorage.read(key: _keyEnabled);
      if (flag == 'true') {
        await _secureStorage.write(key: _keyToken, value: token);
        await _secureStorage.write(key: _keyIdentifier, value: identifier);
        await _secureStorage.write(key: _keyDisplayName, value: displayName);
      }
    } catch (_) {}
  }

  /// Tắt sinh trắc học và xóa toàn bộ token đã mã hóa khỏi Secure Storage
  Future<void> disable() async {
    if (kIsWeb) return;
    try {
      await _secureStorage.delete(key: _keyEnabled);
      await _secureStorage.delete(key: _keyToken);
      await _secureStorage.delete(key: _keyIdentifier);
      await _secureStorage.delete(key: _keyDisplayName);
    } catch (_) {}
  }

  /// Quét Vân tay / FaceID thật để mở khóa token đăng nhập từ Secure Storage
  Future<BiometricAuthResult> authenticateAndReadToken() async {
    if (kIsWeb) {
      return const BiometricAuthResult(
        success: false,
        error: 'Sinh trắc học chỉ khả dụng trên ứng dụng di động.',
      );
    }

    final enabled = await isEnabled();
    if (!enabled) {
      return const BiometricAuthResult(
        success: false,
        error: 'Bạn chưa bật đăng nhập sinh trắc học. Vui lòng đăng nhập và bật trong Cài đặt ứng dụng.',
      );
    }

    try {
      final didAuth = await _localAuth.authenticate(
        localizedReason: 'Quét Vân tay hoặc FaceID để đăng nhập Austec Smart Home',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );
      if (!didAuth) {
        return const BiometricAuthResult(
          success: false,
          error: 'Xác thực sinh trắc học đã bị hủy hoặc không khớp.',
        );
      }

      final token = await _secureStorage.read(key: _keyToken);
      final identifier = await _secureStorage.read(key: _keyIdentifier);
      if (token == null || token.isEmpty) {
        return const BiometricAuthResult(
          success: false,
          error: 'Phiên sinh trắc học đã hết hạn. Vui lòng đăng nhập lại bằng mật khẩu hoặc Google.',
        );
      }

      return BiometricAuthResult(success: true, token: token, identifier: identifier);
    } on PlatformException catch (e) {
      return BiometricAuthResult(
        success: false,
        error: 'Lỗi xác thực sinh trắc học: ${e.message ?? e.code}',
      );
    } catch (e) {
      return BiometricAuthResult(success: false, error: 'Lỗi sinh trắc học: $e');
    }
  }
}
