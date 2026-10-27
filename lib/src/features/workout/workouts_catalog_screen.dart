import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../navigation.dart';
import '../../services/catalog_service.dart';
import '../../widgets/ui.dart';
import '../common/site_page.dart';

/// The full catalog by category (app/workouts/page.js).
class WorkoutsCatalogScreen extends StatefulWidget {
  const WorkoutsCatalogScreen({super.key});

  @override
  State<WorkoutsCatalogScreen> createState() => _WorkoutsCatalogScreenState();
}

class _WorkoutsCatalogScreenState extends State<WorkoutsCatalogScreen> {
  List<Workout>? _workouts;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    fetchWorkouts().then((r) {
      if (mounted) setState(() => _workouts = r.workouts);
    }).catchError((_) {
      if (mounted) setState(() => _failed = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final workouts = _workouts ?? const <Workout>[];
    final byCategory = <String, List<Workout>>{};
    for (final w in workouts) {
      byCategory.putIfAbsent(w.category, () => []).add(w);
    }
    return SitePage(
      active: '/workouts',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PageTitle('Workouts', size: atLeast(context, Breakpoints.md) ? 36 : 30),
          const SizedBox(height: 8),
          Text('${workouts.length} guided workouts across ${byCategory.length} categories.', style: fg(size: 16, color: AppColors.white70)),
          const SizedBox(height: 32),
          if (_failed)
            FgCard(
              padding: const EdgeInsets.all(20),
              child: Text('The workout catalog can’t be loaded right now. Please try again in a moment.', style: fg(size: 16, color: AppColors.white70)),
            )
          else if (_workouts == null)
            const LoadingRow('Loading workouts…'),
          for (final entry in byCategory.entries) ...[
            Semantics(header: true, child: Text(entry.key, style: fg(size: 18, weight: FontWeight.w700))),
            const SizedBox(height: 16),
            FgGrid(columns: 1, sm: 2, lg: 3, children: [
              for (final w in entry.value)
                FgCard(
                  onTap: () => openWorkout(context, w.slug),
                  // The details line up along the bottom of a row of cards.
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(w.title, style: fg(size: 16, weight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        Text(w.shortDescription ?? w.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: fg(size: 14, color: AppColors.white70)),
                        const SizedBox(height: 16),
                      ]),
                      Wrap(
                        spacing: 16,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          _Meta(LucideIcons.clock, '${w.duration} min'),
                          _Meta(LucideIcons.trendingUp, w.difficulty),
                          if (w.isPremium) Text('PLUS', style: fg(size: 12, weight: FontWeight.w800, color: AppColors.amber300)),
                          if (w.calories != null && w.calories! > 0) _Meta(LucideIcons.flame, '${w.calories} kcal'),
                        ],
                      ),
                    ],
                  ),
                ),
            ]),
            const SizedBox(height: 32),
          ],
        ],
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta(this.icon, this.text);
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [Icon(icon, size: 14, color: AppColors.white70), const SizedBox(width: 4), Text(text, style: fg(size: 12, color: AppColors.white70))],
    );
  }
}
