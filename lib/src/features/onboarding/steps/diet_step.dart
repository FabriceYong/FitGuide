import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../widgets/forms.dart';
import '../../../widgets/ui.dart';

const _diets = [
  ('Keto Diet', 'Keto', 'Very low carb, high fat. About 70% fat, 25% protein, 5% carbs.', LucideIcons.flame, Color(0xFFF59E0B)),
  ('Mediterranean Diet', 'Mediterranean', 'Whole foods, olive oil, fish, vegetables and whole grains.', LucideIcons.waves, Color(0xFF06B6D4)),
  ('Paleo Diet', 'Paleo', 'Lean meat, fish, vegetables, nuts and fruit; no grains or refined foods.', LucideIcons.sprout, Color(0xFF10B981)),
  ('Intermittent Fasting', 'Intermittent fasting (16:8)', 'Eat within an 8-hour window each day, with balanced macros.', LucideIcons.timer, Color(0xFF8B5CF6)),
  ('Flexible Balanced Plan', 'Flexible and balanced', 'No foods off limits. About 40% carbs, 30% protein, 30% fat.', LucideIcons.apple, Color(0xFF00C4B4)),
];

class DietStep extends StatelessWidget {
  const DietStep({super.key, required this.diet, required this.onChanged});
  final String diet;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading(title: 'How do you like to eat?', description: 'Your calorie and macro targets and sample meal plans follow this.'),
        ...spaced([
          for (final (id, title, subtitle, icon, color) in _diets)
            OptionCard(title: title, description: subtitle, icon: icon, color: color, selected: diet == id, onTap: () => onChanged(id)),
        ], 12),
      ],
    );
  }
}
