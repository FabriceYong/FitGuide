import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/images.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../navigation.dart';
import '../../services/catalog_service.dart';
import '../../state/favorites_controller.dart';
import '../../widgets/ui.dart';
import '../plus/plus_gate.dart';
import 'catalog_filter.dart';
import 'exercise_demo_view.dart';
import 'exercise_demos.dart';
import 'workout_reviews.dart';
import 'workout_steps.dart';

/// A workout's page: overview, every step with its demonstration, what you
/// need, and reviews, with "Start workout" pinned to the bottom
/// (features/workout/WorkoutDetails.js on /workouts/[slug]).
class WorkoutDetailsScreen extends StatefulWidget {
  const WorkoutDetailsScreen({super.key, required this.slug});
  final String slug;

  @override
  State<WorkoutDetailsScreen> createState() => _WorkoutDetailsScreenState();
}

class _WorkoutDetailsScreenState extends State<WorkoutDetailsScreen> {
  Workout? _workout;
  bool _loading = true;
  String? _error;
  bool _favoriteBusy = false;
  bool _allSteps = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      // Signed-in PLUS members get the full PLUS workout; others get it locked.
      final workout = await fetchWorkoutBySlug(widget.slug, auth: true);
      if (!mounted) return;
      setState(() {
        _workout = workout;
        _error = workout == null ? 'Workout not found' : null;
      });
    } catch (_) {
      if (mounted) setState(() => _error = 'Failed to load workout');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleFavorite(FavoritesController favorites, String slug) async {
    if (_favoriteBusy || !favorites.canSave) return;
    setState(() => _favoriteBusy = true);
    await favorites.toggle(slug);
    if (mounted) setState(() => _favoriteBusy = false);
  }

  Widget _chips(IconData icon, String title, List<String> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: AppColors.limeLight),
            const SizedBox(width: 8),
            Flexible(child: Text(title.toUpperCase(), style: fg(size: 14, weight: FontWeight.w700, letterSpacing: 0.7))),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final item in items)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(999), border: Border.all(color: AppColors.white30A(0.2))),
                child: Text(item, style: fg(size: 12, color: AppColors.white70)),
              ),
          ],
        ),
      ],
    );
  }

  /// "What you'll do": every step with its drawn demo and target, the first
  /// eight until "Show all".
  Widget _steps(Workout workout, Color tint) {
    final steps = stepsFor(workout);
    final shown = _allSteps ? steps : steps.take(8).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(header: true, child: Text("What you'll do · ${steps.length} steps", style: fg(size: 16, weight: FontWeight.w800))),
        const SizedBox(height: 12),
        ...spaced([
          for (final (i, s) in shown.indexed) _StepRow(index: i, step: s, tint: tint),
        ], 8),
        if (steps.length > 8) ...[
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerLeft,
            child: LinkText(_allSteps ? 'Show fewer steps' : 'Show all ${steps.length} steps', size: 14, weight: FontWeight.w700, onTap: () => setState(() => _allSteps = !_allSteps)),
          ),
        ],
      ],
    );
  }

  Widget _bullets(List<String> items, {Color bullet = AppColors.limeLight, Color text = AppColors.white70}) {
    return Column(
      children: spaced([
        for (final item in items)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('•', style: fg(size: 14, color: bullet)),
              const SizedBox(width: 8),
              Expanded(child: Text(item, style: fg(size: 14, color: text))),
            ],
          ),
      ], 8),
    );
  }

  @override
  Widget build(BuildContext context) {
    final workout = _workout;
    if (_loading) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(width: 64, height: 64, child: CircularProgressIndicator(strokeWidth: 4)),
              const SizedBox(height: 16),
              Text('Loading workout...', style: fg(size: 16)),
            ],
          ),
        ),
      );
    }
    if (_error != null || workout == null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error ?? 'Workout not found', style: fg(size: 16, color: AppColors.white70)),
                const SizedBox(height: 16),
                FgButton(label: 'Go Back', radius: 12, fontWeight: FontWeight.w700, onPressed: () => Navigator.of(context).maybePop()),
              ],
            ),
          ),
        ),
      );
    }
    if (workout.locked) return PlusLockedScreen(workout: workout);

    final favorites = context.watch<FavoritesController>();
    final isFavorite = favorites.isFavorite(workout.slug);
    final tint = categoryColor(workout.category);
    final image = workoutSpecificImage(workout.title, workout.category, size: ImageSize.large, customImageUrl: workout.thumbnailUrl);
    void begin() => openPlayer(context, workout.slug);
    final gutter = pageGutter(context);
    // A phone on its side keeps some of the page in view under the photo.
    final heroHeight = math.min(384.0, math.max(260.0, MediaQuery.sizeOf(context).height * 0.6));
    // The site's wider margins on a tablet (`md:px-12 lg:px-20`).
    final margin = responsive(context, 16.0, md: 48.0, lg: 80.0);
    final gear = requiredEquipment(workout).map(stripOptional).toList();

    return Scaffold(
      // "Start workout" stays in reach while reading.
      bottomNavigationBar: Container(
        decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.95), border: Border(top: BorderSide(color: AppColors.white30A(0.1)))),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: MaxWidth(
              560,
              child: FgButton(
                label: 'Start workout',
                icon: LucideIcons.play,
                expand: true,
                height: 52,
                radius: 16,
                fontSize: 14,
                fontWeight: FontWeight.w800,
                uppercase: true,
                onPressed: begin,
              ),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: heroHeight + MediaQuery.of(context).padding.top,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  NetImage(image),
                  const ColoredBox(color: Color(0x80000000)),
                  DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(radius: 0.8, colors: [tint.withAlpha(0x55), Colors.transparent]))),
                  SafeArea(
                    child: Padding(
                      padding: EdgeInsets.all(gutter),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _RoundButton(icon: LucideIcons.arrowLeft, label: 'Back', onTap: () => Navigator.of(context).maybePop()),
                          const Spacer(),
                          _RoundButton(
                            icon: isFavorite ? Icons.favorite_rounded : LucideIcons.heart,
                            label: favorites.canSave ? (isFavorite ? 'Remove from favorites' : 'Add to favorites') : 'Create an account to save favorites',
                            background: isFavorite ? AppColors.red500.withValues(alpha: 0.9) : Colors.black.withValues(alpha: 0.3),
                            onTap: favorites.canSave && !_favoriteBusy ? () => _toggleFavorite(favorites, workout.slug) : null,
                          ),
                        ],
                      ),
                    ),
                  ),
                  Center(
                    child: IconButton(
                      tooltip: "Let's begin",
                      onPressed: begin,
                      icon: Icon(LucideIcons.circlePlay, size: 80, color: AppColors.whiteA(0.5)),
                    ),
                  ),
                  // Lined up with the page's content below.
                  Positioned(
                    left: margin,
                    right: margin,
                    bottom: 24,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Semantics(
                          header: true,
                          child: Text(
                            workout.title,
                            style: fg(size: 30, weight: FontWeight.w800, letterSpacing: -0.5).copyWith(shadows: const [Shadow(blurRadius: 6, color: Color(0x99000000))]),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            Pill(workout.category, background: tint.withValues(alpha: 0.9), textColor: AppColors.noirEclipse, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6)),
                            if (workout.intensity.isNotEmpty)
                              Pill('${workout.intensity} intensity', background: AppColors.whiteA(0.15), textColor: AppColors.white, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(margin, atLeast(context, Breakpoints.md) ? 32 : 24, margin, 0),
              child: MaxWidth(
                1800,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: spaced([
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.05))),
                      child: Row(
                        children: [
                          _DetailStat('DURATION', '${workout.duration} MIN', LucideIcons.clock),
                          _DetailStat('DIFFICULTY', workout.difficulty, LucideIcons.trendingUp),
                          _DetailStat('CALORIES', workout.calories?.toString() ?? '—', LucideIcons.target, color: AppColors.limeLight),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(width: 4, height: 40, decoration: BoxDecoration(color: AppColors.limeLight, borderRadius: BorderRadius.circular(999))),
                            const SizedBox(width: 16),
                            Flexible(child: Text('ABOUT THIS WORKOUT', style: fg(size: 16, weight: FontWeight.w800, letterSpacing: 0.8))),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(workout.description, style: fg(size: 14, weight: FontWeight.w500, color: AppColors.white70, height: 1.6)),
                      ],
                    ),
                    _steps(workout, tint),
                    if (gear.isNotEmpty)
                      _chips(LucideIcons.dumbbell, "You'll need", gear)
                    else
                      Row(children: [
                        const Icon(LucideIcons.check, size: 20, color: AppColors.limeLight),
                        const SizedBox(width: 8),
                        Expanded(child: Text('No equipment: just some floor space', style: fg(size: 14, color: AppColors.white70))),
                      ]),
                    if (workout.targetMuscles.isNotEmpty) _chips(LucideIcons.target, 'Target Muscles', workout.targetMuscles),
                    if (workout.benefits.isNotEmpty)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            const Icon(LucideIcons.circleCheck, size: 20, color: AppColors.limeLight),
                            const SizedBox(width: 8),
                            Flexible(child: Text('BENEFITS', style: fg(size: 14, weight: FontWeight.w700, letterSpacing: 0.7))),
                          ]),
                          const SizedBox(height: 12),
                          _bullets(workout.benefits),
                        ],
                      ),
                    if (workout.cautions.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.orange500.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.orange500.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(children: [
                              const Icon(LucideIcons.circleAlert, size: 20, color: AppColors.orange400),
                              const SizedBox(width: 8),
                              Flexible(child: Text('IMPORTANT NOTES', style: fg(size: 14, weight: FontWeight.w700, color: AppColors.orange400, letterSpacing: 0.7))),
                            ]),
                            const SizedBox(height: 12),
                            _bullets(workout.cautions, bullet: AppColors.orange400, text: AppColors.orange200),
                          ],
                        ),
                      ),
                    Container(
                      padding: const EdgeInsets.only(top: 32),
                      decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.white30A(0.1)))),
                      child: WorkoutReviews(workoutSlug: workout.slug, workoutTitle: workout.title),
                    ),
                  ], atLeast(context, Breakpoints.md) ? 32 : 24),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One step in "What you'll do": its drawn demo, name and target.
class _StepRow extends StatelessWidget {
  const _StepRow({required this.index, required this.step, required this.tint});
  final int index;
  final WorkoutStep step;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    final demo = demoForStep(step);
    final target = targetLabel(step);
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.1))),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(color: tint.withAlpha(0x12), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.whiteA(0.1))),
            clipBehavior: Clip.antiAlias,
            child: demo == null ? Icon(LucideIcons.target, size: 20, color: tint.withAlpha(0x99)) : ExcludeSemantics(child: ExerciseDemoView(demo, color: tint, animate: false)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${(index + 1).toString().padLeft(2, '0')}  ${stepName(step)}', maxLines: 2, overflow: TextOverflow.ellipsis, style: fg(size: 14, weight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(step.instruction, maxLines: 2, overflow: TextOverflow.ellipsis, style: fg(size: 12, color: AppColors.white70)),
              ],
            ),
          ),
          if (target.isNotEmpty) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: tint.withAlpha(0x22), borderRadius: BorderRadius.circular(999)),
              child: Text(target, style: fg(size: 12, weight: FontWeight.w700, color: tint)),
            ),
          ],
        ],
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({required this.icon, required this.label, this.onTap, this.background});
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: background ?? Colors.black.withValues(alpha: 0.3),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(width: 40, height: 40, child: Icon(icon, size: 22, color: AppColors.white)),
        ),
      ),
    );
  }
}

class _DetailStat extends StatelessWidget {
  const _DetailStat(this.label, this.value, this.icon, {this.color = AppColors.white});
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Column(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 8),
            // One line each, shrunk to the column with large system text
            // rather than split mid-word.
            FittedBox(fit: BoxFit.scaleDown, child: Text(label, maxLines: 1, style: fg(size: 10, weight: FontWeight.w700, color: AppColors.muted, letterSpacing: 1.5))),
            const SizedBox(height: 8),
            FittedBox(fit: BoxFit.scaleDown, child: Text(value, maxLines: 1, textAlign: TextAlign.center, style: fg(size: 14, weight: FontWeight.w700, color: color))),
          ],
        ),
      ),
    );
  }
}
