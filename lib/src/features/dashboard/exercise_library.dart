import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../services/catalog_service.dart';
import '../../widgets/body_map.dart';
import '../../widgets/forms.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';
import 'explore_tab.dart';

const _categoryColors = {
  'Strength': Color(0xFFC084FC),
  'Cardio': Color(0xFFFB923C),
  'Mobility': Color(0xFF14B8A6),
  'Core': Color(0xFF00C4B4),
  'Plyometric': Color(0xFFF59E0B),
};

const _tracking = {'reps': 'Counted in reps', 'weighted': 'Weight × reps', 'duration': 'Timed', 'distance': 'Distance'};

String _normalize(String s) => s.toLowerCase().replaceAll(RegExp('[^a-z0-9]+'), ' ').trim();

/// FitGuide's exercise library (dashboard/components/ExerciseLibrary.tsx).
class ExerciseLibrary extends StatefulWidget {
  const ExerciseLibrary({super.key});

  @override
  State<ExerciseLibrary> createState() => _ExerciseLibraryState();
}

class _ExerciseLibraryState extends State<ExerciseLibrary> {
  final _query = TextEditingController();
  List<Exercise>? _exercises;
  String? _error;
  String _category = '';
  String _equipment = '';
  List<String> _regions = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _load() {
    setState(() => _error = null);
    fetchExercises().then((list) {
      if (mounted) setState(() => _exercises = list);
    }).catchError((Object err) {
      if (mounted) setState(() => _error = '$err');
    });
  }

  void _reset() {
    _query.clear();
    setState(() {
      _category = '';
      _equipment = '';
      _regions = [];
    });
  }

  void _open(Exercise e) {
    final color = _categoryColors[e.category] ?? AppColors.limeLight;
    showFgModal<void>(
      context,
      title: e.name,
      sheet: true,
      builder: (_) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(spacing: 8, runSpacing: 8, children: [
            Pill(e.category, color: color, background: color.withAlpha(0x22), size: 12, weight: FontWeight.w700),
            Pill(_tracking[e.trackingType] ?? e.trackingType, color: AppColors.white70, background: AppColors.whiteA(0.1), size: 12, weight: FontWeight.w700, uppercase: false),
          ]),
          if (e.aliases.isNotEmpty) ...[const SizedBox(height: 20), Text('Also called: ${e.aliases.join(', ')}', style: fg(size: 12, color: AppColors.white70))],
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(16)),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final (label, value) in [
                  ('MUSCLES', e.primaryMuscles.join(', ')),
                  ('EQUIPMENT', e.equipment.isEmpty ? 'None' : e.equipment.join(', ')),
                ])
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(label, style: fgLabel(size: 10)),
                        const SizedBox(height: 2),
                        Text(value, style: fg(size: 14, weight: FontWeight.w600)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          if (e.instructions.isNotEmpty) ...[
            const SizedBox(height: 20),
            const SmallLabel('How to do it'),
            const SizedBox(height: 8),
            ...spaced([
              for (final (i, step) in e.instructions.indexed)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 2),
                      width: 20,
                      height: 20,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.limeLight.withValues(alpha: 0.2)),
                      child: Text('${i + 1}', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.limeLight)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Text(step, style: fg(size: 14))),
                  ],
                ),
            ], 8),
          ],
          if (e.formCues.isNotEmpty) ...[
            const SizedBox(height: 20),
            const SmallLabel('Form cues'),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.limeLight.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.limeLight.withValues(alpha: 0.2)),
              ),
              child: Column(
                children: spaced([
                  for (final cue in e.formCues)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(padding: EdgeInsets.only(top: 2), child: Icon(LucideIcons.shieldCheck, size: 16, color: AppColors.limeLight)),
                        const SizedBox(width: 8),
                        Expanded(child: Text(cue, style: fg(size: 14))),
                      ],
                    ),
                ], 6),
              ),
            ),
          ],
          if (e.commonMistakes.isNotEmpty) ...[
            const SizedBox(height: 20),
            const SmallLabel('Common mistakes'),
            const SizedBox(height: 8),
            for (final m in e.commonMistakes)
              Padding(
                padding: const EdgeInsets.only(bottom: 4, left: 4),
                child: Text('•  $m', style: fg(size: 14, color: AppColors.white70)),
              ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.red500.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.red500.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Expanded(child: ErrorLine(_error!)),
            const SizedBox(width: 12),
            FgButton(label: 'Try again', style: FgButtonStyle.ghost, height: 36, fontSize: 14, fontWeight: FontWeight.w700, onPressed: _load),
          ],
        ),
      );
    }
    final exercises = _exercises ?? const <Exercise>[];
    final equipmentOptions = {for (final e in exercises) ...e.equipment}.toList()..sort();
    final categories = {for (final e in exercises) e.category}.toList();
    final term = _normalize(_query.text);
    final shown = exercises.where((e) {
      if (_category.isNotEmpty && e.category != _category) return false;
      if (_equipment == 'none' ? e.equipment.isNotEmpty : _equipment.isNotEmpty && !e.equipment.contains(_equipment)) return false;
      if (!worksRegions(e.primaryMuscles, _regions)) return false;
      return term.isEmpty || [e.name, ...e.aliases, ...e.primaryMuscles].any((n) => _normalize(n).contains(term));
    }).toList();
    final filtered = term.isNotEmpty || _category.isNotEmpty || _equipment.isNotEmpty || _regions.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'How to do each exercise in FitGuide\'s workouts: the muscles it works, the equipment, step-by-step instructions, form cues and common mistakes.',
          style: fg(size: 14, color: AppColors.white70),
        ),
        const SizedBox(height: 20),
        SearchField(controller: _query, hint: 'Search exercises by name or muscle', onChanged: (_) => setState(() {})),
        const SizedBox(height: 20),
        Semantics(
          label: 'Exercise type',
          container: true,
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final c in ['', ...categories])
                FgChip(
                  label: c.isEmpty ? 'All types' : c,
                  selected: _category == c,
                  height: 36,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  unselectedBackground: AppColors.obsidianWave,
                  onTap: () => setState(() => _category = c),
                ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Text('Equipment', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
            const SizedBox(width: 8),
            Expanded(
              child: FgSelect<String>(
                value: _equipment,
                fill: AppColors.obsidianWave,
                fontSize: 12,
                dense: true,
                semanticLabel: 'Equipment',
                options: [('', 'Any'), ('none', 'None (bodyweight)'), for (final o in equipmentOptions) (o, o)],
                onChanged: (v) => setState(() => _equipment = v),
              ),
            ),
          ],
        ),
        if (filtered) ...[
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: Material(
              color: AppColors.red500.withValues(alpha: 0.1),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: AppColors.red500.withValues(alpha: 0.3))),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: _reset,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(LucideIcons.x, size: 14, color: AppColors.red300),
                      const SizedBox(width: 6),
                      Text('Clear filters', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.red300)),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
        const SizedBox(height: 20),
        BodyMap(
          selected: _regions,
          onToggle: (r) => setState(() => _regions = _regions.contains(r) ? _regions.where((x) => x != r).toList() : [..._regions, r]),
          onClear: () => setState(() => _regions = []),
        ),
        const SizedBox(height: 20),
        if (_exercises == null)
          const LoadingRow('Loading exercises…', padding: EdgeInsets.symmetric(vertical: 32))
        else if (shown.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 56),
            decoration: BoxDecoration(color: AppColors.obsidianWave.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.1))),
            child: Column(
              children: [
                const Icon(LucideIcons.bookOpen, size: 40, color: AppColors.white70),
                const SizedBox(height: 12),
                Text('No exercises match', style: fg(size: 16, weight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text('Try fewer filters or another search.', style: fg(size: 14, color: AppColors.white70)),
              ],
            ),
          )
        else ...[
          Semantics(liveRegion: true, child: Text('${shown.length} of ${exercises.length} exercises', style: fg(size: 12, color: AppColors.white70))),
          const SizedBox(height: 16),
          FgGrid(columns: 1, sm: 2, lg: 3, children: [
            for (final e in shown)
              FgCard(
                onTap: () => _open(e),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Pill(e.category, color: _categoryColors[e.category] ?? AppColors.limeLight, background: (_categoryColors[e.category] ?? AppColors.limeLight).withAlpha(0x22), weight: FontWeight.w700),
                        const Spacer(),
                        const Icon(LucideIcons.chevronRight, size: 16, color: AppColors.white70),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(e.name, style: fg(size: 16, weight: FontWeight.w800, height: 1.2)),
                    const SizedBox(height: 8),
                    Text(e.primaryMuscles.join(', '), style: fg(size: 12, color: AppColors.white70)),
                    const SizedBox(height: 8),
                    Text(e.equipment.isEmpty ? 'No equipment' : e.equipment.join(', '), style: fg(size: 11, color: AppColors.white70)),
                  ],
                ),
              ),
          ]),
        ],
      ],
    );
  }
}
