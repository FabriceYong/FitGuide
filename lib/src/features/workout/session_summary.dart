import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/analytics.dart';
import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/units.dart';
import '../../models/json.dart';
import '../../navigation.dart';
import '../../services/home_widgets.dart';
import '../../services/reminders.dart';
import '../../services/training_service.dart';
import '../../state/auth_controller.dart';
import '../../state/dashboard_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/share_card.dart';
import '../../widgets/ui.dart';
import 'workout_feedback_card.dart';

const _effortLabels = {1: 'Very easy', 3: 'Easy', 5: 'Moderate', 7: 'Hard', 9: 'Very hard', 10: 'Max effort'};

/// End-of-workout sheet: review the session, rate the effort, add notes and
/// save it to the account. Guests see the summary but can't save
/// (features/workout/SessionSummary.js).
class SessionSummary extends StatefulWidget {
  const SessionSummary({
    super.key,
    required this.draft,
    required this.status,
    required this.caloriesPerMinute,
    required this.tint,
    required this.onDone,
    this.onResume,
  });

  /// Session fields from the player (everything but effort and notes).
  final Json draft;
  final String status;
  final double caloriesPerMinute;
  final Color tint;
  final void Function(LoggedSession? result) onDone;
  final VoidCallback? onResume;

  @override
  State<SessionSummary> createState() => _SessionSummaryState();
}

class _SessionSummaryState extends State<SessionSummary> {
  late final _minutes = TextEditingController(text: '${((widget.draft['durationSec'] as int) / 60).round().clamp(1, 1440)}');
  final _notes = TextEditingController();
  int? _effort;
  bool _saving = false;
  String? _error;
  LoggedSession? _saved;
  // Kept across retries of Save, so a retry after a lost response isn't saved twice.
  final _clientId = newClientId();

  @override
  void initState() {
    super.initState();
    _minutes.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _minutes.dispose();
    _notes.dispose();
    super.dispose();
  }

  int get _minutesValue => int.tryParse(_minutes.text) ?? 0;

  Future<void> _save() async {
    final user = context.read<AuthController>().user;
    if (user == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final result = await logSession({
        ...widget.draft,
        'status': widget.status,
        'durationSec': _minutesValue * 60,
        'perceivedEffort': _effort,
        'notes': _notes.text.trim(),
        'clientId': _clientId,
      }, user.id);
      setState(() => _saved = result);
      if (mounted) context.read<DashboardController>().dataChanged();
      // An invited member's first workout: PLUS for a week, for them and their friend.
      if (result.plusDays != null && mounted) context.read<AuthController>().refreshProfile();
      // Trained today: today's reminders are no longer needed.
      if (!result.queued) {
        syncReminders();
        syncHomeWidgets();
      }
      track('workout_completed', path: '/workouts/${widget.draft['workoutSlug']}/play', props: {'status': widget.status, 'queued': result.queued});
    } catch (err) {
      setState(() => _error = err is ApiError ? err.message : '$err');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _stat(IconData icon, Color color, String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(color: AppColors.whiteA(0.05), borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.whiteA(0.1))),
        child: Column(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 4),
            Text(value, style: fg(size: 24, weight: FontWeight.w900)),
            const SizedBox(height: 2),
            Text(label, style: fg(size: 12, color: AppColors.muted)),
          ],
        ),
      ),
    );
  }

  void _shareCard(LoggedSession saved, int calories, int loggedSets, double volumeKg, Units units) {
    showShareCard(
      context,
      ShareCardData(
        label: 'WORKOUT COMPLETE',
        title: '${widget.draft['workoutTitle']}',
        subtitle: formatDayLong(localToday()),
        stats: [
          ('$_minutesValue', 'Minutes'),
          ('$calories', 'Calories'),
          if (loggedSets > 0) ('$loggedSets', loggedSets == 1 ? 'Set' : 'Sets'),
          if (volumeKg > 0) ('${thousands(weightIn(volumeKg, units))} ${units.weight}', 'Lifted'),
        ],
        records: [for (final r in saved.newRecords) '${r.exerciseName} · ${formatRecord(r, units)}'],
      ),
      filename: 'fitguide-workout.png',
      text: 'Just finished ${widget.draft['workoutTitle']} on FitGuide',
      kind: 'workout',
    );
  }

  Widget _button(String label, VoidCallback? onTap, {bool primary = false}) {
    return Expanded(
      child: FgButton(
        label: label,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        radius: 12,
        fontSize: 14,
        fontWeight: FontWeight.w700,
        height: 50,
        style: primary ? FgButtonStyle.primary : FgButtonStyle.ghost,
        color: primary ? widget.tint : null,
        loading: primary && _saving,
        onPressed: onTap,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final draft = widget.draft;
    final sets = asJsonList(draft['sets']);
    final loggedSets = sets.where((s) => s['reps'] != null || s['weightKg'] != null).length;
    final volumeKg = sets.fold<double>(0, (n, s) => n + (asDouble(s['reps']) ?? 0) * (asDouble(s['weightKg']) ?? 0));
    final saved = _saved;
    final calories = asInt(saved?.session['calories']) ?? (_minutesValue * widget.caloriesPerMinute).round();
    final completed = widget.status == 'completed';

    return Material(
      color: AppColors.noirEclipse.withValues(alpha: 0.95),
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 512),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.whiteA(0.1))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(completed ? '🏆' : '💪', textAlign: TextAlign.center, style: const TextStyle(fontSize: 48)),
                  const SizedBox(height: 12),
                  Text(completed ? 'Workout Complete!' : 'Good effort', textAlign: TextAlign.center, style: fg(size: 30, weight: FontWeight.w900, color: widget.tint)),
                  const SizedBox(height: 4),
                  Text('${draft['workoutTitle']}', textAlign: TextAlign.center, style: fg(size: 14, color: AppColors.whiteA(0.6))),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _stat(LucideIcons.clock, AppColors.blue400, '${saved != null ? (asInt(saved.session['durationSec']) ?? _minutesValue * 60) ~/ 60 : _minutesValue}', 'Minutes'),
                      const SizedBox(width: 12),
                      _stat(LucideIcons.flame, AppColors.orange400, '$calories', 'Calories'),
                      const SizedBox(width: 12),
                      _stat(LucideIcons.award, widget.tint, '${draft['stepsCompleted']}/${draft['totalSteps']}', 'Steps'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (saved != null) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(LucideIcons.check, size: 20, color: AppColors.emerald400),
                        const SizedBox(width: 8),
                        Flexible(child: Text('Saved to your progress', style: fg(size: 16, weight: FontWeight.w600, color: AppColors.emerald400), textAlign: TextAlign.center)),
                      ],
                    ),
                    if (saved.queued) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.amber500.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.amber500.withValues(alpha: 0.3)),
                        ),
                        child: Text('You\'re offline. This session is saved on this device and will sync when you\'re back online.', style: fg(size: 14, color: AppColors.amber200)),
                      ),
                    ],
                    if (saved.plusDays != null) ...[
                      const SizedBox(height: 16),
                      StatusBox('🎁 Your first workout: you and the friend who invited you each get ${saved.plusDays} days of FitGuide PLUS.'),
                    ],
                    if (saved.newRecords.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.amber500.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.amber500.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(children: [
                              const Icon(LucideIcons.trophy, size: 20, color: AppColors.amber300),
                              const SizedBox(width: 8),
                              Flexible(child: Text('New personal record${saved.newRecords.length > 1 ? 's' : ''}', style: fg(size: 16, weight: FontWeight.w700, color: AppColors.amber300))),
                            ]),
                            const SizedBox(height: 8),
                            for (final r in saved.newRecords)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Row(children: [
                                  Expanded(child: Text(r.exerciseName, style: fg(size: 14, color: AppColors.whiteA(0.8)))),
                                  Text(formatRecord(r, context.read<AuthController>().user?.units ?? Units.metric), style: fg(size: 14, weight: FontWeight.w700)),
                                ]),
                              ),
                          ],
                        ),
                      ),
                    ],
                    if (!saved.queued && asString(saved.session['id']) != null) ...[
                      const SizedBox(height: 16),
                      WorkoutFeedbackCard(sessionId: asString(saved.session['id'])!, tint: widget.tint),
                    ],
                    const SizedBox(height: 16),
                    FgButton(
                      label: 'Share my workout',
                      icon: LucideIcons.share2,
                      style: FgButtonStyle.ghost,
                      radius: 12,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      onPressed: () => _shareCard(saved, calories, loggedSets, volumeKg, auth.user?.units ?? Units.metric),
                    ),
                    const SizedBox(height: 12),
                    Row(children: [
                      _button('View progress', () => toDashboard(context, DashboardTab.progress)),
                      const SizedBox(width: 12),
                      _button('Done', () => widget.onDone(saved), primary: true),
                    ]),
                  ] else if (auth.hasAccount) ...[
                    SmallLabel('Active time (minutes)', color: AppColors.whiteA(0.5)),
                    const SizedBox(height: 8),
                    FgTextField(
                      controller: _minutes,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      radius: 12,
                      fill: AppColors.whiteA(0.05),
                      border: AppColors.whiteA(0.1),
                      semanticLabel: 'Active time in minutes',
                    ),
                    const SizedBox(height: 20),
                    Text.rich(TextSpan(children: [
                      TextSpan(text: 'HOW HARD WAS IT?', style: fgLabel(color: AppColors.whiteA(0.5))),
                      if (_effort != null) TextSpan(text: ' — $_effort/10 ${_effortLabels[_effort] ?? ''}', style: fg(size: 12, color: AppColors.white70)),
                    ])),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        for (var n = 1; n <= 10; n++)
                          Expanded(
                            child: Padding(
                              padding: EdgeInsets.only(left: n == 1 ? 0 : 4),
                              child: Semantics(
                                button: true,
                                selected: _effort == n,
                                child: Material(
                                  color: _effort == n ? widget.tint : AppColors.whiteA(0.05),
                                  borderRadius: BorderRadius.circular(8),
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(8),
                                    onTap: () => setState(() => _effort = n),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      child: Text('$n', textAlign: TextAlign.center, style: fg(size: 14, weight: FontWeight.w700, color: _effort == n ? AppColors.noirEclipse : AppColors.white70)),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    SmallLabel('Notes (optional)', color: AppColors.whiteA(0.5)),
                    const SizedBox(height: 8),
                    FgTextField(
                      controller: _notes,
                      hint: 'How did it feel? Anything to change next time?',
                      maxLines: 3,
                      minLines: 3,
                      maxLength: 1000,
                      fontSize: 14,
                      radius: 12,
                      fill: AppColors.whiteA(0.05),
                      border: AppColors.whiteA(0.1),
                    ),
                    if (loggedSets > 0) ...[
                      const SizedBox(height: 12),
                      Text('$loggedSets logged set${loggedSets > 1 ? 's' : ''} will be saved with this session.', style: fg(size: 12, color: AppColors.whiteA(0.5))),
                    ],
                    if (_error != null) ...[const SizedBox(height: 16), ErrorBox(_error!, compact: true)],
                    const SizedBox(height: 20),
                    Row(children: [
                      if (widget.onResume != null) _button('Keep going', _saving ? null : widget.onResume) else _button("Don't save", _saving ? null : () => widget.onDone(null)),
                      const SizedBox(width: 12),
                      _button('Save session', _saving || _minutesValue <= 0 ? null : _save, primary: true),
                    ]),
                    if (widget.onResume != null) ...[
                      const SizedBox(height: 12),
                      Center(child: LinkText('Exit without saving', size: 12, color: AppColors.whiteA(0.5), weight: FontWeight.w400, onTap: _saving ? null : () => widget.onDone(null))),
                    ],
                  ] else ...[
                    Text(
                      'You\'re browsing as a guest, so this session isn\'t saved. Create an account to track sessions, streaks and personal records.',
                      textAlign: TextAlign.center,
                      style: fg(size: 14, color: AppColors.white70),
                    ),
                    const SizedBox(height: 16),
                    Row(children: [
                      if (widget.onResume != null) ...[_button('Keep going', widget.onResume), const SizedBox(width: 12)],
                      _button('Done', () => widget.onDone(null), primary: true),
                    ]),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
