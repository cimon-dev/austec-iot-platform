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

