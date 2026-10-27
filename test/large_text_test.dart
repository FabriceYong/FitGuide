import 'package:fitguide/src/models/catalog.dart';
import 'package:fitguide/src/widgets/workout_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';
import 'layout_checks.dart';

/// Screens at Android's largest font size (200%). An overflow fails the test.
void main() {
  layoutChecks(size: const Size(390, 844), textScale: 2);

  testWidgets('workout cards grow to fit their text', (tester) async {
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final w = Workout({'slug': 'core-crusher', 'title': 'Full Body Core Crusher Challenge', 'category': 'HIIT', 'difficulty': 'Intermediate', 'duration': 25, 'calories': 250, 'isPremium': true});
    await pumpApp(tester, ListView(children: [WorkoutCard(workout: w)]));
    expect(tester.getSize(find.byType(WorkoutCard)).height, greaterThan(176));
  });
}
