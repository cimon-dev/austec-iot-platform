import 'package:flutter/foundation.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/auth_service.dart';
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

  List<MemberPermission> getOfflineFallbackMembers(String hwId) {
    final curUser = AuthService().currentUser;
    final ownerName = (curUser != null && curUser.fullName.isNotEmpty)
        ? "${curUser.fullName} (Chủ nhà)"
        : "Chủ nhà";
    final ownerPhone = curUser?.phoneNumber ?? "0944102588";
    return [
      MemberPermission(
        id: "PERM-01",
        hardwareId: hwId,
        userId: curUser?.id ?? "USER-OWNER",
        memberName: ownerName,
        phoneNumber: ownerPhone,
        role: "OWNER",
        canControl: true,
        canViewHistory: true,
        canChildLock: true,
        canConfig: true,
        createdAt: "2026-09-01",
      ),
      MemberPermission(
        id: "PERM-02",
        hardwareId: hwId,
        userId: "USER-SUB-001",
        memberName: "Trần Thu Hà (Vợ)",
        phoneNumber: "0988776655",
        role: "MEMBER",
        canControl: true,
        canViewHistory: true,
        canChildLock: true,
        canConfig: false,
        createdAt: "2026-09-02",
      ),
    ];
  }

  List<SuggestedMember> getOfflineFallbackSuggestions(String hwId) {
    return [
      SuggestedMember(
        userId: "USER-SUB-002",
        memberName: "Nguyễn Minh Khang (Con trai)",
        phoneNumber: "0977112233",
        role: "MEMBER",
        canControl: true,
        canViewHistory: true,
        canChildLock: false,
        canConfig: false,
        sourceDeviceNames: ["Cửa cuốn Gara Đức Mạnh"],
      ),
      SuggestedMember(
        userId: "USER-SUB-003",
        memberName: "Lê Văn Toàn (Tài xế / Khách)",
        phoneNumber: "0911223344",
        role: "GUEST",
        canControl: true,
        canViewHistory: false,
        canChildLock: false,
        canConfig: false,
        scheduleLimitActive: true,
        accessStartTime: "07:30",
        accessEndTime: "18:30",
        sourceDeviceNames: ["Cửa cuốn Gara Đức Mạnh"],
      ),
    ];
  }
}
