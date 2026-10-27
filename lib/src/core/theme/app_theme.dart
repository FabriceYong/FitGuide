import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// The website's Tailwind sizes are for desktop screens; on a phone they are
/// set on this mobile type scale. Small text keeps its size and larger text
/// shrinks progressively: body 14 → 13.5, base 16 → 15, headings 24 → 20,
/// 30 → 23, 36 → 26.
const _mobileScale = <(double, double)>[
  (12, 12), (14, 13.5), (16, 15), (18, 16), (20, 17), (24, 20), (30, 23), (36, 26), (48, 32), (60, 38),
];

/// [size] on the mobile type scale, interpolated between its steps.
double mobileSize(double size) {
  if (size <= _mobileScale.first.$1) return size;
  for (var i = 1; i < _mobileScale.length; i++) {
    final (fromA, toA) = _mobileScale[i - 1];
    final (fromB, toB) = _mobileScale[i];
    if (size <= fromB) return toA + (size - fromA) / (fromB - fromA) * (toB - toA);
  }
  final (from, to) = _mobileScale.last;
  return size * to / from;
}

/// Poppins text, given in the site's sizes (Tailwind: xs 12, sm 14, base 16,
/// lg 18, xl 20, 2xl 24, 3xl 30, 4xl 36) and drawn on the mobile scale;
/// bold 700, extrabold 800, black 900.
TextStyle fg({
  double size = 14,
  FontWeight weight = FontWeight.w400,
  Color color = AppColors.white,
  double? height,
  double? letterSpacing,
  FontStyle? fontStyle,
  List<FontFeature>? features,
  TextDecoration? decoration,
}) {
  return GoogleFonts.poppins(
    fontSize: mobileSize(size),
    fontWeight: weight,
    color: color,
    height: height,
    letterSpacing: letterSpacing,
    fontStyle: fontStyle,
    fontFeatures: features,
    decoration: decoration,
    decorationColor: color,
  );
}

/// `uppercase tracking-wider` labels.
TextStyle fgLabel({double size = 12, Color color = AppColors.white70, FontWeight weight = FontWeight.w700, double tracking = 0.05}) =>
    fg(size: size, weight: weight, color: color, letterSpacing: size * tracking);

const tabularFigures = [FontFeature.tabularFigures()];

/// Whether the system text size is well above normal (over 130%), for the few
/// layouts that stack instead of sitting on one line.
bool largeText(BuildContext context) => MediaQuery.textScalerOf(context).scale(100) > 130;

class AppTheme {
  static ThemeData get darkTheme {
    final base = ThemeData(useMaterial3: true, brightness: Brightness.dark);
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.noirEclipse,
      canvasColor: AppColors.noirEclipse,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.limeLight,
        secondary: AppColors.royalNebula,
        surface: AppColors.obsidianWave,
        onPrimary: AppColors.noirEclipse,
        onSecondary: AppColors.white,
        onSurface: AppColors.white,
        error: AppColors.red400,
        onError: AppColors.white,
      ),
      textTheme: GoogleFonts.poppinsTextTheme(base.textTheme).apply(bodyColor: AppColors.white, displayColor: AppColors.white),
      iconTheme: const IconThemeData(color: AppColors.white, size: 20),
      dividerTheme: DividerThemeData(color: AppColors.white30A(0.1), thickness: 1, space: 1),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: AppColors.limeLight,
        selectionColor: AppColors.limeLight.withValues(alpha: 0.3),
        selectionHandleColor: AppColors.limeLight,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: AppColors.limeLight),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.obsidianWave,
        contentTextStyle: fg(size: 14),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999), side: BorderSide(color: AppColors.white30A(0.2))),
      ),
      datePickerTheme: DatePickerThemeData(
        backgroundColor: AppColors.obsidianWave,
        headerBackgroundColor: AppColors.noirEclipse,
        headerForegroundColor: AppColors.white,
        todayForegroundColor: WidgetStateProperty.all(AppColors.limeLight),
        dayForegroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.noirEclipse : AppColors.white),
        dayBackgroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.limeLight : null),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: AppColors.limeLight,
        inactiveTrackColor: AppColors.whiteA(0.1),
        thumbColor: AppColors.limeLight,
        overlayColor: AppColors.limeLight.withValues(alpha: 0.2),
        trackHeight: 8,
        // Just enough room for the thumb, so the track lines up with the text around it.
        padding: const EdgeInsets.symmetric(horizontal: 10),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.noirEclipse : AppColors.white70),
        trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.limeLight : AppColors.whiteA(0.1)),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.limeLight : Colors.transparent),
        checkColor: WidgetStateProperty.all(AppColors.noirEclipse),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.noirEclipse,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
          systemNavigationBarColor: AppColors.noirEclipse,
          systemNavigationBarIconBrightness: Brightness.light,
        ),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.windows: FadeUpwardsPageTransitionsBuilder(),
          TargetPlatform.linux: FadeUpwardsPageTransitionsBuilder(),
        },
      ),
    );
  }
}
