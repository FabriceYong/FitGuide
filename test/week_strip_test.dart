import 'package:fitguide/src/core/format.dart';
import 'package:fitguide/src/features/plan/week_strip.dart';
import 'package:fitguide/src/models/training.dart';
import 'package:fitguide/src/widgets/empty_state.dart';
import 'package:fitguide/src/widgets/progress_ring.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'helpers.dart';

void main() {
  setUp(setUpApp);

  testWidgets('the week strip marks done, missed, planned and rest days', (tester) async {
    final now = DateTime.now();
    final monday = DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - 1));
    String day(int i) => ymd(monday.add(Duration(days: i)));
    final plan = Plan({
      'id': 'e1',
      'programSlug': 'plan-1',
      'programTitle': 'Your plan',
      'schedule': [
        {'week': 1, 'day': 1, 'title': 'Strength A', 'workoutSlug': 'a', 'date': day(0), 'status': 'done'},
        {'week': 1, 'day': 2, 'title': 'Cardio', 'workoutSlug': 'b', 'date': day(2), 'status': 'missed'},
        {'week': 1, 'day': 3, 'title': 'Strength B', 'workoutSlug': 'c', 'date': day(4), 'status': 'upcoming'},
      ],
    });
    await pumpApp(tester, SingleChildScrollView(child: WeekStrip(plan: plan)));

    expect(find.text('This week'), findsOneWidget);
    expect(find.text('1 of 3 sessions done'), findsOneWidget);
    expect(find.bySemanticsLabel('Monday: Strength A, done'), findsOneWidget);
    expect(find.bySemanticsLabel('Wednesday: Cardio, missed'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp(r'^Friday: Strength B, (planned|today)$')), findsOneWidget);
    expect(find.bySemanticsLabel('Sunday: rest day'), findsOneWidget);
  });

  testWidgets('a ring past its goal stays full, and an empty state explains itself', (tester) async {
    await pumpApp(
      tester,
      const Column(children: [
        ProgressRing(value: 12000, goal: 10000, color: Colors.teal, child: Text('12k')),
        EmptyState(icon: LucideIcons.trophy, title: 'No challenges yet', text: 'Pick a goal and invite friends.'),
      ]),
    );
    await tester.pumpAndSettle();
    expect(find.text('12k'), findsOneWidget);
    expect(find.text('No challenges yet'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
