import 'package:fitguide/src/core/i18n.dart';
import 'package:fitguide/src/core/storage.dart';
import 'package:fitguide/src/core/theme/app_theme.dart';
import 'package:fitguide/src/state/auth_controller.dart';
import 'package:fitguide/src/state/dashboard_controller.dart';
import 'package:fitguide/src/state/favorites_controller.dart';
import 'package:fitguide/src/state/workouts_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Fresh device storage and the bundled fonts, for each widget test.
Future<void> setUpApp() async {
  GoogleFonts.config.allowRuntimeFetching = false;
  SharedPreferences.setMockInitialValues({});
  await Storage.init();
}

/// Pump [child] with the app's providers and theme, on a phone-sized screen
/// ([size] in logical pixels; an iPhone 14 by default).
Future<AuthController> pumpApp(WidgetTester tester, Widget child, {AuthController? auth, Size size = const Size(390, 844)}) async {
  tester.view.physicalSize = size * 3;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final controller = auth ?? AuthController();
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: controller),
        ChangeNotifierProvider(create: (_) => LocaleController()),
        ChangeNotifierProvider(create: (_) => WorkoutsController()),
        ChangeNotifierProvider(create: (_) => DashboardController()),
        ChangeNotifierProvider(create: (context) => FavoritesController(context.read<AuthController>())),
      ],
      child: MaterialApp(theme: AppTheme.darkTheme, home: Scaffold(body: child)),
    ),
  );
  // Wait for the bundled Poppins, so text is measured as on a phone rather
  // than in the test font, where every letter is a full square.
  await tester.runAsync(GoogleFonts.pendingFonts);
  await tester.pump();
  return controller;
}
