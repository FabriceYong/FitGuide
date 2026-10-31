import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../services/ai_service.dart';
import '../../widgets/forms.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';

const _reasons = [
  ('pain', 'It hurts or a joint is sore'),
  ('space', 'No room, or must be quiet'),
  ('equipment', "I don't have the equipment"),
  ('harder', 'Too hard right now'),
  ('easier', 'Too easy'),
  ('other', 'Something else'),
];

/// "Swap this exercise" (SwapExercise.tsx): pick why, get one alternative
/// that trains the same thing, and use it for this workout. Returns the
/// replacement step, or null when the member keeps the original.
Future<WorkoutStep?> showSwapSheet(BuildContext context, {required WorkoutStep step, required Workout workout, required Color tint}) {
  return showFgModal<WorkoutStep>(
    context,
    title: 'Swap this exercise',
    sheet: true,
    builder: (_) => _SwapBody(step: step, workout: workout, tint: tint),
  );
}

class _SwapBody extends StatefulWidget {
  const _SwapBody({required this.step, required this.workout, required this.tint});
  final WorkoutStep step;
  final Workout workout;
  final Color tint;

  @override
  State<_SwapBody> createState() => _SwapBodyState();
}

class _SwapBodyState extends State<_SwapBody> {
  final _details = TextEditingController();
  String? _reason;
  bool _busy = false;
  String? _error;
  Swap? _swap;

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  Future<void> _ask() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final w = widget.workout;
      final swap = await suggestSwap(
        instruction: widget.step.instruction,
        exerciseName: widget.step.exerciseName,
        reason: _reason!,
        details: _details.text,
        workout: {'title': w.title, 'category': w.category, 'difficulty': w.difficulty, 'equipment': w.equipment},
      );
      if (mounted) setState(() => _swap = swap);
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _use() {
    final s = _swap!;
    final old = widget.step;
    // Keeps the step's place and length; the drawn demo follows the new name.
    Navigator.of(context).pop(WorkoutStep(stepNumber: old.stepNumber, instruction: s.instruction, duration: old.duration, exerciseName: s.name, formCues: s.formCues));
  }

  @override
  Widget build(BuildContext context) {
    final tint = widget.tint;
    final swap = _swap;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text.rich(
          TextSpan(
            children: [
              const TextSpan(text: 'Replacing: '),
              TextSpan(
                text: widget.step.instruction,
                style: fg(size: 14, weight: FontWeight.w700),
              ),
            ],
          ),
          style: fg(size: 14, color: AppColors.white70),
        ),
        const SizedBox(height: 16),
        if (swap == null) ...[
          Text(
            'WHY DO YOU WANT TO SWAP IT?',
            style: fg(size: 11, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 0.8),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final (id, label) in _reasons)
                FgChip(
                  label: label,
                  selected: _reason == id,
                  onTap: () => setState(() => _reason = id),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  radius: 12,
                  height: 40,
                  unselectedBackground: AppColors.whiteA(0.05),
                ),
            ],
          ),
          const SizedBox(height: 14),
          FgTextField(controller: _details, hint: 'Anything else? e.g. my left knee aches when I land (optional)', maxLength: 200, semanticLabel: 'Anything else about why'),
          if (_error != null) ...[const SizedBox(height: 10), ErrorLine(_error!)],
          const SizedBox(height: 14),
          FgButton(
            label: 'Find an alternative',
            icon: LucideIcons.sparkles,
            loading: _busy,
            expand: true,
            height: 50,
            radius: 12,
            fontWeight: FontWeight.w800,
            color: tint,
            onPressed: _reason == null || _busy ? null : _ask,
          ),
        ] else ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: tint.withValues(alpha: 0.07),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: tint.withValues(alpha: 0.33)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'TRY INSTEAD',
                  style: fg(size: 11, weight: FontWeight.w700, color: tint, letterSpacing: 0.8),
                ),
                const SizedBox(height: 4),
                Text(swap.name, style: fg(size: 20, weight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text(swap.why, style: fg(size: 14, color: AppColors.whiteA(0.85), height: 1.4)),
                for (final c in swap.formCues)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Icon(LucideIcons.check, size: 16, color: tint),
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Text(c, style: fg(size: 14))),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          if (swap.safetyNote != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.orange500.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.orange500.withValues(alpha: 0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: Icon(LucideIcons.triangleAlert, size: 16, color: AppColors.orange300),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(swap.safetyNote!, style: fg(size: 13, color: AppColors.orange200)),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: FgButton(label: 'Try another', style: FgButtonStyle.secondary, height: 48, radius: 12, fontWeight: FontWeight.w700, onPressed: () => setState(() => _swap = null)),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: FgButton(label: 'Use this exercise', height: 48, radius: 12, fontWeight: FontWeight.w800, color: tint, onPressed: _use),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Only changes this workout. Suggested by AI: stop if anything hurts.', style: fg(size: 11, color: AppColors.white70)),
        ],
      ],
    );
  }
}
