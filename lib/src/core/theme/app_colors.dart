import 'package:flutter/material.dart';

class AppColors {
  // Main Background
  static const Color noirEclipse = Color(0xFF0A0C10);

  // Secondary Background / Cards
  static const Color obsidianWave = Color(0xFF131921);
  static const Color cardSurface = Color(0xFF1A1F2E);

  // Primary Accent (Neon Yellow/Lime)
  static const Color limeLight = Color(0xFFEEFF00);
  static const Color limeLightDark = Color(0xFFCCDD00);

  // Secondary Accent (Royal Blue)
  static const Color royalNebula = Color(0xFF3E25F5);
  static const Color royalNebulaDark = Color(0xFF2E1BC5);

  // Gradient Colors
  static const Color purpleGlow = Color(0xFF6C63FF);
  static const Color pinkGlow = Color(0xFFFF6B9D);
  static const Color blueGlow = Color(0xFF00D4FF);

  // Text Colors
  static const Color white = Color(0xFFFFFFFF);
  static const Color white90 = Color(0xE6FFFFFF);
  static const Color white70 = Color(0xB3FFFFFF);
  static const Color white50 = Color(0x80FFFFFF);
  static const Color white30 = Color(0x4DFFFFFF);
  static const Color white10 = Color(0x1AFFFFFF);

  // Status Colors
  static const Color success = Color(0xFF00FF87);
  static const Color warning = Color(0xFFFFB800);
  static const Color error = Color(0xFFFF5252);
  static const Color info = Color(0xFF00D4FF);

  // Gradient Definitions
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [limeLight, Color(0xFFCCFF00)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [royalNebula, purpleGlow],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [noirEclipse, obsidianWave],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [cardSurface, obsidianWave],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
