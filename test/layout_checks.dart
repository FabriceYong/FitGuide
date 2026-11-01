import 'package:fitguide/src/features/auth/confirm_email_screen.dart';
import 'package:fitguide/src/features/auth/login_screen.dart';
import 'package:fitguide/src/features/dashboard/calculators_tab.dart';
import 'package:fitguide/src/features/dashboard/dashboard_screen.dart';
import 'package:fitguide/src/features/onboarding/onboarding_wizard.dart';
import 'package:fitguide/src/features/progress/progress_view.dart';
import 'package:fitguide/src/models/catalog.dart';
import 'package:fitguide/src/models/training.dart';
import 'package:fitguide/src/state/auth_controller.dart';
import 'package:fitguide/src/state/dashboard_controller.dart';
import 'package:fitguide/src/widgets/workout_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'helpers.dart';

/// Runs [body] and fails, naming the widget and file, if any layout overflows.
Future<void> expectNoOverflow(Future<void> Function() body) async {
  final overflows = <String>[];
  final original = FlutterError.onError;
  FlutterError.onError = (details) {
    final text = details.toString();
    final where = RegExp(r'(\w+):file:///\S*?/(lib/\S+)').firstMatch(text);
    overflows.add('${details.exceptionAsString().split('\n').first}${where == null ? '' : ' (${where[1]} at ${where[2]})'}');
  };
  try {
    await body();
  } finally {
    FlutterError.onError = original;
  }
  expect(overflows, isEmpty, reason: overflows.toSet().join('\n'));
}

/// Every screen the tests can show, on a [size] phone with system text at
/// [textScale]. An overflow anywhere fails the test.
void layoutChecks({required Size size, required double textScale}) {
  setUp(setUpApp);

  Future<AuthController> pump(WidgetTester tester, Widget child, {AuthController? auth}) async {
    tester.platformDispatcher.textScaleFactorTestValue = textScale;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final controller = await pumpApp(tester, child, auth: auth, size: size);
    await tester.pumpAndSettle();
    return controller;
  }

  testWidgets('sign in', (tester) async {
    await expectNoOverflow(() => pump(tester, LoginScreen(onSwitchToRegister: () {}, onEmailNotConfirmed: (_, _) {})));
  });

  testWidgets('confirm your email', (tester) async {
    await expectNoOverflow(() => pump(tester, ConfirmEmailScreen(email: 'someone.with.a.long.address@example.com', password: 'x', onBack: () {})));
  });

  testWidgets('every sign-up step', (tester) async {
    await expectNoOverflow(() => pump(tester, OnboardingWizard(onFinish: (_, {registered = false}) {}, onBackToLogin: () {})));
    for (var step = 1; step <= 10; step++) {
      expect(find.text('Step $step of 10'), findsOneWidget);
      if (step < 10) {
        final next = find.text(step == 1 ? 'Get started' : 'Continue');
        await tester.ensureVisible(next);
        await expectNoOverflow(() async {
          await tester.tap(next);
          await tester.pumpAndSettle();
        });
      }
    }
  });

  testWidgets('calculators', (tester) async {
    await expectNoOverflow(() => pump(tester, const SingleChildScrollView(child: CalculatorsTab())));
  });

  testWidgets('the weekly activity chart, with a day picked', (tester) async {
    ActivityDay day(String date, int minutes) => ActivityDay({'date': date, 'minutes': minutes, 'sessions': minutes > 0 ? 1 : 0});
    final days = [day('2026-10-25', 0), day('2026-10-26', 29), day('2026-10-27', 0), day('2026-10-28', 127), day('2026-10-29', 0), day('2026-10-30', 25), day('2026-10-31', 45)];
    final previous = [for (var i = 18; i <= 24; i++) day('2026-10-$i', 20)];
    await expectNoOverflow(() => pump(tester, SingleChildScrollView(child: WeeklyActivityChart(days: days, previous: previous))));
    expect(find.text('226 min', findRichText: true), findsOneWidget);
    expect(find.text('86 min more than the week before'), findsOneWidget);
    for (final label in ['Sun', 'Wed', 'Today']) {
      await expectNoOverflow(() async {
        await tester.tap(find.text(label));
        await tester.pumpAndSettle();
      });
    }
    expect(find.text('45 min · 1 workout'), findsOneWidget);
  });

  testWidgets('workout cards', (tester) async {
    final w = Workout({'slug': 'core-crusher', 'title': 'Full Body Core Crusher Challenge', 'category': 'HIIT', 'difficulty': 'Intermediate', 'duration': 25, 'calories': 250, 'isPremium': true});
    await expectNoOverflow(
      () => pump(
        tester,
        ListView(children: [
          WorkoutCard(workout: w, onToggleFavorite: (_) {}),
          WorkoutCard(workout: w, tall: true),
        ]),
      ),
    );
  });

  testWidgets('every dashboard tab, as a guest', (tester) async {
    final auth = AuthController()..startGuestSession({'name': 'Fitness Enthusiast', 'goal': 'Vitality'});
    await expectNoOverflow(() => pump(tester, const DashboardScreen(), auth: auth));
    final dashboard = Provider.of<DashboardController>(tester.element(find.byType(DashboardScreen)), listen: false);
    for (final tab in DashboardTab.values) {
      await expectNoOverflow(() async {
        dashboard.setTab(tab);
        await tester.pumpAndSettle();
      });
    }
  });

  if (size.width < 768) {
    testWidgets('the menu', (tester) async {
      final auth = AuthController()..startGuestSession({'name': 'Fitness Enthusiast', 'goal': 'Vitality'});
      await expectNoOverflow(() async {
        await pump(tester, const DashboardScreen(), auth: auth);
        await tester.tap(find.bySemanticsLabel('Open menu'));
        await tester.pumpAndSettle();
      });
      expect(find.text('Menu'), findsWidgets);
    });
  } else {
    // Tablets show the site's header and a row of tabs instead of the
    // bottom bar; a short screen keeps the menu beside the tabs.
    testWidgets('the tab row', (tester) async {
      final auth = AuthController()..startGuestSession({'name': 'Fitness Enthusiast', 'goal': 'Vitality'});
      await expectNoOverflow(() => pump(tester, const DashboardScreen(), auth: auth));
      expect(find.bySemanticsLabel('Open menu'), size.height < 500 ? findsOneWidget : findsNothing);
      for (final label in ['EXPLORE', 'FAVORITES', 'REVIEWS', 'CALCULATORS', 'PROFILE', 'HOME']) {
        await tester.ensureVisible(find.text(label));
        await expectNoOverflow(() async {
          await tester.tap(find.text(label));
          await tester.pumpAndSettle();
        });
      }
      expect(Provider.of<DashboardController>(tester.element(find.byType(DashboardScreen)), listen: false).tab, DashboardTab.home);
    });
  }
}
