import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/ui.dart';

/// Status badges for scheduled days (STATUS_STYLES in ProgramDetail.js).
({String label, Color background, Color text, Color border}) statusStyle(String status) => switch (status) {
      'done' => (label: 'Done', background: AppColors.emerald500.withValues(alpha: 0.15), text: AppColors.emerald300, border: AppColors.emerald500.withValues(alpha: 0.3)),
      'today' => (label: 'Today', background: AppColors.limeLight.withValues(alpha: 0.15), text: AppColors.limeLight, border: AppColors.limeLight.withValues(alpha: 0.4)),
      'missed' => (label: 'Missed', background: AppColors.red500.withValues(alpha: 0.1), text: AppColors.red300, border: AppColors.red500.withValues(alpha: 0.3)),
      _ => (label: 'Upcoming', background: AppColors.whiteA(0.05), text: AppColors.white70, border: AppColors.white30A(0.2)),
    };

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.status, {super.key});
  final String status;

  @override
  Widget build(BuildContext context) {
    final s = statusStyle(status);
    return Pill(s.label, background: s.background, textColor: s.text, border: s.border, weight: FontWeight.w700);
  }
}

/// One scheduled day: day and date, the workout, its status, and a play button.
class ScheduleRow extends StatelessWidget {
  const ScheduleRow({
    super.key,
    required this.day,
    required this.title,
    required this.onOpen,
    this.date,
    this.status,
    this.onPlay,
    this.meta = const [],
    this.notes,
    this.playLabel,
  });

  final int day;
  final String title;
  final String? date;
  final String? status;
  final VoidCallback onOpen;
  final VoidCallback? onPlay;
  final List<Widget> meta;
  final String? notes;
  final String? playLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.white30A(0.1))),
      child: Row(
        children: [
          SizedBox(
            width: 88,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Day $day', style: fg(size: 14, weight: FontWeight.w700)),
                if (date != null) Text(date!, style: fg(size: 11, color: AppColors.white70)),
              ],
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InkWell(onTap: onOpen, child: Text(title, style: fg(size: 15, weight: FontWeight.w600))),
                if (meta.isNotEmpty) ...[const SizedBox(height: 2), Wrap(spacing: 12, runSpacing: 2, children: meta)],
                if (notes != null && notes!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(notes!, style: fg(size: 12, color: AppColors.white70, fontStyle: FontStyle.italic)),
                ],
                if (status != null) ...[const SizedBox(height: 6), StatusBadge(status!)],
              ],
            ),
          ),
          if (onPlay != null)
            Semantics(
              button: true,
              label: playLabel ?? 'Start',
              excludeSemantics: true,
              child: Material(
                color: AppColors.whiteA(0.1),
                shape: const CircleBorder(),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: onPlay,
                  child: const SizedBox(width: 36, height: 36, child: Icon(LucideIcons.play, size: 16)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Small grey "icon text" metadata.
class MetaText extends StatelessWidget {
  const MetaText(this.text, {super.key, this.icon});
  final IconData? icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[Icon(icon, size: 12, color: AppColors.white70), const SizedBox(width: 4)],
        Text(text, style: fg(size: 11, color: AppColors.white70)),
      ],
    );
  }
}
