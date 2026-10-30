import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../services/catalog_service.dart';
import '../../state/favorites_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import '../../widgets/workout_card.dart';
import '../common/site_page.dart';
import '../dashboard/explore_tab.dart' show SearchField;
import 'catalog_filter.dart';

/// The full catalog (app/workouts/page.js and WorkoutCatalog.tsx): a search
/// box and filter chips over picture cards, grouped by category until a
/// filter is on.
class WorkoutsCatalogScreen extends StatefulWidget {
  const WorkoutsCatalogScreen({super.key});

  @override
  State<WorkoutsCatalogScreen> createState() => _WorkoutsCatalogScreenState();
}

class _WorkoutsCatalogScreenState extends State<WorkoutsCatalogScreen> {
  final _query = TextEditingController();
  List<Workout>? _workouts;
  bool _failed = false;
  String _category = '';
  String _level = '';
  int _maxMinutes = 0;
  bool _noGear = false;

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
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _clear() {
    _query.clear();
    setState(() {
      _category = '';
      _level = '';
      _maxMinutes = 0;
      _noGear = false;
    });
  }

  Widget _chip(String label, bool on, VoidCallback onTap) => FgChip(
        label: label,
        selected: on,
        onTap: onTap,
        fontSize: 12,
        fontWeight: FontWeight.w700,
        unselectedBackground: AppColors.obsidianWave,
        unselectedText: AppColors.white70,
      );

  @override
  Widget build(BuildContext context) {
    final workouts = _workouts ?? const <Workout>[];
    final favorites = context.watch<FavoritesController>();
    final categories = categoryCounts(workouts);
    final results = workouts.where((w) => matchesFilter(w, query: _query.text, category: _category, level: _level, maxMinutes: _maxMinutes, equipment: _noGear ? 'none' : '')).toList();
    final filtering = _query.text.trim().isNotEmpty || _category.isNotEmpty || _level.isNotEmpty || _maxMinutes > 0 || _noGear;

    Widget grid(List<Workout> items) => FgGrid(columns: 1, sm: 2, lg: 3, children: [
          for (final w in items)
            WorkoutCard(workout: w, favorite: favorites.isFavorite(w.slug), onToggleFavorite: favorites.canSave ? favorites.toggle : null),
        ]);

    return SitePage(
      active: '/workouts',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PageTitle('Workouts', size: atLeast(context, Breakpoints.md) ? 36 : 30),
          const SizedBox(height: 8),
          Text('${workouts.length} guided workouts across ${categories.length} categories.', style: fg(size: 16, color: AppColors.white70)),
          const SizedBox(height: 20),
          if (_failed)
            FgCard(
              padding: const EdgeInsets.all(20),
              child: Text('The workout catalog can’t be loaded right now. Please try again in a moment.', style: fg(size: 16, color: AppColors.white70)),
            )
          else if (_workouts == null)
            const LoadingRow('Loading workouts…')
          else ...[
            SearchField(controller: _query, hint: 'Search by name, muscle or goal', onChanged: (_) => setState(() {})),
            const SizedBox(height: 12),
            // Categories scroll sideways on a phone and wrap where there's room.
            _ChipRow(children: [
              _chip('All · ${workouts.length}', _category.isEmpty, () => setState(() => _category = '')),
              for (final c in categories) _chip('${c.key} · ${c.value}', _category == c.key, () => setState(() => _category = _category == c.key ? '' : c.key)),
            ]),
            const SizedBox(height: 8),
            _ChipRow(children: [
              for (final (m, label) in catalogDurations.skip(1)) _chip(label, _maxMinutes == m, () => setState(() => _maxMinutes = _maxMinutes == m ? 0 : m)),
              _chip('No equipment', _noGear, () => setState(() => _noGear = !_noGear)),
              for (final l in catalogLevels) _chip(l, _level == l, () => setState(() => _level = _level == l ? '' : l)),
            ]),
            if (filtering) ...[
              const SizedBox(height: 4),
              Align(alignment: Alignment.centerLeft, child: LinkText('Clear filters', size: 12, onTap: _clear)),
            ],
            const SizedBox(height: 20),
            if (filtering) ...[
              Semantics(liveRegion: true, child: Text(results.length == 1 ? '1 workout' : '${results.length} workouts', style: fg(size: 14, weight: FontWeight.w700, color: AppColors.white70))),
              const SizedBox(height: 12),
              if (results.isEmpty)
                FgCard(
                  padding: const EdgeInsets.all(24),
                  child: Column(children: [
                    const Icon(LucideIcons.searchX, size: 24, color: AppColors.white70),
                    const SizedBox(height: 8),
                    Text('No workouts match', style: fg(size: 16, weight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text('Try fewer filters or another word.', textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.white70)),
                  ]),
                )
              else
                grid(results),
            ] else
              for (final c in categories) ...[
                Semantics(header: true, child: Text(c.key, style: fg(size: 20, weight: FontWeight.w800))),
                const SizedBox(height: 12),
                grid([for (final w in workouts) if (w.category == c.key) w]),
                const SizedBox(height: 32),
              ],
          ],
        ],
      ),
    );
  }
}

/// Chips in one sideways-scrolling line on a phone, wrapped on wider screens.
class _ChipRow extends StatelessWidget {
  const _ChipRow({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    if (atLeast(context, Breakpoints.md)) return Wrap(spacing: 8, runSpacing: 8, children: children);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(children: [for (final (i, c) in children.indexed) Padding(padding: EdgeInsets.only(left: i == 0 ? 0 : 8), child: c)]),
    );
  }
}
