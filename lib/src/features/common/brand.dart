import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/i18n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

/// The FitGuide logo, as in the site header.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.radius = 10, this.extraBold = true});
  final double radius;
  final bool extraBold;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ExcludeSemantics(
          child: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(color: AppColors.limeLight, borderRadius: BorderRadius.circular(radius)),
            child: const Icon(LucideIcons.dumbbell, size: 18, color: AppColors.noirEclipse),
          ),
        ),
        const SizedBox(width: 8),
        // The wordmark is a logo: it keeps its size whatever the system text size.
        MediaQuery.withNoTextScaling(child: Text('FitGuide', style: fg(size: 18, weight: extraBold ? FontWeight.w800 : FontWeight.w700, letterSpacing: -0.3))),
      ],
    );
  }
}

/// Full-screen placeholder while the session or data loads.
class LoadingScreen extends StatelessWidget {
  const LoadingScreen({super.key, this.message = 'Loading…'});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Semantics(
          liveRegion: true,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(LucideIcons.dumbbell, size: 56, color: AppColors.limeLight),
              const SizedBox(height: 16),
              SizedBox(
                width: 48,
                height: 48,
                child: CircularProgressIndicator(strokeWidth: 4, color: AppColors.limeLight, backgroundColor: AppColors.limeLight.withValues(alpha: 0.3)),
              ),
              const SizedBox(height: 16),
              Text(message, style: fg(size: 18, weight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Compact language picker (LanguageSwitcher).
class LanguageSwitcher extends StatelessWidget {
  const LanguageSwitcher({super.key});

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleController>();
    return Semantics(
      label: locale.t('language.label'),
      child: PopupMenuButton<String>(
        tooltip: locale.t('language.label'),
        color: AppColors.obsidianWave,
        initialValue: locale.locale,
        onSelected: locale.setLocale,
        itemBuilder: (context) => [
          for (final l in locales) PopupMenuItem(value: l, child: Text(localeNames[l]!, style: fg(size: 14, weight: l == locale.locale ? FontWeight.w700 : FontWeight.w400))),
        ],
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(LucideIcons.globe, size: 16, color: AppColors.white70),
              const SizedBox(width: 4),
              Text(localeNames[locale.locale]!.toUpperCase(), style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
              const Icon(Icons.arrow_drop_down, size: 18, color: AppColors.white70),
            ],
          ),
        ),
      ),
    );
  }
}

/// Credit for the Unsplash photos, and the medical disclaimer (ImageAttribution).
class ImageAttribution extends StatelessWidget {
  const ImageAttribution({super.key, this.onUnsplash});
  final VoidCallback? onUnsplash;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(color: AppColors.obsidianWave, border: Border(top: BorderSide(color: AppColors.white30A(0.1)))),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        spacing: 8,
        runSpacing: 8,
        children: [
          InkWell(
            onTap: onUnsplash,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Photos from ', style: fg(size: 12, color: AppColors.white70)),
                Text('Unsplash', style: fg(size: 12, color: AppColors.limeLight)),
                const SizedBox(width: 4),
                const Icon(LucideIcons.externalLink, size: 12, color: AppColors.limeLight),
              ],
            ),
          ),
          Text('FitGuide is not a substitute for medical advice.', style: fg(size: 12, color: AppColors.white70)),
        ],
      ),
    );
  }
}
