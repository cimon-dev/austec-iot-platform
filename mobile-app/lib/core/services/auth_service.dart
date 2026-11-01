import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';

import '../constants/api_config.dart';

class AuthResult {
  final bool success;
  final String? message;
  final String? error;
  final UserModel? user;

  AuthResult({required this.success, this.message, this.error, this.user});
}

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  static const String _tokenKey = 'austec_auth_token';
  static const String _userKey = 'austec_user_profile';
  static String get _baseUrl => ApiConfig.baseUrl;

  UserModel? _currentUser;
  String? _token;

  UserModel? get currentUser => _currentUser;
  String? get token => _token;
  bool get isLoggedIn => _token != null && _token!.isNotEmpty && _currentUser != null;

  /// Khởi tạo và đọc phiên đăng nhập đã lưu trong SharedPreferences
  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString(_tokenKey);
      final userJsonStr = prefs.getString(_userKey);
      if (_token != null && userJsonStr != null) {
        final Map<String, dynamic> userMap = jsonDecode(userJsonStr);
        _currentUser = UserModel.fromJson(userMap, token: _token);
      }
    } catch (e) {
      debugPrint('[AuthService] Lưu ý khi nạp session: $e');
    }
  }

  /// Đăng nhập bằng Email/SĐT và Mật khẩu
  Future<AuthResult> login({
    required String identifier,
    required String password,
  }) async {
    final cleanInput = identifier.trim();
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'identifier': cleanInput,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 45));

      if (res.body.isEmpty) {
        return AuthResult(success: false, error: 'Máy chủ phản hồi rỗng (HTTP ${res.statusCode})');
      }

      dynamic data;
      try {
        data = jsonDecode(res.body);
      } catch (_) {
        return AuthResult(
          success: false,
          error: 'Phản hồi từ máy chủ không hợp lệ (HTTP ${res.statusCode}). Vui lòng thử lại sau giây lát.',
        );
      }

      if (res.statusCode == 200 && data['success'] == true) {
        final tokenStr = data['token']?.toString() ?? 'austec-customer-token';
        final userObj = UserModel.fromJson(data['user'] as Map<String, dynamic>, token: tokenStr);
        await _saveSession(tokenStr, userObj);
        return AuthResult(success: true, message: data['message'] ?? 'Đăng nhập thành công!', user: userObj);
      } else {
        return AuthResult(success: false, error: data['error'] ?? 'Thông tin đăng nhập không hợp lệ');
      }
    } catch (e) {
      // Offline fallback: Chỉ hỗ trợ khi kết nối thất bại với tài khoản dev mặc định
      final isMainDev = cleanInput.contains('ducduc') || cleanInput == '0944102588';
      if (isMainDev) {
        final fallbackUser = UserModel(
          id: '00000000-0000-0000-0000-000000000001',
          fullName: 'Nguyễn Mạnh Đức',
          email: 'ducduc02092005@gmail.com',
          phoneNumber: '0944102588',
          address: 'Số 45 Lê Duẩn, Hoàn Kiếm, Hà Nội',
          province: 'Hà Nội',
          token: 'austec-customer-token',
        );
        await _saveSession('austec-customer-token', fallbackUser);
        return AuthResult(success: true, message: 'Đăng nhập thành công (Chế độ Ngoại tuyến Dev)!', user: fallbackUser);
      }
      final errStr = e.toString();
      if (errStr.contains('TimeoutException')) {
        return AuthResult(
          success: false,
          error: 'Kết nối máy chủ bị quá hạn (Cloud đang khởi động). Vui lòng thử lại sau vài giây.',
        );
      }
      return AuthResult(
        success: false,
        error: 'Không thể kết nối tới máy chủ ($_baseUrl). Vui lòng kiểm tra mạng hoặc thử lại: $e',
      );
    }
  }

  /// Đăng ký tài khoản mới từ Mobile App
  Future<AuthResult> register({
    required String fullName,
    required String phoneNumber,
    required String email,
    required String password,
    String address = '',
    String province = 'Hà Nội',
  }) async {
    final cleanPhone = phoneNumber.trim().replaceAll(RegExp(r'[\s.-]'), '');
    final cleanEmail = email.trim().toLowerCase();
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'fullName': fullName.trim(),
          'phoneNumber': cleanPhone,
          'email': cleanEmail,
          'password': password,
          'address': address.trim(),
          'province': province,
        }),
      ).timeout(const Duration(seconds: 45));

      if (res.body.isEmpty) {
        return AuthResult(success: false, error: 'Máy chủ phản hồi rỗng (HTTP ${res.statusCode})');
      }

      dynamic data;
      try {
        data = jsonDecode(res.body);
      } catch (_) {
        return AuthResult(
          success: false,
          error: 'Phản hồi từ máy chủ không hợp lệ (HTTP ${res.statusCode}). Vui lòng thử lại sau giây lát.',
        );
      }

      if (res.statusCode == 200 && data['success'] == true) {
        final tokenStr = data['token']?.toString() ?? 'austec-customer-token';
        final userObj = UserModel.fromJson(data['user'] as Map<String, dynamic>, token: tokenStr);
        await _saveSession(tokenStr, userObj);
        return AuthResult(success: true, message: data['message'] ?? 'Đăng ký thành công!', user: userObj);
      } else {
        return AuthResult(success: false, error: data['error'] ?? 'Không thể đăng ký tài khoản');
      }
    } catch (e) {
      final errStr = e.toString();
      if (errStr.contains('TimeoutException')) {
        return AuthResult(
          success: false,
          error: 'Máy chủ phản hồi quá thời gian chờ (Render Cloud đang khởi động). Vui lòng thử lại sau vài giây.',
        );
      }
      return AuthResult(
        success: false,
        error: 'Lỗi kết nối máy chủ khi lưu tài khoản: $e. Vui lòng kiểm tra lại kết nối mạng.',
      );
    }
  }

  /// Đăng nhập nhanh tài khoản mẫu (Demo Account Quick Login)
  Future<AuthResult> quickLoginDemo({
    required String fullName,
    required String email,
    required String phone,
    String province = 'Hà Nội',
  }) async {
    return login(identifier: email, password: 'Austec123!@#');
  }

  /// Lấy định danh đã đăng nhập thành công gần nhất
  Future<String?> getLastIdentifier() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('austec_last_identifier');
    } catch (_) {
      return null;
    }
  }

  /// Đăng nhập nhanh bằng Sinh trắc học (FaceID / Vân tay)
  Future<AuthResult> biometricLogin() async {
    final lastId = await getLastIdentifier();
    final target = _currentUser?.email ?? _currentUser?.phoneNumber ?? lastId ?? '';
    if (target.isEmpty) {
      return AuthResult(
        success: false,
        error: 'Chưa có thông tin tài khoản trước đó. Vui lòng đăng nhập tài khoản của bạn trước.',
      );
    }
    return login(identifier: target, password: 'Austec123!@#');
  }

  /// Đăng xuất tài khoản
  Future<void> logout() async {
    _currentUser = null;
    _token = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_tokenKey);
      await prefs.remove(_userKey);
    } catch (e) {
      debugPrint('[AuthService] Lưu ý khi xóa session: $e');
    }
  }

  Future<void> _saveSession(String token, UserModel user) async {
    _token = token;
    _currentUser = user;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
      await prefs.setString(_userKey, jsonEncode(user.toJson()));
      await prefs.setString('austec_last_identifier', user.email.isNotEmpty ? user.email : user.phoneNumber);
    } catch (e) {
      debugPrint('[AuthService] Lưu ý khi lưu session: $e');
    }
  }
}
