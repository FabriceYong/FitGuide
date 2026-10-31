import 'package:fitguide/src/features/gyms/gym_screen.dart';
import 'package:fitguide/src/services/gym_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

import 'helpers.dart';
import 'layout_checks.dart';

const _here = LatLng(51.5074, -0.1278);

Gym _gym(String id, String? name, double km, {String? address}) =>
    Gym({'id': id, 'name': name, 'lat': 51.5074 + km / 111, 'lng': -0.1278, 'distanceKm': km, 'address': address});

void main() {
  setUp(setUpApp);

  test('distances read like the website’s', () {
    expect(formatDistance(0.004), '10 m');
    expect(formatDistance(0.347), '350 m');
    expect(formatDistance(1.26), '1.3 km');
    expect(formatDistance(12.4), '12 km');
    expect(walkTime(0.4), '5 min walk');
    expect(walkTime(0.01), '1 min walk');
    expect(walkTime(2.5), isNull);
  });

  Future<List<(LatLng, int)>> pumpFinder(WidgetTester tester, {Size size = const Size(390, 844), double textScale = 1, Future<LatLng> Function()? locate, List<Gym>? gyms}) async {
    final searches = <(LatLng, int)>[];
    tester.platformDispatcher.textScaleFactorTestValue = textScale;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await pumpApp(
      tester,
      GymScreen(
        locate: locate ?? () async => _here,
        findGyms: (at, radius) async {
          searches.add((at, radius));
          return gyms ??
              [
                _gym('N1', 'Bannatyne Health Club', 0.35, address: '32 Woburn Place, Bloomsbury, London'),
                _gym('N2', null, 0.8),
                _gym('W3', 'A gym with a very long name that cannot possibly fit on one line of a phone', 3.2),
              ];
        },
      ),
      size: size,
    );
    await tester.pump(const Duration(milliseconds: 100));
    return searches;
  }

  testWidgets('lists the gyms around the member, nearest first', (tester) async {
    late List<(LatLng, int)> searches;
    await expectNoOverflow(() async => searches = await pumpFinder(tester));
    expect(searches.single, (_here, 5));
    expect(find.text('3 gyms within 5 km of you'), findsOneWidget);
    expect(find.text('Bannatyne Health Club'), findsOneWidget);
    expect(find.text('350 m'), findsOneWidget);
    expect(find.text('4 min walk'), findsOneWidget);
    expect(find.text('Unnamed gym'), findsOneWidget);
    expect(find.text('3.2 km'), findsOneWidget);
    expect(find.byTooltip('Directions to Bannatyne Health Club'), findsOneWidget);
  });

  testWidgets('a wider distance searches again', (tester) async {
    final searches = await pumpFinder(tester);
    await tester.tap(find.text('10 km'));
    await tester.pump(const Duration(milliseconds: 100));
    expect(searches.last, (_here, 10));
    expect(find.text('3 gyms within 10 km of you'), findsOneWidget);
  });

  testWidgets('without location it asks for a town instead', (tester) async {
    final searches = await pumpFinder(tester, locate: () async => throw const LocationProblem('Location is turned off for FitGuide.'));
    expect(searches, isEmpty);
    expect(find.text('Location is turned off for FitGuide.'), findsOneWidget);
    expect(find.text('Where should we look?'), findsOneWidget);
  });

  testWidgets('no gyms offers a wider search', (tester) async {
    await pumpFinder(tester, gyms: []);
    expect(find.text('No gyms found within 5 km'), findsOneWidget);
    expect(find.text('Search within 10 km'), findsOneWidget);
  });

  for (final (name, size, scale) in [
    ('a small phone at large text', const Size(320, 640), 1.6),
    ('a tablet in landscape', const Size(1180, 820), 1.0),
    ('a phone on its side', const Size(844, 390), 1.0),
  ]) {
    testWidgets('fits $name', (tester) async {
      await expectNoOverflow(() => pumpFinder(tester, size: size, textScale: scale));
      expect(find.text('Bannatyne Health Club'), findsOneWidget);
    });
  }
}
