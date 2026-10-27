import 'package:fitguide/src/core/theme/app_colors.dart';
import 'package:fitguide/src/features/auth/login_screen.dart';
import 'package:fitguide/src/features/dashboard/calculators_tab.dart';
import 'package:fitguide/src/features/dashboard/dashboard_screen.dart';
import 'package:fitguide/src/features/onboarding/onboarding_wizard.dart';
import 'package:fitguide/src/models/catalog.dart';
import 'package:fitguide/src/state/auth_controller.dart';
import 'package:fitguide/src/widgets/workout_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

/// WCAG contrast ratio between two opaque colours.
double contrast(Color a, Color b) {
  final la = a.computeLuminance(), lb = b.computeLuminance();
  return (la > lb ? la + 0.05 : lb + 0.05) / (la > lb ? lb + 0.05 : la + 0.05);
}

/// WCAG AA contrast for every text colour on screen, read from the colours
/// the app paints. (Flutter's textContrastGuideline samples screenshot
/// pixels and misreads thin 12px Poppins: it reported teal on near-black,
/// about 8:1, as 1.47:1.) Light text is measured on the card colour, the
/// lightest dark surface; dark text on the teal button fill. Large text and
/// icons need 3:1, other text 4.5:1.
List<String> textContrastFailures(WidgetTester tester) {
  final failures = <String>{};
  for (final paragraph in tester.allRenderObjects.whereType<RenderParagraph>()) {
    void visit(InlineSpan span, TextStyle inherited) {
      final style = inherited.merge(span.style);
      if (span is TextSpan && (span.text?.trim().isNotEmpty ?? false) && style.color != null) {
        final light = contrast(style.color!.withValues(alpha: 1), AppColors.noirEclipse) > contrast(style.color!.withValues(alpha: 1), AppColors.white);
        final surface = light ? AppColors.obsidianWave : AppColors.limeLight;
        final ratio = contrast(Color.alphaBlend(style.color!, surface), surface);
        final size = style.fontSize ?? 14;
        final bold = (style.fontWeight ?? FontWeight.w400).value >= 700;
        final icon = style.fontFamily == 'Lucide' || style.fontFamily == 'MaterialIcons';
        final needed = icon || size >= 18 || (size >= 14 && bold) ? 3.0 : 4.5;
        if (ratio < needed) failures.add('"${span.text}" (${size.toStringAsFixed(0)}px): ${ratio.toStringAsFixed(2)}:1, needs $needed:1');
      }
      if (span is TextSpan) {
        for (final child in span.children ?? const <InlineSpan>[]) {
          visit(child, style);
        }
      }
    }

    visit(paragraph.text, const TextStyle());
  }
  return failures.toList();
}

/// Flutter's accessibility checks (tap targets big enough to hit, every
/// tappable control named for screen readers) plus readable text contrast.
/// Reports every failing check at once rather than stopping at the first.
Future<void> expectAccessible(WidgetTester tester) async {
  final failures = <String>[];
  for (final guideline in [androidTapTargetGuideline, iOSTapTargetGuideline, labeledTapTargetGuideline]) {
    final result = await guideline.evaluate(tester);
    if (!result.passed) failures.add('${guideline.description}:\n${result.reason}');
  }
  final lowContrast = textContrastFailures(tester);
  if (lowContrast.isNotEmpty) failures.add('Text contrast below WCAG AA:\n${lowContrast.join('\n')}');
  expect(failures, isEmpty, reason: failures.join('\n\n'));
}

/// A phone-width screen tall enough that a whole page is on it: the checks
/// skip anything scrolled out of view.
Future<void> showWholePage(WidgetTester tester) async {
  tester.view.physicalSize = const Size(1170, 3 * 3000);
  await tester.pumpAndSettle();
}

void main() {
  setUp(setUpApp);

  test('the app’s text colours meet WCAG AA on its surfaces', () {
    for (final surface in [AppColors.noirEclipse, AppColors.obsidianWave]) {
      for (final text in [AppColors.white, AppColors.white70, AppColors.muted, AppColors.limeLight, AppColors.red300, AppColors.amber400]) {
        expect(contrast(Color.alphaBlend(text, surface), surface), greaterThanOrEqualTo(4.5), reason: '$text on $surface');
      }
      // The site's 30% and 40% white fall short, which is why the app uses muted.
      expect(contrast(Color.alphaBlend(AppColors.white30, surface), surface), lessThan(4.5));
      expect(contrast(Color.alphaBlend(AppColors.whiteA(0.4), surface), surface), lessThan(4.5));
    }
    expect(contrast(AppColors.noirEclipse, AppColors.limeLight), greaterThanOrEqualTo(4.5), reason: 'dark text on teal buttons');
  });

  testWidgets('sign in is accessible', (tester) async {
    final semantics = tester.ensureSemantics();
    await pumpApp(tester, LoginScreen(onSwitchToRegister: () {}));
    await showWholePage(tester);
    await expectAccessible(tester);
    semantics.dispose();
  });

  testWidgets('every sign-up step is accessible', (tester) async {
    final semantics = tester.ensureSemantics();
    await pumpApp(tester, OnboardingWizard(onFinish: (_, {registered = false}) {}, onBackToLogin: () {}));
    await showWholePage(tester);
    for (var step = 1; step <= 10; step++) {
      expect(find.text('Step $step of 10'), findsOneWidget);
      await expectAccessible(tester);
      if (step < 10) {
        await tester.tap(find.text(step == 1 ? 'Get started' : 'Continue'));
        await tester.pumpAndSettle();
      }
    }
    semantics.dispose();
  });

  testWidgets('calculators are accessible', (tester) async {
    final semantics = tester.ensureSemantics();
    await pumpApp(tester, const SingleChildScrollView(child: CalculatorsTab()));
    await showWholePage(tester);
    await expectAccessible(tester);
    semantics.dispose();
  });

  testWidgets('a workout card is accessible', (tester) async {
    final semantics = tester.ensureSemantics();
    final w = Workout({'slug': 'core-crusher', 'title': 'Core Crusher', 'category': 'HIIT', 'difficulty': 'Intermediate', 'duration': 25, 'calories': 250, 'isPremium': true});
    await pumpApp(tester, ListView(children: [WorkoutCard(workout: w)]));
    await showWholePage(tester);
    await expectAccessible(tester);
    semantics.dispose();
  });

  testWidgets('the dashboard and its menu are accessible', (tester) async {
    final semantics = tester.ensureSemantics();
    final auth = AuthController()..startGuestSession({'name': 'Fitness Enthusiast', 'goal': 'Vitality'});
    await pumpApp(tester, const DashboardScreen(), auth: auth);
    await showWholePage(tester);
    await expectAccessible(tester);
    await tester.tap(find.bySemanticsLabel('Open menu'));
    await tester.pumpAndSettle();
    expect(find.text('Menu'), findsWidgets);
    await expectAccessible(tester);
    semantics.dispose();
  });

  testWidgets('the system back button steps back through sign-up', (tester) async {
    var backToLogin = false;
    await pumpApp(tester, OnboardingWizard(onFinish: (_, {registered = false}) {}, onBackToLogin: () => backToLogin = true));
    await tester.tap(find.text('Get started'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('Step 3 of 10'), findsOneWidget);

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Step 2 of 10'), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Step 1 of 10'), findsOneWidget);
    expect(backToLogin, isFalse);

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(backToLogin, isTrue);
  });
}
