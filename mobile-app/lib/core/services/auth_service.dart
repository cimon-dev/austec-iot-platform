import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../constants/api_config.dart';
import 'biometric_auth_service.dart';
import 'iot_gateway_client.dart';

class AuthResult {
  final bool success;
  final String? message;
  final String? error;
  final UserModel? user;

  AuthResult({required this.success, this.message, this.error, this.user});
}

class PublicAuthConfig {
  final String googleWebClientId;
  final bool googleAuthEnabled;
  final bool emailOtpEnabled;
  final bool zaloOtpEnabled;
  final bool devConsoleOtpMode;

  const PublicAuthConfig({
    this.googleWebClientId = '',
    this.googleAuthEnabled = false,
    this.emailOtpEnabled = true,
    this.zaloOtpEnabled = false,
    this.devConsoleOtpMode = false,
  });

  factory PublicAuthConfig.fromJson(Map<String, dynamic> json) {
    return PublicAuthConfig(
      googleWebClientId: json['googleWebClientId']?.toString() ?? '',
      googleAuthEnabled: json['googleAuthEnabled'] == true,
      emailOtpEnabled: json['emailOtpEnabled'] != false,
      zaloOtpEnabled: json['zaloOtpEnabled'] == true,
      devConsoleOtpMode: json['devConsoleOtpMode'] == true,
    );
  }
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
  PublicAuthConfig _publicConfig = const PublicAuthConfig();

  UserModel? get currentUser => _currentUser;
  String? get token => _token;
  PublicAuthConfig get publicConfig => _publicConfig;
  bool get isLoggedIn => _token != null && _token!.isNotEmpty && _currentUser != null;

  /// Khởi tạo và đọc phiên đăng nhập đã lưu trong SharedPreferences
  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString(_tokenKey);
      final userJsonStr = prefs.getString(_userKey);
      if (_token != null && _token!.isNotEmpty && userJsonStr != null) {
        final Map<String, dynamic> userMap = jsonDecode(userJsonStr);
        _currentUser = UserModel.fromJson(userMap, token: _token);
      }
      unawaited(fetchPublicAuthConfig());
      if (_token != null && _token!.isNotEmpty) {
        unawaited(refreshProfile());
      }
    } catch (e) {
      debugPrint('[AuthService] Lưu ý khi nạp session: $e');
    }
  }

  /// Lấy cấu hình xác thực công khai từ Backend (GOOGLE_WEB_CLIENT_ID, trạng thái Zalo ZNS)
  Future<PublicAuthConfig> fetchPublicAuthConfig() async {
    try {
      final res = await http
          .get(Uri.parse('$_baseUrl/api/auth/public-config'))
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map<String, dynamic> && data['success'] == true) {
          _publicConfig = PublicAuthConfig.fromJson(data);
        }
      }
    } catch (_) {}
    return _publicConfig;
  }

  /// Làm mới thông tin người dùng từ máy chủ (nếu 401 -> tự đăng xuất xóa phiên cũ)
  Future<bool> refreshProfile() async {
    if (_token == null || _token!.isEmpty) return false;
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/auth/me'),
        headers: {'Authorization': 'Bearer $_token'},
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode == 401) {
        await logout();
        return false;
      }

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['user'] is Map) {
          final updated = UserModel.fromJson(
            Map<String, dynamic>.from(data['user'] as Map),
            token: _token,
          );
          _currentUser = updated;
          await _saveSession(_token!, updated);
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  /// Đăng nhập bằng Email/SĐT và Mật khẩu (xác thực thực tế với Backend)
  Future<AuthResult> login({
    required String identifier,
    required String password,
  }) async {
    final cleanInput = identifier.trim();
    if (cleanInput.isEmpty || password.isEmpty) {
      return AuthResult(success: false, error: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
    }

    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'identifier': cleanInput,
          'password': password,
          'portal': 'mobile',
        }),
      ).timeout(const Duration(seconds: 30));

      if (res.body.isEmpty) {
        return AuthResult(success: false, error: 'Máy chủ phản hồi rỗng (HTTP ${res.statusCode})');
      }

      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true && data['token'] != null) {
        final tokenStr = data['token'].toString();
        final userObj = UserModel.fromJson(
          Map<String, dynamic>.from(data['user'] as Map),
          token: tokenStr,
        );
        IoTGatewayClient().clearAllDevices();
        await _saveSession(tokenStr, userObj);
        await BiometricAuthService().syncTokenIfEnabled(
          token: tokenStr,
          identifier: userObj.email.isNotEmpty ? userObj.email : userObj.phoneNumber,
          displayName: userObj.fullName,
        );
        return AuthResult(
          success: true,
          message: data['message']?.toString() ?? 'Đăng nhập thành công!',
          user: userObj,
        );
      } else {
        return AuthResult(
          success: false,
          error: data['error']?.toString() ?? 'Thông tin đăng nhập không hợp lệ.',
        );
      }
    } catch (e) {
      final errStr = e.toString();
      if (errStr.contains('TimeoutException')) {
        return AuthResult(
          success: false,
          error: 'Kết nối máy chủ bị quá hạn (Cloud đang khởi động). Vui lòng thử lại sau vài giây.',
        );
      }
      return AuthResult(
        success: false,
        error: 'Không thể kết nối tới máy chủ ($_baseUrl). Vui lòng kiểm tra mạng.',
      );
    }
  }

  /// Đăng nhập / Đăng ký nhanh bằng Google (Gmail OAuth)
  Future<AuthResult> signInWithGoogle() async {
    try {
      final cfg = await fetchPublicAuthConfig();
      if (!cfg.googleAuthEnabled || cfg.googleWebClientId.isEmpty) {
        return AuthResult(
          success: false,
          error:
              'Máy chủ chưa cấu hình Google OAuth (GOOGLE_WEB_CLIENT_ID trong backend/.env). Vui lòng điền key để sử dụng.',
        );
      }

      final googleSignIn = GoogleSignIn(
        scopes: const ['email', 'profile'],
        serverClientId: cfg.googleWebClientId,
      );

      await googleSignIn.signOut();
      final account = await googleSignIn.signIn();
      if (account == null) {
        return AuthResult(success: false, error: 'Bạn đã hủy đăng nhập bằng Google.');
      }

      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null || idToken.isEmpty) {
        return AuthResult(
          success: false,
          error:
              'Không lấy được Google ID Token. Kiểm tra lại Android OAuth Client (Package Name: vn.austec.smarthome.app + SHA-1) trên Google Cloud Console.',
        );
      }

      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/google'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'idToken': idToken,
          'portal': 'mobile',
          'mode': 'login',
        }),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true && data['token'] != null) {
        final tokenStr = data['token'].toString();
        final userObj = UserModel.fromJson(
          Map<String, dynamic>.from(data['user'] as Map),
          token: tokenStr,
        );
        IoTGatewayClient().clearAllDevices();
        await _saveSession(tokenStr, userObj);
        await BiometricAuthService().syncTokenIfEnabled(
          token: tokenStr,
          identifier: userObj.email,
          displayName: userObj.fullName,
        );
        return AuthResult(
          success: true,
          message: data['isNewUser'] == true
              ? 'Đăng ký & đăng nhập bằng Google thành công!'
              : (data['message']?.toString() ?? 'Đăng nhập bằng Google thành công!'),
          user: userObj,
        );
      }
      return AuthResult(
        success: false,
        error: data['error']?.toString() ?? 'Xác thực Google thất bại.',
      );
    } catch (e) {
      return AuthResult(success: false, error: 'Lỗi đăng nhập Google: $e');
    }
  }

  /// Đăng ký tài khoản mới từ Mobile App (CUSTOMER)
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
          'portal': 'mobile',
        }),
      ).timeout(const Duration(seconds: 30));

      if (res.body.isEmpty) {
        return AuthResult(success: false, error: 'Máy chủ phản hồi rỗng (HTTP ${res.statusCode})');
      }

      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true && data['token'] != null) {
        final tokenStr = data['token'].toString();
        final userObj = UserModel.fromJson(
          Map<String, dynamic>.from(data['user'] as Map),
          token: tokenStr,
        );
        await _saveSession(tokenStr, userObj);
        return AuthResult(
          success: true,
          message: data['message']?.toString() ?? 'Đăng ký thành công!',
          user: userObj,
        );
      } else {
        return AuthResult(
          success: false,
          error: data['error']?.toString() ?? 'Không thể đăng ký tài khoản.',
        );
      }
    } catch (e) {
      if (e.toString().contains('TimeoutException')) {
        return AuthResult(
          success: false,
          error: 'Máy chủ phản hồi quá thời gian chờ. Vui lòng thử lại sau vài giây.',
        );
      }
      return AuthResult(
        success: false,
        error: 'Lỗi kết nối máy chủ khi đăng ký tài khoản: $e',
      );
    }
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

  /// Đăng nhập nhanh bằng Sinh trắc học thực tế (Vân tay / FaceID + Secure Storage + kiểm tra live /api/auth/me)
  Future<AuthResult> biometricLogin() async {
    final bioRes = await BiometricAuthService().authenticateAndReadToken();
    if (!bioRes.success || bioRes.token == null) {
      return AuthResult(
        success: false,
        error: bioRes.error ?? 'Xác thực sinh trắc học không thành công.',
      );
    }

    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/auth/me'),
        headers: {'Authorization': 'Bearer ${bioRes.token}'},
      ).timeout(const Duration(seconds: 15));

      if (res.statusCode == 401) {
        await BiometricAuthService().disable();
        return AuthResult(
          success: false,
          error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại bằng Mật khẩu hoặc Google.',
        );
      }

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['user'] is Map) {
          final userObj = UserModel.fromJson(
            Map<String, dynamic>.from(data['user'] as Map),
            token: bioRes.token,
          );
          IoTGatewayClient().clearAllDevices();
          await _saveSession(bioRes.token!, userObj);
          return AuthResult(
            success: true,
            message: 'Đăng nhập bằng sinh trắc học thành công!',
            user: userObj,
          );
        }
      }

      return AuthResult(
        success: false,
        error: 'Không thể xác minh phiên đăng nhập với máy chủ.',
      );
    } catch (e) {
      return AuthResult(success: false, error: 'Lỗi kết nối máy chủ: $e');
    }
  }

  // ==========================================
  // STEP-UP OTP (2 KÊNH: GMAIL MẶC ĐỊNH + ZALO TÙY CHỌN)
  // ==========================================
  Future<Map<String, dynamic>?> getVerifyChannels() async {
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/auth/verify/channels'),
        headers: {'Authorization': 'Bearer ${_token ?? ""}'},
      ).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['channels'] is Map) {
          return Map<String, dynamic>.from(data['channels'] as Map);
        }
      }
    } catch (_) {}
    return null;
  }

  Future<Map<String, dynamic>> requestStepUpOtp({
    required String purpose,
    required String channel,
    String? targetOverride,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/verify/request'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${_token ?? ""}',
        },
        body: jsonEncode({
          'purpose': purpose,
          'channel': channel,
          if (targetOverride != null && targetOverride.isNotEmpty) 'targetOverride': targetOverride,
        }),
      ).timeout(const Duration(seconds: 20));
      return Map<String, dynamic>.from(jsonDecode(res.body) as Map);
    } catch (e) {
      return {'success': false, 'error': 'Lỗi kết nối gửi mã OTP: $e'};
    }
  }

  Future<Map<String, dynamic>> confirmStepUpOtp({
    required String purpose,
    required String code,
    String? challengeId,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/verify/confirm'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${_token ?? ""}',
        },
        body: jsonEncode({
          'purpose': purpose,
          'code': code.trim(),
          if (challengeId != null) 'challengeId': challengeId,
        }),
      ).timeout(const Duration(seconds: 15));
      return Map<String, dynamic>.from(jsonDecode(res.body) as Map);
    } catch (e) {
      return {'success': false, 'error': 'Lỗi xác minh mã OTP: $e'};
    }
  }

  // ==========================================
  // FORGOT PASSWORD (CHỨC NĂNG #3)
  // ==========================================
  Future<Map<String, dynamic>> forgotPasswordOptions(String identifier) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/forgot-password/options'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'identifier': identifier.trim()}),
      ).timeout(const Duration(seconds: 15));
      return Map<String, dynamic>.from(jsonDecode(res.body) as Map);
    } catch (e) {
      return {'success': false, 'error': 'Lỗi kết nối máy chủ: $e'};
    }
  }

  Future<Map<String, dynamic>> requestForgotPasswordOtp({
    required String identifier,
    required String channel,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/forgot-password/request'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'identifier': identifier.trim(),
          'channel': channel,
        }),
      ).timeout(const Duration(seconds: 20));
      return Map<String, dynamic>.from(jsonDecode(res.body) as Map);
    } catch (e) {
      return {'success': false, 'error': 'Lỗi gửi mã OTP khôi phục: $e'};
    }
  }

  Future<Map<String, dynamic>> confirmForgotPassword({
    required String identifier,
    required String code,
    required String newPassword,
    required String confirmPassword,
    String? challengeId,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/forgot-password/confirm'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'identifier': identifier.trim(),
          'code': code.trim(),
          'newPassword': newPassword,
          'confirmPassword': confirmPassword,
          if (challengeId != null) 'challengeId': challengeId,
        }),
      ).timeout(const Duration(seconds: 15));
      return Map<String, dynamic>.from(jsonDecode(res.body) as Map);
    } catch (e) {
      return {'success': false, 'error': 'Lỗi đặt lại mật khẩu: $e'};
    }
  }

  // ==========================================
  // ACCOUNT SECURITY (#2, #4, #5)
  // ==========================================
  Future<Map<String, dynamic>> changePassword({
    String? currentPassword,
    required String newPassword,
    required String confirmPassword,
    required String stepUpToken,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/change-password'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${_token ?? ""}',
          'X-StepUp-Token': stepUpToken,
        },
        body: jsonEncode({
          if (currentPassword != null && currentPassword.isNotEmpty)
            'currentPassword': currentPassword,
          'newPassword': newPassword,
          'confirmPassword': confirmPassword,
        }),
      ).timeout(const Duration(seconds: 15));

      final data = Map<String, dynamic>.from(jsonDecode(res.body) as Map);
      if (res.statusCode == 200 && data['success'] == true) {
        if (_currentUser != null) {
          _currentUser = _currentUser!.copyWith(hasPassword: true);
          await _saveSession(_token!, _currentUser!);
        }
        return {'success': true, 'message': data['message'] ?? 'Đổi mật khẩu thành công!'};
      }
      return {'success': false, 'error': data['error'] ?? 'Đổi mật khẩu thất bại!'};
    } catch (e) {
      return {'success': false, 'error': 'Lỗi kết nối máy chủ: $e'};
    }
  }

  Future<Map<String, dynamic>> updateProfile({
    String? fullName,
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

  Future<Map<String, dynamic>> updateContact({
    String? email,
    String? phoneNumber,
    required String stepUpToken,
  }) async {
    try {
      final res = await http.put(
        Uri.parse('$_baseUrl/api/auth/contact'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${_token ?? ""}',
          'X-StepUp-Token': stepUpToken,
        },
        body: jsonEncode({
          if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
          if (phoneNumber != null && phoneNumber.trim().isNotEmpty) 'phoneNumber': phoneNumber.trim(),
        }),
      ).timeout(const Duration(seconds: 15));

      final data = Map<String, dynamic>.from(jsonDecode(res.body) as Map);
      if (res.statusCode == 200 && data['success'] == true && data['user'] is Map) {
        final updated = UserModel.fromJson(
          Map<String, dynamic>.from(data['user'] as Map),
          token: _token,
        );
        await _saveSession(_token!, updated);
        return {'success': true, 'message': data['message'] ?? 'Cập nhật thành công!', 'user': updated};
      }
      return {'success': false, 'error': data['error'] ?? 'Không thể cập nhật liên hệ.'};
    } catch (e) {
      return {'success': false, 'error': 'Lỗi kết nối máy chủ: $e'};
    }
  }

  Future<Map<String, dynamic>> linkGoogleAccount() async {
    try {
      final cfg = await fetchPublicAuthConfig();
      if (!cfg.googleAuthEnabled || cfg.googleWebClientId.isEmpty) {
        return {
          'success': false,
          'error': 'Hệ thống chưa cấu hình GOOGLE_WEB_CLIENT_ID trong backend/.env.',
        };
      }
      final googleSignIn = GoogleSignIn(
        scopes: const ['email', 'profile'],
        serverClientId: cfg.googleWebClientId,
      );
      await googleSignIn.signOut();
      final account = await googleSignIn.signIn();
      if (account == null) {
        return {'success': false, 'error': 'Đã hủy liên kết tài khoản Google.'};
      }
      final auth = await account.authentication;
      if (auth.idToken == null || auth.idToken!.isEmpty) {
        return {'success': false, 'error': 'Không lấy được Google ID Token.'};
      }

      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/google/link'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${_token ?? ""}',
        },
        body: jsonEncode({'idToken': auth.idToken}),
      ).timeout(const Duration(seconds: 20));

      final data = Map<String, dynamic>.from(jsonDecode(res.body) as Map);
      if (res.statusCode == 200 && data['success'] == true && data['user'] is Map) {
        final updated = UserModel.fromJson(
          Map<String, dynamic>.from(data['user'] as Map),
          token: _token,
        );
        await _saveSession(_token!, updated);
        return {'success': true, 'message': data['message'] ?? 'Đã liên kết Google thành công!'};
      }
      return {'success': false, 'error': data['error'] ?? 'Liên kết Google thất bại.'};
    } catch (e) {
      return {'success': false, 'error': 'Lỗi liên kết Google: $e'};
    }
  }

  Future<Map<String, dynamic>> unlinkGoogleAccount({required String stepUpToken}) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/google/unlink'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${_token ?? ""}',
          'X-StepUp-Token': stepUpToken,
        },
        body: jsonEncode({}),
      ).timeout(const Duration(seconds: 15));

      final data = Map<String, dynamic>.from(jsonDecode(res.body) as Map);
      if (res.statusCode == 200 && data['success'] == true && data['user'] is Map) {
        final updated = UserModel.fromJson(
          Map<String, dynamic>.from(data['user'] as Map),
          token: _token,
        );
        await _saveSession(_token!, updated);
        return {'success': true, 'message': data['message'] ?? 'Đã hủy liên kết Google!'};
      }
      return {'success': false, 'error': data['error'] ?? 'Không thể hủy liên kết Google.'};
    } catch (e) {
      return {'success': false, 'error': 'Lỗi kết nối máy chủ: $e'};
    }
  }

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

  /// Xóa tài khoản vĩnh viễn (Chức năng #5 — bắt buộc Step-up OTP Gmail / Zalo)
  Future<Map<String, dynamic>> deleteAccount({
    required String stepUpToken,
    String? reason,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/delete-account'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${_token ?? ""}',
          'X-StepUp-Token': stepUpToken,
        },
        body: jsonEncode({
          if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
        }),
      ).timeout(const Duration(seconds: 20));

      if (res.body.isEmpty) {
        return {'success': false, 'error': 'Máy chủ phản hồi rỗng (HTTP ${res.statusCode})'};
      }

      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true) {
        await BiometricAuthService().disable();
        await logout();
        try {
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove('austec_last_identifier');
        } catch (_) {}
        return {
          'success': true,
          'message': data['message'] ?? 'Tài khoản đã được xóa vĩnh viễn.',
        };
      } else {
        return {
          'success': false,
          'error': data['error'] ?? 'Không thể xóa tài khoản. Vui lòng thử lại.',
        };
      }
    } catch (e) {
      return {'success': false, 'error': 'Lỗi kết nối máy chủ: $e'};
    }
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
      await prefs.setString(
        'austec_last_identifier',
        user.email.isNotEmpty ? user.email : user.phoneNumber,
      );
    } catch (e) {
      debugPrint('[AuthService] Lưu ý khi lưu session: $e');
    }
  }
}
