import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import 'src/app.dart';
import 'src/core/api/api_client.dart';
import 'src/core/storage.dart';
import 'src/state/auth_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Poppins ships in assets/google_fonts, so never download fonts at runtime.
  GoogleFonts.config.allowRuntimeFetching = false;
  LicenseRegistry.addLicense(() async* {
    yield LicenseEntryWithLineBreaks(['Poppins'], await rootBundle.loadString('assets/google_fonts/OFL.txt'));
  });
  await Storage.init();
  await ApiClient.instance.init();
  final auth = AuthController();
  await auth.init();
  runApp(FitGuideApp(auth: auth));
}
