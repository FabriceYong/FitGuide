import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../widgets/forms.dart';
import '../../../widgets/ui.dart';

const _goals = [
  ('Vitality', 'Overall health and energy', 'Feel fitter day to day with a balanced mix of cardio, strength and mobility.', LucideIcons.heart, Color(0xFF00C4B4)),
  ('Muscle', 'Build muscle and strength', 'Mostly strength training, with some conditioning and mobility.', LucideIcons.dumbbell, Color(0xFF7C6CFF)),
  ('Weight', 'Lose fat and improve fitness', 'More calorie-burning cardio and conditioning, plus strength work.', LucideIcons.scale, Color(0xFFF87171)),
  ('Flexibility', 'Mobility and flexibility', 'Yoga, stretching and Pilates for range of motion and core stability.', LucideIcons.activity, Color(0xFF10B981)),
];

class GoalStep extends StatelessWidget {
  const GoalStep({super.key, required this.goal, required this.onChanged});
  final String goal;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading(
          title: "What's your main goal?",
          description: 'Your recommended workouts and plans lean toward this. You can change it at any time.',
        ),
        ...spaced([
          for (final (id, title, subtitle, icon, color) in _goals)
            OptionCard(title: title, description: subtitle, icon: icon, color: color, selected: goal == id, onTap: () => onChanged(id)),
        ], 12),
      ],
    );
  }
}
