import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/i18n.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/auth_gate.dart';
import 'features/common/offline_support.dart';
import 'navigation.dart';
import 'state/auth_controller.dart';
import 'state/dashboard_controller.dart';
import 'state/favorites_controller.dart';
import 'state/phone_health_controller.dart';
import 'state/workouts_controller.dart';

class FitGuideApp extends StatelessWidget {
  const FitGuideApp({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: auth),
        ChangeNotifierProvider(create: (_) => LocaleController()),
        ChangeNotifierProvider(create: (_) => WorkoutsController()),
        ChangeNotifierProvider(create: (_) => DashboardController()),
        ChangeNotifierProvider(create: (context) => FavoritesController(context.read<AuthController>())),
        // Not lazy: syncs the phone's health store as soon as the app opens.
        ChangeNotifierProvider(create: (context) => PhoneHealthController(context.read<AuthController>()), lazy: false),
      ],
      child: MaterialApp(
        title: 'FitGuide',
        navigatorKey: navigatorKey,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        builder: (context, child) => OfflineSupport(child: child ?? const SizedBox.shrink()),
        home: const AuthGate(),
      ),
    );
  }
}
