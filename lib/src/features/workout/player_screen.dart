import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../../core/analytics.dart';
import '../../core/format.dart';
import '../../core/images.dart';
import '../../core/shared/tailoring.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/catalog.dart';
import '../../models/json.dart';
import '../../navigation.dart';
import '../../services/catalog_service.dart';
import '../../services/training_service.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import '../plus/plus_gate.dart';
import 'default_steps.dart';
import 'exercise_media.dart';
import 'session_summary.dart';

/// The guided player (app/workouts/[slug]/play → EnhancedWorkoutExecution.js).
/// Loads the workout, then times each step and saves the session at the end.
class PlayerScreen extends StatefulWidget {
  const PlayerScreen({super.key, required this.slug, this.program});
  final String slug;
  final ProgramContext? program;

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  Workout? _workout;
  String? _error;

  @override
  void initState() {
    super.initState();
    track('workout_started', path: '/workouts/${widget.slug}/play', props: {'program': widget.program != null});
    fetchWorkoutBySlug(widget.slug, auth: true).then((w) {
      if (mounted) setState(() => w == null ? _error = 'Workout not found' : _workout = w);
    }).catchError((Object err) {
      if (mounted) setState(() => _error = '$err');
    });
  }

  @override
  Widget build(BuildContext context) {
    final workout = _workout;
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(leading: const BackButton()),
        body: Center(child: Padding(padding: const EdgeInsets.all(20), child: ErrorBox(_error!))),
      );
    }
    if (workout == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (workout.locked) return PlusLockedScreen(workout: workout);
    return _Player(workout: workout, program: widget.program);
  }
}

class _Player extends StatefulWidget {
  const _Player({required this.workout, this.program});
  final Workout workout;
  final ProgramContext? program;

  @override
  State<_Player> createState() => _PlayerState();
}

class _PlayerState extends State<_Player> {
  late final List<WorkoutStep> _steps = widget.workout.steps.isNotEmpty ? widget.workout.steps : generateDefaultSteps(widget.workout);
  late final Color _tint = categoryColor(widget.workout.category);
  late final double _caloriesPerMinute;
  final String _startedAt = DateTime.now().toIso8601String();
  final _stepSeconds = <int, int>{};
  final _completed = <int>{};
  final _setInputs = <int, ({String reps, String weight})>{};
  final _reps = TextEditingController();
  final _weight = TextEditingController();
  final _scroll = ScrollController();

  int _current = 0;
  bool _playing = false;
  int _remaining = 0;
  int _stepTotal = 0;
  int _elapsed = 0;
  bool _resting = false;
  bool _sound = true;
  ({String status, String completedAt})? _summary;
  Timer? _timer;
  String? _media;
  bool _mediaLoading = false;

  @override
  void initState() {
    super.initState();
    // The workout's burn rate scaled to this user's body, as the API does when saving.
    final w = widget.workout;
    _caloriesPerMinute = (w.calories ?? 0) / (w.duration > 0 ? w.duration : 1) * calorieFactor(context.read<AuthController>().user);
    _goTo(0, initial: true);
    WakelockPlus.enable().catchError((_) {});
  }

  @override
  void dispose() {
    _timer?.cancel();
    _reps.dispose();
    _weight.dispose();
    _scroll.dispose();
    WakelockPlus.disable().catchError((_) {});
    super.dispose();
  }

  WorkoutStep get _step => _steps[_current];
  int get _total => _steps.length;

  void _beep() {
    if (!_sound) return;
    SystemSound.play(SystemSoundType.alert);
    HapticFeedback.mediumImpact();
  }

  void _loadMedia() {
    final step = _step;
    final index = _current;
    setState(() {
      _media = step.gifUrl ?? step.imageUrl;
      _mediaLoading = _media == null;
    });
    if (_media != null) return;
    exerciseMedia(step.gifUrl, step.instruction).then((url) {
      if (mounted && index == _current) setState(() => _media = url);
    }).whenComplete(() {
      if (mounted && index == _current) setState(() => _mediaLoading = false);
    });
  }

  /// Show a step: reset its timer (paused) and its logged reps/weight.
  void _goTo(int index, {bool initial = false}) {
    _saveInputs();
    _setPlaying(false, notify: !initial);
    final duration = _steps[index].duration ?? 60;
    void apply() {
      _current = index;
      _resting = false;
      _remaining = duration;
      _stepTotal = duration;
      final inputs = _setInputs[index];
      _reps.text = inputs?.reps ?? '';
      _weight.text = inputs?.weight ?? '';
    }

    if (initial) {
      apply();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _loadMedia();
      });
    } else {
      setState(apply);
      _loadMedia();
    }
  }

  void _saveInputs() {
    if (_reps.text.isEmpty && _weight.text.isEmpty && !_setInputs.containsKey(_current)) return;
    _setInputs[_current] = (reps: _reps.text, weight: _weight.text);
  }

  void _setPlaying(bool playing, {bool notify = true}) {
    _timer?.cancel();
    _timer = null;
    if (playing) _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
    if (notify && mounted) {
      setState(() => _playing = playing);
    } else {
      _playing = playing;
    }
  }

  void _tick() {
    if (!_playing || _remaining <= 0) return;
    final prev = _remaining;
    if (prev == 10 || prev == 5 || prev == 3) _beep();
    setState(() {
      _elapsed++;
      if (!_resting) _stepSeconds[_current] = (_stepSeconds[_current] ?? 0) + 1;
      _remaining = prev <= 1 ? 0 : prev - 1;
    });
    if (prev > 1) return;
    final rest = widget.workout.restPeriod ?? 0;
    if (rest > 0 && !_resting && _current < _total - 1) {
      _startRest(rest);
    } else if (_current < _total - 1) {
      _stepComplete();
    } else {
      _workoutComplete();
    }
  }

  void _startRest(int seconds) {
    setState(() {
      _resting = true;
      _remaining = seconds;
      _stepTotal = seconds;
    });
    _beep();
  }

  void _stepComplete() {
    _completed.add(_current);
    if (_current == _total - 1) {
      _workoutComplete();
    } else {
      _goTo(_current + 1);
    }
  }

  void _workoutComplete() {
    _setPlaying(false);
    _saveInputs();
    setState(() {
      _completed.add(_current);
      _summary = (status: 'completed', completedAt: DateTime.now().toIso8601String());
    });
    _beep();
  }

  void _saveAndExit() {
    _setPlaying(false);
    _saveInputs();
    setState(() => _summary = (status: 'partial', completedAt: DateTime.now().toIso8601String()));
  }

  Future<void> _handleExit() async {
    if (_summary != null) return;
    if (_elapsed <= 30 && _completed.isEmpty) {
      Navigator.of(context).pop();
      return;
    }
    final choice = await showDialog<String>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.8),
      builder: (_) => _ExitDialog(completed: _completed.length, total: _total),
    );
    if (!mounted) return;
    if (choice == 'exit') Navigator.of(context).pop();
    if (choice == 'save') _saveAndExit();
  }

  /// The session as the API expects it (effort and notes come from the summary).
  Json _draft() {
    final summary = _summary!;
    final wallClock = DateTime.parse(summary.completedAt).difference(DateTime.parse(_startedAt)).inSeconds;
    final sets = <Json>[];
    for (final (idx, step) in _steps.indexed) {
      final seconds = _stepSeconds[idx] ?? 0;
      final input = _setInputs[idx];
      final reps = int.tryParse(input?.reps ?? '');
      final weight = double.tryParse(input?.weight ?? '');
      if (!_completed.contains(idx) && seconds == 0 && reps == null && weight == null) continue;
      final name = step.exerciseName ?? (step.instruction.isNotEmpty ? step.instruction : 'Step ${idx + 1}');
      sets.add({
        'exerciseName': name.length > 200 ? name.substring(0, 200) : name,
        if (reps != null) 'reps': math.max(0, reps),
        if (weight != null) 'weightKg': math.max(0.0, weight),
        if (seconds > 0) 'durationSec': seconds,
      });
    }
    final program = widget.program;
    return {
      'workoutSlug': widget.workout.slug,
      'workoutTitle': widget.workout.title,
      'startedAt': _startedAt,
      'completedAt': summary.completedAt,
      // Timer time if the timer was used, otherwise time since the player opened.
      'durationSec': _elapsed > 0 ? _elapsed : wallClock,
      'stepsCompleted': _completed.length,
      'totalSteps': _total,
      'sets': sets,
      if (program != null) ...{'enrollmentId': program.enrollmentId, 'programWeek': program.week, 'programDay': program.day},
    };
  }

  void _onSummaryDone(LoggedSession? result) {
    // A saved standalone workout goes to Progress; otherwise back where the player was opened.
    if (result != null && widget.program == null) {
      toDashboard(context, DashboardTab.progress);
    } else {
      Navigator.of(context).pop();
    }
  }

  Color get _timeColor => _remaining <= 5 ? AppColors.red400 : _remaining <= 10 ? AppColors.orange400 : _tint;

  @override
  Widget build(BuildContext context) {
    final w = widget.workout;
    final progress = _completed.length / _total * 100;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleExit();
      },
      child: Scaffold(
        body: Stack(
          children: [
            Positioned(
              top: -128,
              right: -128,
              child: IgnorePointer(
                child: Container(
                  width: 384,
                  height: 384,
                  decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [_tint.withValues(alpha: 0.2), Colors.transparent])),
                ),
              ),
            ),
            SafeArea(
              child: Column(
                children: [
                  _hud(w, progress),
                  Expanded(child: _body(w)),
                ],
              ),
            ),
            if (_resting) _restOverlay(),
            if (_summary != null)
              Positioned.fill(
                child: SessionSummary(
                  draft: _draft(),
                  status: _summary!.status,
                  caloriesPerMinute: _caloriesPerMinute,
                  tint: _tint,
                  onDone: _onSummaryDone,
                  onResume: _summary!.status == 'partial' ? () => setState(() => _summary = null) : null,
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// One column on a phone. A wide tablet splits it like the website: the
  /// details on the left, the timer and controls in a side panel
  /// (`lg:flex-row`, `lg:w-[440px]`). Narrower tablets centre one column.
  Widget _body(Workout w) {
    if (!atLeast(context, Breakpoints.lg)) {
      final gutter = pageGutter(context);
      return ListView(
        controller: _scroll,
        padding: EdgeInsets.fromLTRB(gutter, 16, gutter, 32),
        children: [
          MaxWidth(
            672,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [..._controls(w), const SizedBox(height: 24), ..._details(w)]),
          ),
        ],
      );
    }
    return MaxWidth(
      1340,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
              children: [MaxWidth(672, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: _details(w)))],
            ),
          ),
          Container(
            width: 440,
            decoration: BoxDecoration(color: AppColors.whiteA(0.02), border: Border(left: BorderSide(color: AppColors.whiteA(0.1)))),
            // Tapping a step scrolls this panel back to the timer.
            child: ListView(controller: _scroll, padding: const EdgeInsets.fromLTRB(16, 32, 24, 32), children: _controls(w)),
          ),
        ],
      ),
    );
  }

  Widget _hud(Workout w, double progress) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.9), border: Border(bottom: BorderSide(color: AppColors.whiteA(0.1)))),
      child: Row(
        children: [
          _circleButton(LucideIcons.x, 'Exit workout', _handleExit),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(w.title, overflow: TextOverflow.ellipsis, style: fg(size: 12, weight: FontWeight.w500, color: AppColors.whiteA(0.5)))),
                    const SizedBox(width: 8),
                    // Shares the row with the title, shrinking to fit rather than squeezing it out.
                    Flexible(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerRight,
                        child: Text('${_completed.length} of $_total completed', maxLines: 1, style: fg(size: 12, weight: FontWeight.w500, color: AppColors.whiteA(0.5))),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                FgProgressBar(percent: progress, color: _tint, label: 'Workout progress'),
              ],
            ),
          ),
          const SizedBox(width: 16),
          _circleButton(_sound ? LucideIcons.volume2 : LucideIcons.volumeX, _sound ? 'Mute beeps' : 'Turn beeps on', () => setState(() => _sound = !_sound),
              iconColor: _sound ? AppColors.white : AppColors.whiteA(0.4)),
        ],
      ),
    );
  }

  Widget _circleButton(IconData icon, String label, VoidCallback? onTap, {double size = 40, Color iconColor = AppColors.white, Color? background, double iconSize = 20}) {
    final button = Opacity(
      opacity: onTap == null ? 0.3 : 1,
      child: Semantics(
        button: true,
        enabled: onTap != null,
        label: label,
        excludeSemantics: true,
        child: Material(
          color: background ?? AppColors.whiteA(0.1),
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: SizedBox(width: size, height: size, child: Icon(icon, size: iconSize, color: iconColor)),
          ),
        ),
      ),
    );
    return size < 48 ? TapPadding(child: button) : button;
  }

  List<Widget> _controls(Workout w) {
    final step = _step;
    return [
      Text('STEP ${_current + 1} OF $_total', textAlign: TextAlign.center, style: fgLabel(color: AppColors.muted)),
      const SizedBox(height: 4),
      Semantics(liveRegion: true, child: Text(step.instruction, textAlign: TextAlign.center, style: fg(size: 20, weight: FontWeight.w800, height: 1.35))),
      const SizedBox(height: 16),
      // Not taller than half the screen, so a phone on its side still shows the timer.
      ConstrainedBox(
        constraints: BoxConstraints(maxHeight: math.max(220, MediaQuery.sizeOf(context).height * 0.5)),
        child: AspectRatio(
          aspectRatio: 4 / 3,
          child: Container(
            decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.whiteA(0.1))),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (_media != null)
                  NetImage(_media, semanticLabel: step.instruction)
                else if (_mediaLoading)
                  Center(
                    child: Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: _tint.withAlpha(0x20)),
                      child: Padding(padding: const EdgeInsets.all(14), child: CircularProgressIndicator(strokeWidth: 3, color: _tint)),
                    ),
                  )
                else
                  // Clear of the label at the bottom (taller with large system text);
                  // shrinks to fit.
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: largeText(context) ? 76 : 52),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(shape: BoxShape.circle, color: _tint.withAlpha(0x15), border: Border.all(color: _tint.withAlpha(0x30))),
                            child: Icon(LucideIcons.target, size: 40, color: _tint),
                          ),
                          const SizedBox(height: 16),
                          Text('Follow the instructions', style: fg(size: 14, weight: FontWeight.w700)),
                          Text('Maintain proper form throughout', style: fg(size: 12, color: AppColors.whiteA(0.5))),
                        ],
                      ),
                    ),
                  ),
                Positioned(
                  left: 12,
                  right: 12,
                  bottom: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.85), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.whiteA(0.1))),
                    child: Row(
                      children: [
                        Expanded(child: Text('Exercise ${_current + 1} of $_total', style: fg(size: 12, weight: FontWeight.w600, color: AppColors.whiteA(0.8)))),
                        Container(
                          width: 24,
                          height: 24,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(shape: BoxShape.circle, color: _tint),
                          child: Text('${_current + 1}', style: fg(size: 12, weight: FontWeight.w900, color: AppColors.noirEclipse)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      const SizedBox(height: 16),
      Center(
        child: Stack(
          alignment: Alignment.center,
          children: [
            CircularTimer(remaining: _remaining, total: _stepTotal, color: _tint, playing: _playing),
            // Inside the 130px ring, shrunk to fit with large system text.
            SizedBox.square(
              dimension: 130,
              child: Padding(
                padding: const EdgeInsets.all(22),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(clock(_remaining), style: fg(size: 24, weight: FontWeight.w900, color: _timeColor, features: tabularFigures)),
                      Text('REMAINING', style: fg(size: 10, color: AppColors.muted, letterSpacing: 1)),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _circleButton(LucideIcons.chevronLeft, 'Previous step', _current == 0 ? null : () => _goTo(_current - 1), size: 48, iconSize: 24),
          const SizedBox(width: 16),
          Semantics(
            button: true,
            label: _playing ? 'Pause' : 'Play',
            excludeSemantics: true,
            child: Material(
              color: _tint,
              shape: CircleBorder(side: BorderSide(color: AppColors.whiteA(0.2))),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: () => _setPlaying(!_playing),
                child: SizedBox(
                  width: 64,
                  height: 64,
                  child: Icon(_playing ? LucideIcons.pause : LucideIcons.play, size: 32, color: AppColors.noirEclipse),
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          _circleButton(LucideIcons.chevronRight, 'Next step', _current == _total - 1 ? null : _stepComplete, size: 48, iconSize: 24),
        ],
      ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.whiteA(0.1))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('LOG THIS SET (OPTIONAL)', style: fg(size: 10, weight: FontWeight.w700, color: AppColors.muted, letterSpacing: 0.5)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: NumberField(controller: _reps, decimal: false, hint: '0', suffixText: 'reps', radius: 8, fill: AppColors.whiteA(0.05), border: Colors.transparent, semanticLabel: 'Reps', onChanged: (_) => _saveInputs()),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: NumberField(controller: _weight, hint: '0', suffixText: 'kg', radius: 8, fill: AppColors.whiteA(0.05), border: Colors.transparent, semanticLabel: 'Weight in kilograms', onChanged: (_) => _saveInputs()),
                ),
              ],
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      FgButton(label: 'Mark Complete', icon: LucideIcons.check, expand: true, height: 54, radius: 12, fontSize: 14, fontWeight: FontWeight.w800, uppercase: true, color: _tint, onPressed: _workoutComplete),
      const SizedBox(height: 16),
      Row(
        children: [
          Expanded(child: _miniStat(LucideIcons.clock, _tint, 'Step Duration', step.duration != null ? '${step.duration! ~/ 60}:${(step.duration! % 60).toString().padLeft(2, '0')}' : '–')),
          const SizedBox(width: 12),
          Expanded(child: _miniStat(LucideIcons.flame, AppColors.orange400, 'Intensity', w.intensity.isNotEmpty ? w.intensity : 'Moderate')),
        ],
      ),
    ];
  }

  Widget _miniStat(IconData icon, Color color, String label, String value) {
    final badge = Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(color: color.withAlpha(0x15), borderRadius: BorderRadius.circular(8)),
      child: Icon(icon, size: 16, color: color),
    );
    final large = largeText(context);
    final text = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: fg(size: 10, color: AppColors.muted)),
        Text(value, overflow: large ? null : TextOverflow.ellipsis, style: fg(size: 14, weight: FontWeight.w700)),
      ],
    );
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.whiteA(0.1))),
      // Icon beside the text, or above it with large system text so words aren't split.
      child: large
          ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [badge, const SizedBox(height: 8), text])
          : Row(children: [badge, const SizedBox(width: 12), Expanded(child: text)]),
    );
  }

  Widget _panel({required IconData icon, required Color iconColor, required String title, required Widget child, double titleSize = 16}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.whiteA(0.1))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Icon(icon, size: 20, color: iconColor),
            const SizedBox(width: 8),
            Expanded(child: Text(title, style: fg(size: titleSize, weight: FontWeight.w700))),
          ]),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _tagWrap(List<String> items, Color color) => Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final item in items)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withValues(alpha: 0.3))),
              child: Text(item, style: fg(size: 12, weight: FontWeight.w600, color: color)),
            ),
        ],
      );

  List<Widget> _details(Workout w) {
    final step = _step;
    final hasGuidance = step.formCues.isNotEmpty || step.breathingPattern != null || step.commonMistakes.isNotEmpty;
    return spaced([
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (w.category.isNotEmpty) Pill(w.category, color: _tint, background: _tint.withAlpha(0x15), border: _tint.withAlpha(0x30), size: 12, weight: FontWeight.w700),
              if (w.difficulty.isNotEmpty) Pill(w.difficulty, color: AppColors.whiteA(0.6), background: AppColors.whiteA(0.05), border: AppColors.whiteA(0.1), size: 12, weight: FontWeight.w700),
              if (w.intensity.isNotEmpty)
                Pill('${w.intensity} Intensity', color: AppColors.orange400, background: AppColors.orange500.withValues(alpha: 0.1), border: AppColors.orange500.withValues(alpha: 0.2), size: 12, weight: FontWeight.w700),
            ],
          ),
          const SizedBox(height: 12),
          Semantics(header: true, child: Text(w.title, style: fg(size: 30, weight: FontWeight.w800, height: 1.25))),
          if (w.description.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.only(top: 12),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.whiteA(0.1)))),
              child: Text(w.description, style: fg(size: 14, color: AppColors.whiteA(0.7), height: 1.6)),
            ),
          ],
        ],
      ),
      Row(
        children: [
          for (final (i, (icon, color, value, label)) in [
            (LucideIcons.clock, AppColors.blue400, '${_elapsed ~/ 60}m', 'Elapsed'),
            (LucideIcons.flame, AppColors.orange400, '${(_elapsed / 60 * _caloriesPerMinute).floor()}', 'Calories'),
            (LucideIcons.zap, _tint, '${_total - _completed.length}', 'Remaining'),
          ].indexed) ...[
            if (i > 0) const SizedBox(width: 12),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.whiteA(0.1))),
                child: Column(
                  children: [
                    Icon(icon, size: 20, color: color),
                    const SizedBox(height: 4),
                    // One line each, shrunk to the tile with large system text.
                    FittedBox(fit: BoxFit.scaleDown, child: Text(value, maxLines: 1, style: fg(size: 18, weight: FontWeight.w700))),
                    FittedBox(fit: BoxFit.scaleDown, child: Text(label, maxLines: 1, style: fg(size: 12, color: AppColors.muted))),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
      _panel(
        icon: LucideIcons.target,
        iconColor: _tint,
        title: 'Workout Steps ($_total)',
        titleSize: 18,
        child: Column(
          children: spaced([
            for (final (idx, s) in _steps.indexed) _stepRow(idx, s),
          ], 12),
        ),
      ),
      if (hasGuidance)
        _panel(
          icon: LucideIcons.info,
          iconColor: _tint,
          title: 'Form Cues & Guidance',
          titleSize: 18,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: spaced([
              if (step.formCues.isNotEmpty)
                _guidanceBox(
                  background: AppColors.whiteA(0.05),
                  border: AppColors.whiteA(0.1),
                  title: '✓ FORM CUES',
                  titleColor: _tint,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [for (final cue in step.formCues) _bullet('•', _tint, cue, AppColors.whiteA(0.8))],
                  ),
                ),
              if (step.breathingPattern != null)
                _guidanceBox(
                  background: AppColors.indigo500.withValues(alpha: 0.1),
                  border: AppColors.indigo500.withValues(alpha: 0.2),
                  title: 'BREATHING PATTERN',
                  titleColor: AppColors.indigo400,
                  child: Text(step.breathingPattern!, style: fg(size: 14, color: AppColors.whiteA(0.8))),
                ),
              if (step.commonMistakes.isNotEmpty)
                _guidanceBox(
                  background: AppColors.orange500.withValues(alpha: 0.1),
                  border: AppColors.orange500.withValues(alpha: 0.2),
                  title: '⚠ COMMON MISTAKES',
                  titleColor: AppColors.orange400,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [for (final m in step.commonMistakes) _bullet('×', AppColors.orange400, m, AppColors.orange200)],
                  ),
                ),
            ], 16),
          ),
        ),
      if (w.equipment.isNotEmpty) _panel(icon: LucideIcons.target, iconColor: AppColors.indigo400, title: 'Equipment', child: _tagWrap(w.equipment, AppColors.indigo300)),
      if (w.targetMuscles.isNotEmpty) _panel(icon: LucideIcons.flame, iconColor: AppColors.orange400, title: 'Target Muscles', child: _tagWrap(w.targetMuscles, AppColors.orange300)),
      if (w.benefits.isNotEmpty)
        _panel(
          icon: LucideIcons.check,
          iconColor: AppColors.green400,
          title: 'Benefits',
          child: Column(
            children: spaced([
              for (final b in w.benefits)
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Padding(padding: EdgeInsets.only(top: 2), child: Icon(LucideIcons.check, size: 16, color: AppColors.green400)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(b, style: fg(size: 14, color: AppColors.whiteA(0.7)))),
                ]),
            ], 8),
          ),
        ),
      if (w.prerequisites.isNotEmpty)
        _panel(
          icon: LucideIcons.info,
          iconColor: AppColors.blue400,
          title: 'Prerequisites',
          child: Column(children: [for (final p in w.prerequisites) _bullet('•', AppColors.blue400, p, AppColors.whiteA(0.7), size: 12)]),
        ),
      if (w.cautions.isNotEmpty)
        _panel(
          icon: LucideIcons.triangleAlert,
          iconColor: AppColors.orange400,
          title: 'Safety & Cautions',
          child: Column(
            children: spaced([
              for (final c in w.cautions)
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Padding(padding: EdgeInsets.only(top: 2), child: Icon(LucideIcons.triangleAlert, size: 14, color: AppColors.orange400)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(c, style: fg(size: 12, color: AppColors.orange200))),
                ]),
            ], 6),
          ),
        ),
      _panel(
        icon: LucideIcons.activity,
        iconColor: _tint,
        title: 'Workout Specifications',
        child: FgGrid(
          columns: 2,
          gap: 16,
          children: [
            for (final (label, value) in [
              ('Duration', '${w.duration > 0 ? w.duration : 30} min'),
              ('Difficulty', w.difficulty.isNotEmpty ? w.difficulty : 'All Levels'),
              ('Intensity', w.intensity.isNotEmpty ? w.intensity : 'Moderate'),
              ('Est. Burn', '${w.calories ?? 200} kcal'),
            ])
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.whiteA(0.05), borderRadius: BorderRadius.circular(12)),
                child: Column(children: [
                  Text(label, style: fg(size: 12, color: AppColors.muted)),
                  const SizedBox(height: 4),
                  Text(value, textAlign: TextAlign.center, style: fg(size: 16, weight: FontWeight.w700)),
                ]),
              ),
          ],
        ),
      ),
    ], 16);
  }

  Widget _guidanceBox({required Color background, required Color border, required String title, required Color titleColor, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(12), border: Border.all(color: border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [Text(title, style: fg(size: 12, weight: FontWeight.w700, color: titleColor, letterSpacing: 0.6)), const SizedBox(height: 8), child],
      ),
    );
  }

  Widget _bullet(String mark, Color markColor, String text, Color textColor, {double size = 14}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(mark, style: fg(size: size, color: markColor)),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: fg(size: size, color: textColor))),
      ]),
    );
  }

  Widget _stepRow(int idx, WorkoutStep s) {
    final isCurrent = idx == _current;
    final isDone = _completed.contains(idx);
    return Semantics(
      button: true,
      selected: isCurrent,
      child: Material(
        color: isCurrent ? AppColors.whiteA(0.1) : isDone ? AppColors.green500.withValues(alpha: 0.1) : AppColors.whiteA(0.05),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: isCurrent ? _tint : isDone ? AppColors.green500.withValues(alpha: 0.3) : AppColors.whiteA(0.1), width: isCurrent ? 2 : 1),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () {
            _goTo(idx);
            _scroll.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: isDone ? AppColors.green500 : isCurrent ? _tint : AppColors.whiteA(0.15)),
                  child: isDone
                      ? const Icon(LucideIcons.check, size: 16, color: AppColors.noirEclipse)
                      : Text('${idx + 1}', style: fg(size: 14, weight: FontWeight.w700, color: isCurrent ? AppColors.noirEclipse : AppColors.white)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Text('Step ${s.stepNumber}', style: fg(size: 14, weight: FontWeight.w700, color: isCurrent ? _tint : isDone ? AppColors.green400 : AppColors.white)),
                        if (s.duration != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(color: AppColors.whiteA(0.1), borderRadius: BorderRadius.circular(999)),
                            child: Text('${s.duration! ~/ 60}:${(s.duration! % 60).toString().padLeft(2, '0')}', style: fg(size: 12, color: AppColors.whiteA(0.6))),
                          ),
                        ],
                      ]),
                      const SizedBox(height: 2),
                      Text(s.instruction, maxLines: 1, overflow: TextOverflow.ellipsis, style: fg(size: 12, color: AppColors.whiteA(0.7))),
                    ],
                  ),
                ),
                if (isCurrent) ...[const SizedBox(width: 8), Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: _tint))],
                if (s.gifUrl != null) ...[
                  const SizedBox(width: 8),
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.whiteA(0.1)), color: Colors.black.withValues(alpha: 0.4)),
                    clipBehavior: Clip.antiAlias,
                    child: NetImage(s.gifUrl),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _restOverlay() {
    return Positioned.fill(
      child: Material(
        color: AppColors.noirEclipse.withValues(alpha: 0.95),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('REST PERIOD', style: fg(size: 12, weight: FontWeight.w700, color: _tint, letterSpacing: 1.5)),
                const SizedBox(height: 16),
                Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularTimer(remaining: _remaining, total: widget.workout.restPeriod ?? 30, color: _tint, playing: true),
                    Text('$_remaining', style: fg(size: 36, weight: FontWeight.w900, color: _tint)),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Take a Breather', style: fg(size: 30, weight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text("You're doing fantastic! Grab some water 💧", textAlign: TextAlign.center, style: fg(size: 16, color: AppColors.whiteA(0.6))),
                const SizedBox(height: 24),
                FgButton(label: 'Skip Rest', uppercase: true, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 52, padding: const EdgeInsets.symmetric(horizontal: 40), color: _tint, onPressed: _stepComplete),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The ring around the step countdown (CircularTimer in the website's player).
class CircularTimer extends StatelessWidget {
  const CircularTimer({super.key, required this.remaining, required this.total, required this.color, required this.playing});
  final int remaining;
  final int total;
  final Color color;
  final bool playing;

  @override
  Widget build(BuildContext context) {
    final fraction = total > 0 ? remaining / total : 1.0;
    final ringColor = remaining <= 5 ? AppColors.red400 : remaining <= 10 ? AppColors.orange400 : color;
    return ExcludeSemantics(
      child: TweenAnimationBuilder<double>(
        tween: Tween(end: fraction),
        duration: const Duration(seconds: 1),
        builder: (context, value, _) => CustomPaint(size: const Size(130, 130), painter: _RingPainter(value, ringColor, playing)),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.fraction, this.color, this.playing);
  final double fraction;
  final Color color;
  final bool playing;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    const radius = 52.0;
    final rect = Rect.fromCircle(center: center, radius: radius);
    canvas.drawCircle(center, radius, Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7
      ..color = const Color(0x14FFFFFF));
    final sweep = 2 * math.pi * fraction;
    canvas.drawArc(rect, -math.pi / 2, sweep, false, Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..color = color.withValues(alpha: 0.35)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3));
    canvas.drawArc(rect, -math.pi / 2, sweep, false, Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7
      ..strokeCap = StrokeCap.round
      ..color = color);
    if (playing) {
      final angle = -math.pi / 2 + 2 * math.pi * (1 - fraction);
      canvas.drawCircle(center + Offset(math.cos(angle), math.sin(angle)) * radius, 4.5, Paint()..color = color);
    }
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.fraction != fraction || old.color != color || old.playing != playing;
}

class _ExitDialog extends StatelessWidget {
  const _ExitDialog({required this.completed, required this.total});
  final int completed;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.obsidianWave,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24), side: BorderSide(color: AppColors.whiteA(0.1))),
      // Scrolls when large system text makes it taller than the screen.
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.red500.withValues(alpha: 0.1)),
              child: const Icon(LucideIcons.triangleAlert, size: 32, color: AppColors.red400),
            ),
            const SizedBox(height: 16),
            Text('Exit Workout?', style: fg(size: 24, weight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text('You\'ve completed $completed of $total exercises. Are you sure you want to quit?', textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.whiteA(0.6))),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: FgButton(label: 'Keep Going', style: FgButtonStyle.ghost, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 50, onPressed: () => Navigator.of(context).pop())),
                const SizedBox(width: 12),
                Expanded(child: FgButton(label: 'Exit', style: FgButtonStyle.danger, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 50, onPressed: () => Navigator.of(context).pop('exit'))),
              ],
            ),
            const SizedBox(height: 12),
            FgButton(label: 'Save progress & exit', style: FgButtonStyle.secondary, expand: true, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: () => Navigator.of(context).pop('save')),
          ],
        ),
      ),
    );
  }
}
