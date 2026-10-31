import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/json.dart';
import '../../models/training.dart';
import '../../navigation.dart';
import '../../services/training_service.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../widgets/charts.dart';
import '../../widgets/forms.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';

const _accent = AppColors.limeLight;

const _measurements = [
  ('weightKg', 'Weight', 'kg'),
  ('bodyFatPct', 'Body fat', '%'),
  ('waistCm', 'Waist', 'cm'),
  ('hipsCm', 'Hips', 'cm'),
  ('chestCm', 'Chest', 'cm'),
  ('armCm', 'Arm', 'cm'),
  ('thighCm', 'Thigh', 'cm'),
];

/// Progress from the user's logged sessions, program enrolment and body
/// metrics (features/progress/ProgressView.tsx).
class ProgressView extends StatefulWidget {
  const ProgressView({super.key});

  @override
  State<ProgressView> createState() => _ProgressViewState();
}

class _ProgressViewState extends State<ProgressView> {
  ProgressData? _data;
  List<BodyMetric> _metrics = [];
  String? _error;
  String? _loadedFor;

  Future<void> _load() async {
    try {
      final results = await Future.wait([fetchProgressSummary(), fetchBodyMetrics()]);
      if (!mounted) return;
      setState(() {
        _data = results[0] as ProgressData;
        _metrics = results[1] as List<BodyMetric>;
        _error = null;
      });
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    }
  }

  /// Load for this account, and again whenever training data changes.
  void _maybeLoad(AuthController auth, int dataVersion) {
    final id = auth.hasAccount ? auth.user!.id : null;
    final key = id == null ? null : '$id:$dataVersion';
    if (key == _loadedFor) return;
    final sameUser = _loadedFor?.startsWith('$id:') ?? false;
    _loadedFor = key;
    if (!sameUser) _data = null;
    if (id != null) _load();
  }

  Future<void> _deleteSession(SessionRecord s) async {
    final ok = await confirmDialog(
      context,
      title: 'Delete this session?',
      message: '${s.workoutTitle} on ${formatDateTime(s.completedAt)} will be removed from your history, streaks and records.',
      confirmText: 'Delete',
      danger: true,
    );
    if (!ok) return;
    try {
      await deleteSession(s.id);
      if (mounted) context.read<DashboardController>().dataChanged();
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    _maybeLoad(auth, context.select<DashboardController, int>((d) => d.dataVersion));
    if (!auth.hasAccount) {
      return FgCard(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(LucideIcons.activity, size: 40, color: AppColors.limeLight),
            const SizedBox(height: 16),
            Text('Track your progress', style: fg(size: 24, weight: FontWeight.w800)),
            const SizedBox(height: 16),
            Text(
              'Create an account to save your workouts and see your streaks, personal records and body measurements over time.',
              textAlign: TextAlign.center,
              style: fg(size: 16, color: AppColors.white70),
            ),
            const SizedBox(height: 16),
            FgButton(label: 'Create an account', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: auth.startSignUp),
          ],
        ),
      );
    }
    final data = _data;
    if (_error != null && data == null) {
      return FgCard(
        padding: const EdgeInsets.all(20),
        borderColor: AppColors.red500.withValues(alpha: 0.3),
        child: Row(
          children: [
            Expanded(child: ErrorLine(_error!, size: 16)),
            const SizedBox(width: 12),
            FgButton(label: 'Retry', style: FgButtonStyle.ghost, height: 36, fontSize: 14, fontWeight: FontWeight.w700, onPressed: _load),
          ],
        ),
      );
    }
    if (data == null) return const LoadingRow('Loading your progress…', padding: EdgeInsets.symmetric(vertical: 40));
    final summary = data.summary;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: spaced([
        const PageTitle('Your progress'),
        if (_error != null) ErrorLine(_error!),
        _StatTiles(summary: summary),
        if (summary.total('sessions') == 0)
          FgCard(
            padding: const EdgeInsets.all(20),
            borderColor: AppColors.limeLight.withValues(alpha: 0.3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('No sessions yet. Finish a workout and save it to start your streak.', style: fg(size: 16, color: AppColors.white70)),
                const SizedBox(height: 16),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  FgButton(label: 'Find a workout', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 40, onPressed: () => openHref(context, '/workouts')),
                  FgButton(label: 'Browse programs', style: FgButtonStyle.ghost, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 40, onPressed: () => openHref(context, '/programs')),
                ]),
              ],
            ),
          ),
        ...pairs(context, WeeklyActivityChart(
              days: summary.days.sublist(math.max(0, summary.days.length - 7)),
              previous: summary.days.sublist(math.max(0, summary.days.length - 14), math.max(0, summary.days.length - 7)),
            ), _ProgramPanel(enrollment: summary.activeEnrollment)),
        if (summary.days.isNotEmpty) _ActivityCalendar(days: summary.days),
        ...pairs(context, _PersonalRecords(records: summary.personalRecords), _RecentSessions(sessions: data.recentSessions, onDelete: _deleteSession)),
        _BodyMetrics(
          body: summary.body,
          metrics: _metrics,
          onSaved: (user) async {
            if (user != null) auth.updateUser(user);
            await _load();
          },
          onDelete: (id) async {
            try {
              await deleteBodyMetric(id);
              await _load();
            } catch (err) {
              if (mounted) setState(() => _error = '$err');
            }
          },
        ),
      ], 24),
    );
  }
}

/// A titled card (`Panel`).
class Panel extends StatelessWidget {
  const Panel({super.key, required this.title, required this.child, this.icon, this.action});
  final String title;
  final IconData? icon;
  final Widget? action;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return FgCard(
      radius: 24,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              if (icon != null) ...[Icon(icon, size: 20, color: AppColors.limeLight), const SizedBox(width: 8)],
              Expanded(child: Semantics(header: true, child: Text(title, style: fg(size: 16, weight: FontWeight.w700)))),
              if (action != null) action!,
            ],
          ),
          const SizedBox(height: 20),
          child,
        ],
      ),
    );
  }
}

class _StatTiles extends StatelessWidget {
  const _StatTiles({required this.summary});
  final ProgressSummary summary;

  @override
  Widget build(BuildContext context) {
    final s = summary;
    final tiles = [
      ('Sessions this week', '${s.week('sessions')}', '${s.week('activeDays')} active day${s.week('activeDays') == 1 ? '' : 's'}', LucideIcons.dumbbell, const Color(0xFF00C4B4)),
      ('Minutes this week', '${s.week('minutes')}', '${s.week('calories')} kcal', LucideIcons.clock, const Color(0xFF8B7CF6)),
      ('Day streak', '${s.streakCurrent}', s.streakCurrent > 0 && !s.trainedToday ? 'Train today to keep it' : 'Best: ${s.streakLongest}', LucideIcons.zap, const Color(0xFFFB923C)),
      ('Total sessions', '${s.total('sessions')}', '${s.total('minutes')} min · ${s.total('calories')} kcal', LucideIcons.flame, const Color(0xFFC084FC)),
    ];
    return FgGrid(
      columns: 2,
      lg: 4,
      gap: 16,
      children: [
        for (final (label, value, sub, icon, color) in tiles)
          FgCard(
            radius: 20,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(color: AppColors.noirEclipse, borderRadius: BorderRadius.circular(8)),
                  child: Icon(icon, size: 20, color: color),
                ),
                const SizedBox(height: 12),
                Text(value, style: fg(size: 24, weight: FontWeight.w700, height: 1.2)),
                Text(label, style: fg(size: 12, color: AppColors.white70)),
                const SizedBox(height: 2),
                Text(sub, style: fg(size: 11, color: AppColors.white70)),
              ],
            ),
          ),
      ],
    );
  }
}

/// Three round steps that cover the busiest day: 0 / 10 / 20 / 30, 0 / 20 / 40 / 60 and so on.
List<int> minuteTicks(int peak) {
  const steps = [10, 15, 20, 30, 45, 60, 90, 120];
  final step = steps.firstWhere((s) => s * 3 >= peak, orElse: () => (peak / 3 / 60).ceil() * 60);
  return [0, step, step * 2, step * 3];
}

String _workoutsLabel(int n) => '$n workout${n == 1 ? '' : 's'}';

/// Minutes per day for the last 7 days (WeeklyChart in ProgressView.tsx): the
/// week's total up top, compared with the 7 days before, then one column per
/// day on a light grid. Only the best day carries its number; tapping a day
/// shows its details.
class WeeklyActivityChart extends StatefulWidget {
  const WeeklyActivityChart({super.key, required this.days, required this.previous});
  final List<ActivityDay> days;
  final List<ActivityDay> previous;

  @override
  State<WeeklyActivityChart> createState() => _WeeklyActivityChartState();
}

class _WeeklyActivityChartState extends State<WeeklyActivityChart> {
  static const _plot = 160.0;
  int? _active;

  void _toggle(int i) => setState(() => _active = _active == i ? null : i);

  Widget _tooltip(ActivityDay d) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: AppColors.noirEclipse,
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: AppColors.whiteA(0.2)),
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(formatDay(d.date), style: fg(size: 11, weight: FontWeight.w700)),
        Text(d.minutes > 0 ? '${d.minutes} min · ${_workoutsLabel(d.sessions)}' : 'Rest day', style: fg(size: 11, color: AppColors.white70)),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final days = widget.days;
    final total = days.fold<int>(0, (n, d) => n + d.minutes);
    final before = widget.previous.fold<int>(0, (n, d) => n + d.minutes);
    final workouts = days.fold<int>(0, (n, d) => n + d.sessions);
    final peak = days.fold<int>(0, (m, d) => math.max(m, d.minutes));
    final peakIndex = peak > 0 ? days.lastIndexWhere((d) => d.minutes == peak) : -1;
    final ticks = minuteTicks(peak);
    final top = ticks.last;
    final change = total - before;
    final trend = change > 0
        ? LucideIcons.trendingUp
        : change < 0
        ? LucideIcons.trendingDown
        : null;
    final comparison = widget.previous.isEmpty || (before == 0 && total == 0)
        ? _workoutsLabel(workouts)
        : change == 0
        ? 'Same as the week before'
        : '${change.abs()} min ${change > 0 ? 'more' : 'less'} than the week before';
    double y(int minutes) => minutes / top * _plot;

    return Panel(
      title: 'Weekly activity',
      icon: LucideIcons.activity,
      action: Text('Last 7 days', style: fg(size: 12, color: AppColors.white70)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.end,
            spacing: 16,
            runSpacing: 4,
            children: [
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '$total',
                      style: fg(size: 36, weight: FontWeight.w800, height: 1),
                    ),
                    TextSpan(
                      text: ' min',
                      style: fg(size: 16, weight: FontWeight.w700, color: AppColors.white70),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (trend != null) ...[Icon(trend, size: 16, color: change > 0 ? AppColors.limeLight : AppColors.amber300), const SizedBox(width: 6)],
                    Flexible(
                      child: Text(comparison, style: fg(size: 14, color: AppColors.white70)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Semantics(
            label: 'Minutes trained per day over the last 7 days: ${days.map((d) => '${formatWeekday(d.date)} ${d.minutes}').join(', ')}',
            child: ExcludeSemantics(
              child: SizedBox(
                height: _plot,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(
                      width: 28,
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          for (final t in ticks)
                            Positioned(
                              right: 0,
                              bottom: y(t) - 6,
                              child: Text('$t', style: fg(size: 10, color: AppColors.white70, height: 1.2)),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: LayoutBuilder(
                        builder: (context, c) {
                          final col = c.maxWidth / days.length;
                          final active = _active;
                          return Stack(
                            clipBehavior: Clip.none,
                            children: [
                              for (final t in ticks)
                                Positioned(
                                  left: 0,
                                  right: 0,
                                  bottom: y(t),
                                  child: Container(height: 1, color: AppColors.whiteA(t == 0 ? 0.25 : 0.1)),
                                ),
                              Row(
                                children: [
                                  for (final (i, d) in days.indexed)
                                    Expanded(
                                      child: GestureDetector(
                                        behavior: HitTestBehavior.opaque,
                                        onTap: () => _toggle(i),
                                        child: Align(
                                          alignment: Alignment.bottomCenter,
                                          child: d.minutes > 0
                                              ? AnimatedContainer(
                                                  duration: const Duration(milliseconds: 500),
                                                  width: math.min(24, col - 8),
                                                  height: y(d.minutes),
                                                  decoration: BoxDecoration(
                                                    color: _accent.withValues(alpha: active == null || active == i ? 1 : 0.5),
                                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                                                  ),
                                                )
                                              : const SizedBox.shrink(),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              if (peakIndex >= 0 && active != peakIndex)
                                Positioned(
                                  left: peakIndex * col,
                                  width: col,
                                  bottom: y(peak) + 4,
                                  child: IgnorePointer(
                                    child: Text(
                                      '$peak',
                                      textAlign: TextAlign.center,
                                      style: fg(size: 11, weight: FontWeight.w700),
                                    ),
                                  ),
                                ),
                              if (active != null)
                                // Kept inside the chart: the first days open to the right, the last to the left.
                                if (active < 2)
                                  Positioned(left: active * col, bottom: y(days[active].minutes) + 6, child: _tooltip(days[active]))
                                else if (active > days.length - 3)
                                  Positioned(right: (days.length - 1 - active) * col, bottom: y(days[active].minutes) + 6, child: _tooltip(days[active]))
                                else
                                  Positioned(
                                    left: (active - 1) * col,
                                    width: col * 3,
                                    bottom: y(days[active].minutes) + 6,
                                    child: Center(child: _tooltip(days[active])),
                                  ),
                            ],
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          ExcludeSemantics(
            child: Row(
              children: [
                const SizedBox(width: 36),
                for (final (i, d) in days.indexed)
                  Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => _toggle(i),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Text(
                          i == days.length - 1 ? 'Today' : formatWeekday(d.date),
                          textAlign: TextAlign.center,
                          style: fg(size: 11, weight: i == days.length - 1 ? FontWeight.w700 : FontWeight.w400, color: i == days.length - 1 ? AppColors.white : AppColors.white70),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgramPanel extends StatelessWidget {
  const _ProgramPanel({required this.enrollment});
  final Plan? enrollment;

  @override
  Widget build(BuildContext context) {
    final e = enrollment;
    if (e == null) {
      return Panel(
        title: 'Program',
        icon: LucideIcons.calendarDays,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Follow a program or build a personal plan to get a schedule and see how consistently you stick to it.', style: fg(size: 14, color: AppColors.white70)),
            const SizedBox(height: 16),
            Wrap(spacing: 8, runSpacing: 8, children: [
              FgButton(label: 'Build my plan', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 40, onPressed: () => openHref(context, '/plan')),
              FgButton(label: 'Browse programs', style: FgButtonStyle.ghost, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 40, onPressed: () => openHref(context, '/programs')),
            ]),
          ],
        ),
      );
    }
    final next = e.nextDay;
    Widget mini(String value, String label) => Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              Text(value, style: fg(size: 18, weight: FontWeight.w700)),
              Text(label.toUpperCase(), style: fg(size: 10, color: AppColors.white70, letterSpacing: 0.5)),
            ]),
          ),
        );
    return Panel(
      title: e.programTitle,
      icon: LucideIcons.calendarDays,
      action: LinkText('View schedule', size: 12, weight: FontWeight.w700, onTap: () => openHref(context, e.isPersonalPlan ? '/plan' : '/programs/${e.programSlug}')),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            mini('${e.currentWeek}/${e.weeks ?? '?'}', 'Week'),
            const SizedBox(width: 12),
            mini('${e.completedCount}/${e.totalDays}', 'Sessions'),
            const SizedBox(width: 12),
            mini(e.adherencePct == null ? '–' : '${e.adherencePct}%', 'On schedule'),
          ]),
          const SizedBox(height: 20),
          FgProgressBar(percent: e.percentComplete.toDouble(), label: 'Program completed'),
          const SizedBox(height: 20),
          if (next != null)
            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('NEXT · ${formatDay(next.date).toUpperCase()}', style: fg(size: 10, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 0.5)),
                  Text(next.title, style: fg(size: 14, weight: FontWeight.w600)),
                ]),
              ),
              FgButton(
                label: 'Start',
                icon: LucideIcons.play,
                radius: 12,
                fontSize: 14,
                fontWeight: FontWeight.w700,
                height: 40,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                onPressed: () => openPlayer(context, next.workoutSlug, program: ProgramContext.of(e, next)),
              ),
            ])
          else
            Text('All sessions done.', style: fg(size: 14, color: AppColors.white70)),
        ],
      ),
    );
  }
}

/// 12-week calendar, one column per week (Monday first), shaded by minutes trained.
class _ActivityCalendar extends StatelessWidget {
  const _ActivityCalendar({required this.days});
  final List<ActivityDay> days;

  Color _shade(ActivityDay? d) {
    if (d == null) return Colors.transparent;
    if (d.sessions == 0) return AppColors.whiteA(0.06);
    if (d.minutes >= 45) return _accent;
    if (d.minutes >= 20) return _accent.withAlpha(0xAA);
    return _accent.withAlpha(0x66);
  }

  @override
  Widget build(BuildContext context) {
    final firstWeekday = parseYmd(days.first.date).weekday - 1; // Monday = 0
    final cells = <ActivityDay?>[...List<ActivityDay?>.filled(firstWeekday, null), ...days];
    final columns = (cells.length / 7).ceil();
    final active = days.where((d) => d.sessions > 0).length;
    return Panel(
      title: 'Activity',
      icon: LucideIcons.calendarDays,
      action: Text('$active active days in 12 weeks', style: fg(size: 12, color: AppColors.white70)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            label: 'Calendar of the last 12 weeks: $active days with training',
            child: ExcludeSemantics(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var c = 0; c < columns; c++)
                      Padding(
                        padding: const EdgeInsets.only(right: 4),
                        child: Column(
                          children: [
                            for (var r = 0; r < 7; r++)
                              Builder(builder: (context) {
                                final i = c * 7 + r;
                                final d = i < cells.length ? cells[i] : null;
                                return Tooltip(
                                  message: d == null ? '' : '${formatDay(d.date)}: ${d.sessions > 0 ? '${d.sessions} session${d.sessions > 1 ? 's' : ''}, ${d.minutes} min' : 'rest'}',
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 4),
                                    width: 18,
                                    height: 18,
                                    decoration: BoxDecoration(color: _shade(d), borderRadius: BorderRadius.circular(4)),
                                  ),
                                );
                              }),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          ExcludeSemantics(
            child: Row(children: [
              Text('Less', style: fg(size: 11, color: AppColors.white70)),
              const SizedBox(width: 8),
              for (final c in [AppColors.whiteA(0.06), _accent.withAlpha(0x66), _accent.withAlpha(0xAA), _accent]) ...[
                Container(width: 12, height: 12, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(3))),
                const SizedBox(width: 8),
              ],
              Text('More', style: fg(size: 11, color: AppColors.white70)),
            ]),
          ),
        ],
      ),
    );
  }
}

class _PersonalRecords extends StatelessWidget {
  const _PersonalRecords({required this.records});
  final List<PersonalRecord> records;

  @override
  Widget build(BuildContext context) {
    return Panel(
      title: 'Personal records',
      icon: LucideIcons.trophy,
      child: records.isEmpty
          ? Text(
              'Log reps or weights in the workout player (or hold a timed exercise like a plank) and your best efforts will show up here.',
              style: fg(size: 14, color: AppColors.white70),
            )
          : Column(
              children: [
                for (final (i, r) in records.take(10).indexed)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: AppColors.white30A(0.1)))),
                    child: Row(children: [
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(r.exerciseName, overflow: TextOverflow.ellipsis, style: fg(size: 14, weight: FontWeight.w600)),
                          Text('${formatDay(r.achievedAt.length >= 10 ? r.achievedAt.substring(0, 10) : r.achievedAt)} · ${r.workoutTitle}', style: fg(size: 11, color: AppColors.white70)),
                        ]),
                      ),
                      const SizedBox(width: 16),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text(formatRecord(r), style: fg(size: 14, weight: FontWeight.w700, color: AppColors.amber300)),
                        if (r.estimatedOneRepMaxKg != null) Text('≈ ${numText(r.estimatedOneRepMaxKg)} kg 1RM', style: fg(size: 11, color: AppColors.white70)),
                      ]),
                    ]),
                  ),
              ],
            ),
    );
  }
}

class _RecentSessions extends StatelessWidget {
  const _RecentSessions({required this.sessions, required this.onDelete});
  final List<SessionRecord> sessions;
  final ValueChanged<SessionRecord> onDelete;

  @override
  Widget build(BuildContext context) {
    return Panel(
      title: 'Recent sessions',
      icon: LucideIcons.dumbbell,
      child: sessions.isEmpty
          ? Text('Your saved workouts will appear here.', style: fg(size: 14, color: AppColors.white70))
          : Column(
              children: [
                for (final (i, s) in sessions.indexed)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: AppColors.white30A(0.1)))),
                    child: Row(children: [
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          InkWell(onTap: () => openWorkout(context, s.workoutSlug), child: Text(s.workoutTitle, overflow: TextOverflow.ellipsis, style: fg(size: 14, weight: FontWeight.w600))),
                          Text(
                            [
                              formatDateTime(s.completedAt),
                              '${(s.durationSec / 60).round()} min',
                              if (s.calories != null) '${s.calories} kcal',
                              if (s.avgHr != null) '${s.avgHr} bpm avg',
                              if (s.perceivedEffort != null) 'RPE ${s.perceivedEffort}',
                              if (s.status == 'partial') 'partial',
                              if (s.enrollmentId != null) 'program W${s.programWeek}D${s.programDay}',
                            ].join(' · '),
                            style: fg(size: 11, color: AppColors.white70),
                          ),
                        ]),
                      ),
                      IconButton(
                        tooltip: 'Delete ${s.workoutTitle} session',
                        onPressed: () => onDelete(s),
                        icon: const Icon(LucideIcons.trash2, size: 16, color: AppColors.white70),
                      ),
                    ]),
                  ),
              ],
            ),
    );
  }
}

class _BodyMetrics extends StatefulWidget {
  const _BodyMetrics({required this.body, required this.metrics, required this.onSaved, required this.onDelete});
  final BodySummary body;
  final List<BodyMetric> metrics;
  final Future<void> Function(Json? user) onSaved;
  final Future<void> Function(String id) onDelete;

  @override
  State<_BodyMetrics> createState() => _BodyMetricsState();
}

class _BodyMetricsState extends State<_BodyMetrics> {
  String _date = localToday();
  final _fields = {for (final (key, _, _) in _measurements) key: TextEditingController()};
  bool _showMore = false;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    for (final c in _fields.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final entry = <String, dynamic>{'date': _date};
      for (final (key, _, _) in _measurements) {
        final value = double.tryParse(_fields[key]!.text);
        if (value != null) entry[key] = value;
      }
      final result = await logBodyMetric(entry);
      for (final c in _fields.values) {
        c.clear();
      }
      await widget.onSaved(result['user'] == null ? null : asJson(result['user']));
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(context: context, initialDate: parseYmd(_date), firstDate: DateTime(2000), lastDate: DateTime.now());
    if (picked != null) setState(() => _date = ymd(picked));
  }

  @override
  Widget build(BuildContext context) {
    final body = widget.body;
    final latest = body.latestWeight;
    final change = body.weightChangeKg;
    final others = _measurements.where((m) => m.$1 != 'weightKg' && body.latestMeasurements.containsKey(m.$1)).toList();
    final shown = _showMore ? _measurements : _measurements.take(1).toList();
    final overview = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.end,
          spacing: 24,
          runSpacing: 4,
          children: [
            Text.rich(TextSpan(children: [
              TextSpan(text: latest != null ? '${numText(latest.weightKg)} kg' : '–', style: fg(size: 30, weight: FontWeight.w700)),
              if (latest != null) TextSpan(text: '  ${formatDay(latest.date)}', style: fg(size: 12, color: AppColors.white70)),
            ])),
            if (change != null && body.weightChangeSince != null)
              Text(
                '${change > 0 ? '+' : ''}${numText(change)} kg since ${formatDay(body.weightChangeSince!)}',
                style: fg(size: 14, weight: FontWeight.w700, color: change <= 0 ? AppColors.emerald400 : AppColors.orange300),
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (body.weights.length >= 2)
          TrendLineChart(
            labels: [for (final w in body.weights) formatDayMonth(w.date)],
            values: [for (final w in body.weights) w.weightKg],
            label: 'Weight trend: ${body.weights.length} weigh-ins',
          )
        else
          Text('Log your weight on two or more days to see a trend.', style: fg(size: 14, color: AppColors.white70)),
        if (others.isNotEmpty) ...[
          const SizedBox(height: 16),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final (key, label, unit) in others)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(999)),
                child: Text.rich(TextSpan(children: [
                  TextSpan(text: '$label ', style: fg(size: 12, color: AppColors.white70)),
                  TextSpan(text: '${numText(body.latestMeasurements[key]!.value)} $unit', style: fg(size: 12, weight: FontWeight.w700)),
                ])),
              ),
          ]),
        ],
      ],
    );
    final log = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(children: [
          const Icon(LucideIcons.ruler, size: 16, color: AppColors.limeLight),
          const SizedBox(width: 8),
          Flexible(child: Text('Log measurements', style: fg(size: 14, weight: FontWeight.w700))),
        ]),
        const SizedBox(height: 12),
        Material(
          color: AppColors.noirEclipse,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: AppColors.white30A(0.2))),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _pickDate,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(children: [
                Expanded(child: Text(formatDay(_date), style: fg(size: 14), semanticsLabel: 'Date, ${formatDayLong(_date)}')),
                const Icon(LucideIcons.calendarDays, size: 16, color: AppColors.white70),
              ]),
            ),
          ),
        ),
        const SizedBox(height: 12),
        FgGrid(
          columns: 2,
          gap: 8,
          children: [
            for (final (key, label, unit) in shown)
              NumberField(controller: _fields[key]!, hint: label, suffixText: unit, semanticLabel: '$label ($unit)', border: AppColors.white30A(0.2)),
          ],
        ),
        const SizedBox(height: 12),
        Align(alignment: Alignment.centerLeft, child: LinkText(_showMore ? 'Fewer fields' : 'More measurements', size: 12, weight: FontWeight.w700, onTap: () => setState(() => _showMore = !_showMore))),
        if (_error != null) ...[const SizedBox(height: 8), ErrorLine(_error!, size: 12)],
        const SizedBox(height: 12),
        FgButton(label: 'Save', loading: _saving, expand: true, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 44, onPressed: _saving ? null : _submit),
        if (widget.metrics.isNotEmpty) ...[
          const SizedBox(height: 20),
          for (final (i, m) in widget.metrics.indexed)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 4),
              decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: AppColors.white30A(0.1)))),
              child: Row(children: [
                SizedBox(width: 96, child: Text(formatDay(m.date), style: fg(size: 12, color: AppColors.white70))),
                Expanded(
                  child: Text(
                    [for (final (key, _, unit) in _measurements) if (m.value(key) != null) '${numText(m.value(key))} $unit'].join(' · '),
                    overflow: TextOverflow.ellipsis,
                    style: fg(size: 12),
                  ),
                ),
                IconButton(
                  tooltip: 'Delete entry for ${formatDay(m.date)}',
                  onPressed: () => widget.onDelete(m.id),
                  icon: const Icon(LucideIcons.trash2, size: 14, color: AppColors.white70),
                ),
              ]),
            ),
        ],
      ],
    );
    return Panel(
      title: 'Body',
      icon: LucideIcons.scale,
      // The trend beside the log form on a wide tablet (`lg:grid-cols-[1fr_320px]`).
      child: atLeast(context, Breakpoints.lg)
          ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: overview), const SizedBox(width: 32), SizedBox(width: 320, child: log)])
          : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [overview, const SizedBox(height: 24), log]),
    );
  }
}
