import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/images.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../models/training.dart';
import '../../navigation.dart';
import '../../services/training_service.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../state/workouts_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import '../../widgets/workout_card.dart';
import '../dashboard/explore_tab.dart';
import 'program_card.dart';

const _levels = [
  ('All', LucideIcons.layoutGrid, 'Everything'),
  ('Beginner', LucideIcons.zap, 'Build foundations'),
  ('Intermediate', LucideIcons.trendingUp, 'Step it up'),
  ('Advanced', LucideIcons.flame, 'Peak performance'),
];

const _levelText = {
  'Beginner': 'For starting out or coming back: simpler movements and lower intensity.',
  'Intermediate': 'For regular exercisers: more volume, intensity and complexity.',
  'Advanced': 'For experienced athletes: high intensity and demanding movements.',
  'All Levels': 'Easy to scale up or down to suit you.',
};

/// Multi-week programs, the personal plan, and single workouts by level
/// (features/programs/ProgramsTab.tsx).
class ProgramsTab extends StatefulWidget {
  const ProgramsTab({super.key});

  @override
  State<ProgramsTab> createState() => _ProgramsTabState();
}

class _ProgramsTabState extends State<ProgramsTab> {
  final _query = TextEditingController();
  List<ProgramSummary>? _programs;
  String? _programsError;
  Plan? _active;
  String _level = 'All';
  String _category = '';
  String? _loadedFor;

  @override
  void initState() {
    super.initState();
    fetchPrograms().then((p) {
      if (mounted) setState(() => _programs = p);
    }).catchError((Object err) {
      if (mounted) setState(() => _programsError = '$err');
    });
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _loadEnrollment(AuthController auth, int dataVersion) {
    final id = auth.hasAccount ? auth.user!.id : null;
    final key = id == null ? null : '$id:$dataVersion';
    if (key == _loadedFor) return;
    if (!(_loadedFor?.startsWith('$id:') ?? false)) _active = null;
    _loadedFor = key;
    if (id == null) return;
    fetchEnrollments().then((e) {
      if (mounted) setState(() => _active = e.active);
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    _loadEnrollment(context.watch<AuthController>(), context.select<DashboardController, int>((d) => d.dataVersion));
    final catalog = context.watch<WorkoutsController>();
    final term = _query.text.trim().toLowerCase();
    final matches = catalog.workouts
        .where((w) => (_category.isEmpty || w.category == _category) && (term.isEmpty || w.title.toLowerCase().contains(term) || w.description.toLowerCase().contains(term)))
        .toList();
    final levels = _level == 'All' ? ['Beginner', 'Intermediate', 'Advanced', 'All Levels'] : [_level, 'All Levels'];
    final groups = [for (final l in levels) (l, matches.where((w) => w.difficulty == l).toList())];
    final active = _active;
    final personalPlan = active != null && active.isPersonalPlan ? active : null;
    final programs = [...?_programs]..sort((a, b) => (b.slug == active?.programSlug ? 1 : 0) - (a.slug == active?.programSlug ? 1 : 0));
    final wide = atLeast(context, Breakpoints.md);
    final planText = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.sparkles, size: 24, color: AppColors.limeLight),
            const SizedBox(width: 8),
            Expanded(child: Text(personalPlan != null ? 'Your personal plan' : 'Want a plan made for you?', style: fg(size: 18, weight: FontWeight.w800))),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          personalPlan != null
              ? 'Week ${personalPlan.currentWeek} of ${personalPlan.weeks ?? '?'} · ${personalPlan.completedCount} of ${personalPlan.totalDays} sessions done.'
              : 'Tell FitGuide your goal, level, available days and equipment, and it builds a weekly schedule. The AI coach can adjust it later.',
          style: fg(size: 16, color: AppColors.white70),
        ),
      ],
    );
    final planButton = FgButton(
      label: personalPlan != null ? 'Open my plan' : 'Build my plan',
      trailingIcon: LucideIcons.arrowRight,
      radius: 12,
      fontSize: 14,
      fontWeight: FontWeight.w800,
      height: 50,
      onPressed: () => openHref(context, '/plan'),
    );
    final category = Row(
      children: [
        Text('Category', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
        const SizedBox(width: 8),
        Expanded(
          child: FgSelect<String>(
            value: _category,
            fill: AppColors.obsidianWave,
            semanticLabel: 'Category',
            options: [('', 'All'), for (final c in catalog.categories) (c, c)],
            onChanged: (v) => setState(() => _category = v),
          ),
        ),
      ],
    );
    final search = SearchField(controller: _query, hint: 'Search workouts', radius: 12, onChanged: (_) => setState(() {}));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: spaced([
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PageTitle('Programs', size: wide ? 36 : 30),
            const SizedBox(height: 12),
            Text('Follow a multi-week program, let FitGuide build a plan around you, or pick single workouts for your level.', style: fg(size: 16, color: AppColors.white70)),
          ],
        ),
        Container(
          padding: EdgeInsets.all(wide ? 32 : 20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.whiteA(0.1)),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color.alphaBlend(AppColors.royalNebula.withValues(alpha: 0.3), AppColors.noirEclipse), AppColors.obsidianWave],
            ),
          ),
          // The button beside the text on a tablet, under it on a phone.
          child: wide
              ? Row(children: [Expanded(child: planText), const SizedBox(width: 24), planButton])
              : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [planText, const SizedBox(height: 16), planButton]),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SectionHeader('Multi-week programs', subtitle: Text('A schedule of workouts, week by week, with your sessions tracked against it.', style: fg(size: 14, color: AppColors.white70))),
            const SizedBox(height: 20),
            if (active != null && personalPlan == null) ...[
              FgCard(
                padding: const EdgeInsets.all(16),
                color: AppColors.limeLight.withValues(alpha: 0.1),
                borderColor: AppColors.limeLight.withValues(alpha: 0.3),
                onTap: () => openProgram(context, active.programSlug),
                child: Row(
                  children: [
                    Expanded(
                      child: Text.rich(TextSpan(style: fg(size: 14), children: [
                        const TextSpan(text: 'You’re following '),
                        TextSpan(text: active.programTitle, style: fg(size: 14, weight: FontWeight.w700)),
                        TextSpan(text: ': week ${active.currentWeek}, ${active.percentComplete}% done.'),
                      ])),
                    ),
                    const Icon(LucideIcons.arrowRight, size: 16, color: AppColors.limeLight),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
            if (_programsError != null)
              ErrorLine(_programsError!)
            else if (_programs == null)
              FgGrid(columns: 1, md: 2, gap: 20, children: [for (var i = 0; i < 2; i++) const Skeleton(height: 192)])
            else
              FgGrid(columns: 1, md: 2, gap: 20, children: [for (final p in programs) ProgramCard(program: p, badge: p.slug == active?.programSlug ? 'Following' : null)]),
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SectionHeader('Single workouts by level'),
            const SizedBox(height: 16),
            FgGrid(
              columns: 2,
              md: 4,
              gap: 12,
              children: [
                for (final (l, icon, text) in _levels)
                  Semantics(
                    button: true,
                    selected: _level == l,
                    child: Material(
                      color: _level == l ? AppColors.limeLight : AppColors.obsidianWave,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: _level == l ? AppColors.limeLight : AppColors.whiteA(0.15)),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => setState(() => _level = l),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              Icon(icon, size: 24, color: _level == l ? AppColors.noirEclipse : AppColors.white),
                              const SizedBox(height: 8),
                              Text((l == 'All' ? 'All levels' : l).toUpperCase(),
                                  textAlign: TextAlign.center, style: fg(size: 14, weight: FontWeight.w700, color: _level == l ? AppColors.noirEclipse : AppColors.white, letterSpacing: 0.7)),
                              const SizedBox(height: 4),
                              Text(text, textAlign: TextAlign.center, style: fg(size: 12, color: _level == l ? AppColors.noirEclipse.withValues(alpha: 0.8) : AppColors.white70)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            // Search and category on one line on a tablet.
            if (wide)
              Row(children: [Expanded(child: search), const SizedBox(width: 12), SizedBox(width: 280, child: category)])
            else ...[
              search,
              const SizedBox(height: 12),
              category,
            ],
            for (final (l, list) in groups) ...[
              const SizedBox(height: 16),
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.end,
                spacing: 12,
                children: [
                  Text(l, style: fg(size: 20, weight: FontWeight.w800, color: levelColors[l] ?? AppColors.white)),
                  Text('${list.length} workout${list.length == 1 ? '' : 's'}', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
                ],
              ),
              const SizedBox(height: 4),
              Text(_levelText[l] ?? '', style: fg(size: 14, color: AppColors.white70)),
              const SizedBox(height: 16),
              if (list.isEmpty)
                Text('No ${l.toLowerCase()} workouts match.', style: fg(size: 14, color: AppColors.white70))
              else
                FgGrid(columns: 1, md: 2, lg: 3, children: [for (final w in list) WorkoutCard(workout: w)]),
            ],
          ],
        ),
      ], 32),
    );
  }
}
