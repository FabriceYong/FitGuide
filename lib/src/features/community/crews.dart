import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../navigation.dart';
import '../../services/crew_service.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import 'crew_screen.dart';

/// This week's workouts against a crew's goal.
class GoalBar extends StatelessWidget {
  const GoalBar({super.key, required this.done, required this.goal, required this.label});
  final int done;
  final int goal;
  final String label;

  @override
  Widget build(BuildContext context) => FgProgressBar(
        percent: (done / (goal < 1 ? 1 : goal) * 100).clamp(0, 100).toDouble(),
        color: done >= goal ? AppColors.emerald400 : AppColors.limeLight,
        label: label,
      );
}

/// Crews on the community screen: the member's crews with this week's
/// progress, and making or joining one (community/Crews.tsx).
class Crews extends StatefulWidget {
  const Crews({super.key});

  @override
  State<Crews> createState() => _CrewsState();
}

class _CrewsState extends State<Crews> {
  List<CrewSummary>? _crews;
  bool _creating = false;
  bool _busy = false;
  String? _error;
  final _name = TextEditingController();
  final _goal = TextEditingController(text: '6');
  final _code = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _goal.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final crews = await fetchCrews();
      if (mounted) setState(() => _crews = crews);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    }
  }

  Future<void> _open(Future<Crew> Function() task) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final crew = await task();
      if (!mounted) return;
      _code.clear();
      _name.clear();
      setState(() => _creating = false);
      await Navigator.of(context).push(pageRoute(CrewScreen(id: crew.id)));
      _load();
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final crews = _crews;
    return FgCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Icon(LucideIcons.shield, size: 20, color: AppColors.limeLight),
          const SizedBox(width: 8),
          Expanded(child: Semantics(header: true, child: Text('Crews', style: fg(size: 20, weight: FontWeight.w800)))),
          FgButton(
            label: 'New crew',
            icon: LucideIcons.plus,
            height: 34,
            radius: 8,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            onPressed: () => setState(() => _creating = !_creating),
          ),
        ]),
        const SizedBox(height: 8),
        Text('A small group of up to 8 who train towards a weekly goal together, see each other’s workouts and chat.', style: fg(size: 13, color: AppColors.white70)),
        if (_creating) ...[
          const SizedBox(height: 12),
          FormFieldLabel(label: 'Crew name', child: FgTextField(controller: _name, maxLength: 50, semanticLabel: 'Crew name')),
          const SizedBox(height: 8),
          FormFieldLabel(
            label: 'Workouts a week',
            child: FgTextField(controller: _goal, keyboardType: TextInputType.number, inputFormatters: [FilteringTextInputFormatter.digitsOnly], semanticLabel: 'Workouts a week'),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: FgButton(
              label: 'Create',
              loading: _busy,
              radius: 12,
              fontSize: 14,
              fontWeight: FontWeight.w700,
              onPressed: _busy ? null : () => _open(() => createCrew(_name.text.trim(), int.tryParse(_goal.text) ?? 0)),
            ),
          ),
        ],
        const SizedBox(height: 12),
        if (crews == null && _error == null) const LoadingRow('Loading…', padding: EdgeInsets.symmetric(vertical: 8)),
        if (crews != null)
          ...spaced([
            for (final c in crews)
              Semantics(
                button: true,
                label: '${c.name}: ${c.thisWeek} of ${c.weeklyGoal} workouts this week, ${c.memberCount} members',
                excludeSemantics: true,
                child: FgCard(
                  color: AppColors.noirEclipse.withValues(alpha: 0.6),
                  radius: 12,
                  padding: const EdgeInsets.all(14),
                  onTap: () async {
                    await Navigator.of(context).push(pageRoute(CrewScreen(id: c.id)));
                    _load();
                  },
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Row(children: [
                      Expanded(child: Text(c.name, style: fg(size: 15, weight: FontWeight.w700))),
                      Text('${c.thisWeek} of ${c.weeklyGoal} this week', style: fg(size: 12, color: AppColors.white70)),
                    ]),
                    const SizedBox(height: 8),
                    GoalBar(done: c.thisWeek, goal: c.weeklyGoal, label: '${c.name} this week'),
                    const SizedBox(height: 6),
                    Text('${c.memberCount} ${c.memberCount == 1 ? 'member' : 'members'}', style: fg(size: 11, color: AppColors.white70)),
                  ]),
                ),
              ),
          ], 8),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: FgTextField(controller: _code, hint: 'Invite code', maxLength: 20, semanticLabel: 'Crew invite code')),
          const SizedBox(width: 8),
          FgButton(
            label: 'Join crew',
            style: FgButtonStyle.ghost,
            radius: 12,
            fontSize: 14,
            fontWeight: FontWeight.w700,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            onPressed: _busy ? null : () => _open(() => joinCrew(_code.text.trim())),
          ),
        ]),
        if (_error != null) ...[const SizedBox(height: 8), ErrorLine(_error!)],
      ]),
    );
  }
}
