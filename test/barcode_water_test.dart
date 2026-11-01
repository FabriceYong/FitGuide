import 'dart:convert';

import 'package:fitguide/src/core/api/api_client.dart';
import 'package:fitguide/src/core/units.dart';
import 'package:fitguide/src/features/nutrition/food_picker.dart';
import 'package:fitguide/src/services/nutrition_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// A barcode fills in a packaged food to check and log; water adds up.
void main() {
  final sent = <http.Request>[];

  setUp(() async {
    await setUpApp();
    sent.clear();
    ApiClient.instance.useForTesting(MockClient((request) async {
      sent.add(request);
      final path = request.url.path;
      if (path.endsWith('/nutrition/foods')) return http.Response(jsonEncode({'foods': []}), 200);
      if (path.endsWith('/barcode/3017620422003')) {
        return http.Response(jsonEncode({
          'product': {
            'code': '3017620422003', 'name': 'Hazelnut spread', 'brand': 'Nutella', 'serving': '15 g',
            'per100g': {'calories': 539, 'protein': 6.3, 'carbs': 57.5, 'fat': 30.9},
            'perServing': {'calories': 81, 'protein': 0.9, 'carbs': 8.6, 'fat': 4.6},
          },
        }), 200);
      }
      if (path.contains('/barcode/')) return http.Response(jsonEncode({'message': 'Not found.'}), 404);
      if (path.endsWith('/nutrition/water')) return http.Response(jsonEncode({'water': {'ml': 750}}), 200);
      return http.Response(jsonEncode({'entry': {}}), 201);
    }));
  });
  tearDown(() => ApiClient.instance.useForTesting(http.Client(), signedIn: false));

  testWidgets('a barcode fills in the food, per serving or per 100 g', (tester) async {
    await pumpApp(tester, const SingleChildScrollView(child: FoodPicker(meal: 'breakfast', date: '2026-11-01')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Barcode'));
    await tester.pumpAndSettle();

    await tester.enterText(find.bySemanticsLabel('Barcode'), '4000000000000');
    await tester.tap(find.text('Look up'));
    await tester.pumpAndSettle();
    expect(find.text('We couldn’t find that product. Enter it manually instead.'), findsOneWidget);

    await tester.enterText(find.bySemanticsLabel('Barcode'), '3017620422003');
    await tester.tap(find.text('Look up'));
    await tester.pumpAndSettle();
    expect(find.text('Nutella Hazelnut spread (15 g)'), findsOneWidget);
    expect(find.text('81'), findsOneWidget);
    await tester.tap(find.text('Per 100 g'));
    await tester.pumpAndSettle();
    expect(find.text('Nutella Hazelnut spread (100 g)'), findsOneWidget);
    expect(find.text('539'), findsOneWidget);

    await tester.ensureVisible(find.text('Add'));
    await tester.tap(find.text('Add'));
    await tester.pumpAndSettle();
    final logged = jsonDecode(sent.singleWhere((r) => r.url.path.endsWith('/nutrition/log')).body) as Map<String, dynamic>;
    expect(logged, containsPair('name', 'Nutella Hazelnut spread (100 g)'));
    expect(logged, containsPair('calories', 539));
  });

  test('adds water and reads the day total', () async {
    expect(await addWater(250), 750);
    expect(jsonDecode(sent.single.body), {'ml': 250});
  });

  test('shows water in the user\'s units', () {
    expect(volumeText(750, Units.metric), '750 ml');
    expect(volumeText(2500, Units.metric), '2.5 l');
    expect(volumeText(2500, Units.imperial), '85 fl oz');
  });
}
