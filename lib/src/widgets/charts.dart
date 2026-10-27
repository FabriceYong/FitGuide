import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';

/// Charts drawn with fl_chart in the website's Recharts styles.

enum SparkType { area, line, bar }

/// A small trend line or bars under a headline number (StatCard's sparkline).
class Sparkline extends StatelessWidget {
  const Sparkline({super.key, required this.data, required this.color, this.type = SparkType.area, this.height = 60, this.label});
  final List<num> data;
  final Color color;
  final SparkType type;
  final double height;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final maxY = data.fold<double>(0, (m, v) => math.max(m, v.toDouble()));
    final chart = switch (type) {
      SparkType.bar => BarChart(
          BarChartData(
            maxY: maxY == 0 ? 1 : maxY,
            alignment: BarChartAlignment.spaceBetween,
            gridData: const FlGridData(show: false),
            titlesData: const FlTitlesData(show: false),
            borderData: FlBorderData(show: false),
            barTouchData: BarTouchData(enabled: false),
            barGroups: [
              for (final (i, v) in data.indexed)
                BarChartGroupData(x: i, barRods: [
                  BarChartRodData(
                    toY: v.toDouble(),
                    width: 10,
                    color: color.withValues(alpha: 0.8),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                  ),
                ]),
            ],
          ),
          duration: Duration.zero,
        ),
      _ => LineChart(
          LineChartData(
            minY: 0,
            maxY: maxY == 0 ? 1 : maxY * 1.05,
            gridData: const FlGridData(show: false),
            titlesData: const FlTitlesData(show: false),
            borderData: FlBorderData(show: false),
            lineTouchData: const LineTouchData(enabled: false),
            lineBarsData: [
              LineChartBarData(
                spots: [for (final (i, v) in data.indexed) FlSpot(i.toDouble(), v.toDouble())],
                isCurved: true,
                preventCurveOverShooting: true,
                color: color,
                barWidth: 2,
                dotData: const FlDotData(show: false),
                belowBarData: BarAreaData(
                  show: type == SparkType.area,
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [color.withValues(alpha: 0.8), color.withValues(alpha: 0.1)],
                  ),
                ),
              ),
            ],
          ),
          duration: Duration.zero,
        ),
    };
    return Semantics(label: label, child: ExcludeSemantics(child: SizedBox(height: height, child: chart)));
  }
}

/// Bars per day with date labels underneath, and an optional dashed target line.
class DayBarChart extends StatelessWidget {
  const DayBarChart({super.key, required this.labels, required this.values, this.target, this.height = 176, this.unit = '', this.label});
  final List<String> labels;
  final List<num?> values;
  final num? target;
  final double height;
  final String unit;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final maxValue = values.fold<double>(target?.toDouble() ?? 0, (m, v) => math.max(m, (v ?? 0).toDouble()));
    final maxY = maxValue <= 0 ? 1.0 : (maxValue * 1.1 / 100).ceil() * 100.0;
    final every = math.max(1, (labels.length / 7).ceil());
    return Semantics(
      label: label,
      child: SizedBox(
        height: height,
        child: BarChart(
          BarChartData(
            maxY: maxY,
            alignment: BarChartAlignment.spaceAround,
            gridData: const FlGridData(show: false),
            borderData: FlBorderData(show: false),
            extraLinesData: target == null
                ? null
                : ExtraLinesData(horizontalLines: [
                    HorizontalLine(y: target!.toDouble(), color: const Color(0xFFE5E7EB), strokeWidth: 1, dashArray: [4, 4]),
                  ]),
            titlesData: FlTitlesData(
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 40,
                  getTitlesWidget: (value, meta) => value == meta.max || value == 0 || value == meta.max / 2
                      ? Text(value >= 1000 ? '${(value / 1000).toStringAsFixed(value % 1000 == 0 ? 0 : 1)}k' : value.toStringAsFixed(0), style: fg(size: 10, color: const Color(0xFF9CA3AF)))
                      : const SizedBox.shrink(),
                ),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 20,
                  getTitlesWidget: (value, meta) {
                    final i = value.toInt();
                    if (i < 0 || i >= labels.length || i % every != 0) return const SizedBox.shrink();
                    return Padding(padding: const EdgeInsets.only(top: 4), child: Text(labels[i], style: fg(size: 10, color: const Color(0xFF9CA3AF))));
                  },
                ),
              ),
            ),
            barTouchData: BarTouchData(
              touchTooltipData: BarTouchTooltipData(
                getTooltipColor: (_) => const Color(0xFF111111),
                getTooltipItem: (group, groupIndex, rod, rodIndex) =>
                    BarTooltipItem('${labels[group.x]}\n${rod.toY.round()}$unit', fg(size: 12)),
              ),
            ),
            barGroups: [
              for (final (i, v) in values.indexed)
                BarChartGroupData(x: i, barRods: [
                  BarChartRodData(
                    toY: (v ?? 0).toDouble(),
                    width: math.max(4, 160 / values.length),
                    color: AppColors.limeLight,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                  ),
                ]),
            ],
          ),
          duration: Duration.zero,
        ),
      ),
    );
  }
}

/// A weight trend line with axes and a tooltip.
class TrendLineChart extends StatelessWidget {
  const TrendLineChart({super.key, required this.labels, required this.values, this.height = 224, this.unit = 'kg', this.label});
  final List<String> labels;
  final List<double> values;
  final double height;
  final String unit;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final minV = values.reduce(math.min) - 1;
    final maxV = values.reduce(math.max) + 1;
    final every = math.max(1, (labels.length / 5).ceil());
    return Semantics(
      label: label,
      child: SizedBox(
        height: height,
        child: LineChart(
          LineChartData(
            minY: minV.floorToDouble(),
            maxY: maxV.ceilToDouble(),
            gridData: FlGridData(
              drawVerticalLine: false,
              getDrawingHorizontalLine: (_) => FlLine(color: AppColors.whiteA(0.06), strokeWidth: 1),
            ),
            borderData: FlBorderData(show: false),
            titlesData: FlTitlesData(
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 32,
                  getTitlesWidget: (value, meta) => Text(value.toStringAsFixed(0), style: fg(size: 11, color: AppColors.white70)),
                ),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 22,
                  interval: 1,
                  getTitlesWidget: (value, meta) {
                    final i = value.toInt();
                    if (value != i || i < 0 || i >= labels.length || i % every != 0) return const SizedBox.shrink();
                    return Padding(padding: const EdgeInsets.only(top: 4), child: Text(labels[i], style: fg(size: 11, color: AppColors.white70)));
                  },
                ),
              ),
            ),
            lineTouchData: LineTouchData(
              touchTooltipData: LineTouchTooltipData(
                getTooltipColor: (_) => AppColors.obsidianWave,
                getTooltipItems: (spots) => [
                  for (final s in spots) LineTooltipItem('${labels[s.x.toInt()]}\n${s.y} $unit', fg(size: 12)),
                ],
              ),
            ),
            lineBarsData: [
              LineChartBarData(
                spots: [for (final (i, v) in values.indexed) FlSpot(i.toDouble(), v)],
                isCurved: true,
                preventCurveOverShooting: true,
                color: AppColors.limeLight,
                barWidth: 2.5,
                dotData: FlDotData(
                  getDotPainter: (spot, percent, bar, index) => FlDotCirclePainter(radius: 3, color: AppColors.limeLight, strokeWidth: 0),
                ),
              ),
            ],
          ),
          duration: Duration.zero,
        ),
      ),
    );
  }
}
