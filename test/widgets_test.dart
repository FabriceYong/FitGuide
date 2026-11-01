import 'package:fitguide/src/features/auth/login_screen.dart';
import 'package:fitguide/src/features/dashboard/calculators_tab.dart';
import 'package:fitguide/src/features/onboarding/onboarding_wizard.dart';
import 'package:fitguide/src/models/catalog.dart';
import 'package:fitguide/src/models/json.dart';
import 'package:fitguide/src/widgets/ui.dart';
import 'package:fitguide/src/widgets/workout_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

void main() {
  setUp(setUpApp);

  testWidgets('sign in needs an email and a password', (tester) async {
    var switched = false;
    await pumpApp(tester, LoginScreen(onSwitchToRegister: () => switched = true));

    expect(find.text('Welcome back. Sign in to continue your training.'), findsOneWidget);
    expect(find.text('Email: demo@fitguide.com'), findsOneWidget);
    final button = find.widgetWithText(InkWell, 'Sign in').last;
    expect(tester.widget<InkWell>(button).onTap, isNull);

    await tester.enterText(find.byType(TextField).first, 'demo@fitguide.com');
    await tester.enterText(find.byType(TextField).last, 'demo123');
    await tester.pump();
    expect(tester.widget<InkWell>(button).onTap, isNotNull);

    await tester.tap(find.text('Create an account').first);
    expect(switched, isTrue);
  });

  testWidgets('forgot password carries the email over and confirms the request', (tester) async {
    await pumpApp(tester, LoginScreen(onSwitchToRegister: () {}));
    await tester.enterText(find.byType(TextField).first, 'demo@fitguide.com');
    await tester.tap(find.text('Forgot password?'));
    await tester.pumpAndSettle();

    expect(find.text('Forgot your password?'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'demo@fitguide.com'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '');
    await tester.pump();
    expect(tester.widget<InkWell>(find.widgetWithText(InkWell, 'Send reset link').last).onTap, isNull);

    await tester.tap(find.text('Back to sign in').first);
    await tester.pumpAndSettle();
    expect(find.text('Welcome back. Sign in to continue your training.'), findsOneWidget);
  });

  testWidgets('sign-up walks through the steps and can continue as a guest', (tester) async {
    Json? finished;
    var wasRegistered = true;
    await pumpApp(
      tester,
      OnboardingWizard(
        onFinish: (response, {registered = false}) {
          finished = response;
          wasRegistered = registered;
        },
        onBackToLogin: () {},
      ),
    );

    expect(find.text('Step 1 of 10'), findsOneWidget);
    expect(find.text('Create your FitGuide account'), findsOneWidget);
    await tester.tap(find.text('Get started'));
    await tester.pumpAndSettle();
    expect(find.text('Step 2 of 10'), findsOneWidget);
    expect(find.text('A quick look around'), findsOneWidget);

    await tester.tap(find.text('Skip the questions'));
    await tester.pumpAndSettle();
    expect(find.text('Step 10 of 10'), findsOneWidget);
    expect(find.text('Create your account'), findsOneWidget);

    await tester.tap(find.text('Continue as a guest'));
    await tester.pump();
    expect(wasRegistered, isFalse);
    expect(finished!['name'], 'Fitness Enthusiast');
    expect(finished!['goal'], 'Vitality');
    expect(finished!['focusAreas'], ['Full Body', 'Core']);
  });

  testWidgets('a workout card shows its details and a PLUS badge', (tester) async {
    final w = Workout({
      'slug': 'core-crusher',
      'title': 'Core Crusher',
      'category': 'HIIT',
      'difficulty': 'Intermediate',
      'duration': 25,
      'calories': 250,
      'isPremium': true,
    });
    await pumpApp(tester, ListView(children: [WorkoutCard(workout: w, calories: 240)]));
    expect(find.text('Core Crusher'), findsOneWidget);
    expect(find.text('25 min · Intermediate · ~240 kcal'), findsOneWidget);
    expect(find.text('PLUS'), findsOneWidget);
    expect(find.text('HIIT'), findsOneWidget);
  });

  testWidgets('one-rep max matches the website’s formula', (tester) async {
    await pumpApp(tester, const SingleChildScrollView(child: CalculatorsTab()));
    // 80 kg × 5: average of Epley (93.3) and Brzycki (90.0).
    expect(find.text('92 kg', findRichText: true), findsOneWidget);
    expect(find.text('Training loads for a 92 kg max'), findsOneWidget);
    expect(find.text('~80 kg'), findsOneWidget, reason: '5 reps at 87%');
  });

  testWidgets('grid rows stay as tall as their tallest cell when it grows', (tester) async {
    final text = ValueNotifier('Short');
    await pumpApp(
      tester,
      SingleChildScrollView(
        child: FgGrid(columns: 2, children: [
          FgCard(child: ValueListenableBuilder(valueListenable: text, builder: (_, t, _) => Text(t, key: const Key('grows')))),
          const FgCard(child: Text('Other', key: Key('other'))),
        ]),
      ),
    );
    final before = tester.getSize(find.byType(FgCard).last).height;

    // Content arriving after the first layout, like a font or data loading.
    text.value = List.filled(12, 'A longer line that wraps').join(' ');
    await tester.pump();

    final grown = tester.getSize(find.byType(FgCard).first).height;
    expect(grown, greaterThan(before));
    expect(tester.getSize(find.byType(FgCard).last).height, grown, reason: 'cells in a row share its height');
  });
}
