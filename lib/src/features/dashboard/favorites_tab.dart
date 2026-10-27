import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../state/favorites_controller.dart';
import '../../widgets/ui.dart';
import '../../widgets/workout_card.dart';

/// The signed-in user's saved workouts (dashboard/components/FavoritesTab.tsx).
class FavoritesTab extends StatelessWidget {
  const FavoritesTab({super.key});

  @override
  Widget build(BuildContext context) {
    final favorites = context.watch<FavoritesController>();
    if (!favorites.canSave) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 80),
        child: Column(
          children: [
            const Icon(LucideIcons.lock, size: 40, color: AppColors.white70),
            const SizedBox(height: 16),
            Text('Save workouts you like', style: fg(size: 20, weight: FontWeight.w700)),
            const SizedBox(height: 16),
            SizedBox(
              width: 280,
              child: Text('Create an account to keep a list of favorite workouts across your devices.', textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.white70)),
            ),
            const SizedBox(height: 16),
            FgButton(label: 'Create an account', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: context.read<AuthController>().startSignUp),
          ],
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const PageTitle('Favorite workouts', size: 24),
        if (!favorites.loading) ...[const SizedBox(height: 4), Text('${favorites.favorites.length} saved', style: fg(size: 14, color: AppColors.white70))],
        const SizedBox(height: 16),
        if (favorites.error != null) ...[ErrorLine(favorites.error!), const SizedBox(height: 16)],
        if (favorites.loading)
          const LoadingRow('Loading favorites…', padding: EdgeInsets.symmetric(vertical: 40))
        else if (favorites.favorites.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 48),
            child: Column(
              children: [
                const Icon(LucideIcons.heart, size: 48, color: AppColors.white70),
                const SizedBox(height: 16),
                Text('No favorites yet', style: fg(size: 20, weight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text('Tap the heart on any workout to save it here.', style: fg(size: 16, color: AppColors.white70)),
                const SizedBox(height: 16),
                FgButton(
                  label: 'Find workouts',
                  radius: 12,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  onPressed: () => context.read<DashboardController>().setTab(DashboardTab.explore),
                ),
              ],
            ),
          )
        else
          FgGrid(columns: 1, md: 2, lg: 3, children: [
            for (final w in favorites.favorites) WorkoutCard(workout: w, favorite: true, onToggleFavorite: favorites.toggle),
          ]),
      ],
    );
  }
}
