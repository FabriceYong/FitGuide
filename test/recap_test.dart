import 'dart:convert';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/core/units.dart';
import 'package:fitguide/src/features/progress/recap_story.dart';
import 'package:fitguide/src/services/recap_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// The recap story's slides, and paging through them.
void main() {
  final october = {
    'kind': 'month', 'key': '2026-10', 'label': 'October 2026', 'workouts': 12, 'previousWorkouts': 9, 'activeDays': 10, 'minutes': 540,
    'volumeKg': 3000, 'records': 2, 'topRecord': {'exerciseName': 'Bench Press', 'unit': 'kg', 'value': 60, 'reps': 5},
    'topMuscle': {'region': 'Legs', 'workouts': 6}, 'favouriteWorkout': {'title': 'Leg Day', 'times': 4}, 'foodDays': 0,
  };

  test('builds the slides from the recap, leaving out what has nothing', () {
    final slides = recapSlides(Recap(october), Units.metric);
    expect(slides.map((s) => s.kicker), ['Your October', 'Time well spent', 'Weight lifted', 'Best record', 'Your go-to', 'October 2026']);
    expect(slides[0].line, 'workouts finished, 3 more than the month before.');
    expect(slides[1].big, '9 h');
    expect((slides[2].big, slides[2].line), ('3,000 kg', 'About the weight of 2 small cars.'));
    expect(slides[3].big, '60 kg × 5');
    expect(slides[4].line, 'Trained in 6 workouts. Favourite workout: Leg Day (4×).');
    expect(recapSlides(Recap({...october, 'kind': 'year', 'label': '2026', 'previousWorkouts': 12}), Units.imperial)[0].line, 'workouts finished, the same as the year before.');
  });

  testWidgets('pages through the story', (tester) async {
    await setUpApp();
    ApiClient.instance.useForTesting(MockClient((_) async => http.Response(jsonEncode({'recap': october}), 200)));
    addTearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));
    await pumpApp(tester, const RecapStoryScreen(month: '2026-10'));
    await tester.pumpAndSettle();
    expect(find.text('YOUR OCTOBER'), findsOneWidget);
    expect(find.text('1 / 6'), findsOneWidget);
    await tester.tap(find.byTooltip('Next'));
    await tester.pumpAndSettle();
    expect(find.text('TIME WELL SPENT'), findsOneWidget);
    expect(find.text('2 / 6'), findsOneWidget);
  });
}
