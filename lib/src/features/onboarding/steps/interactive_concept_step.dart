import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../widgets/forms.dart';
import '../../../widgets/ui.dart';

const _muscles = {
  'chest': ('Chest & Pecs', ['Barbell Bench Press', 'Incline Dumbbell Flyes', 'Cable Crossover'], 'Intermediate'),
  'back': ('Back & Lats', ['Pull-ups', 'Lat Pulldown', 'Bent-Over Barbell Row'], 'All Levels'),
  'legs': ('Legs & Quads', ['Barbell Back Squat', 'Romanian Deadlift', 'Leg Extension'], 'Advanced'),
  'core': ('Abs & Core', ['Hanging Leg Raises', 'Plank Hold', 'Russian Twists'], 'Beginner'),
  'arms': ('Biceps & Triceps', ['Dumbbell Bicep Curl', 'Tricep Rope Pushdown', 'Hammer Curls'], 'All Levels'),
};

const _concepts = [
  ('Muscle Map', LucideIcons.dumbbell, Color(0xFF00C4B4)),
  ('Smart Player', LucideIcons.timer, Color(0xFF3E25F5)),
  ('Macro Sync', LucideIcons.utensils, Color(0xFF10B981)),
  ('Analytics', LucideIcons.activity, Color(0xFFEF4444)),
];

/// "A quick look around": four interactive previews (InteractiveConceptStep.js).
class InteractiveConceptStep extends StatefulWidget {
  const InteractiveConceptStep({super.key});

  @override
  State<InteractiveConceptStep> createState() => _InteractiveConceptStepState();
}

class _InteractiveConceptStepState extends State<InteractiveConceptStep> {
  int _active = 0;
  String _muscle = 'chest';
  bool _timerRunning = false;
  int _seconds = 45;
  Timer? _timer;
  double _calories = 2400;
  String _calcTab = 'bmi';

  void _toggleTimer() {
    if (_timerRunning) {
      _timer?.cancel();
      setState(() => _timerRunning = false);
      return;
    }
    if (_seconds == 0) return;
    setState(() => _timerRunning = true);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      setState(() {
        _seconds--;
        if (_seconds <= 0) {
          _seconds = 0;
          _timerRunning = false;
          t.cancel();
        }
      });
    });
  }

  void _resetTimer() {
    _timer?.cancel();
    setState(() {
      _seconds = 45;
      _timerRunning = false;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Widget _badge(IconData icon, String text) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [Icon(icon, size: 12, color: AppColors.limeLight), const SizedBox(width: 4), Flexible(child: Text(text, style: fg(size: 12, weight: FontWeight.w600, color: AppColors.limeLight)))],
      );

  Widget _inner({required Widget child, EdgeInsets padding = const EdgeInsets.all(12)}) => Container(
        width: double.infinity,
        padding: padding,
        decoration: BoxDecoration(
          color: AppColors.noirEclipse.withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.white30A(0.1)),
        ),
        child: child,
      );

  Widget _muscleMap() {
    final (name, exercises, level) = _muscles[_muscle]!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Side by side, or stacked when large text doesn't fit.
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 4,
          children: [
            _badge(LucideIcons.target, 'Target Muscle Selector'),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.limeLight.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: AppColors.limeLight.withValues(alpha: 0.2)),
              ),
              child: Text(level, style: fg(size: 12, weight: FontWeight.w600, color: AppColors.limeLight)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 6,
          children: [
            for (final key in _muscles.keys)
              TapPadding(
                child: Semantics(
                  button: true,
                  selected: _muscle == key,
                  child: Material(
                    color: _muscle == key ? AppColors.limeLight : AppColors.whiteA(0.1),
                    borderRadius: BorderRadius.circular(8),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () => setState(() => _muscle = key),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        child: Text(
                          '${key[0].toUpperCase()}${key.substring(1)}',
                          style: fg(size: 14, weight: FontWeight.w700, color: _muscle == key ? AppColors.noirEclipse : AppColors.white70),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        _inner(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(child: Text('$name Focus', style: fg(size: 14, weight: FontWeight.w700))),
                  Text('3 Recommended Moves', style: fg(size: 12, color: AppColors.white70)),
                ],
              ),
              const SizedBox(height: 8),
              for (final ex in exercises)
                Container(
                  margin: const EdgeInsets.only(top: 6),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.whiteA(0.05), borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.white30A(0.05))),
                  child: Row(
                    children: [
                      Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.limeLight, shape: BoxShape.circle)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(ex, style: fg(size: 14, weight: FontWeight.w500))),
                      Text('3 × 12 reps', style: fg(size: 12, color: AppColors.white70)),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _player() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Side by side, or stacked when large text doesn't fit.
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 4,
          children: [
            _badge(LucideIcons.zap, 'Live Workout Engine'),
            _badge(LucideIcons.volume2, 'Audio Beeps On'),
          ],
        ),
        const SizedBox(height: 12),
        _inner(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text('Current Set • Exercise 2 of 6', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
              const SizedBox(height: 8),
              Text('00:${_seconds.toString().padLeft(2, '0')}', style: fg(size: 36, weight: FontWeight.w900, color: AppColors.limeLight, features: tabularFigures)),
              const SizedBox(height: 8),
              Text('Incline Dumbbell Press', style: fg(size: 14, weight: FontWeight.w700)),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Material(
              color: AppColors.whiteA(0.1),
              shape: const CircleBorder(),
              child: IconButton(onPressed: _resetTimer, tooltip: 'Reset timer', icon: const Icon(LucideIcons.rotateCcw, size: 16, color: AppColors.white70)),
            ),
            const SizedBox(width: 12),
            Material(
              color: _timerRunning ? AppColors.amber400 : AppColors.limeLight,
              borderRadius: BorderRadius.circular(999),
              child: InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: _toggleTimer,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(_timerRunning ? LucideIcons.pause : LucideIcons.play, size: 16, color: AppColors.noirEclipse),
                      const SizedBox(width: 8),
                      Text(_timerRunning ? 'Pause timer' : 'Start step timer', style: fg(size: 14, weight: FontWeight.w600, color: AppColors.noirEclipse)),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _macros() {
    final cal = _calories.round();
    final protein = (cal * 0.30 / 4).round();
    final carbs = (cal * 0.45 / 4).round();
    final fat = (cal * 0.25 / 9).round();
    Widget bar(String label, int grams, double pct, Color color) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                  const SizedBox(width: 6),
                  Expanded(child: Text(label, style: fg(size: 14, weight: FontWeight.w700))),
                  Text('${grams}g', style: fg(size: 14, weight: FontWeight.w700, color: color, features: tabularFigures)),
                ],
              ),
              const SizedBox(height: 4),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: Stack(children: [
                  Container(height: 6, color: AppColors.whiteA(0.1)),
                  FractionallySizedBox(widthFactor: pct, child: Container(height: 6, color: color)),
                ]),
              ),
            ],
          ),
        );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Side by side, or stacked when large text doesn't fit.
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 4,
          children: [
            _badge(LucideIcons.flame, 'Precision Macro Calculator'),
            Text('$cal kcal / day', style: fg(size: 14, weight: FontWeight.w900)),
          ],
        ),
        Slider(value: _calories, min: 1500, max: 3500, divisions: 40, onChanged: (v) => setState(() => _calories = v)),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            for (final t in ['1500 kcal\n(Deficit)', '2500 kcal\n(Maintenance)', '3500 kcal\n(Bulk)'])
              Text(t, textAlign: TextAlign.center, style: fg(size: 11, weight: FontWeight.w600, color: AppColors.white70)),
          ],
        ),
        const SizedBox(height: 12),
        _inner(
          child: Column(
            children: [
              bar('Protein (30%)', protein, 0.30, AppColors.cyan400),
              bar('Carbohydrates (45%)', carbs, 0.45, AppColors.emerald400),
              bar('Healthy Fats (25%)', fat, 0.25, AppColors.amber400),
            ],
          ),
        ),
      ],
    );
  }

  Widget _analytics() {
    final (title, value, unit, unitColor, text) = switch (_calcTab) {
      'bmr' => ('Basal Metabolic Rate (BMR)', '1,780', 'kcal/day', AppColors.cyan400, 'Calories burned naturally at rest every 24 hours.'),
      'tdee' => ('Total Daily Energy Expenditure', '2,450', 'kcal/day', AppColors.purple400, 'Calculated energy burn including workout sessions & daily steps.'),
      _ => ('Body Mass Index (BMI)', '22.4', '(Normal Range)', AppColors.emerald400, 'Optimal weight-to-height ratio for lean athletic performance.'),
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Side by side, or stacked when large text doesn't fit.
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 4,
          children: [
            _badge(LucideIcons.award, 'Body Health Analytics'),
            Row(mainAxisSize: MainAxisSize.min, children: [
              for (final tab in ['bmi', 'bmr', 'tdee'])
                Padding(
                  padding: const EdgeInsets.only(left: 4),
                  child: TapPadding(
                    minSize: const Size(40, 48),
                    child: Semantics(
                      button: true,
                      selected: _calcTab == tab,
                      child: Material(
                        color: _calcTab == tab ? AppColors.limeLight : AppColors.whiteA(0.1),
                        borderRadius: BorderRadius.circular(4),
                        child: InkWell(
                          onTap: () => setState(() => _calcTab = tab),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            child: Text(tab, style: fg(size: 12, weight: FontWeight.w600, color: _calcTab == tab ? AppColors.noirEclipse : AppColors.white70)),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ]),
          ],
        ),
        const SizedBox(height: 12),
        _inner(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text(title, style: fg(size: 12, weight: FontWeight.w600, color: AppColors.white70)),
              const SizedBox(height: 4),
              Text.rich(
                TextSpan(children: [
                  TextSpan(text: value, style: fg(size: 30, weight: FontWeight.w900, color: AppColors.limeLight)),
                  TextSpan(text: ' $unit', style: fg(size: 14, color: unitColor)),
                ]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(text, textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.white70)),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: AppColors.whiteA(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.white30A(0.1))),
          child: Row(
            children: [
              const Icon(LucideIcons.circleCheck, size: 16, color: AppColors.limeLight),
              const SizedBox(width: 6),
              Expanded(child: Text('7-Day Consistency Streak Active', style: fg(size: 14, weight: FontWeight.w500, color: AppColors.white70))),
              Text('+120 XP', style: fg(size: 14, weight: FontWeight.w600, color: AppColors.limeLight)),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final color = _concepts[_active].$3;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading(title: 'A quick look around', description: 'Try the tabs to preview some of what FitGuide does. The numbers here are examples.'),
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.2))),
          child: Row(
            children: [
              for (final (i, (title, icon, _)) in _concepts.indexed)
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(left: i == 0 ? 0 : 6),
                    child: Semantics(
                      button: true,
                      selected: _active == i,
                      child: Material(
                        color: _active == i ? AppColors.limeLight : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => setState(() => _active = i),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
                            child: Column(
                              children: [
                                Icon(icon, size: 20, color: _active == i ? AppColors.noirEclipse : AppColors.white70),
                                const SizedBox(height: 4),
                                // One line, like a tab bar label, shrunk to fit the tab.
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    title,
                                    maxLines: 1,
                                    softWrap: false,
                                    style: fg(size: 11, weight: FontWeight.w600, color: _active == i ? AppColors.noirEclipse : AppColors.white70),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Container(
          constraints: const BoxConstraints(minHeight: 260),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.obsidianWave.withValues(alpha: 0.9),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.white30A(0.2)),
            gradient: RadialGradient(center: const Alignment(1, 1), radius: 0.8, colors: [color.withValues(alpha: 0.18), Colors.transparent]),
          ),
          child: switch (_active) {
            0 => _muscleMap(),
            1 => _player(),
            2 => _macros(),
            _ => _analytics(),
          },
        ),
      ],
    );
  }
}
