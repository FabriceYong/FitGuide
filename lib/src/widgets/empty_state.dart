import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';

/// What a section shows when there's nothing in it yet: what it's for and
/// how to start (components/EmptyState.tsx).
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, required this.text, this.color = AppColors.limeLight, this.action, this.compact = false});
  final IconData icon;
  final String title;
  final String text;
  final Color color;
  final Widget? action;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final tile = compact ? 44.0 : 56.0;
    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: compact ? 20 : 36),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.2))),
      child: Column(
        children: [
          Container(
            width: tile,
            height: tile,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(16)),
            child: Icon(icon, size: compact ? 20 : 24, color: color),
          ),
          const SizedBox(height: 12),
          Text(title, textAlign: TextAlign.center, style: fg(size: 15, weight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(text, textAlign: TextAlign.center, style: fg(size: 13, color: AppColors.white70, height: 1.45)),
          if (action != null) ...[const SizedBox(height: 14), action!],
        ],
      ),
    );
  }
}
