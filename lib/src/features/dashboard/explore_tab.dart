import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../navigation.dart';
import '../../state/dashboard_controller.dart';
import '../../state/favorites_controller.dart';
import '../../state/workouts_controller.dart';
import '../../widgets/body_map.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import '../../widgets/workout_card.dart';
import '../workout/catalog_filter.dart';
import '../workout/my_workouts.dart';
import 'exercise_library.dart';

const _page = 9;

/// Browse and filter the workout catalog, your own workouts, or the
/// exercise library (dashboard/components/ExploreTab.tsx).
class ExploreTab extends StatefulWidget {
  const ExploreTab({super.key});

  @override
  State<ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends State<ExploreTab> {
  final _query = TextEditingController();
  String _view = 'workouts';
  String _category = '';
  String _level = '';
  String _equipment = '';
  int _maxMinutes = 0;
  List<String> _regions = [];
  bool _showFilters = false;
  bool _showAll = false;
  int _handledRequest = 0;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _clearAll() {
    _query.clear();
    setState(() {
      _category = '';
      _level = '';
      _equipment = '';
      _maxMinutes = 0;
      _regions = [];
      _showAll = false;
    });
  }

  /// Follow a request from elsewhere to show a category (/workouts#strength).
  void _applyRequest(DashboardController dashboard) {
    if (dashboard.exploreRequest == _handledRequest) return;
    _handledRequest = dashboard.exploreRequest;
    _view = 'workouts';
    _query.clear();
    _category = dashboard.exploreCategory ?? '';
    _showAll = false;
  }

  @override
  Widget build(BuildContext context) {
    _applyRequest(context.watch<DashboardController>());
    final catalog = context.watch<WorkoutsController>();
    final favorites = context.watch<FavoritesController>();
    final workouts = catalog.workouts;

    final categories = categoryCounts(workouts);
    final equipmentOptions = equipmentNames(workouts);

    final term = _query.text.trim().toLowerCase();
    final results = workouts
        .where((w) => matchesFilter(w, query: term, category: _category, level: _level, equipment: _equipment, maxMinutes: _maxMinutes) && worksRegions(w.targetMuscles, _regions))
        .toList();

    final advancedCount = [_level.isNotEmpty, _equipment.isNotEmpty, _maxMinutes > 0, _regions.isNotEmpty].where((b) => b).length;
    final anyFilter = term.isNotEmpty || _category.isNotEmpty || advancedCount > 0;
    final shown = _showAll ? results : results.take(_page).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 12,
          runSpacing: 12,
          children: [
            const PageTitle('Explore'),
            LinkText('Full catalog page →', onTap: () => openHref(context, '/workouts')),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.2))),
          child: Row(
            children: [
              for (final (id, label, icon) in const [('workouts', 'Workouts', LucideIcons.layers), ('mine', 'My workouts', LucideIcons.dumbbell), ('exercises', 'Exercises', LucideIcons.bookOpen)])
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(left: id == 'workouts' ? 0 : 4),
                    child: Semantics(
                      button: true,
                      selected: _view == id,
                      child: Material(
                        color: _view == id ? AppColors.limeLight : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => setState(() => _view = id),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(icon, size: 16, color: _view == id ? AppColors.noirEclipse : AppColors.white70),
                                const SizedBox(width: 8),
                                Flexible(child: Text(label, textAlign: TextAlign.center, style: fg(size: 12, weight: FontWeight.w700, color: _view == id ? AppColors.noirEclipse : AppColors.white70))),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (_view == 'mine')
          const MyWorkouts()
        else if (_view == 'exercises')
          const ExerciseLibrary()
        else ...[
          Row(
            children: [
              Expanded(
                child: SearchField(
                  controller: _query,
                  hint: 'Search workouts',
                  onChanged: (_) => setState(() => _showAll = false),
                ),
              ),
              const SizedBox(width: 8),
              Semantics(
                button: true,
                label: advancedCount > 0 ? 'Filters ($advancedCount)' : 'Filters',
                excludeSemantics: true,
                child: Material(
                  color: _showFilters || advancedCount > 0 ? AppColors.limeLight.withValues(alpha: 0.15) : AppColors.obsidianWave,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: _showFilters || advancedCount > 0 ? AppColors.limeLight : AppColors.white30A(0.4)),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => setState(() => _showFilters = !_showFilters),
                    // Icon only on a phone; the label too where there's room.
                    child: Container(
                      height: 48,
                      constraints: const BoxConstraints(minWidth: 48),
                      padding: EdgeInsets.symmetric(horizontal: atLeast(context, Breakpoints.sm) ? 16 : 0),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.slidersHorizontal, size: 18, color: _showFilters || advancedCount > 0 ? AppColors.limeLight : AppColors.white),
                          if (atLeast(context, Breakpoints.sm)) ...[
                            const SizedBox(width: 8),
                            Text(
                              advancedCount > 0 ? 'Filters ($advancedCount)' : 'Filters',
                              style: fg(size: 12, weight: FontWeight.w700, color: _showFilters || advancedCount > 0 ? AppColors.limeLight : AppColors.white),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (_showFilters) ...[
            const SizedBox(height: 16),
            FgGrid(columns: 1, sm: 3, gap: 12, children: [
              _FilterSelect(
                label: 'Level',
                value: _level,
                options: [('', 'Any level'), for (final l in catalogLevels) (l, l)],
                onChanged: (v) => setState(() => _level = v),
              ),
              _FilterSelect(
                label: 'Equipment',
                value: _equipment,
                options: [('', 'Any equipment'), ('none', 'No equipment needed'), for (final e in equipmentOptions) (e, e)],
                onChanged: (v) => setState(() => _equipment = v),
              ),
              _FilterSelect(
                label: 'Length',
                value: '$_maxMinutes',
                options: [for (final (m, label) in catalogDurations) ('$m', label)],
                onChanged: (v) => setState(() => _maxMinutes = int.parse(v)),
              ),
            ]),
            const SizedBox(height: 16),
            BodyMap(
              selected: _regions,
              onToggle: (r) => setState(() => _regions = _regions.contains(r) ? _regions.where((x) => x != r).toList() : [..._regions, r]),
              onClear: () => setState(() => _regions = []),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            height: 48,
            child: Semantics(
              label: 'Category',
              container: true,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  for (final (c, count) in [('', workouts.length), for (final e in categories) (e.key, e.value)])
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FgChip(
                        label: '${c.isEmpty ? 'All' : c}  $count',
                        selected: _category == c,
                        height: 34,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        unselectedBackground: AppColors.obsidianWave,
                        onTap: () => setState(() {
                          _category = c;
                          _showAll = false;
                        }),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (favorites.error != null) ...[const SizedBox(height: 16), ErrorLine(favorites.error!)],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Semantics(
                  liveRegion: true,
                  child: Text(
                    catalog.loading ? 'LOADING…' : '${results.length} WORKOUT${results.length == 1 ? '' : 'S'}',
                    style: fg(size: 14, weight: FontWeight.w700, letterSpacing: 1.4),
                  ),
                ),
              ),
              if (anyFilter)
                InkWell(
                  onTap: _clearAll,
                  child: Row(
                    children: [
                      const Icon(LucideIcons.x, size: 14, color: AppColors.red300),
                      const SizedBox(width: 6),
                      Text('Clear filters', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.red300)),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (catalog.loading)
            FgGrid(columns: 1, md: 2, lg: 3, children: [for (var i = 0; i < 6; i++) const Skeleton(height: 176, radius: 24)])
          else if (results.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 48),
              decoration: BoxDecoration(color: AppColors.obsidianWave.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.1))),
              child: Column(
                children: [
                  Text('No workouts match these filters.', style: fg(size: 16, color: AppColors.white70)),
                  if (anyFilter) ...[const SizedBox(height: 12), LinkText('Clear filters', weight: FontWeight.w700, onTap: _clearAll)],
                ],
              ),
            )
          else ...[
            FgGrid(columns: 1, md: 2, lg: 3, children: [
              for (final w in shown)
                WorkoutCard(workout: w, favorite: favorites.isFavorite(w.slug), onToggleFavorite: favorites.canSave ? favorites.toggle : null),
            ]),
            if (results.length > _page) ...[
              const SizedBox(height: 16),
              Center(
                child: FgButton(
                  label: _showAll ? 'Show fewer' : 'Show all ${results.length}',
                  style: FgButtonStyle.ghost,
                  radius: 12,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  onPressed: () => setState(() => _showAll = !_showAll),
                ),
              ),
            ],
          ],
          if (!favorites.canSave && !catalog.loading) ...[
            const SizedBox(height: 16),
            Text('Create an account to save favorites.', style: fg(size: 12, color: AppColors.white70)),
          ],
        ],
      ],
    );
  }
}

/// The search box (`bg-obsidian-wave border rounded-2xl` with a search icon).
class SearchField extends StatelessWidget {
  const SearchField({super.key, required this.controller, required this.hint, this.onChanged, this.radius = 12});
  final TextEditingController controller;
  final String hint;
  final ValueChanged<String>? onChanged;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return FgTextField(
      controller: controller,
      hint: hint,
      fontSize: 14,
      radius: radius,
      fill: AppColors.obsidianWave,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      semanticLabel: hint,
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
      prefix: const Icon(LucideIcons.search, size: 18, color: AppColors.white70),
    );
  }
}

class _FilterSelect extends StatelessWidget {
  const _FilterSelect({required this.label, required this.value, required this.options, required this.onChanged});
  final String label;
  final String value;
  final List<(String, String)> options;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.2))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SmallLabel(label),
          const SizedBox(height: 8),
          FgSelect<String>(value: value, options: options, onChanged: onChanged, semanticLabel: label),
        ],
      ),
    );
  }
}
