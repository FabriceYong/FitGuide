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
}
