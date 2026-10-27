import 'package:fitguide/src/core/format.dart';
import 'package:fitguide/src/features/workout/default_steps.dart';
import 'package:fitguide/src/models/catalog.dart';
import 'package:fitguide/src/models/training.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('numbers and records print like the website', () {
    expect(thousands(15160), '15,160');
    expect(thousands(999), '999');
    expect(formatRecord(PersonalRecord({'unit': 'kg', 'value': 80, 'reps': 5})), '80 kg × 5');
    expect(formatRecord(PersonalRecord({'unit': 'sec', 'value': 95})), '1m 35s');
    expect(formatRecord(PersonalRecord({'unit': 'm', 'value': 2500})), '2.50 km');
    expect(formatRecord(PersonalRecord({'unit': 'reps', 'value': 20})), '20 reps');
    expect(clock(65), '01:05');
  });

  test('dates shift in local time', () {
    expect(shiftDate('2026-10-31', 1), '2026-11-01');
    expect(shiftDate('2026-03-01', -1), '2026-02-28');
    expect(formatDay('2026-10-26'), 'Mon 26 Oct');
  });

  test('workouts without steps get a timed routine for their length', () {
    final steps = generateDefaultSteps(Workout({'slug': 'y', 'title': 'Morning Yoga', 'category': 'Yoga', 'duration': 60}));
    expect(steps.length, 24);
    expect(steps.first.instruction, startsWith('Opening Centering'));
    expect(steps.last.duration, 180, reason: 'savasana keeps its fixed length');
    expect(steps.every((s) => s.formCues.isNotEmpty), isTrue);
  });
}
