import 'dart:convert';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/features/community/crew_screen.dart';
import 'package:fitguide/src/features/community/crews.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// Crews: the list on the community screen, and a crew's goal, members and chat.
void main() {
  final sent = <http.Request>[];
  final crew = {
    'id': 'c1',
    'name': 'Early Birds',
    'weeklyGoal': 6,
    'inviteCode': 'ABCD2345',
    'thisWeek': 3,
    'isOwner': false,
    'members': [
      {'id': 'u1', 'name': 'Gus M.', 'role': 'owner', 'isYou': false, 'workoutsThisWeek': 1},
      {'id': 'u2', 'name': 'Hal M.', 'role': 'member', 'isYou': true, 'workoutsThisWeek': 2},
    ],
    'activity': [
      {'id': 's1', 'name': 'Gus M.', 'isYou': false, 'workoutTitle': 'Leg Day', 'completedAt': '2026-11-02T07:00:00Z', 'durationSec': 1800},
    ],
    'messages': [
      {'id': 'm1', 'name': 'Gus M.', 'isYou': false, 'text': 'Morning run tomorrow?', 'createdAt': '2026-11-02T07:30:00Z'},
    ],
  };

  setUp(() async {
    await setUpApp();
    sent.clear();
    ApiClient.instance.useForTesting(MockClient((request) async {
      sent.add(request);
      final path = request.url.path;
      if (path.endsWith('/messages')) {
        return http.Response(jsonEncode({'message': {'id': 'm2', 'name': 'Hal M.', 'isYou': true, 'text': jsonDecode(request.body)['text'], 'createdAt': '2026-11-02T08:00:00Z'}}), 201);
      }
      if (path.endsWith('/crews')) {
        return http.Response(jsonEncode({'crews': [{'id': 'c1', 'name': 'Early Birds', 'weeklyGoal': 6, 'memberCount': 2, 'thisWeek': 3}]}), 200);
      }
      return http.Response(jsonEncode({'crew': crew}), 200);
    }));
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  testWidgets("lists the member's crews with the week's progress", (tester) async {
    await pumpApp(tester, const SingleChildScrollView(child: Crews()));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Early Birds: 3 of 6 workouts this week, 2 members'), findsOneWidget);
  });

  testWidgets("shows the crew's goal, members and chat, and sends a message", (tester) async {
    await pumpApp(tester, const CrewScreen(id: 'c1'));
    await tester.pumpAndSettle();
    expect(find.text('Early Birds'), findsWidgets);
    expect(find.text('Gus M. 👑'), findsOneWidget);
    expect(find.text('ABCD2345'), findsOneWidget);
    expect(find.text('Morning run tomorrow?'), findsOneWidget);
    // Only the owner can change the goal.
    expect(find.text('Change the goal'), findsNothing);

    await tester.enterText(find.bySemanticsLabel('Message your crew'), 'In!');
    await tester.tap(find.byTooltip('Send'));
    await tester.pumpAndSettle();
    expect(jsonDecode(sent.last.body), {'text': 'In!'});
    expect(find.text('In!'), findsOneWidget);
  });
}
