import 'package:flutter/foundation.dart';
import '../../../core/network/api_client.dart';
import '../domain/entities/member_permission_entity.dart';

class FamilySharingService {
  static final FamilySharingService _instance = FamilySharingService._internal();
  factory FamilySharingService() => _instance;
  FamilySharingService._internal();

  Future<List<MemberPermission>> getMembers(String hardwareId) async {
    try {
      final res = await ApiClient().get('/api/devices/$hardwareId/members');
      if (res.success && res.data is Map && res.data['members'] is List) {
        return (res.data['members'] as List)
            .map((m) => MemberPermission.fromJson(m))
            .toList();
      }
    } catch (e) {
      debugPrint('[FamilySharingService] getMembers error: $e');
    }
    return [];
  }

  Future<List<SuggestedMember>> getSuggestions(String hardwareId) async {
    try {
      final res = await ApiClient().get('/api/devices/$hardwareId/member-suggestions');
      if (res.success && res.data is Map && res.data['suggestions'] is List) {
        return (res.data['suggestions'] as List)
            .map((s) => SuggestedMember.fromJson(s))
            .toList();
      }
    } catch (e) {
      debugPrint('[FamilySharingService] getSuggestions error: $e');
    }
    return [];
  }

  Future<List<Map<String, dynamic>>> searchUsers(String query) async {
    if (query.trim().isEmpty) return [];
    try {
      final res = await ApiClient().get('/api/chat/users/search?q=${Uri.encodeComponent(query.trim())}');
      if (res.success && res.data is Map && res.data['users'] is List) {
        return List<Map<String, dynamic>>.from(res.data['users']);
      }
    } catch (e) {
      debugPrint('[FamilySharingService] searchUsers error: $e');
    }
    return [];
  }

  Future<bool> addMember(String hardwareId, MemberPermission member) async {
    try {
      final res = await ApiClient().post(
        '/api/devices/$hardwareId/members',
        body: member.toJson(),
      );
      return res.success;
    } catch (e) {
      debugPrint('[FamilySharingService] addMember error: $e');
      return false;
    }
  }

  Future<bool> updateMember(String hardwareId, MemberPermission member) async {
    try {
      final res = await ApiClient().put(
        '/api/devices/$hardwareId/members/${member.id}',
        body: member.toJson(),
      );
      return res.success;
    } catch (e) {
      debugPrint('[FamilySharingService] updateMember error: $e');
      return false;
    }
  }

  Future<bool> revokeMember(String hardwareId, String memberId) async {
    try {
      final res = await ApiClient().delete(
        '/api/devices/$hardwareId/members/$memberId',
      );
      return res.success;
    } catch (e) {
      debugPrint('[FamilySharingService] revokeMember error: $e');
      return false;
    }
  }

  /// Chức năng #6: Tạo mã OTP chuyển giao quyền sở hữu (kèm X-StepUp-Token đã xác thực qua Gmail / Zalo)
  Future<Map<String, dynamic>?> createTransferOtp(
    String hardwareId, {
    required String stepUpToken,
  }) async {
    try {
      final res = await ApiClient().post(
        '/api/devices/$hardwareId/transfer/create',
        headers: {'X-StepUp-Token': stepUpToken},
      );
      if (res.data is Map) {
        return Map<String, dynamic>.from(res.data);
      }
      return {'success': res.success, 'error': res.message};
    } catch (e) {
      debugPrint('[FamilySharingService] createTransferOtp error: $e');
    }
    return null;
  }

  Future<bool> cancelTransferOtp(String hardwareId) async {
    try {
      final res = await ApiClient().post('/api/devices/$hardwareId/transfer/cancel');
      return res.success;
    } catch (e) {
      debugPrint('[FamilySharingService] cancelTransferOtp error: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>?> claimDeviceByOtp(String otpCode) async {
    try {
      final res = await ApiClient().post(
        '/api/devices/transfer/claim',
        body: {'otpCode': otpCode},
      );
      if (res.data is Map) {
        return Map<String, dynamic>.from(res.data);
      }
      return {'success': res.success, 'error': res.message};
    } catch (e) {
      debugPrint('[FamilySharingService] claimDeviceByOtp error: $e');
    }
    return null;
  }
}
