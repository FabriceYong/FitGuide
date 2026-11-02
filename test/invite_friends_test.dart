import 'dart:convert';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/features/community/invite_friends.dart';
import 'package:fitguide/src/services/training_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// Invites: the card on the community screen, and the reward after a first workout.
void main() {
  setUp(() async {
    await setUpApp();
    ApiClient.instance.useForTesting(MockClient((request) async {
      if (request.url.path.endsWith('/referrals')) {
        return http.Response(jsonEncode({'referrals': {'code': 'ABCD2345', 'invited': 2, 'rewarded': 1, 'rewardsLeft': 11, 'plusUntil': '2026-11-09T10:00:00.000Z'}}), 200);
      }
      return http.Response(jsonEncode({'session': {'id': 's1'}, 'newRecords': [], 'inviteRewarded': true, 'plusDays': 7}), 201);
    }));
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  testWidgets('shows the invite code and how invites have gone', (tester) async {
    await pumpApp(tester, const SingleChildScrollView(child: InviteFriends()));
    await tester.pumpAndSettle();
    expect(find.text('ABCD2345'), findsOneWidget);
    expect(find.textContaining('2 joined with your link, 1 finished a first workout.'), findsOneWidget);
    expect(find.textContaining('You have PLUS until'), findsOneWidget);
    expect(find.byTooltip('Copy your invite link'), findsOneWidget);
  });

  test("an invited member's first workout comes back with the PLUS days", () async {
    final saved = await logSession({'workoutSlug': 'core-power-blast', 'durationSec': 600}, 'u1');
    expect(saved.plusDays, 7);
  });
}
