import 'dart:convert';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/core/format.dart';
import 'package:fitguide/src/features/plan/plan_suggestion.dart';
import 'package:fitguide/src/models/training.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// The plan proposes a change; nothing changes until the member says yes.
void main() {
  final sent = <http.Request>[];
  final today = localToday();
  final suggestion = {
    'id': 's1',
    'kind': 'catch_up',
    'enrollmentId': 'e1',
    'programTitle': 'Your muscle plan',
    'reason': 'You missed the last 3 sessions. Pick up today where you left off, and move the rest of the plan 6 days later.',
    'endDate': '2026-12-01',
    'changes': [
      for (var i = 0; i < 5; i++) {'week': 1, 'day': i + 1, 'title': 'Day ${i + 1}: Squats', 'date': '2026-10-2${i + 1}', 'newDate': i == 0 ? today : '2026-11-0${i + 2}'},
    ],
  };

  void answer({bool stale = false}) {
    ApiClient.instance.useForTesting(MockClient((request) async {
      sent.add(request);
      final path = request.url.path;
      if (path.endsWith('/plan/suggestion/accept')) {
        if (stale) return http.Response(jsonEncode({'success': false, 'message': 'Your plan has changed since.', 'suggestion': {...suggestion, 'id': 's2'}}), 409);
        return http.Response(jsonEncode({'success': true, 'enrollment': {'id': 'e1', 'endDate': '2026-12-01', 'schedule': []}}), 200);
      }
      if (path.endsWith('/plan/suggestion/dismiss')) return http.Response(jsonEncode({'success': true}), 200);
      if (path.endsWith('/plan/suggestion')) return http.Response(jsonEncode({'suggestion': suggestion}), 200);
      return http.Response(jsonEncode({'success': true}), 200);
    }));
  }

  setUp(() async {
    await setUpApp();
    sent.clear();
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  testWidgets('shows what would change and makes it only when accepted', (tester) async {
    answer();
    Plan? applied;
    await pumpApp(tester, SingleChildScrollView(child: PlanSuggestionCard(onApplied: (p) => applied = p)));
    await tester.pumpAndSettle();

    expect(find.text('Catch up on your plan'), findsOneWidget);
    expect(find.text('today'), findsOneWidget);
    expect(find.text('and 2 more sessions'), findsOneWidget);
    expect(sent.where((r) => r.method == 'POST'), isEmpty);

    await tester.tap(find.text('Make this change'));
    await tester.pumpAndSettle();
    final accept = sent.lastWhere((r) => r.url.path.endsWith('/accept'));
    expect(jsonDecode(accept.body), {'id': 's1'});
    expect(applied?.id, 'e1');
    expect(find.textContaining('Moved. Your plan now ends'), findsOneWidget);
  });

  testWidgets('shows the new suggestion when the plan changed since', (tester) async {
    answer(stale: true);
    await pumpApp(tester, const SingleChildScrollView(child: PlanSuggestionCard()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Make this change'));
    await tester.pumpAndSettle();
    expect(find.text('Your plan has changed since.'), findsOneWidget);
    await tester.tap(find.text('Make this change'));
    await tester.pumpAndSettle();
    expect(jsonDecode(sent.lastWhere((r) => r.url.path.endsWith('/accept')).body), {'id': 's2'});
  });

  testWidgets('not now hides it and tells the API', (tester) async {
    answer();
    await pumpApp(tester, const SingleChildScrollView(child: PlanSuggestionCard()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Not now'));
    await tester.pumpAndSettle();
    expect(find.text('Catch up on your plan'), findsNothing);
    expect(jsonDecode(sent.lastWhere((r) => r.url.path.endsWith('/dismiss')).body), {'kind': 'catch_up'});
  });

  testWidgets('stays hidden for another enrollment', (tester) async {
    answer();
    await pumpApp(tester, const SingleChildScrollView(child: PlanSuggestionCard(enrollmentId: 'other')));
    await tester.pumpAndSettle();
    expect(find.text('Catch up on your plan'), findsNothing);
  });
}
