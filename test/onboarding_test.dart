import 'package:fitguide/src/features/dashboard/dashboard_screen.dart';
import 'package:fitguide/src/features/onboarding/onboarding_screen.dart';
import 'package:fitguide/src/features/onboarding/widgets/diet_selection_page.dart';
import 'package:fitguide/src/features/onboarding/widgets/goal_selection_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('GoalSelectionPage renders and selects item', (WidgetTester tester) async {
    String? selectedGoal;
    
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: GoalSelectionPage(
            onGoalSelected: (val) => selectedGoal = val,
            selectedGoal: 'Muscle',
          ),
        ),
      ),
    );

    // Verify initial renders
    expect(find.text('Vitality'), findsOneWidget);
    expect(find.text('Muscle'), findsOneWidget);
    expect(find.text('Weight'), findsOneWidget);

    // Verify selection styling (Muscle is selected)
    // Finding the container with border is hard directly, but we can tap another one
    
    await tester.tap(find.byKey(const Key('goal_Vitality')));
    await tester.pump();
    
    expect(selectedGoal, 'Vitality');
  });

  testWidgets('DietSelectionPage renders list', (WidgetTester tester) async {
    await tester.pumpWidget(
       MaterialApp(
        home: Scaffold(
          body: DietSelectionPage(
            onDietSelected: (_) {},
          ),
        ),
      ),
    );

    expect(find.text('Keto Diet'), findsOneWidget);
    expect(find.text('Paleo Diet'), findsOneWidget);
    expect(find.byIcon(Icons.whatshot), findsOneWidget);
  });
  testWidgets('Full Onboarding Flow traverses to Dashboard', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: OnboardingScreen(),
      ),
    );

    // Page 0: Welcome
    expect(find.text('GET STARTED'), findsOneWidget);
    await tester.tap(find.text('GET STARTED'));
    await tester.pumpAndSettle();

    // Page 1: Goal Selection
    expect(find.text("What's Your\nFitness Goal?"), findsOneWidget);
    await tester.tap(find.byKey(const Key('goal_Vitality'))); // Select a goal
    await tester.pump();
    await tester.tap(find.text('CONTINUE'));
    await tester.pumpAndSettle();

    // Page 2: Weight Selection
    expect(find.text("What's Your\nDesired Weight?"), findsOneWidget);
    await tester.tap(find.text('CONTINUE')); // Accept default
    await tester.pumpAndSettle();

    // Page 3: Diet Selection
    expect(find.text("What's Your\nDiet Type?"), findsOneWidget);
    await tester.tap(find.text('Keto Diet')); // Select a diet
    await tester.pump();
    await tester.tap(find.text('CONTINUE'));
    await tester.pumpAndSettle();

    // Page 4: Create Profile
    expect(find.text('Create Your\nProfile'), findsOneWidget);
    await tester.tap(find.text('CREATE ACCOUNT'));
    await tester.pumpAndSettle();

    // Should be at Dashboard
    expect(find.byType(DashboardScreen), findsOneWidget);
  });
}
