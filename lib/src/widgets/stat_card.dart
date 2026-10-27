import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import 'charts.dart';

/// A headline number with an optional sparkline (dashboard/components/StatCard.tsx).
class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.suffix,
    this.footnote,
    this.color = AppColors.limeLight,
    this.data = const [],
    this.chartType = SparkType.area,
    this.chartLabel,
  });

  final IconData icon;
  final String label;
  final String value;
  final String? suffix;
  final String? footnote;
  final Color color;
  final List<num> data;
  final SparkType chartType;
  final String? chartLabel;

  @override
  Widget build(BuildContext context) {
    final showChart = data.any((v) => v > 0);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.obsidianWave,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.white30A(0.1)),
        gradient: RadialGradient(
          center: Alignment.topRight,
          radius: 1.2,
          colors: [Color.alphaBlend(color.withValues(alpha: 0.05), AppColors.obsidianWave), AppColors.obsidianWave],
          stops: const [0, 0.7],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ExcludeSemantics(
            child: Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(color: color.withAlpha(0x20), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, size: 18, color: color),
            ),
          ),
          const SizedBox(height: 12),
          // Number and unit on one line, shrunk to fit a narrow card.
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text.rich(
              TextSpan(children: [
                TextSpan(text: value, style: fg(size: 30, weight: FontWeight.w800)),
                if (suffix != null) TextSpan(text: ' $suffix', style: fg(size: 14, weight: FontWeight.w700, color: AppColors.white70)),
              ]),
              maxLines: 1,
            ),
          ),
          const SizedBox(height: 2),
          Text(label.toUpperCase(), style: fgLabel(size: 11, weight: FontWeight.w600)),
          if (footnote != null) ...[const SizedBox(height: 4), Text(footnote!, style: fg(size: 12, color: AppColors.white70))],
          if (showChart) ...[
            const SizedBox(height: 12),
            Sparkline(data: data, color: color, type: chartType, label: chartLabel ?? '$label trend'),
          ],
        ],
      ),
    );
  }
}
