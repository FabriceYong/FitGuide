import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/training.dart';
import '../../services/plan_service.dart';
import '../../state/auth_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import 'plan_screen.dart';

const _minutes = [15, 20, 30, 45, 60, 75, 90];
const _weeks = [2, 4, 6, 8, 12];
const _goalLabels = {'Vitality': 'Feel better overall', 'Muscle': 'Build strength and muscle', 'Weight': 'Lose weight', 'Flexibility': 'Move and stretch better'};

/// The questions behind the rules-based plan generator (PlanGenerator.tsx).
class PlanGenerator extends StatefulWidget {
  const PlanGenerator({super.key, required this.hasPlan, required this.onCreated, this.onCancel});
  final bool hasPlan;
  final void Function(Plan plan, List<String> warnings) onCreated;
  final VoidCallback? onCancel;

  @override
  State<PlanGenerator> createState() => _PlanGeneratorState();
}

class _PlanGeneratorState extends State<PlanGenerator> {
  PlanOptions? _options;
  late String _goal;
  late String _level;
  int _days = 3;
  int _minutesPerSession = 30;
  int _weekCount = 4;
  final _equipment = <String>[];
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthController>().user;
    _goal = user?.goal ?? 'Vitality';
    _level = user?.fitnessLevel ?? 'Beginner';
    fetchPlanOptions().then((o) {
      if (mounted) setState(() => _options = o);
    }).catchError((Object err) {
      if (mounted) setState(() => _error = '$err');
    });
  }

  Future<void> _submit() async {
    if (widget.hasPlan && !await confirmReplacePlan(context)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await generatePlan({
        'goal': _goal,
        'level': _level,
        'daysPerWeek': _days,
        'minutesPerSession': _minutesPerSession,
        'weeks': _weekCount,
        'equipment': _equipment,
      });
      widget.onCreated(result.plan, result.warnings);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _chips(List<String> options, bool Function(String) selected, ValueChanged<String> onTap, {String Function(String)? label}) {
    // Chips have 48px touch areas, which already space the rows.
    return Wrap(spacing: 8, children: [
      for (final o in options)
        FgChip(
          label: label?.call(o) ?? o,
          selected: selected(o),
          radius: 12,
          height: 38,
          fontWeight: FontWeight.w600,
          unselectedBackground: AppColors.noirEclipse,
          unselectedText: AppColors.white70,
          onTap: () => onTap(o),
        ),
    ]);
  }

  Widget _select(String label, int value, List<int> options, ValueChanged<int> onChanged) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SmallLabel(label),
      const SizedBox(height: 6),
      FgSelect<int>(value: value, semanticLabel: label, options: [for (final n in options) (n, '$n')], onChanged: onChanged),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final options = _options;
    if (options == null) return _error != null ? ErrorLine(_error!) : const LoadingRow('Loading…');
    return FgCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: spaced([
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(LucideIcons.sparkles, size: 20, color: AppColors.limeLight),
              const SizedBox(width: 8),
              Flexible(child: Text('Build your plan', style: fg(size: 20, weight: FontWeight.w800))),
            ]),
            const SizedBox(height: 4),
            Text("Answer a few questions and we'll schedule workouts from the catalog that fit your goal, level, time and equipment.", style: fg(size: 14, color: AppColors.white70)),
          ]),
          Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SmallLabel('Main goal'),
            const SizedBox(height: 8),
            _chips(options.goals, (g) => g == _goal, (g) => setState(() => _goal = g), label: (g) => _goalLabels[g] ?? g),
          ]),
          Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SmallLabel('Fitness level'),
            const SizedBox(height: 8),
            _chips(options.levels, (l) => l == _level, (l) => setState(() => _level = l)),
          ]),
          // On one row where there's room (`sm:grid-cols-3`).
          FgGrid(columns: 1, sm: 3, gap: 16, children: [
            _select('Days per week', _days, const [1, 2, 3, 4, 5, 6, 7], (v) => setState(() => _days = v)),
            _select('Minutes per session', _minutesPerSession, _minutes, (v) => setState(() => _minutesPerSession = v)),
            _select('Plan length (weeks)', _weekCount, _weeks, (v) => setState(() => _weekCount = v)),
          ]),
          Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SmallLabel('Equipment you have'),
            const SizedBox(height: 4),
            Text('Bodyweight workouts and a mat are always included.', style: fg(size: 12, color: AppColors.white70)),
            const SizedBox(height: 8),
            _chips(options.equipment, _equipment.contains, (e) => setState(() => _equipment.contains(e) ? _equipment.remove(e) : _equipment.add(e))),
          ]),
          if (_error != null) ErrorLine(_error!),
          Wrap(spacing: 12, runSpacing: 12, children: [
            FgButton(label: widget.hasPlan ? 'Replace my plan' : 'Create my plan', loading: _busy, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 48, onPressed: _busy ? null : _submit),
            if (widget.onCancel != null) FgButton(label: 'Cancel', style: FgButtonStyle.ghost, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 48, onPressed: widget.onCancel),
          ]),
        ], 16),
      ),
    );
  }
}
