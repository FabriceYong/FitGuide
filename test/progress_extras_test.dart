import 'package:fitguide/src/models/training.dart';
import 'package:fitguide/src/widgets/body_map.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

/// Achievements and the muscle map, as the progress summary sends them.
void main() {
  test('reads achievements and the regions trained this week', () {
    final summary = ProgressSummary({
      'achievements': [
        {'id': 'first-workout', 'title': 'First workout', 'description': 'Finish your first workout.', 'earnedAt': '2026-11-01T18:00:00.000Z', 'progress': {'value': 1, 'goal': 1}},
        {'id': 'workouts-10', 'title': '10 workouts', 'description': 'Finish 10 workouts.', 'earnedAt': null, 'progress': {'value': 1, 'goal': 10}},
      ],
      'muscles': {'regions': {'Legs': 2, 'Core': 1, 'Chest': 0}},
    });
    expect(summary.achievements.map((a) => a.earned), [true, false]);
    expect(summary.achievements[1].value / summary.achievements[1].goal, 0.1);
    expect(summary.muscleRegions, {'Legs': 2, 'Core': 1, 'Chest': 0});
  });

  testWidgets('draws the front and back of the body', (tester) async {
    await setUpApp();
    await pumpApp(tester, const MuscleHeatMap(counts: {'Legs': 3, 'Arms': 1}));
    expect(find.byType(SvgPicture), findsNWidgets(2));
    expect(find.text('Front'), findsOneWidget);
    expect(find.text('Back'), findsOneWidget);
  });

  test('reads the weekly streak', () {
    final streak = ProgressSummary({
      'weekStreak': {
        'goal': 3,
        'weeks': 2,
        'best': 4,
        'thisWeek': {'weekStart': '2026-11-02', 'activeDays': 1, 'met': false, 'daysLeft': 6},
        'passAvailable': true,
        'lastWeekSaved': true,
        'history': [
          {'weekStart': '2026-10-19', 'activeDays': 3, 'met': true, 'saved': false},
          {'weekStart': '2026-10-26', 'activeDays': 1, 'met': false, 'saved': true},
        ],
      },
    }).weekStreak;
    expect((streak.weeks, streak.best, streak.daysLeft, streak.lastWeekSaved), (2, 4, 6, true));
    expect(streak.history.map((w) => (w.met, w.saved)), [(true, false), (false, true)]);
    expect(streak.thisWeekText, '1 of 3 days this week');
  });

  test('reads strength levels', () {
    final summary = ProgressSummary({
      'strength': {
        'bodyweightKg': 80,
        'levels': [
          {'lift': 'Squat', 'oneRepMaxKg': 116.7, 'ratio': 1.46, 'level': 'Novice', 'nextLevel': 'Intermediate', 'toNextKg': 3.5, 'progress': 0.84},
          {'lift': 'Deadlift', 'oneRepMaxKg': 46.7, 'ratio': 0.52, 'level': null, 'nextLevel': 'Beginner', 'toNextKg': 33.5, 'progress': 0.52},
        ],
      },
    });
    expect(summary.strengthBodyweightKg, 80);
    expect(summary.strengthLevels.map((l) => (l.lift, l.level, l.toNextKg)), [('Squat', 'Novice', 3.5), ('Deadlift', null, 33.5)]);
  });
}
