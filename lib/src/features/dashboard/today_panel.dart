import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/units.dart';
import '../../models/catalog.dart';
import '../../models/training.dart';
import '../../navigation.dart';
import '../../services/health_service.dart';
import '../../services/nutrition_service.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../widgets/progress_ring.dart';
import '../../widgets/ui.dart';

/// A common daily target; FitGuide doesn't ask for a personal one yet.
const stepGoal = 10000;

/// One tap on the water card.
const glassMl = 250;

/// "Today" on the home tab (dashboard/components/TodayPanel.tsx): the next
/// workout, food logged against the day's target, water, steps from the
/// phone or a wearable, and the streak, each a tap from where to act on it.
class TodayPanel extends StatefulWidget {
  const TodayPanel({super.key, required this.summary, required this.suggestion});
  final ProgressSummary? summary;
  final Workout? suggestion;

  @override
  State<TodayPanel> createState() => _TodayPanelState();
}

class _TodayPanelState extends State<TodayPanel> {
  DayLog? _food;
  HealthSummary? _health;
  int? _water;
  bool _waterFailed = false;

  /// Add (or take away) a glass, showing it straight away.
  Future<void> _drink(int ml) async {
    final before = _water ?? _food?.waterMl ?? 0;
    setState(() {
      _water = (before + ml).clamp(0, 20000);
      _waterFailed = false;
    });
    try {
      final total = await addWater(ml);
      if (mounted) setState(() => _water = total);
    } catch (_) {
      if (mounted) {
        setState(() {
          _water = before;
          _waterFailed = true;
        });
      }
    }
  }

  @override
  void initState() {
    super.initState();
    fetchDayLog(localToday()).then((f) {
      if (mounted) setState(() => _food = f);
    }).catchError((Object _) {});
    fetchHealth(7).then((h) {
      if (mounted) setState(() => _health = h);
    }).catchError((Object _) {});
  }

  @override
  Widget build(BuildContext context) {
    final summary = widget.summary;
    final enrollment = summary?.activeEnrollment;
    final nextDay = enrollment?.nextDay;
    final suggestion = widget.suggestion;
    final steps = _health?.today?.steps;
    final food = _food;
    final eaten = food?.totals.calories.round();
    final target = food?.targets.calories.round();
    final water = _water ?? food?.waterMl;
    final waterGoal = food?.targets.waterMl ?? 2000;
    final units = context.watch<AuthController>().user?.units ?? Units.metric;
    final lastWeek = summary == null ? const <ActivityDay>[] : summary.days.sublist(summary.days.length > 7 ? summary.days.length - 7 : 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionHeader('Today'),
        const SizedBox(height: 14),
        FgGrid(columns: 1, sm: 2, lg: 3, gap: 12, children: [
          // Next workout
          _TodayCard(
            icon: LucideIcons.calendarDays,
            color: AppColors.limeLight,
            label: nextDay != null ? 'Your plan' : 'Suggested workout',
            highlight: true,
            child: nextDay != null && enrollment != null
                ? _Next(
                    title: nextDay.title,
                    detail: 'Week ${nextDay.week}, day ${nextDay.day}${nextDay.date.isNotEmpty ? ' · ${formatDay(nextDay.date)}' : ''}',
                    onStart: () => openPlayer(context, nextDay.workoutSlug, program: ProgramContext.of(enrollment, nextDay)),
                  )
                : suggestion != null
                    ? _Next(
                        title: suggestion.title,
                        detail: '${suggestion.duration} min · ${suggestion.difficulty}',
                        onStart: () => openWorkout(context, suggestion.slug),
                        extra: LinkText('Build a plan →', size: 12, weight: FontWeight.w700, onTap: () => openHref(context, '/plan')),
                      )
                    : const Skeleton(height: 48),
          ),
          // Food
          _TodayCard(
            icon: LucideIcons.utensils,
            color: AppColors.emerald400,
            label: 'Food',
            onTap: () => openHref(context, '/nutrition'),
            action: 'Log food',
            child: _RingRow(
              ring: ProgressRing(
                value: (eaten ?? 0).toDouble(),
                goal: (target ?? 1).toDouble(),
                color: AppColors.emerald400,
                size: 80,
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text('${eaten ?? '–'}', style: fg(size: 18, weight: FontWeight.w800)),
                  Text('kcal', style: fg(size: 10, color: AppColors.white70)),
                ]),
              ),
              title: food == null ? null : (target! - eaten! > 0 ? '${target - eaten} kcal left' : 'Target reached'),
              detail: food == null ? 'Log a meal to see how today adds up.' : 'of $target today · ${food.totals.protein.round()} / ${food.targets.protein.round()} g protein',
            ),
          ),
          // Water
          _TodayCard(
            icon: LucideIcons.glassWater,
            color: AppColors.blue400,
            label: 'Water',
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              _RingRow(
                ring: ProgressRing(
                  value: (water ?? 0).toDouble(),
                  goal: waterGoal.toDouble(),
                  color: AppColors.blue400,
                  size: 80,
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Text(water == null ? '–' : '${(water / glassMl).floor()}', style: fg(size: 18, weight: FontWeight.w800)),
                    Text('glasses', style: fg(size: 10, color: AppColors.white70)),
                  ]),
                ),
                title: water == null ? null : (water >= waterGoal ? 'Goal reached' : '${volumeText(waterGoal - water, units)} to go'),
                detail: food == null
                    ? 'Tap + each time you drink a glass.'
                    : _waterFailed
                        ? 'Couldn’t save that. Check your connection.'
                        : '${volumeText(water ?? 0, units)} of ${volumeText(waterGoal, units)}',
              ),
              const SizedBox(height: 12),
              Row(children: [
                IconButton.filledTonal(
                  tooltip: 'Remove a glass of water',
                  onPressed: food == null || (water ?? 0) <= 0 ? null : () => _drink(-glassMl),
                  icon: const Icon(LucideIcons.minus, size: 16),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Semantics(
                    button: true,
                    label: 'Add a glass of water (${volumeText(glassMl, units)})',
                    excludeSemantics: true,
                    child: FgButton(label: 'Glass', icon: LucideIcons.plus, height: 40, color: AppColors.blue400, onPressed: food == null ? null : () => _drink(glassMl)),
                  ),
                ),
              ]),
            ]),
          ),
          // Steps
          _TodayCard(
            icon: LucideIcons.footprints,
            color: AppColors.sky400,
            label: 'Steps',
            onTap: () => context.read<DashboardController>().setTab(DashboardTab.progress),
            action: steps != null ? 'Health details' : 'Connect',
            child: _RingRow(
              ring: ProgressRing(
                value: (steps ?? 0).toDouble(),
                goal: stepGoal.toDouble(),
                color: AppColors.sky400,
                size: 80,
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(steps == null ? '–' : steps >= 10000 ? '${(steps / 1000).toStringAsFixed(1)}k' : '$steps', style: fg(size: 16, weight: FontWeight.w800)),
                  Text('steps', style: fg(size: 10, color: AppColors.white70)),
                ]),
              ),
              title: steps == null ? null : (steps >= stepGoal ? 'Goal reached' : '${stepGoal - steps} to go'),
              detail: steps == null ? 'Connect your phone or a wearable to count steps.' : 'Daily goal 10,000',
            ),
          ),
          // Streak
          _TodayCard(
            icon: LucideIcons.flame,
            color: AppColors.orange400,
            label: 'Streak',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
                  Text('${summary?.streakCurrent ?? '–'}', style: fg(size: 44, weight: FontWeight.w900, height: 1)),
                  const SizedBox(width: 6),
                  Text(summary?.streakCurrent == 1 ? 'day' : 'days', style: fg(size: 14, color: AppColors.white70)),
                ]),
                const SizedBox(height: 12),
                // The last seven days, a bar each.
                Semantics(
                  label: summary == null ? null : 'Trained on ${lastWeek.where((d) => d.sessions > 0).length} of the last 7 days',
                  child: Row(children: [
                    for (var i = 0; i < 7; i++) ...[
                      if (i > 0) const SizedBox(width: 6),
                      Expanded(
                        child: Container(
                          height: 8,
                          decoration: BoxDecoration(
                            color: i < lastWeek.length && lastWeek[i].sessions > 0 ? AppColors.orange400 : AppColors.whiteA(0.1),
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                    ],
                  ]),
                ),
                const SizedBox(height: 10),
                Text(
                  summary == null
                      ? ' '
                      : summary.streakCurrent > 0 && !summary.trainedToday
                          ? 'Train today to keep it going'
                          : summary.trainedToday
                              ? 'Trained today. Nice work!'
                              : 'Best: ${summary.streakLongest} days',
                  style: fg(size: 12, color: AppColors.white70),
                ),
              ],
            ),
          ),
        ]),
      ],
    );
  }
}

class _TodayCard extends StatelessWidget {
  const _TodayCard({required this.icon, required this.color, required this.label, required this.child, this.onTap, this.action, this.highlight = false});
  final IconData icon;
  final Color color;
  final String label;
  final Widget child;
  final VoidCallback? onTap;
  final String? action;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final body = Padding(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Flexible(child: Text(label.toUpperCase(), style: fg(size: 11, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 0.8))),
          ]),
          const SizedBox(height: 14),
          child,
          if (action != null) ...[
            const SizedBox(height: 12),
            Row(children: [
              Text(action!, style: fg(size: 12, weight: FontWeight.w700, color: color)),
              const SizedBox(width: 4),
              Icon(LucideIcons.arrowRight, size: 12, color: color),
            ]),
          ],
        ],
      ),
    );
    return Material(
      color: AppColors.obsidianWave,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24), side: BorderSide(color: AppColors.white30A(0.1))),
      clipBehavior: Clip.antiAlias,
      child: Ink(
        decoration: highlight ? BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [color.withValues(alpha: 0.15), Colors.transparent])) : null,
        child: onTap == null ? body : InkWell(onTap: onTap, child: body),
      ),
    );
  }
}

class _Next extends StatelessWidget {
  const _Next({required this.title, required this.detail, required this.onStart, this.extra});
  final String title;
  final String detail;
  final VoidCallback onStart;
  final Widget? extra;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: fg(size: 17, weight: FontWeight.w800, height: 1.3)),
        const SizedBox(height: 4),
        Text(detail, style: fg(size: 12, color: AppColors.white70)),
        const SizedBox(height: 14),
        Wrap(
          spacing: 14,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            FgButton(label: 'Start', icon: LucideIcons.play, height: 38, radius: 12, fontSize: 12, fontWeight: FontWeight.w800, uppercase: true, padding: const EdgeInsets.symmetric(horizontal: 16), onPressed: onStart),
            ?extra,
          ],
        ),
      ],
    );
  }
}

class _RingRow extends StatelessWidget {
  const _RingRow({required this.ring, required this.title, required this.detail});
  final Widget ring;
  final String? title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        ring,
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (title != null) Text(title!, style: fg(size: 14, weight: FontWeight.w700)),
              Text(detail, style: fg(size: 12, color: AppColors.white70)),
            ],
          ),
        ),
      ],
    );
  }
}
