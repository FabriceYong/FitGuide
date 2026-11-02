import 'package:fitguide/src/core/units.dart';
import 'package:fitguide/src/core/voice_coach.dart';
import 'package:flutter_test/flutter_test.dart';

/// The same cases as fitguide_api/test/voiceCoach.test.js for the website.
void main() {
  test('speaks weights in the member’s units', () {
    expect(spokenWeight(22.5), '22.5 kilos');
    expect(spokenWeight(20), '20 kilos');
    expect(spokenWeight(1), '1 kilo');
    expect(spokenWeight(20, Units.imperial), '44.1 pounds');
  });

  test('says last time and today’s suggestion as a step starts', () {
    expect(stepCoaching(index: 0, total: 6, last: (reps: 8, weightKg: 20), suggestion: (reps: 8, weightKg: 22.5)), 'Last time, 20 kilos for 8. Today, try 22.5 kilos for 8.');
    expect(stepCoaching(index: 0, total: 6, last: (reps: 12, weightKg: null), suggestion: (reps: 12, weightKg: null)), 'Last time, 12 reps.');
    expect(stepCoaching(index: 1, total: 6), '');
  });

  test('says halfway and the last exercise', () {
    expect(stepCoaching(index: 3, total: 6), 'Halfway there.');
    expect(stepCoaching(index: 5, total: 6), 'Last one. Finish strong!');
    expect(stepCoaching(index: 1, total: 2), '');
  });

  test('praises a set that beats last time', () {
    expect(setPraise(logged: (reps: 8, weightKg: 22.5), last: (reps: 8, weightKg: 20)), 'That’s 2.5 kilos more than last time. Nice work!');
    expect(setPraise(logged: (reps: 10, weightKg: 20), last: (reps: 8, weightKg: 20)), '2 more reps than last time. Strong!');
    expect(setPraise(logged: (reps: 13, weightKg: null), last: (reps: 12, weightKg: null)), '1 more rep than last time. Strong!');
    expect(setPraise(logged: (reps: 6, weightKg: 20), last: (reps: 8, weightKg: 20)), isNull);
    expect(setPraise(logged: (reps: 8, weightKg: 20)), isNull);
  });
}
