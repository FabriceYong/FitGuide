import 'package:flutter/material.dart';
import 'src/core/theme/app_theme.dart';
import 'src/features/onboarding/onboarding_screen.dart';

void main() {
  runApp(const FitGuideApp());
}

class FitGuideApp extends StatelessWidget {
  const FitGuideApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FitGuide',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const OnboardingScreen(),
    );
  }
}
