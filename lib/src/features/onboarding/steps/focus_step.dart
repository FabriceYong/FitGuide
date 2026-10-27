import 'package:flutter/material.dart';

import '../../../core/shared/profile_options.dart';
import '../../../widgets/forms.dart';
import '../../../widgets/ui.dart';

const _descriptions = {
  'Full Body': 'Balanced sessions that train everything',
  'Core': 'Abs, obliques and lower back',
  'Glutes': 'Hips and the posterior chain',
  'Legs': 'Quads, hamstrings and calves',
  'Back': 'Upper and lower back, posture',
  'Chest': 'Pressing strength',
  'Shoulders': 'Shoulder strength and stability',
  'Arms': 'Biceps, triceps and forearms',
};

/// Body areas to emphasise, pre-filled with suggestions from goal and gender.
class FocusStep extends StatelessWidget {
  const FocusStep({super.key, required this.selected, required this.suggested, required this.onChanged});
  final List<String> selected;
  final List<String> suggested;
  final ValueChanged<List<String>> onChanged;

  @override
  Widget build(BuildContext context) {
    final isSuggestion = selected.length == suggested.length && selected.every(suggested.contains);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StepHeading(
          title: 'What do you want to work on?',
          description: isSuggestion
              ? 'We picked a starting point from your answers so far. Tap to change anything.'
              : 'Pick as many as you like. Recommended workouts will lean toward these.',
        ),
        Semantics(
          label: 'Focus areas',
          container: true,
          child: FgGrid(columns: 1, sm: 2, gap: 12, children: [
            for (final area in Profile.focusAreas)
              OptionCard(
                title: area,
                description: _descriptions[area],
                selected: selected.contains(area),
                onTap: () => onChanged(selected.contains(area) ? selected.where((a) => a != area).toList() : [...selected, area]),
              ),
          ]),
        ),
      ],
    );
  }
}
