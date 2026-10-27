import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/analytics.dart';
import '../../models/json.dart';
import '../../navigation.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../common/brand.dart';
import '../dashboard/dashboard_screen.dart';
import '../onboarding/onboarding_wizard.dart';
import 'login_screen.dart';

/// Shows the sign-in page, the sign-up wizard or the app (AuthWrapper).
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool? _wasSignedIn;
  bool _wasRegistering = false;

  /// Signing out or opening sign-up leaves whatever page was on top.
  void _closePagesOnTransition(AuthController auth) {
    final signedIn = auth.isAuthenticated;
    final signedOut = _wasSignedIn == true && !signedIn;
    if (signedOut || (auth.showRegister && !_wasRegistering)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        navigatorKey.currentState?.popUntil((route) => route.isFirst);
        if (signedOut && mounted) context.read<DashboardController>().reset();
      });
    }
    _wasSignedIn = signedIn;
    _wasRegistering = auth.showRegister;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    _closePagesOnTransition(auth);
    if (!auth.ready) return const LoadingScreen(message: 'Loading…');
    if (auth.showRegister) {
      return OnboardingWizard(
        onFinish: (Json? response, {bool registered = false}) async {
          if (response != null && registered) {
            // Registered account: the response carries the session tokens.
            track('signup', path: '/');
            await auth.login(response);
          } else if (response != null) {
            // Skipped account creation: browse as a guest.
            auth.startGuestSession(response);
          }
          auth.closeRegister();
        },
        onBackToLogin: auth.closeRegister,
      );
    }
    if (auth.isAuthenticated) return const DashboardScreen();
    return LoginScreen(onSwitchToRegister: auth.startSignUp);
  }
}
