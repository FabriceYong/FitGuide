import 'dart:typed_data';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/widgets/body_map.dart';
import 'package:fitguide/src/widgets/share_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// Picture cards: shown first, then shared as a 1080 × 1350 PNG.
void main() {
  final shared = <(Uint8List, String, String)>[];

  setUp(() async {
    await setUpApp();
    shared.clear();
    shareCardSharer = (png, filename, text, origin) async => shared.add((png, filename, text));
    // Analytics events go nowhere.
    ApiClient.instance.useForTesting(MockClient((_) async => http.Response('{}', 200)));
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  const data = ShareCardData(
    label: 'WORKOUT COMPLETE',
    title: 'Leg Day',
    subtitle: 'Monday 2 November',
    stats: [('35', 'Minutes'), ('210', 'Calories'), ('4', 'Sets'), ('1,200 kg', 'Lifted')],
    records: ['Goblet Squat · 24 kg × 8'],
  );

  testWidgets('shows the card, then shares it as a picture', (tester) async {
    await pumpApp(tester, Builder(builder: (context) => TextButton(
      onPressed: () => showShareCard(context, data, filename: 'fitguide-workout.png', text: 'Just finished Leg Day', kind: 'workout'),
      child: const Text('Open'),
    )));
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(find.text('Leg Day'), findsOneWidget);
    expect(find.text('1,200 kg'), findsOneWidget);
    expect(find.text('🏆 New personal record'), findsOneWidget);

    await tester.runAsync(() async {
      await tester.tap(find.text('Share'));
      // Rendering the picture happens off the test clock.
      for (var i = 0; i < 50 && shared.isEmpty; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 50));
      }
    });
    await tester.pumpAndSettle();

    expect(shared, hasLength(1));
    final (png, filename, text) = shared.single;
    expect((filename, text), ('fitguide-workout.png', 'Just finished Leg Day'));
    expect(String.fromCharCodes(png.sublist(1, 4)), 'PNG');
    final header = ByteData.sublistView(png, 16, 24);
    expect((header.getUint32(0), header.getUint32(4)), (1080, 1350));
    // The dialog closes once shared.
    expect(find.text('Leg Day'), findsNothing);
  });

  testWidgets('the week card fits the muscle map and its numbers', (tester) async {
    await pumpApp(tester, const Center(child: ShareCard(data: ShareCardData(
      label: 'MY WEEK',
      title: 'Muscles trained',
      figure: MuscleHeatMap(counts: {'Chest': 2, 'Legs': 3}),
      stats: [('4', 'Workouts this week'), ('160', 'Minutes this week')],
    ))));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('Workouts this week'), findsOneWidget);
    expect(tester.getSize(find.byType(ShareCard)), ShareCard.size);
  });

  testWidgets('the fullest workout card still fits', (tester) async {
    await pumpApp(tester, const Center(child: ShareCard(data: ShareCardData(
      label: 'WORKOUT COMPLETE',
      title: 'Full Body Strength and Conditioning Circuit for Experienced Lifters',
      subtitle: 'Wednesday 30 September',
      stats: [('120', 'Minutes'), ('1,450', 'Calories'), ('48', 'Sets'), ('12,500 lb', 'Lifted')],
      records: ['Barbell Back Squat · 140 kg × 5', 'Romanian Deadlift · 120 kg × 8', 'Overhead Press · 60 kg × 6'],
    ))));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
