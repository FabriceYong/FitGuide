import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../models/json.dart';
import '../../../widgets/forms.dart';
import '../../../widgets/ui.dart';

const _levels = [
  ('Beginner', 'Beginner', 'New to training, or coming back after a break.', LucideIcons.zap, Color(0xFF00C4B4)),
  ('Intermediate', 'Intermediate', 'You train 2–4 times a week and know the main lifts and moves.', LucideIcons.trendingUp, Color(0xFF7C6CFF)),
  ('Advanced', 'Advanced', 'You train hard most days and want challenging sessions.', LucideIcons.flame, Color(0xFFF87171)),
];

const _statuses = [
  ('Inactive', 'Mostly sitting', 'Desk job, little daily movement'),
  ('Moderately Active', 'Lightly active', 'Some walking and light exercise'),
  ('Active', 'Active', 'Exercise 3 or more days a week'),
  ('Very Active', 'Very active', 'Daily training or a physical job'),
];

class ActivityLevelStep extends StatelessWidget {
  const ActivityLevelStep({super.key, required this.fitnessLevel, required this.activityStatus, required this.onChanged});
  final String fitnessLevel;
  final String activityStatus;
  final void Function(Json) onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading(
          title: 'Your fitness and activity',
          description: 'This sets how hard your suggested workouts are and how many calories you need each day.',
        ),
        FormSection(
          title: 'Fitness level',
          child: Column(
            children: spaced([
              for (final (id, title, desc, icon, color) in _levels)
                OptionCard(title: title, description: desc, icon: icon, color: color, selected: fitnessLevel == id, onTap: () => onChanged({'fitnessLevel': id})),
            ], 12),
          ),
        ),
        const SizedBox(height: 24),
        FormSection(
          title: 'How active are you day to day?',
          child: FgGrid(columns: 1, sm: 2, gap: 12, children: [
            for (final (id, label, desc) in _statuses)
              OptionCard(title: label, description: desc, selected: activityStatus == id, onTap: () => onChanged({'activityStatus': id})),
          ]),
        ),
      ],
    );
  }
}
