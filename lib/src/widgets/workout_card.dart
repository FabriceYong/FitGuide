import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/images.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import '../models/catalog.dart';
import '../navigation.dart';
import 'ui.dart';

/// A workout tile linking to its page (dashboard/components/WorkoutCard.tsx).
/// With [onToggleFavorite] it also shows a heart button. [calories]
/// replaces the catalog estimate (e.g. with one for this user).
class WorkoutCard extends StatelessWidget {
  const WorkoutCard({super.key, required this.workout, this.favorite = false, this.onToggleFavorite, this.tall = false, this.calories, this.useCatalogCalories = true});

  final Workout workout;
  final bool favorite;
  final ValueChanged<String>? onToggleFavorite;
  final bool tall;
  final int? calories;
  final bool useCatalogCalories;

  @override
  Widget build(BuildContext context) {
    final color = categoryColor(workout.category);
    final image = workoutSpecificImage(workout.title, workout.category, size: ImageSize.small, customImageUrl: workout.thumbnailUrl);
    final kcal = calories ?? (useCatalogCalories ? workout.calories : null);
    // The site's height, growing when large system text needs more room.
    return Container(
      constraints: BoxConstraints(minHeight: tall ? 220 : 176),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(24), border: Border.all(color: color.withAlpha(0x40), width: 2)),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.passthrough,
        children: [
          Positioned.fill(child: NetImage(image)),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [AppColors.noirEclipse, AppColors.noirEclipse.withValues(alpha: 0.6), AppColors.noirEclipse.withValues(alpha: 0.1)],
                ),
              ),
            ),
          ),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => openWorkout(context, workout.slug),
              child: Semantics(
                button: true,
                label: '${workout.title}, ${workout.duration} minutes, ${workout.difficulty}',
                excludeSemantics: true,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Pill(workout.category, background: color.withAlpha(0xCC), textColor: AppColors.white, weight: FontWeight.w700, size: 10),
                          if (workout.isPremium) ...[
                            const SizedBox(width: 6),
                            const Pill('PLUS', background: AppColors.amber400, textColor: AppColors.noirEclipse, size: 10),
                          ],
                        ],
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 12),
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(shape: BoxShape.circle, color: color.withAlpha(0xCC)),
                            child: const Icon(Icons.play_arrow_rounded, size: 18, color: AppColors.white),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            workout.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: fg(size: 16, weight: FontWeight.w800, height: 1.2),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(LucideIcons.clock, size: 14),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  '${workout.duration} min · ${workout.difficulty}${kcal != null && kcal > 0 ? ' · ~$kcal kcal' : ''}',
                                  overflow: TextOverflow.ellipsis,
                                  style: fg(size: 12),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (onToggleFavorite != null)
            Positioned(
              // 12px from the corner, as on the site, inside a 48px touch area.
              top: 6,
              right: 6,
              child: TapPadding(
                child: Semantics(
                  button: true,
                  selected: favorite,
                  label: favorite ? 'Remove ${workout.title} from favorites' : 'Add ${workout.title} to favorites',
                  excludeSemantics: true,
                  child: Material(
                    color: AppColors.noirEclipse.withValues(alpha: 0.7),
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () => onToggleFavorite!(workout.slug),
                      child: SizedBox(
                        width: 36,
                        height: 36,
                        child: Icon(favorite ? Icons.favorite_rounded : LucideIcons.heart, size: 16, color: favorite ? AppColors.red500 : AppColors.white),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
