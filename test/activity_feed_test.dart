import 'dart:convert';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/features/community/activity_feed.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// Friends' workouts in the feed, with records and cheers.
void main() {
  final sent = <http.Request>[];
  var cheerStatus = 200;

  setUp(() async {
    await setUpApp();
    sent.clear();
    cheerStatus = 200;
    ApiClient.instance.useForTesting(MockClient((request) async {
      sent.add(request);
      if (request.url.path.endsWith('/cheer')) {
        return http.Response(jsonEncode(cheerStatus == 200 ? {'success': true} : {'success': false, 'message': 'Workout not found.'}), cheerStatus);
      }
      if (request.url.path.endsWith('/social/sharing')) return http.Response(jsonEncode({'success': true}), 200);
      final completed = DateTime.now().subtract(const Duration(minutes: 30)).toIso8601String();
      return http.Response(jsonEncode({
        'shareActivity': true,
        'nextBefore': null,
        'items': [
          {
            'id': 's1', 'person': {'name': 'Ana L.'}, 'isYou': false, 'workoutTitle': 'Leg Day', 'completedAt': completed,
            'durationSec': 2100, 'calories': 210, 'setCount': 4, 'volumeKg': 1200,
            'records': [{'exerciseName': 'Goblet Squat', 'unit': 'kg', 'value': 24, 'reps': 8}],
            'cheers': 1, 'cheeredByYou': false, 'cheeredBy': ['Ben O.'],
          },
          {
            'id': 's2', 'person': {'name': 'Me'}, 'isYou': true, 'workoutTitle': 'Core Blast', 'completedAt': completed,
            'durationSec': 900, 'calories': 0, 'setCount': 0, 'volumeKg': 0, 'records': [], 'cheers': 0, 'cheeredByYou': false, 'cheeredBy': [],
          },
        ],
      }), 200);
    }));
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  testWidgets("shows friends' workouts and records, and cheers them", (tester) async {
    await pumpApp(tester, const SingleChildScrollView(child: ActivityFeed()));
    await tester.pumpAndSettle();

    expect(find.bySemanticsLabel(RegExp(r'^Ana L.: Leg Day')), findsOneWidget);
    expect(find.text('Goblet Squat: 24 kg × 8'), findsOneWidget);
    expect(find.text('Ben O. cheered'), findsOneWidget);
    // Your own workout can't be cheered.
    expect(find.text('Cheer'), findsOneWidget);

    await tester.tap(find.text('Cheer'));
    await tester.pumpAndSettle();
    expect(sent.last.method, 'POST');
    expect(sent.last.url.path, endsWith('/social/feed/s1/cheer'));
    expect(find.text('Cheered'), findsOneWidget);
    expect(find.text('You and Ben O. cheered'), findsOneWidget);
  });

  testWidgets('puts a cheer back when the API refuses it', (tester) async {
    cheerStatus = 404;
    await pumpApp(tester, const SingleChildScrollView(child: ActivityFeed()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cheer'));
    await tester.pumpAndSettle();
    expect(find.text('Cheer'), findsOneWidget);
    expect(find.text('Workout not found.'), findsOneWidget);
  });

  testWidgets('turns sharing off', (tester) async {
    await pumpApp(tester, const SingleChildScrollView(child: ActivityFeed()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Show my workouts to friends'));
    await tester.pumpAndSettle();
    expect(jsonDecode(sent.last.body), {'shareActivity': false});
  });

  test('says how long ago', () {
    final now = DateTime.utc(2026, 11, 2, 12);
    expect(timeAgo('2026-11-02T11:59:30Z', now), 'just now');
    expect(timeAgo('2026-11-02T11:15:00Z', now), '45 min ago');
    expect(timeAgo('2026-11-02T09:00:00Z', now), '3 h ago');
    expect(timeAgo('2026-11-01T10:00:00Z', now), 'yesterday');
    expect(timeAgo('2026-10-28T12:00:00Z', now), '5 days ago');
  });
}
