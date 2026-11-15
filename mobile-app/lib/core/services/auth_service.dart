import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../constants/api_config.dart';
import 'iot_gateway_client.dart';

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
        IoTGatewayClient().clearAllDevices();
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

  /// Đổi mật khẩu tài khoản
  Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
    required String confirmPassword,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/change-password'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${_token ?? ""}',
        },
        body: jsonEncode({
          'currentPassword': currentPassword,
          'newPassword': newPassword,
          'confirmPassword': confirmPassword,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true) {
        return {'success': true, 'message': data['message'] ?? 'Đổi mật khẩu thành công!'};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Đổi mật khẩu thất bại!'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Lỗi kết nối máy chủ: $e'};
    }
  }

  /// Cập nhật thông tin cá nhân
  Future<Map<String, dynamic>> updateProfile({
    String? fullName,
    String? phoneNumber,
    String? address,
    String? province,
    String? avatarUrl,
  }) async {
    try {
      final res = await http.put(
        Uri.parse('$_baseUrl/api/auth/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${_token ?? ""}',
        },
        body: jsonEncode({
          if (fullName != null) 'fullName': fullName,
          if (phoneNumber != null) 'phoneNumber': phoneNumber,
          if (address != null) 'address': address,
          if (province != null) 'province': province,
          if (avatarUrl != null) 'avatarUrl': avatarUrl,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true) {
        if (_currentUser != null) {
          _currentUser = _currentUser!.copyWith(
            fullName: fullName,
            phoneNumber: phoneNumber,
            address: address,
            province: province,
            avatarUrl: avatarUrl,
          );
          await _saveSession(_token!, _currentUser!);
        }
        return {'success': true, 'message': data['message'] ?? 'Cập nhật thành công!', 'user': _currentUser};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Cập nhật thất bại!'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Lỗi kết nối máy chủ: $e'};
    }
  }

  /// Tải ảnh đại diện lên Cloudflare R2
  Future<String?> uploadAvatar(List<int> fileBytes, String filename) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$_baseUrl/api/upload/image'),
      );
      request.headers['Authorization'] = 'Bearer ${_token ?? ""}';
      request.files.add(http.MultipartFile.fromBytes(
        'file',
        fileBytes,
        filename: filename,
      ));

      final streamedRes = await request.send().timeout(const Duration(seconds: 25));
      final res = await http.Response.fromStream(streamedRes);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['url'] != null) {
          final newAvatarUrl = data['url'].toString();
          await updateProfile(avatarUrl: newAvatarUrl);
          return newAvatarUrl;
        }
      }
    } catch (e) {
      debugPrint('[AuthService] Lỗi upload avatar: $e');
    }
    return null;
  }

  /// Đăng xuất tài khoản
  Future<void> logout() async {
    _currentUser = null;
    _token = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_tokenKey);
      await prefs.remove(_userKey);
      final keys = prefs.getKeys().where((k) => k.startsWith('austec_cached_user_devices')).toList();
      for (final k in keys) {
        await prefs.remove(k);
      }
      await prefs.remove('austec_cached_user_devices');
    } catch (e) {
      debugPrint('[AuthService] Lưu ý khi xóa session: $e');
    }
    IoTGatewayClient().clearAllDevices();
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
