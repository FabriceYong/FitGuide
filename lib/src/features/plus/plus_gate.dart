import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../navigation.dart';
import '../../widgets/ui.dart';
import '../workout/workouts_catalog_screen.dart';

/// The upgrade card shown instead of a locked PLUS workout (components/PlusGate.tsx).
class PlusLockedScreen extends StatelessWidget {
  const PlusLockedScreen({super.key, required this.workout});
  final Workout workout;

  @override
  Widget build(BuildContext context) {
    // The buttons sit side by side where there's room (`sm:flex-row`).
    final row = atLeast(context, Breakpoints.sm);
    final see = FgButton(label: 'See PLUS', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, expand: !row, onPressed: () => openHref(context, '/plus'));
    final browse = FgButton(
      label: 'Browse free workouts',
      style: FgButtonStyle.ghost,
      radius: 12,
      fontSize: 14,
      fontWeight: FontWeight.w700,
      expand: !row,
      onPressed: () => Navigator.of(context).pushReplacement(pageRoute(const WorkoutsCatalogScreen())),
    );
    return Scaffold(
      appBar: AppBar(leading: const BackButton()),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 512),
              child: FgCard(
                radius: 24,
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const Pill('FitGuide PLUS', color: AppColors.amber300, background: Color(0x26FBBF24), icon: LucideIcons.crown, size: 12, weight: FontWeight.w800),
                    const SizedBox(height: 20),
                    Text(workout.title, textAlign: TextAlign.center, style: fg(size: 30, weight: FontWeight.w800)),
                    const SizedBox(height: 20),
                    Text(workout.description, textAlign: TextAlign.center, style: fg(size: 16, color: AppColors.white70)),
                    const SizedBox(height: 20),
                    Text('${workout.duration} min · ${workout.category}', style: fg(size: 14, color: AppColors.white70)),
                    const SizedBox(height: 20),
                    if (row)
                      Row(mainAxisAlignment: MainAxisAlignment.center, children: [Flexible(child: see), const SizedBox(width: 12), Flexible(child: browse)])
                    else ...[
                      see,
                      const SizedBox(height: 12),
                      browse,
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
