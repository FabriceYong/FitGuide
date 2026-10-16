import 'package:fitguide/src/features/dashboard/widgets/home_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('HomePage renders progress and training plan', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: HomePage(),
        ),
      ),
    );

    // Header
    expect(find.text('Hello, Sarah'), findsOneWidget);
    
    // Progress Card
    expect(find.text('PROGRESS'), findsOneWidget);
    expect(find.text('15,160'), findsOneWidget);
    expect(find.text('STEPS'), findsOneWidget);
    
    // Training Plan
    expect(find.text('TRAINING PLAN'), findsOneWidget);
    expect(find.text('Core with Sarah'), findsOneWidget);
    
    // Banner
    expect(find.text('FitGuide+'), findsOneWidget);
  });
}
