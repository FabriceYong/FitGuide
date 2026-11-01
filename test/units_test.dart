import 'package:fitguide/src/core/units.dart';
import 'package:fitguide/src/features/workout/workout_steps.dart';
import 'package:fitguide/src/models/user.dart';
import 'package:flutter_test/flutter_test.dart';

/// Weights and lengths in the user's units; the API keeps kg and cm.
void main() {
  test('reads the units from the profile, metric by default', () {
    expect(AppUser({'units': 'imperial'}).units, Units.imperial);
    expect(AppUser({}).units, Units.metric);
  });

  test('shows and reads weights in pounds', () {
    expect(weightText(70, Units.metric), '70 kg');
    expect(weightText(70, Units.imperial), '154.3 lb');
    // Typed in pounds, saved in kg, shown again as typed.
    expect(weightIn(kgFrom(135, Units.imperial), Units.imperial), 135);
    expect(kgFrom(62.5, Units.metric), 62.5);
    expect(setLabel(8, 61.235, Units.imperial), '8 reps × 135 lb');
  });

  test('shows heights in feet and inches, and measurements in inches', () {
    expect(heightText(170, Units.imperial), '5′ 7″');
    expect(heightText(170, Units.metric), '170 cm');
    expect(measureText('waistCm', 81.28, Units.imperial), '32 in');
    expect(measureText('bodyFatPct', 18, Units.imperial), '18 %');
    expect(measureFrom('waistCm', 32, Units.imperial), 81.28);
    expect(measureUnit('weightKg', Units.imperial), 'lb');
  });
}
