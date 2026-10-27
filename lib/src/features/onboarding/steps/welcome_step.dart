import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../widgets/forms.dart';
import '../../../widgets/ui.dart';

const _features = [
  ('Workouts and programs matched to your level, from beginner to advanced', LucideIcons.dumbbell, Color(0xFF00C4B4)),
  ('A guided player that times each step and logs your sets', LucideIcons.zap, Color(0xFF7C6CFF)),
  ('Calorie and macro targets for your goal and diet', LucideIcons.target, Color(0xFF10B981)),
  ('Progress tracking, streaks, personal records and health calculators', LucideIcons.award, Color(0xFFF87171)),
];

class WelcomeStep extends StatelessWidget {
  const WelcomeStep({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading(
          title: 'Create your FitGuide account',
          description:
              'Answer a few questions so we can suggest the right workouts and targets for you. It takes about two minutes, and you can change everything later.',
        ),
        ...spaced([
          for (final (text, icon, color) in _features)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.whiteA(0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.white30A(0.2)),
              ),
              child: Row(
                children: [
                  IconTile(icon, color: color),
                  const SizedBox(width: 14),
                  Expanded(child: Text(text, style: fg(size: 16, height: 1.35))),
                ],
              ),
            ),
        ], 12),
      ],
    );
  }
}
