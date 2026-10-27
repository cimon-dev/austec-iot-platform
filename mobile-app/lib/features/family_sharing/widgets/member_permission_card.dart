import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../domain/entities/member_permission_entity.dart';

class MemberPermissionCard extends StatelessWidget {
  final MemberPermission member;
  final bool isDark;
  final Color textCol;
  final Color cardBg;
  final Color cardBorder;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const MemberPermissionCard({
    super.key,
    required this.member,
    required this.isDark,
    required this.textCol,
    required this.cardBg,
    required this.cardBorder,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    Color badgeColor;
    String roleLabel;

    if (member.role == "OWNER") {
      badgeColor = AppTheme.cyanAccent;
      roleLabel = "CHỦ SỞ HỮU";
    } else if (member.role == "MEMBER") {
      badgeColor = AppTheme.emeraldSuccess;
      roleLabel = "THÀNH VIÊN GIA ĐÌNH";
    } else {
      badgeColor = AppTheme.amberWarning;
      roleLabel = "KHÁCH TẠM THỜI";
    }

    final isOwner = member.role == "OWNER";

    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: badgeColor.withValues(alpha: 0.18),
                radius: 20,
                child: Text(
                  member.memberName.isNotEmpty ? member.memberName[0].toUpperCase() : "U",
                  style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            member.memberName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: textCol, fontWeight: FontWeight.bold, fontSize: 13.5),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: badgeColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            roleLabel,
                            style: TextStyle(color: badgeColor, fontSize: 8.5, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        const Icon(Icons.phone_outlined, size: 12, color: AppTheme.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          member.phoneNumber.isNotEmpty ? member.phoneNumber : "Chưa có SĐT",
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 11, fontFamily: 'monospace'),
                        ),
                        const SizedBox(width: 10),
                        const Icon(Icons.access_time, size: 12, color: AppTheme.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          member.scheduleLimitActive
                              ? "${member.accessStartTime} - ${member.accessEndTime}"
                              : "Toàn thời gian (24/7)",
                          style: TextStyle(
                            color: member.scheduleLimitActive ? AppTheme.amberWarning : AppTheme.textMuted,
                            fontSize: 10.5,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (!isOwner) ...[
                IconButton(
                  icon: const Icon(Icons.tune_rounded, size: 18, color: AppTheme.cyanAccent),
                  tooltip: "Chỉnh sửa quyền",
                  onPressed: onEdit,
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.roseDanger),
                  tooltip: "Thu hồi quyền",
                  onPressed: onDelete,
                ),
              ] else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.cyanAccent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    "Toàn quyền",
                    style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              _buildPermBadge("Điều khiển", member.canControl, Icons.flash_on_rounded),
              _buildPermBadge("Nhật ký", member.canViewHistory, Icons.history_rounded),
              _buildPermBadge("Khóa trẻ em", member.canChildLock, Icons.lock_clock_rounded),
              _buildPermBadge("Cấu hình", member.canConfig, Icons.settings_outlined),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPermBadge(String title, bool isGranted, IconData icon) {
    final color = isGranted ? AppTheme.cyanAccent : AppTheme.textMuted.withValues(alpha: 0.5);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: isGranted ? AppTheme.cyanAccent.withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: isGranted ? AppTheme.cyanAccent.withValues(alpha: 0.3) : Colors.white12,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(
            title,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: isGranted ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}
