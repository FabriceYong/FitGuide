import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/analytics.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/training.dart';
import '../../navigation.dart';
import '../../services/plan_service.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';
import '../common/site_page.dart';
import '../programs/schedule.dart';
import 'coach_chat.dart';
import 'plan_generator.dart';
import 'plan_suggestion.dart';
import 'week_strip.dart';

/// /plan: the user's personal plan (or the generator) and the coach
/// (features/plan/PlanView.tsx).
class PlanScreen extends StatefulWidget {
  const PlanScreen({super.key});

  @override
  State<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends State<PlanScreen> {
  Plan? _plan;
  bool _loaded = false;
  bool _editing = false;
  List<String> _notice = [];
  bool _adapting = false;
  String? _error;

  int? _seenVersion;

  /// (Re)load the plan, again whenever training data changes (a session saved).
  void _sync(bool hasAccount, int dataVersion) {
    if (!hasAccount || dataVersion == _seenVersion) return;
    _seenVersion = dataVersion;
    _load();
  }

  Future<void> _load() async {
    try {
      final plan = await fetchPlan();
      if (mounted) setState(() => _plan = plan);
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    } finally {
      if (mounted) setState(() => _loaded = true);
    }
  }

  Future<void> _adapt() async {
    setState(() {
      _adapting = true;
      _error = null;
    });
    try {
      final result = await adaptPlan();
      final changed = result.changes.length;
      setState(() {
        _plan = result.plan;
        _notice = [
          result.reason,
          result.direction == 'keep' ? 'No changes made.' : '$changed upcoming ${changed == 1 ? 'session was' : 'sessions were'} made ${result.direction}.',
        ];
      });
    } catch (err) {
      setState(() => _error = '$err');
    } finally {
      if (mounted) setState(() => _adapting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    _sync(auth.hasAccount, context.select<DashboardController, int>((d) => d.dataVersion));
    if (!auth.hasAccount) {
      return SitePage(
        active: '/plan',
        child: FgCard(
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            Text('Sign in to get a plan built for you and chat with your coach.', textAlign: TextAlign.center, style: fg(size: 16, color: AppColors.white70)),
            const SizedBox(height: 16),
            FgButton(label: 'Sign in', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: auth.startSignUp),
          ]),
        ),
      );
    }
    if (!_loaded && _error == null) {
      return SitePage(
        active: '/plan',
        child: Semantics(
          label: 'Loading your plan',
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: spaced([
            const Skeleton(height: 40, width: 200),
            const Skeleton(height: 170),
            const Skeleton(height: 110),
            for (var i = 0; i < 4; i++) const Skeleton(height: 56, radius: 12),
          ], 16)),
        ),
      );
    }
    final plan = _plan;
    final weeks = plan == null ? <int>[] : {for (final d in plan.schedule) d.week}.toList();
    final wide = atLeast(context, Breakpoints.md);
    final main = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: spaced([
        PageTitle('Your plan', size: wide ? 36 : 30),
        if (_error != null) ErrorLine(_error!),
        if (plan == null || _editing)
          PlanGenerator(
            hasPlan: plan != null,
            onCancel: plan != null ? () => setState(() => _editing = false) : null,
            onCreated: (created, warnings) {
              track('plan_created', path: '/plan');
              context.read<DashboardController>().dataChanged();
              setState(() {
                _plan = created;
                _editing = false;
                _notice = warnings;
              });
            },
          ),
        if (plan != null && !_editing) ...[
          FgCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(plan.programTitle, style: fg(size: 20, weight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text(
                  'Week ${plan.currentWeek} of ${plan.weeks} · started ${formatDay(plan.startDate)}${plan.adherencePct != null ? ' · ${plan.adherencePct}% of scheduled sessions done' : ''}',
                  style: fg(size: 14, color: AppColors.white70),
                ),
                const SizedBox(height: 16),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  FgButton(
                    label: 'Adjust to my progress',
                    icon: LucideIcons.slidersHorizontal,
                    loading: _adapting,
                    style: FgButtonStyle.ghost,
                    radius: 12,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    onPressed: _adapting ? null : _adapt,
                  ),
                  FgButton(
                    label: 'New plan',
                    icon: LucideIcons.refreshCw,
                    style: FgButtonStyle.ghost,
                    radius: 12,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    onPressed: () => setState(() => _editing = true),
                  ),
                ]),
                const SizedBox(height: 16),
                Row(children: [
                  Expanded(child: Text('${plan.completedCount} of ${plan.totalDays} sessions', style: fg(size: 12, color: AppColors.white70))),
                  Text('${plan.percentComplete}%', style: fg(size: 12, color: AppColors.white70)),
                ]),
                const SizedBox(height: 6),
                FgProgressBar(percent: plan.percentComplete.toDouble(), label: 'Plan progress'),
                if (plan.nextDay != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
                    child: _nextUp(
                      wide,
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('NEXT UP · ${formatDay(plan.nextDay!.date).toUpperCase()}', style: fg(size: 10, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 0.6)),
                        const SizedBox(height: 2),
                        Text(plan.nextDay!.title, style: fg(size: 16, weight: FontWeight.w700)),
                      ]),
                      FgButton(
                        label: 'Start session',
                        icon: LucideIcons.play,
                        radius: 12,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        onPressed: () => openPlayer(context, plan.nextDay!.workoutSlug, program: ProgramContext.of(plan, plan.nextDay!)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          PlanSuggestionCard(
            key: ValueKey('suggestion-${plan.id}'),
            enrollmentId: plan.id,
            onApplied: (changed) => setState(() => _plan = changed),
          ),
          WeekStrip(plan: plan),
          if (_notice.isNotEmpty)
            Semantics(
              liveRegion: true,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.limeLight.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.limeLight.withValues(alpha: 0.3))),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [for (final n in _notice) Text(n, style: fg(size: 14))]),
              ),
            ),
          for (final week in weeks)
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('WEEK $week', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 1.5)),
                const SizedBox(height: 8),
                ...spaced([
                  for (final d in plan.schedule.where((d) => d.week == week))
                    ScheduleRow(
                      day: d.day,
                      date: formatDay(d.date),
                      title: d.title,
                      status: d.status,
                      onOpen: () => openWorkout(context, d.workoutSlug),
                      playLabel: 'Start week ${d.week} day ${d.day}',
                      onPlay: d.status != 'done' ? () => openPlayer(context, d.workoutSlug, program: ProgramContext.of(plan, d)) : null,
                    ),
                ], 8),
              ],
            ),
        ],
      ], 16),
    );
    final chat = CoachChat(onPlanChanged: _load);
    return SitePage(
      active: '/plan',
      // The coach beside the plan on a wide tablet (`lg:grid-cols-[1fr_380px]`).
      child: atLeast(context, Breakpoints.lg)
          ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: main), const SizedBox(width: 32), SizedBox(width: 380, child: chat)])
          : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [main, const SizedBox(height: 16), chat]),
    );
  }

  /// The next session and its start button: side by side on a tablet.
  Widget _nextUp(bool wide, Widget text, Widget button) => wide
      ? Row(children: [Expanded(child: text), const SizedBox(width: 16), button])
      : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [text, const SizedBox(height: 12), button]);
}

/// Ask before replacing the current plan.
Future<bool> confirmReplacePlan(BuildContext context) => confirmDialog(
      context,
      title: 'Start a new plan?',
      message: 'Your current plan ends, but your logged sessions stay in your history.',
      confirmText: 'Start new plan',
    );
