import 'package:flutter/material.dart';

import '../../../core/shared/profile_options.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../models/json.dart';
import '../../../widgets/forms.dart';
import '../../../widgets/ui.dart';

/// Gender, height and current weight, with metric or imperial display.
class BiometricsStep extends StatefulWidget {
  const BiometricsStep({super.key, required this.gender, required this.height, required this.weight, required this.onChanged});
  final String gender;
  final int height;
  final int weight;
  final void Function(Json) onChanged;

  @override
  State<BiometricsStep> createState() => _BiometricsStepState();
}

class _BiometricsStepState extends State<BiometricsStep> {
  String _unit = 'metric';

  @override
  Widget build(BuildContext context) {
    final h = widget.height;
    final w = widget.weight;
    final displayHeight = _unit == 'metric' ? '$h cm' : "${(h / 30.48).floor()}' ${((h % 30.48) / 2.54).round()}\"";
    final displayWeight = _unit == 'metric' ? '$w kg' : '${(w * 2.20462).round()} lb';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading(
          title: 'About you',
          description:
              'We use these to estimate your calorie burn and targets, and to suggest where to start. You can change them later in your profile.',
        ),
        FormSection(
          title: 'Gender',
          hint: 'Used for calorie estimates and the focus areas we suggest.',
          child: FgGrid(columns: 1, sm: 2, gap: 12, children: [
            for (final g in Profile.genders) OptionCard(title: g, selected: widget.gender == g, onTap: () => widget.onChanged({'gender': g})),
          ]),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(child: Text('Height and weight', style: fg(size: 14, weight: FontWeight.w600))),
            Segmented<String>(
              label: 'Units',
              options: const [('metric', 'cm / kg'), ('imperial', 'ft / lb')],
              value: _unit,
              onChanged: (u) => setState(() => _unit = u),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _RangeField(label: 'Height', display: displayHeight, value: h, min: 120, max: 220, onChanged: (v) => widget.onChanged({'height': v})),
        const SizedBox(height: 16),
        _RangeField(label: 'Current weight', display: displayWeight, value: w, min: 40, max: 180, onChanged: (v) => widget.onChanged({'weight': v})),
      ],
    );
  }
}

/// A slider with its label and current value above it.
class _RangeField extends StatelessWidget {
  const _RangeField({required this.label, required this.display, required this.value, required this.min, required this.max, required this.onChanged});
  final String label;
  final String display;
  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(child: Text(label, style: fg(size: 14, weight: FontWeight.w600))),
            Text(display, style: fg(size: 16, weight: FontWeight.w600, color: AppColors.limeLight, features: tabularFigures)),
          ],
        ),
        Slider(
          value: value.clamp(min, max).toDouble(),
          min: min.toDouble(),
          max: max.toDouble(),
          divisions: max - min,
          semanticFormatterCallback: (_) => display,
          onChanged: (v) => onChanged(v.round()),
        ),
      ],
    );
  }
}
