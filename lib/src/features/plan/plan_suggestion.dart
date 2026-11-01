import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/training.dart';
import '../../services/plan_service.dart';
import '../../widgets/ui.dart';

const _headings = {
  'catch_up': 'Catch up on your plan',
  'easier': 'Make the next sessions easier?',
  'harder': 'Ready for harder sessions?',
};
const _icons = {'catch_up': LucideIcons.calendarClock, 'easier': LucideIcons.trendingDown, 'harder': LucideIcons.trendingUp};
const _shown = 3;

/// "Strength A: Goblet squats" → "Goblet squats".
String _workout(String title) => title.replaceFirst(RegExp(r'^.*?: '), '');

/// A change the member's plan or program proposes (catch up after missed
/// sessions, or easier/harder workouts), with what it would change. Nothing
/// changes until they say yes; "Not now" hides it for a week
/// (plan/PlanSuggestionCard.tsx).
class PlanSuggestionCard extends StatefulWidget {
  const PlanSuggestionCard({super.key, this.enrollmentId, this.onApplied});

  /// Only show a suggestion for this enrollment.
  final String? enrollmentId;
  final ValueChanged<Plan>? onApplied;

  @override
  State<PlanSuggestionCard> createState() => _PlanSuggestionCardState();
}

class _PlanSuggestionCardState extends State<PlanSuggestionCard> {
  PlanSuggestion? _suggestion;
  bool _busy = false;
  String? _error;
  String? _done;

  @override
  void initState() {
    super.initState();
    fetchPlanSuggestion().then((s) {
      if (mounted) setState(() => _suggestion = s);
    }).catchError((Object _) {});
  }

  Future<void> _accept(PlanSuggestion s) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final plan = await acceptPlanSuggestion(s.id);
      if (!mounted) return;
      final n = s.changes.length;
      setState(() => _done = s.kind == 'catch_up' ? 'Moved. Your plan now ends ${formatDay(plan.endDate)}.' : 'Changed $n upcoming ${n == 1 ? 'session' : 'sessions'}.');
      widget.onApplied?.call(plan);
    } catch (err) {
      if (!mounted) return;
      setState(() {
        if (err is ApiError && err.status == 409) _suggestion = PlanSuggestion.maybe(err.data?['suggestion']);
        _error = err is ApiError ? err.message : 'Could not change your plan.';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _notNow(PlanSuggestion s) {
    setState(() => _suggestion = null);
    dismissPlanSuggestion(s.kind).catchError((Object _) => <String, dynamic>{});
  }

  Widget _change(String kind, SuggestedChange c) {
    final today = c.newDate == localToday();
    final arrow = const Padding(padding: EdgeInsets.symmetric(horizontal: 6), child: Icon(LucideIcons.arrowRight, size: 14, color: AppColors.limeLight));
    final (String before, String after, String spoken) = kind == 'catch_up'
        ? ('${c.title.replaceFirst(RegExp(r':.*$'), '')}: ${formatDay(c.date)}', today ? 'today' : formatDay(c.newDate ?? c.date), 'to')
        : ('${formatDay(c.date)}: ${_workout(c.title)}', _workout(c.newTitle ?? c.title), 'becomes');
    return MergeSemantics(
      child: Semantics(
        label: 'Week ${c.week}, day ${c.day}, $before $spoken $after',
        excludeSemantics: true,
        child: Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: [
          Text('Week ${c.week}, day ${c.day}  ', style: fg(size: 12, color: AppColors.white70)),
          Text(before, style: fg(size: 14)),
          arrow,
          Text(after, style: fg(size: 14, weight: FontWeight.w700)),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_done != null) return StatusBox(_done!);
    final s = _suggestion;
    if (s == null || (widget.enrollmentId != null && s.enrollmentId != widget.enrollmentId)) return const SizedBox.shrink();
    final more = s.changes.length - _shown;
    return FgCard(
      padding: const EdgeInsets.all(16),
      borderColor: AppColors.limeLight.withValues(alpha: 0.3),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          IconTile(_icons[s.kind] ?? LucideIcons.calendarClock, color: AppColors.limeLight, radius: 12),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Semantics(header: true, child: Text(_headings[s.kind] ?? 'A change to your plan', style: fg(size: 16, weight: FontWeight.w800))),
              Text(s.programTitle, style: fg(size: 12, color: AppColors.white70)),
              const SizedBox(height: 8),
              Text(s.reason, style: fg(size: 14)),
            ]),
          ),
        ]),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: spaced([
            for (final c in s.changes.take(_shown)) _change(s.kind, c),
            if (more > 0) Text('and $more more ${more == 1 ? 'session' : 'sessions'}', style: fg(size: 12, color: AppColors.white70)),
            if (s.endDate != null) Text('The plan would end ${formatDay(s.endDate!)}.', style: fg(size: 12, color: AppColors.white70)),
          ], 6)),
        ),
        if (_error != null) ...[const SizedBox(height: 8), ErrorLine(_error!)],
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [
          FgButton(label: 'Make this change', loading: _busy, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: _busy ? null : () => _accept(s)),
          FgButton(label: 'Not now', style: FgButtonStyle.ghost, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: _busy ? null : () => _notNow(s)),
        ]),
      ]),
    );
  }
}
