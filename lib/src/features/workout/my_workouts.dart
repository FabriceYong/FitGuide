import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/shared/profile_options.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../navigation.dart';
import '../../services/catalog_service.dart';
import '../../services/my_workout_service.dart';
import '../../state/auth_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';
import '../common/site_page.dart';

/// Your own workouts (Explore → My workouts; features/workout/MyWorkouts.tsx):
/// start, change or delete them, or build a new one.
class MyWorkouts extends StatefulWidget {
  const MyWorkouts({super.key});

  @override
  State<MyWorkouts> createState() => _MyWorkoutsState();
}

class _MyWorkoutsState extends State<MyWorkouts> {
  List<MyWorkout>? _workouts;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (context.read<AuthController>().hasAccount) _load();
  }

  Future<void> _load() async {
    try {
      final workouts = await fetchMyWorkouts();
      if (mounted) setState(() => _workouts = workouts);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not load your workouts.');
    }
  }

  Future<void> _edit([MyWorkout? workout]) async {
    final saved = await Navigator.of(context).push<MyWorkout>(pageRoute(WorkoutBuilderScreen(workout: workout)));
    if (saved != null && mounted) {
      setState(() => _workouts = [saved, ...(_workouts ?? []).where((w) => w.workout.slug != saved.workout.slug)]);
    }
  }

  Future<void> _delete(MyWorkout w) async {
    final ok = await confirmDialog(
      context,
      title: 'Delete ${w.workout.title}?',
      message: 'The workout goes; the sessions you’ve done with it stay in your history.',
      confirmText: 'Delete',
      danger: true,
      icon: LucideIcons.triangleAlert,
    );
    if (!ok || !mounted) return;
    setState(() => _error = null);
    try {
      await deleteMyWorkout(w.workout.slug);
      if (mounted) setState(() => _workouts = (_workouts ?? []).where((x) => x.workout.slug != w.workout.slug).toList());
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not delete the workout.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (!auth.hasAccount) {
      return FgCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
        child: Column(children: [
          const Icon(LucideIcons.dumbbell, size: 32, color: AppColors.limeLight),
          const SizedBox(height: 12),
          Text('Create an account to build your own workouts.', textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.white70)),
          const SizedBox(height: 12),
          FgButton(label: 'Create an account', onPressed: auth.startSignUp),
        ]),
      );
    }
    final workouts = _workouts;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FgButton(label: 'Build a workout', icon: LucideIcons.plus, expand: true, height: 48, radius: 16, onPressed: () => _edit()),
        const SizedBox(height: 16),
        if (_error != null) ...[ErrorBox(_error!, compact: true), const SizedBox(height: 16)],
        if (workouts == null && _error == null)
          const LoadingRow('Loading your workouts…')
        else if (workouts != null && workouts.isEmpty)
          FgCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
            child: Text(
              'No workouts of your own yet. Pick your exercises, sets and reps, and they play like any other workout, with your last numbers alongside.',
              textAlign: TextAlign.center,
              style: fg(size: 14, color: AppColors.white70),
            ),
          )
        else if (workouts != null)
          FgGrid(
            columns: 1,
            md: 2,
            gap: 12,
            children: [for (final w in workouts) _card(w)],
          ),
      ],
    );
  }

  Widget _card(MyWorkout w) {
    return FgCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(w.workout.title, style: fg(size: 16, weight: FontWeight.w800)),
          Text('${w.workout.category} · ${w.workout.shortDescription ?? ''}', style: fg(size: 14, color: AppColors.white70)),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: FgButton(label: 'Start', icon: LucideIcons.play, height: 40, onPressed: () => openPlayer(context, w.workout.slug))),
            const SizedBox(width: 8),
            Semantics(
              button: true,
              label: 'Edit ${w.workout.title}',
              excludeSemantics: true,
              child: FgButton(label: 'Edit', icon: LucideIcons.pencil, style: FgButtonStyle.secondary, height: 40, onPressed: () => _edit(w)),
            ),
            const SizedBox(width: 8),
            IconButton(
              tooltip: 'Delete ${w.workout.title}',
              onPressed: () => _delete(w),
              icon: const Icon(LucideIcons.trash2, size: 18, color: AppColors.red300),
            ),
          ]),
        ],
      ),
    );
  }
}

const _rests = [30, 45, 60, 90, 120, 180];
String _restLabel(int s) => s < 60 ? '$s s' : (s % 60 == 0 ? '${s ~/ 60} min' : '${s ~/ 60} min ${s % 60} s');

/// One exercise being edited, with its text fields.
class _Draft {
  _Draft(BuilderExercise e)
      : name = TextEditingController(text: e.name),
        sets = TextEditingController(text: '${e.sets}'),
        reps = TextEditingController(text: e.reps ?? '10'),
        seconds = TextEditingController(text: '${e.seconds ?? 30}'),
        timed = e.timed,
        weighted = e.weighted,
        supersetNext = e.supersetNext;

  final TextEditingController name;
  final TextEditingController sets;
  final TextEditingController reps;
  final TextEditingController seconds;
  final focus = FocusNode();
  bool timed;
  bool weighted;
  bool supersetNext;

  BuilderExercise get value => BuilderExercise(
        name: name.text,
        sets: int.tryParse(sets.text) ?? 0,
        reps: timed ? null : reps.text.trim(),
        seconds: timed ? int.tryParse(seconds.text) ?? 0 : null,
        weighted: weighted,
        supersetNext: supersetNext,
      );

  void dispose() {
    for (final c in [name, sets, reps, seconds]) {
      c.dispose();
    }
    focus.dispose();
  }
}

/// Make or change one of your workouts (features/workout/WorkoutBuilder.tsx):
/// exercises with sets of reps or of a time, optionally paired into
/// supersets. Library exercises are suggested as you type and set reps or
/// time, and weights, to suit. Pops with the saved workout.
class WorkoutBuilderScreen extends StatefulWidget {
  const WorkoutBuilderScreen({super.key, this.workout});
  final MyWorkout? workout;

  @override
  State<WorkoutBuilderScreen> createState() => _WorkoutBuilderScreenState();
}

class _WorkoutBuilderScreenState extends State<WorkoutBuilderScreen> {
  late final _title = TextEditingController(text: widget.workout?.answers.title ?? '');
  late String _category = widget.workout?.answers.category ?? 'Strength';
  late int _rest = widget.workout?.answers.restSec ?? 90;
  late final List<_Draft> _drafts = (widget.workout?.answers.exercises ?? const [BuilderExercise()]).map(_Draft.new).toList();
  List<Exercise> _library = const [];
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    fetchExercises().then((list) {
      if (mounted) setState(() => _library = list);
    }).catchError((Object _) {}); // suggestions only
  }

  @override
  void dispose() {
    _title.dispose();
    for (final d in _drafts) {
      d.dispose();
    }
    super.dispose();
  }

  /// Picking a library exercise sets reps or time, and weights, to suit it.
  void _picked(_Draft d, String name) {
    final match = _library.where((x) => x.name.toLowerCase() == name.toLowerCase()).firstOrNull;
    if (match == null) return;
    setState(() {
      d.timed = match.trackingType == 'duration';
      d.weighted = match.trackingType == 'weighted';
    });
  }

  void _move(int i, int by) => setState(() {
    final d = _drafts.removeAt(i);
    _drafts.insert(i + by, d);
  });

  Future<void> _save() async {
    final answers = BuilderAnswers(title: _title.text, category: _category, restSec: _rest, exercises: [for (final d in _drafts) d.value]);
    String? problem;
    if (answers.title.trim().length < 3) problem = 'Give the workout a name of at least 3 letters.';
    for (final (i, e) in answers.exercises.indexed) {
      if (problem != null) break;
      if (e.name.trim().isEmpty) problem = 'Name exercise ${i + 1}.';
      if (e.sets < 1 || e.sets > 10) problem = 'Exercise ${i + 1}: 1 to 10 sets.';
      if (!e.timed && !RegExp(r'^\d{1,3}(\s*[–-]\s*\d{1,3})?$').hasMatch(e.reps ?? '')) problem = 'Exercise ${i + 1}: reps as a number, or a range like 8-10.';
      if (e.timed && ((e.seconds ?? 0) < 5 || (e.seconds ?? 0) > 600)) problem = 'Exercise ${i + 1}: 5 to 600 seconds.';
    }
    if (problem != null) return setState(() => _error = problem);
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final saved = await saveMyWorkout(answers, slug: widget.workout?.workout.slug);
      if (mounted) Navigator.of(context).pop(saved);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not save the workout.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SitePage(
      active: '/',
      maxWidth: 720,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(alignment: Alignment.centerLeft, child: LinkText('← My workouts', onTap: () => Navigator.of(context).pop())),
          const SizedBox(height: 12),
          PageTitle(widget.workout == null ? 'Build a workout' : 'Edit ${widget.workout!.workout.title}'),
          const SizedBox(height: 20),
          FormFieldLabel(label: 'Name', child: FgTextField(controller: _title, hint: 'Leg day', maxLength: 100, semanticLabel: 'Name')),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(
              child: FormFieldLabel(
                label: 'Type',
                child: FgSelect<String>(value: _category, options: [for (final c in Catalog.workoutCategories) (c, c)], onChanged: (v) => setState(() => _category = v), semanticLabel: 'Type'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FormFieldLabel(
                label: 'Rest between sets',
                child: FgSelect<int>(value: _rest, options: [for (final s in _rests) (s, _restLabel(s))], onChanged: (v) => setState(() => _rest = v), semanticLabel: 'Rest between sets'),
              ),
            ),
          ]),
          const SizedBox(height: 20),
          for (final (i, d) in _drafts.indexed) ...[_exercise(i, d), const SizedBox(height: 12)],
          FgButton(
            label: 'Add an exercise',
            icon: LucideIcons.plus,
            style: FgButtonStyle.secondary,
            expand: true,
            onPressed: _drafts.length >= 30 ? null : () => setState(() => _drafts.add(_Draft(const BuilderExercise()))),
          ),
          const SizedBox(height: 8),
          Text('A superset goes straight from one exercise to the next and rests after the pair.', style: fg(size: 12, color: AppColors.white70)),
          if (_error != null) ...[const SizedBox(height: 16), ErrorBox(_error!, compact: true)],
          const SizedBox(height: 16),
          FgButton(label: _saving ? 'Saving…' : 'Save workout', loading: _saving, expand: true, height: 48, onPressed: _saving ? null : _save),
        ],
      ),
    );
  }

  Widget _exercise(int i, _Draft d) {
    final last = i == _drafts.length - 1;
    return FgCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Expanded(child: SmallLabel('Exercise ${i + 1}')),
            IconButton(tooltip: 'Move exercise ${i + 1} up', onPressed: i == 0 ? null : () => _move(i, -1), icon: const Icon(LucideIcons.arrowUp, size: 18)),
            IconButton(tooltip: 'Move exercise ${i + 1} down', onPressed: last ? null : () => _move(i, 1), icon: const Icon(LucideIcons.arrowDown, size: 18)),
            IconButton(
              tooltip: 'Remove exercise ${i + 1}',
              onPressed: _drafts.length == 1 ? null : () => setState(() => _drafts.removeAt(i).dispose()),
              icon: const Icon(LucideIcons.trash2, size: 18),
            ),
          ]),
          FormFieldLabel(
            label: 'Exercise',
            child: RawAutocomplete<String>(
              textEditingController: d.name,
              focusNode: d.focus,
              optionsBuilder: (value) {
                final term = value.text.trim().toLowerCase();
                if (term.length < 2) return const [];
                return _library.map((x) => x.name).where((n) => n.toLowerCase().contains(term)).take(8);
              },
              onSelected: (name) => _picked(d, name),
              fieldViewBuilder: (context, controller, focus, onSubmitted) => FgTextField(
                controller: controller,
                focusNode: focus,
                hint: 'Start typing, e.g. Squat',
                maxLength: 100,
                semanticLabel: 'Exercise ${i + 1} name',
              ),
              optionsViewBuilder: (context, onSelected, options) => Align(
                alignment: Alignment.topLeft,
                child: Material(
                  color: AppColors.obsidianWave,
                  borderRadius: BorderRadius.circular(12),
                  elevation: 8,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 260, maxWidth: 400),
                    child: ListView(
                      padding: EdgeInsets.zero,
                      shrinkWrap: true,
                      children: [for (final o in options) ListTile(dense: true, title: Text(o, style: fg(size: 14)), onTap: () => onSelected(o))],
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Expanded(child: FormFieldLabel(label: 'Sets', child: NumberField(controller: d.sets, semanticLabel: 'Exercise ${i + 1} sets'))),
            const SizedBox(width: 12),
            Expanded(
              child: FormFieldLabel(
                label: 'Count',
                child: Segmented<bool>(
                  options: const [(false, 'Reps'), (true, 'Time')],
                  value: d.timed,
                  expand: true,
                  height: 44,
                  onChanged: (v) => setState(() => d.timed = v),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: d.timed
                  ? FormFieldLabel(label: 'Seconds', child: NumberField(controller: d.seconds, semanticLabel: 'Exercise ${i + 1} seconds'))
                  : FormFieldLabel(
                      label: 'Reps',
                      child: FgTextField(
                        controller: d.reps,
                        hint: '8-10',
                        keyboardType: TextInputType.text,
                        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9\-– ]'))],
                        semanticLabel: 'Exercise ${i + 1} reps',
                      ),
                    ),
            ),
          ]),
          const SizedBox(height: 8),
          _check('Log a weight', d.weighted, (v) => setState(() => d.weighted = v)),
          if (!last) _check('Superset with the next one', d.supersetNext, (v) => setState(() => d.supersetNext = v)),
        ],
      ),
    );
  }

  Widget _check(String label, bool value, ValueChanged<bool> onChanged) => InkWell(
        onTap: () => onChanged(!value),
        child: Row(children: [
          Checkbox(value: value, onChanged: (v) => onChanged(v ?? false), semanticLabel: label),
          Flexible(child: Text(label, style: fg(size: 14))),
        ]),
      );
}
