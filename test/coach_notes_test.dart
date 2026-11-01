import 'dart:convert';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/features/dashboard/coach_notes.dart';
import 'package:fitguide/src/services/training_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// Sharing progress with a program's coach, and the notes they send.
void main() {
  final sent = <http.Request>[];

  setUp(() async {
    await setUpApp();
    sent.clear();
    ApiClient.instance.useForTesting(MockClient((request) async {
      sent.add(request);
      final path = request.url.path;
      if (path.endsWith('/enrollments/notes')) {
        return http.Response(jsonEncode({
          'notes': [
            {'id': 'n1', 'text': 'Missed you on Saturday. Shall we do a short one?', 'createdAt': '2026-11-01T09:00:00.000Z', 'coachName': 'Kim C.', 'programTitle': 'Park Club'},
          ],
        }), 200);
      }
      if (request.method == 'PATCH') {
        final share = (jsonDecode(request.body) as Map)['shareWithCoach'];
        return http.Response(jsonEncode({'enrollment': {'id': 'e1', 'shareWithCoach': share, 'schedule': []}}), 200);
      }
      return http.Response(jsonEncode({'success': true}), 200);
    }));
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  testWidgets('shows a coach note until the member marks it read', (tester) async {
    await pumpApp(tester, const SingleChildScrollView(child: CoachNotes()));
    await tester.pumpAndSettle();
    expect(find.text('A note from Kim C.'), findsOneWidget);
    expect(find.text('Missed you on Saturday. Shall we do a short one?'), findsOneWidget);

    await tester.tap(find.text('Got it'));
    await tester.pumpAndSettle();
    expect(find.text('A note from Kim C.'), findsNothing);
    expect(sent.last.method, 'POST');
    expect(sent.last.url.path, endsWith('/enrollments/notes/n1/read'));
  });

  test('turns sharing with the coach on and off', () async {
    final on = await shareWithCoach('e1', true);
    expect(on.shareWithCoach, isTrue);
    expect(sent.last.url.path, endsWith('/enrollments/e1'));
    expect(jsonDecode(sent.last.body), {'shareWithCoach': true});
    expect((await shareWithCoach('e1', false)).shareWithCoach, isFalse);
  });
}
