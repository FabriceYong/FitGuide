import 'dart:convert';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/features/dashboard/starter_journey.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// The first-week steps on the home tab.
void main() {
  final sent = <http.Request>[];
  var show = true;

  setUp(() async {
    await setUpApp();
    sent.clear();
    show = true;
    ApiClient.instance.useForTesting(MockClient((request) async {
      sent.add(request);
      if (request.url.path.endsWith('/hide')) return http.Response(jsonEncode({'success': true}), 200);
      return http.Response(jsonEncode({
        'starter': {
          'show': show,
          'done': 2,
          'total': 7,
          'steps': [
            {'id': 'first_workout', 'title': 'Finish your first workout', 'done': true, 'href': '/?tab=explore'},
            {'id': 'meal', 'title': 'Log a meal', 'done': false, 'href': '/nutrition'},
            {'id': 'checkin', 'title': 'Check your readiness', 'done': true, 'href': null},
          ],
        },
      }), 200);
    }));
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  testWidgets('shows the steps done and to do, and hides', (tester) async {
    await pumpApp(tester, const SingleChildScrollView(child: StarterJourney()));
    await tester.pumpAndSettle();
    expect(find.text('Your first week'), findsOneWidget);
    expect(find.text('2 of 7 first steps done'), findsOneWidget);
    expect(find.bySemanticsLabel('Log a meal (to do)'), findsOneWidget);
    expect(find.bySemanticsLabel('Check your readiness (done)'), findsOneWidget);

    await tester.tap(find.byTooltip('Hide your first week steps'));
    await tester.pumpAndSettle();
    expect(find.text('Your first week'), findsNothing);
    expect(sent.last.url.path, endsWith('/progress/starter/hide'));
  });

  testWidgets('stays away once the first two weeks are over', (tester) async {
    show = false;
    await pumpApp(tester, const SingleChildScrollView(child: StarterJourney()));
    await tester.pumpAndSettle();
    expect(find.text('Your first week'), findsNothing);
  });
}
