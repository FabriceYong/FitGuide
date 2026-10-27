import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/images.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../models/training.dart';
import '../../navigation.dart';
import '../../services/training_service.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';
import '../common/site_page.dart';
import 'schedule.dart';

/// A program's page: overview, enrolment and the week-by-week schedule with
/// the user's progress overlaid (app/programs/[slug] → ProgramDetail.js).
class ProgramDetailScreen extends StatefulWidget {
  const ProgramDetailScreen({super.key, required this.slug});
  final String slug;

  @override
  State<ProgramDetailScreen> createState() => _ProgramDetailScreenState();
}

class _ProgramDetailScreenState extends State<ProgramDetailScreen> {
  ProgramDetail? _program;
  bool _notFound = false;
  String? _loadError;
  List<Plan>? _enrollments;
  bool _busy = false;
  String? _error;
  String? _conflict;
  String _startDate = localToday();

  @override
  void initState() {
    super.initState();
    fetchProgram(widget.slug).then((p) {
      if (mounted) setState(() => p == null ? _notFound = true : _program = p);
    }).catchError((Object err) {
      if (mounted) setState(() => _loadError = '$err');
    });
  }

  int? _seenVersion;

  /// (Re)load the user's enrollments, again whenever training data changes.
  void _syncEnrollments(bool hasAccount, int dataVersion) {
    if (!hasAccount || dataVersion == _seenVersion) return;
    _seenVersion = dataVersion;
    _loadEnrollments();
  }

  Future<void> _loadEnrollments() async {
    try {
      final data = await fetchEnrollments();
      if (mounted) setState(() => _enrollments = data.enrollments);
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    }
  }

  Future<void> _enroll({bool replace = false}) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await enrollInProgram(widget.slug, replace: replace, startDate: _startDate);
      _conflict = null;
      if (mounted) context.read<DashboardController>().dataChanged();
    } catch (err) {
      if (err is ApiError && err.code == 'ACTIVE_ENROLLMENT') {
        _conflict = err.message;
      } else {
        _error = '$err';
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _leave(Plan mine, String title) async {
    final ok = await confirmDialog(context, title: 'Leave program?', message: 'Leave $title? Your completed sessions stay in your history.', confirmText: 'Leave', danger: true);
    if (!ok) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await leaveProgram(mine.id);
      if (mounted) context.read<DashboardController>().dataChanged();
    } catch (err) {
      _error = '$err';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: parseYmd(_startDate),
      firstDate: now.subtract(const Duration(days: 365)),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _startDate = ymd(picked));
  }

  @override
  Widget build(BuildContext context) {
    _syncEnrollments(context.watch<AuthController>().hasAccount, context.select<DashboardController, int>((d) => d.dataVersion));
    final program = _program;
    if (_notFound || _loadError != null || program == null) {
      return SitePage(
        active: '/programs',
        child: _notFound
            ? Text('Program not found.', style: fg(size: 16, color: AppColors.white70))
            : _loadError != null
                ? ErrorBox(_loadError!)
                : const LoadingRow('Loading program…'),
      );
    }
    final hasAccount = context.watch<AuthController>().hasAccount;
    final active = _enrollments?.where((e) => e.status == 'active').firstOrNull;
    final mine = active?.programSlug == program.slug ? active : null;
    final scheduled = {for (final d in mine?.schedule ?? const <PlanDay>[]) '${d.week}:${d.day}': d};
    final color = levelColors[program.level] ?? AppColors.limeLight;

    return SitePage(
      active: '/programs',
      maxWidth: 1100,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(alignment: Alignment.centerLeft, child: LinkText('← ALL PROGRAMS', size: 12, color: AppColors.white70, weight: FontWeight.w700, onTap: () => openHref(context, '/programs'))),
          const SizedBox(height: 16),
          Wrap(spacing: 8, children: [
            Pill(program.level, color: color, background: color.withAlpha(0x20)),
            Pill(program.goal, color: AppColors.white70, background: AppColors.whiteA(0.05)),
          ]),
          const SizedBox(height: 16),
          PageTitle(program.title, size: atLeast(context, Breakpoints.md) ? 36 : 30),
          if (program.createdBy != null) ...[const SizedBox(height: 8), Text('By ${program.createdBy}, FitGuide creator', style: fg(size: 14, color: AppColors.white70))],
          const SizedBox(height: 16),
          Text(program.description, style: fg(size: 16, color: AppColors.white70, height: 1.6)),
          const SizedBox(height: 16),
          Wrap(spacing: 20, runSpacing: 8, children: [
            MetaText('${program.weeks} weeks', icon: LucideIcons.calendarDays),
            MetaText('${program.daysPerWeek} sessions a week', icon: LucideIcons.target),
            MetaText('${program.days.length} sessions in total', icon: LucideIcons.check),
          ]),
          const SizedBox(height: 24),
          FgCard(padding: const EdgeInsets.all(20), child: _enrollment(program, hasAccount, active, mine)),
          const SizedBox(height: 24),
          Semantics(header: true, child: Text('Schedule', style: fg(size: 20, weight: FontWeight.w800))),
          for (var week = 1; week <= program.weeks; week++) ...[
            const SizedBox(height: 16),
            Text('WEEK $week', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 1.5)),
            const SizedBox(height: 8),
            ...spaced([
              for (final d in program.days.where((d) => d.week == week))
                Builder(builder: (context) {
                  final day = scheduled['${d.week}:${d.day}'];
                  final workout = program.workouts[d.workoutSlug];
                  return ScheduleRow(
                    day: d.day,
                    title: d.title,
                    date: day != null ? formatDay(day.date) : null,
                    status: day?.status,
                    notes: d.notes,
                    onOpen: () => openWorkout(context, d.workoutSlug),
                    meta: [
                      if (workout != null) MetaText('${workout.duration} min', icon: LucideIcons.clock),
                      if (workout?.calories != null && workout!.calories! > 0) MetaText('${workout.calories} kcal', icon: LucideIcons.flame),
                      if (workout != null) MetaText(workout.category),
                    ],
                    playLabel: 'Start week ${d.week} day ${d.day}',
                    onPlay: mine != null && day != null && day.status != 'done' ? () => openPlayer(context, day.workoutSlug, program: ProgramContext.of(mine, day)) : null,
                  );
                }),
            ], 8),
          ],
        ],
      ),
    );
  }

  Widget _enrollment(ProgramDetail program, bool hasAccount, Plan? active, Plan? mine) {
    if (hasAccount && _enrollments == null && _error == null) return const LoadingRow('Loading your programs…', padding: EdgeInsets.zero);
    final error = _error != null ? [const SizedBox(height: 16), ErrorLine(_error!)] : const <Widget>[];
    if (!hasAccount) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sign in to follow this program and track each session.', style: fg(size: 14, color: AppColors.white70)),
          const SizedBox(height: 16),
          FgButton(label: 'Sign in', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: context.read<AuthController>().startSignUp),
        ],
      );
    }
    if (mine != null) {
      final next = mine.nextDay;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('YOU\'RE FOLLOWING THIS PROGRAM', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.limeLight, letterSpacing: 0.6)),
          const SizedBox(height: 4),
          Text(
            'Week ${mine.currentWeek} of ${program.weeks} · started ${formatDay(mine.startDate)}${mine.adherencePct != null ? ' · ${mine.adherencePct}% of scheduled sessions done' : ''}',
            style: fg(size: 14, color: AppColors.white70),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: InkWell(
              onTap: _busy ? null : () => _leave(mine, program.title),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(LucideIcons.x, size: 16, color: AppColors.red300),
                const SizedBox(width: 6),
                Text('Leave program', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.red300)),
              ]),
            ),
          ),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: Text('${mine.completedCount} of ${mine.totalDays} sessions', style: fg(size: 12, color: AppColors.white70))),
            Text('${mine.percentComplete}%', style: fg(size: 12, color: AppColors.white70)),
          ]),
          const SizedBox(height: 6),
          FgProgressBar(percent: mine.percentComplete.toDouble(), label: 'Program completed'),
          if (next != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('NEXT UP · ${formatDay(next.date).toUpperCase()}', style: fg(size: 10, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 0.6)),
                  const SizedBox(height: 2),
                  Text('Week ${next.week}, day ${next.day}: ${next.title}', style: fg(size: 16, weight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  FgButton(
                    label: 'Start session',
                    icon: LucideIcons.play,
                    radius: 12,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    onPressed: () => openPlayer(context, next.workoutSlug, program: ProgramContext.of(mine, next)),
                  ),
                ],
              ),
            ),
          ],
          ...error,
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (active != null) ...[
          Wrap(children: [
            Text('You\'re currently following ', style: fg(size: 14, color: AppColors.white70)),
            LinkText(active.programTitle, color: AppColors.white, weight: FontWeight.w400, underline: true, onTap: () => openHref(context, active.isPersonalPlan ? '/plan' : '/programs/${active.programSlug}')),
            Text('.', style: fg(size: 14, color: AppColors.white70)),
          ]),
          const SizedBox(height: 16),
        ],
        Text('START DATE', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 0.6)),
        const SizedBox(height: 6),
        Material(
          color: AppColors.noirEclipse,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: AppColors.white30A(0.2))),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _pickDate,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(children: [
                Expanded(child: Text(formatDayLong(_startDate), style: fg(size: 16))),
                const Icon(LucideIcons.calendarDays, size: 18, color: AppColors.white70),
              ]),
            ),
          ),
        ),
        const SizedBox(height: 16),
        FgButton(label: 'Start this program', loading: _busy, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 48, onPressed: _busy ? null : () => _enroll()),
        if (_conflict != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.amber500.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.amber500.withValues(alpha: 0.3))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(_conflict!, style: fg(size: 14, color: AppColors.amber200)),
                const SizedBox(height: 12),
                Row(children: [
                  FgButton(label: 'Cancel', style: FgButtonStyle.ghost, height: 36, fontSize: 14, fontWeight: FontWeight.w700, onPressed: () => setState(() => _conflict = null)),
                  const SizedBox(width: 8),
                  FgButton(label: 'Switch program', style: FgButtonStyle.amber, height: 36, fontSize: 14, fontWeight: FontWeight.w700, onPressed: _busy ? null : () => _enroll(replace: true)),
                ]),
              ],
            ),
          ),
        ],
        ...error,
      ],
    );
  }
}
