import 'dart:convert';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/features/workout/my_workouts.dart';
import 'package:fitguide/src/models/catalog.dart';
import 'package:fitguide/src/services/my_workout_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// Building your own workout: library suggestions, and what's sent to the API.
void main() {
  final sent = <http.Request>[];

  setUp(() async {
    await setUpApp();
    sent.clear();
    ApiClient.instance.useForTesting(MockClient((request) async {
      sent.add(request);
      if (request.url.path.endsWith('/exercises')) {
        return http.Response(jsonEncode({
          'exercises': [
            {'slug': 'back-squat', 'name': 'Barbell Back Squat', 'trackingType': 'weighted', 'equipment': ['Barbell']},
            {'slug': 'plank', 'name': 'Plank', 'trackingType': 'duration'},
          ],
        }), 200);
      }
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      return http.Response(jsonEncode({'workout': {'slug': 'my-garage-day-abc123', 'title': body['title'], 'builtFrom': body}}), 201);
    }));
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  testWidgets('a library exercise sets its own count and weights, and the workout is saved', (tester) async {
    await pumpApp(tester, const WorkoutBuilderScreen());
    await tester.pumpAndSettle();

    await tester.enterText(find.bySemanticsLabel('Name'), 'Garage day');
    await tester.enterText(find.bySemanticsLabel('Exercise 1 name'), 'squat');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Barbell Back Squat'));
    await tester.pumpAndSettle();
    // The only exercise so far, so its one box is "Log a weight".
    expect(tester.widget<Checkbox>(find.byType(Checkbox).first).value, isTrue);
    await tester.enterText(find.bySemanticsLabel('Exercise 1 sets'), '2');
    await tester.enterText(find.bySemanticsLabel('Exercise 1 reps'), '5');

    await tester.tap(find.text('Add an exercise'));
    await tester.pumpAndSettle();
    await tester.enterText(find.bySemanticsLabel('Exercise 2 name'), 'plank');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Plank'));
    await tester.pumpAndSettle();
    // A hold is counted in time.
    expect(find.bySemanticsLabel('Exercise 2 seconds'), findsOneWidget);

    await tester.ensureVisible(find.text('Save workout'));
    await tester.tap(find.text('Save workout'));
    await tester.pumpAndSettle();

    final saved = sent.singleWhere((r) => r.method == 'POST');
    expect(saved.url.path, endsWith('/my-workouts'));
    expect(jsonDecode(saved.body), {
      'title': 'Garage day',
      'category': 'Strength',
      'restSec': 90,
      'exercises': [
        {'name': 'Barbell Back Squat', 'sets': 2, 'reps': '5', 'seconds': null, 'weighted': true, 'supersetNext': false},
        {'name': 'Plank', 'sets': 3, 'reps': null, 'seconds': 30, 'weighted': false, 'supersetNext': false},
      ],
    });
  });

  testWidgets('says what to fix before saving', (tester) async {
    await pumpApp(tester, const WorkoutBuilderScreen());
    await tester.pumpAndSettle();
    await tester.enterText(find.bySemanticsLabel('Name'), 'Go');
    await tester.ensureVisible(find.text('Save workout'));
    await tester.tap(find.text('Save workout'));
    await tester.pumpAndSettle();
    expect(find.text('Give the workout a name of at least 3 letters.'), findsOneWidget);
    expect(sent.where((r) => r.method == 'POST'), isEmpty);
  });

  test('steps inside a superset have no rest after them', () {
    final step = WorkoutStep.fromJson({'instruction': 'Squat — Set 1 of 2 (5 reps)', 'restAfter': false}, 0);
    expect(step.restAfter, isFalse);
    expect(WorkoutStep.fromJson({'instruction': 'Plank'}, 0).restAfter, isTrue);
    expect(isOwnWorkout('my-garage-day-abc123'), isTrue);
    expect(isOwnWorkout('full-body-strength-builder'), isFalse);
  });
}
