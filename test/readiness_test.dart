import 'dart:convert';
import 'dart:ui' show CheckedState;

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/features/dashboard/readiness_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// The morning check-in, the score, and the easier swap on a low day.
void main() {
  final sent = <http.Request>[];
  late Map<String, dynamic> current;

  Map<String, dynamic> scored(int energy, int soreness) => {
        'checkedIn': true,
        'energy': energy,
        'soreness': soreness,
        'score': 26,
        'band': 'easy',
        'headline': 'Take it easy',
        'advice': 'Go lighter today: an easier session, mobility or a walk.',
        'reasons': [
          {'text': 'Sore', 'effect': 'down'},
          {'text': 'Slept 5 h', 'effect': 'down'},
        ],
        'easierSwap': {'week': 1, 'day': 1, 'title': 'Day 1: Leg Blaster', 'newTitle': 'Day 1: Gentle Legs', 'workoutSlug': 'gentle-legs'},
      };

  setUp(() async {
    await setUpApp();
    sent.clear();
    current = {'date': '2026-11-02', 'checkedIn': false};
    ApiClient.instance.useForTesting(MockClient((request) async {
      sent.add(request);
      if (request.url.path.endsWith('/readiness') && request.method == 'PUT') {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        current = scored(body['energy'] as int, body['soreness'] as int);
      }
      if (request.url.path.endsWith('/plan/days')) return http.Response(jsonEncode({'success': true}), 200);
      return http.Response(jsonEncode({'readiness': current}), 200);
    }));
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  testWidgets('checks in, shows the score and swaps today for an easier workout', (tester) async {
    var planChanged = 0;
    await pumpApp(tester, SingleChildScrollView(child: ReadinessCard(onPlanChanged: () => planChanged++)));
    await tester.pumpAndSettle();

    expect(find.text('See my readiness'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('Energy: Low'));
    await tester.tap(find.bySemanticsLabel('Soreness: Sore'));
    await tester.pump();
    await tester.tap(find.text('See my readiness'));
    await tester.pumpAndSettle();

    final put = sent.lastWhere((r) => r.method == 'PUT');
    expect(jsonDecode(put.body), {'energy': 2, 'soreness': 3});
    expect(find.bySemanticsLabel('Readiness 26 out of 100'), findsOneWidget);
    expect(find.text('Take it easy'), findsOneWidget);
    expect(find.text('Slept 5 h'), findsOneWidget);

    await tester.tap(find.text('Swap to the easier one'));
    await tester.pumpAndSettle();
    expect(jsonDecode(sent.last.body), {'week': 1, 'day': 1, 'workoutSlug': 'gentle-legs'});
    expect(find.text('Swapped. Today’s session is now Gentle Legs.'), findsOneWidget);
    expect(planChanged, 1);
  });

  testWidgets('lets the answers be changed', (tester) async {
    current = scored(2, 3);
    await pumpApp(tester, const SingleChildScrollView(child: ReadinessCard()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Change my answers'));
    await tester.pumpAndSettle();
    // The earlier answers are picked.
    final low = tester.getSemantics(find.bySemanticsLabel('Energy: Low'));
    expect(low.flagsCollection.isChecked, CheckedState.isTrue);
    await tester.tap(find.bySemanticsLabel('Energy: Great'));
    await tester.pump();
    await tester.tap(find.text('See my readiness'));
    await tester.pumpAndSettle();
    expect(jsonDecode(sent.lastWhere((r) => r.method == 'PUT').body), {'energy': 5, 'soreness': 3});
  });
}
