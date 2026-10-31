import 'package:flutter/material.dart';

/// The website's design tokens (fitguide_nextjs/src/app/globals.css) plus the
/// Tailwind colours its components use, so screens can be matched 1:1.
class AppColors {
  // Brand tokens
  static const Color noirEclipse = Color(0xFF0A0C10);
  static const Color obsidianWave = Color(0xFF131921);
  // Named "lime" on the site, but the value is teal.
  static const Color limeLight = Color(0xFF00C4B4);
  static const Color royalNebula = Color(0xFF3E25F5);
  static const Color white = Color(0xFFFFFFFF);
  static const Color white70 = Color(0xB3FFFFFF);
  static const Color white30 = Color(0x4DFFFFFF);

  /// The faintest text colour that stays readable: 50% white keeps the
  /// WCAG AA 4.5:1 contrast on the app's dark backgrounds, where the site's
  /// `text-white-30` and `text-white/40` labels fall short.
  static const Color muted = Color(0x80FFFFFF);

  // Tailwind colours used across the site
  static const Color red300 = Color(0xFFFCA5A5);
  static const Color red400 = Color(0xFFF87171);
  static const Color red500 = Color(0xFFEF4444);
  static const Color red600 = Color(0xFFDC2626);
  static const Color amber200 = Color(0xFFFDE68A);
  static const Color amber300 = Color(0xFFFCD34D);
  static const Color amber400 = Color(0xFFFBBF24);
  static const Color amber500 = Color(0xFFF59E0B);
  static const Color orange200 = Color(0xFFFED7AA);
  static const Color orange300 = Color(0xFFFDBA74);
  static const Color orange400 = Color(0xFFFB923C);
  static const Color orange500 = Color(0xFFF97316);
  static const Color emerald300 = Color(0xFF6EE7B7);
  static const Color emerald400 = Color(0xFF34D399);
  static const Color emerald500 = Color(0xFF10B981);
  static const Color green400 = Color(0xFF4ADE80);
  static const Color green500 = Color(0xFF22C55E);
  static const Color cyan400 = Color(0xFF22D3EE);
  static const Color sky400 = Color(0xFF38BDF8);
  static const Color pink400 = Color(0xFFF472B6);
  static const Color blue400 = Color(0xFF60A5FA);
  static const Color indigo300 = Color(0xFFA5B4FC);
  static const Color indigo400 = Color(0xFF818CF8);
  static const Color indigo500 = Color(0xFF6366F1);
  static const Color indigo600 = Color(0xFF4F46E5);
  static const Color purple200 = Color(0xFFE9D5FF);
  static const Color purple300 = Color(0xFFD8B4FE);
  static const Color purple400 = Color(0xFFC084FC);
  static const Color purple500 = Color(0xFFA855F7);
  static const Color gray300 = Color(0xFFD1D5DB);
  static const Color yellow300 = Color(0xFFFDE047);
  static const Color amber600 = Color(0xFFD97706);

  /// `white/5`, `white/10` … as on the site.
  static Color whiteA(double opacity) => white.withValues(alpha: opacity);

  /// `white-30/20` and friends: white30 at a further opacity.
  static Color white30A(double opacity) => white.withValues(alpha: 0.3 * opacity);

  /// A hex colour with an alpha suffix, like the site's `${color}22`.
  static Color withHexAlpha(Color color, int alpha) => color.withAlpha(alpha);

  /// Parse '#RRGGBB'.
  static Color hex(String value) {
    final hex = value.replaceFirst('#', '');
    return Color(int.parse('FF$hex', radix: 16));
  }
}
