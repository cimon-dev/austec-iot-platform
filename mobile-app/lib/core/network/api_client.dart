import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../constants/api_config.dart';
import '../services/auth_service.dart';

class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;
  final int statusCode;

  ApiResponse({
    required this.success,
    this.data,
    this.message,
    required this.statusCode,
  });
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  String get baseUrl => ApiConfig.baseUrl;

  Map<String, String> _getHeaders({Map<String, String>? extraHeaders}) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    final token = AuthService().token;
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    if (extraHeaders != null) {
      headers.addAll(extraHeaders);
    }
    return headers;
  }

  Future<ApiResponse<dynamic>> get(
    String endpoint, {
    Map<String, String>? queryParams,
    Map<String, String>? headers,
  }) async {
    try {
      var uri = Uri.parse('$baseUrl$endpoint');
      if (queryParams != null && queryParams.isNotEmpty) {
        uri = uri.replace(queryParameters: queryParams);
      }
      final response = await http.get(uri, headers: _getHeaders(extraHeaders: headers));
      return _parseResponse(response);
    } catch (e) {
      debugPrint('[ApiClient] GET $endpoint error: $e');
      return ApiResponse(success: false, message: e.toString(), statusCode: 500);
    }
  }

  Future<ApiResponse<dynamic>> post(
    String endpoint, {
    dynamic body,
    Map<String, String>? headers,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl$endpoint');
      final response = await http.post(
        uri,
        headers: _getHeaders(extraHeaders: headers),
        body: body != null ? jsonEncode(body) : null,
      );
      return _parseResponse(response);
    } catch (e) {
      debugPrint('[ApiClient] POST $endpoint error: $e');
      return ApiResponse(success: false, message: e.toString(), statusCode: 500);
    }
  }

  Future<ApiResponse<dynamic>> put(
    String endpoint, {
    dynamic body,
    Map<String, String>? headers,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl$endpoint');
      final response = await http.put(
        uri,
        headers: _getHeaders(extraHeaders: headers),
        body: body != null ? jsonEncode(body) : null,
      );
      return _parseResponse(response);
    } catch (e) {
      debugPrint('[ApiClient] PUT $endpoint error: $e');
      return ApiResponse(success: false, message: e.toString(), statusCode: 500);
    }
  }

  Future<ApiResponse<dynamic>> delete(
    String endpoint, {
    dynamic body,
    Map<String, String>? headers,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl$endpoint');
      final response = await http.delete(
        uri,
        headers: _getHeaders(extraHeaders: headers),
        body: body != null ? jsonEncode(body) : null,
      );
      return _parseResponse(response);
    } catch (e) {
      debugPrint('[ApiClient] DELETE $endpoint error: $e');
      return ApiResponse(success: false, message: e.toString(), statusCode: 500);
    }
  }

  ApiResponse<dynamic> _parseResponse(http.Response response) {
    try {
      final body = jsonDecode(utf8.decode(response.bodyBytes));
      final bool isSuccess = response.statusCode >= 200 && response.statusCode < 300;
      if (body is Map<String, dynamic>) {
        final bool statusSuccess = body['success'] == true || (isSuccess && !body.containsKey('success'));
        return ApiResponse(
          success: statusSuccess,
          data: body['data'] ?? body,
          message: body['message'] ?? body['error'],
          statusCode: response.statusCode,
        );
      }
      return ApiResponse(
        success: isSuccess,
        data: body,
        statusCode: response.statusCode,
      );
    } catch (_) {
      return ApiResponse(
        success: response.statusCode >= 200 && response.statusCode < 300,
        message: response.body,
        statusCode: response.statusCode,
      );
    }
  }
}
