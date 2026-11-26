import 'package:flutter/material.dart';
import '../constants/app_theme.dart';

/// Quiet surface card with hairline border and 4px-aligned padding
class AustecCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color? color;
  final Color? borderColor;
  final VoidCallback? onTap;

  const AustecCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.radius = AppRadius.card,
    this.color,
    this.borderColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final box = Container(
      padding: padding,
      decoration: AppTheme.glassBox(
        color: color,
        borderColor: borderColor,
        radius: radius,
      ),
      child: child,
    );

    if (onTap == null) return box;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: box,
      ),
    );
  }
}

/// Sentence-case section header with strict 4px grouping rhythm
class AustecSectionHeader extends StatelessWidget {
  final String title;
  final Widget? trailing;
  final EdgeInsetsGeometry padding;

  const AustecSectionHeader({
    super.key,
    required this.title,
    this.trailing,
    this.padding = const EdgeInsets.only(bottom: AppSpacing.sm),
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: TextStyle(
              color: AppTheme.dynamicTextSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// Signature detail: calm live status dot (no glow, no pulse loop)
class AustecStatusDot extends StatelessWidget {
  final bool isOnline;
  final Color? color;
  final double size;

  const AustecStatusDot({
    super.key,
    this.isOnline = true,
    this.color,
    this.size = 8.0,
  });

  @override
  Widget build(BuildContext context) {
    final dotColor = color ?? (isOnline ? AppTheme.emeraldSuccess : AppTheme.dynamicTextMuted);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: dotColor,
      ),
    );
  }
}

/// Aligned key-value info row with optional leading icon and tabular figures
class AustecInfoRow extends StatelessWidget {
  final IconData? icon;
  final String label;
  final String value;
  final Color? valueColor;
  final bool isMono;

  const AustecInfoRow({
    super.key,
    this.icon,
    required this.label,
    required this.value,
    this.valueColor,
    this.isMono = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        children: [
          if (icon != null) ...[
            SizedBox(
              width: 24,
              child: Icon(icon, size: 18, color: AppTheme.dynamicTextMuted),
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: AppTheme.dynamicTextSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w400,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Text(
            value,
            textAlign: TextAlign.right,
            style: AppTheme.tabular(
              TextStyle(
                color: valueColor ?? AppTheme.dynamicTextPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
                fontFamily: isMono ? 'monospace' : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Dòng trạng thái Online/Offline đồng nhất toàn ứng dụng (thẳng hàng dọc ngay dưới tên thiết bị)
class DeviceOnlineStatusRow extends StatelessWidget {
  final bool isOnline;
  final String? suffix;
  final double fontSize;
  final bool center;

  const DeviceOnlineStatusRow({
    super.key,
    required this.isOnline,
    this.suffix,
    this.fontSize = 11,
    this.center = false,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor =
        isOnline ? AppTheme.emeraldSuccess : const Color(0xFF94A3B8);
    final label = isOnline ? "Trực tuyến" : "Ngoại tuyến";

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment:
          center ? MainAxisAlignment.center : MainAxisAlignment.start,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(
            color: statusColor,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            (suffix != null && suffix!.isNotEmpty)
                ? "$label · $suffix"
                : label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: statusColor,
              fontSize: fontSize,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

/// Tiêu đề AppBar chuẩn đồng nhất cho TẤT CẢ màn hình Chi tiết thiết bị:
/// Tên thiết bị và dòng "Trực tuyến / Ngoại tuyến" căn trái thẳng 1 trục dọc.
class DeviceDetailAppBarTitle extends StatelessWidget {
  final String name;
  final bool isOnline;
  final String? suffix;

  const DeviceDetailAppBarTitle({
    super.key,
    required this.name,
    required this.isOnline,
    this.suffix,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 15,
            fontWeight: FontWeight.w600,
            height: 1.2,
          ),
        ),
        const SizedBox(height: 2),
        DeviceOnlineStatusRow(
          isOnline: isOnline,
          suffix: suffix,
          fontSize: 11,
          center: false,
        ),
      ],
    );
  }
}

/// Header Preview Card chuẩn đồng nhất cho mọi loại thiết bị (theo phong cách gọn gàng BMS,
/// KHÔNG có tag ON/OFF trùng lặp trạng thái kết nối).
class DevicePreviewHeader extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String name;
  final bool isOnline;
  final String? statusSuffix;
  final Widget? trailing;
  final bool isDark;
  final Color textColor;

  const DevicePreviewHeader({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.name,
    required this.isOnline,
    this.statusSuffix,
    this.trailing,
    required this.isDark,
    required this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(AppRadius.inner),
            border: Border.all(
              color: iconColor.withValues(alpha: 0.25),
              width: 1,
            ),
          ),
          child: Icon(icon, color: iconColor, size: 18),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: textColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 2),
              DeviceOnlineStatusRow(
                isOnline: isOnline,
                suffix: statusSuffix,
                fontSize: 11,
                center: false,
              ),
            ],
          ),
        ),
        if (trailing != null) ...[
          const SizedBox(width: 8),
          trailing!,
        ],
      ],
    );
  }
}


