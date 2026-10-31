import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/training.dart';
import '../../navigation.dart';
import '../../widgets/ui.dart';

const _weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const _weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/// This week, Monday to Sunday: what's planned each day and how it went
/// (WeekStrip in features/plan/PlanView.tsx). Tap a planned day to start it.
class WeekStrip extends StatelessWidget {
  const WeekStrip({super.key, required this.plan});
  final Plan plan;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final monday = today.subtract(Duration(days: today.weekday - 1));
    final days = [for (var i = 0; i < 7; i++) monday.add(Duration(days: i))];
    final byDate = {for (final d in plan.schedule) d.date: d};
    final planned = days.where((d) => byDate.containsKey(ymd(d))).length;
    final done = days.where((d) => byDate[ymd(d)]?.status == 'done').length;

    return FgCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Expanded(child: Semantics(header: true, child: Text('This week', style: fg(size: 16, weight: FontWeight.w800)))),
            Text(planned > 0 ? '$done of $planned sessions done' : 'A rest week', style: fg(size: 12, color: AppColors.white70)),
          ]),
          const SizedBox(height: 14),
          Row(
            children: [
              for (final (i, d) in days.indexed) ...[
                if (i > 0) const SizedBox(width: 6),
                Expanded(child: _Day(date: d, index: i, day: byDate[ymd(d)], isToday: d == today, plan: plan)),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _Day extends StatelessWidget {
  const _Day({required this.date, required this.index, required this.day, required this.isToday, required this.plan});
  final DateTime date;
  final int index;
  final PlanDay? day;
  final bool isToday;
  final Plan plan;

  @override
  Widget build(BuildContext context) {
    final state = day == null ? 'rest' : (day!.status == 'done' ? 'done' : day!.status == 'missed' ? 'missed' : 'planned');
    final (Color bg, Color text, Color? border, Color dot) = switch (state) {
      'done' => (AppColors.limeLight, AppColors.noirEclipse, null, AppColors.noirEclipse.withValues(alpha: 0.6)),
      'missed' => (AppColors.red500.withValues(alpha: 0.15), AppColors.red400, AppColors.red500.withValues(alpha: 0.3), AppColors.red400),
      'planned' => (AppColors.whiteA(0.05), AppColors.white, AppColors.white30A(0.2), AppColors.limeLight),
      _ => (Colors.transparent, AppColors.white70, null, Colors.transparent),
    };
    final label = '${_weekdayNames[index]}: ${day == null ? 'rest day' : '${day!.title}, ${state == 'planned' ? (isToday ? 'today' : 'planned') : state}'}';
    final cell = Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: isToday ? Border.all(color: AppColors.limeLight, width: 2) : border == null ? null : Border.all(color: border),
      ),
      child: Column(
        children: [
          Text(_weekdays[index], style: fg(size: 10, weight: FontWeight.w700, color: text.withValues(alpha: 0.8))),
          const SizedBox(height: 2),
          FittedBox(fit: BoxFit.scaleDown, child: Text('${date.day}', style: fg(size: 16, weight: FontWeight.w800, color: text))),
          const SizedBox(height: 4),
          Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: dot)),
        ],
      ),
    );
    final d = day;
    return Semantics(
      label: label,
      button: d != null && d.status != 'done',
      excludeSemantics: true,
      child: d != null && d.status != 'done'
          ? Material(
              color: Colors.transparent,
              child: InkWell(borderRadius: BorderRadius.circular(12), onTap: () => openPlayer(context, d.workoutSlug, program: ProgramContext.of(plan, d)), child: cell),
            )
          : cell,
    );
  }
}
