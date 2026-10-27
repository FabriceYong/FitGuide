import 'package:flutter/material.dart';

import '../../../core/shared/profile_options.dart';
import '../../../models/json.dart';
import '../../../widgets/forms.dart';

const _minuteOptions = [15, 20, 30, 45, 60];
const _dayOptions = [1, 2, 3, 4, 5, 6, 7];

/// Equipment, time, frequency and limitations. Everything is optional.
class TrainingSetupStep extends StatelessWidget {
  const TrainingSetupStep({
    super.key,
    required this.equipment,
    required this.workoutMinutes,
    required this.daysPerWeek,
    required this.limitations,
    required this.onChanged,
  });

  final List<String> equipment;
  final int? workoutMinutes;
  final int? daysPerWeek;
  final List<String> limitations;
  final void Function(Json) onChanged;

  /// "No equipment" and the kits exclude each other.
  void _toggleKit(String kit) {
    if (kit == 'none') {
      onChanged({'equipment': equipment.contains('none') ? <String>[] : ['none']});
      return;
    }
    final kits = equipment.where((k) => k != 'none').toList();
    onChanged({'equipment': kits.contains(kit) ? kits.where((k) => k != kit).toList() : [...kits, kit]});
  }

  void _toggleLimitation(String id) =>
      onChanged({'limitations': limitations.contains(id) ? limitations.where((l) => l != id).toList() : [...limitations, id]});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading(title: 'Your training setup', description: "So we only suggest workouts you can do. Skip anything you're not sure about."),
        FormSection(
          title: 'Equipment you have',
          hint: 'A mat, a chair, stairs and running shoes count as basics.',
          // Chips have 48px touch areas, which already space the rows.
          child: Wrap(
            spacing: 8,
            children: [
              for (final kit in Profile.equipmentKits)
                FgChip(label: equipmentKitOptions[kit]!.label, selected: equipment.contains(kit), onTap: () => _toggleKit(kit)),
            ],
          ),
        ),
        const SizedBox(height: 24),
        FormSection(
          title: 'Time per workout',
          // One row of equal chips, so no option sits alone on a second line.
          child: Row(
            children: [
              for (final (i, m) in _minuteOptions.indexed) ...[
                if (i > 0) const SizedBox(width: 6),
                Expanded(
                  child: FgChip(
                    label: m == 60 ? '60+ min' : '$m min',
                    width: double.infinity,
                    fontSize: 13,
                    selected: workoutMinutes == m,
                    onTap: () => onChanged({'workoutMinutes': workoutMinutes == m ? null : m}),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 24),
        FormSection(
          title: 'Workouts per week',
          child: Row(
            children: [
              for (final (i, d) in _dayOptions.indexed) ...[
                if (i > 0) const SizedBox(width: 6),
                Expanded(
                  child: FgChip(
                    label: '$d',
                    width: double.infinity,
                    semanticLabel: '$d per week',
                    selected: daysPerWeek == d,
                    onTap: () => onChanged({'daysPerWeek': daysPerWeek == d ? null : d}),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 24),
        FormSection(
          title: 'Go easy on',
          hint: "We'll avoid workouts that load these areas. This isn't medical advice: check with a professional if you're injured.",
          child: Wrap(
            spacing: 8,
            children: [
              for (final id in Profile.limitations)
                FgChip(label: limitationLabels[id]!, selected: limitations.contains(id), onTap: () => _toggleLimitation(id)),
            ],
          ),
        ),
      ],
    );
  }
}
