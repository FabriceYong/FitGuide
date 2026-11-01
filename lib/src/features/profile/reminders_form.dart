import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../services/reminders.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';

// Monday first; values are the API's weekdays (0 = Sunday).
const _week = [(1, 'Mon', 'Monday'), (2, 'Tue', 'Tuesday'), (3, 'Wed', 'Wednesday'), (4, 'Thu', 'Thursday'), (5, 'Fri', 'Friday'), (6, 'Sat', 'Saturday'), (0, 'Sun', 'Sunday')];

/// Workout days and time, and the streak nudge (profile/components/Reminders.tsx).
/// The website gets them by browser push; this phone schedules its own.
class RemindersForm extends StatefulWidget {
  const RemindersForm({super.key});

  @override
  State<RemindersForm> createState() => _RemindersFormState();
}

class _RemindersFormState extends State<RemindersForm> {
  ReminderSettings? _settings;
  bool? _allowed;
  bool _saving = false;
  bool _saved = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([fetchReminders(), ReminderNotifications.allowed()]);
      if (!mounted) return;
      setState(() {
        _settings = (results[0] as Reminders).settings;
        _allowed = results[1] as bool;
      });
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not load your reminders.');
    }
  }

  void _change(ReminderSettings settings) => setState(() {
    _settings = settings;
    _saved = false;
  });

  Future<void> _pickTime() async {
    final s = _settings!;
    final parts = s.time.split(':');
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: int.tryParse(parts.first) ?? 18, minute: int.tryParse(parts.last) ?? 0),
    );
    if (picked != null) _change(s.copyWith(time: '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}'));
  }

  Future<void> _save() async {
    final settings = _settings!;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final saved = await saveReminders(settings);
      final allowed = settings.anyOn && !(_allowed ?? false) ? await ReminderNotifications.requestPermission() : _allowed;
      await ReminderNotifications.schedule(saved.upcoming);
      if (!mounted) return;
      setState(() {
        _settings = saved.settings;
        _allowed = allowed;
        _saved = true;
      });
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : 'Could not save your reminders.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String get _phoneText {
    if (!ReminderNotifications.supported) return 'This device can’t show reminders. The FitGuide app on a phone can, and so can the website.';
    if (_allowed ?? false) return 'Reminders show on this phone, and in browsers where you’ve turned them on.';
    return 'Notifications are off for FitGuide. Save to allow them, or turn them on in your phone’s settings.';
  }

  @override
  Widget build(BuildContext context) {
    final s = _settings;
    if (s == null) {
      return _error != null
          ? ErrorBox(_error!, compact: true)
          : const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator(color: AppColors.limeLight)));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('A nudge on the days you plan to train. None comes on a day you’ve already worked out.', style: fg(size: 14, color: AppColors.white70)),
        const SizedBox(height: 20),
        Text('Workout days', style: fg(size: 14, weight: FontWeight.w500)),
        const SizedBox(height: 8),
        Row(children: [
          for (final (day, short, long) in _week) ...[
            if (day != 1) const SizedBox(width: 6),
            Expanded(
              child: FgChip(
                label: short,
                semanticLabel: long,
                selected: s.days.contains(day),
                filled: false,
                height: 40,
                radius: 8,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                onTap: () => _change(s.copyWith(days: s.days.contains(day) ? s.days.where((d) => d != day).toList() : [...s.days, day])),
              ),
            ),
          ],
        ]),
        const SizedBox(height: 20),
        FormFieldLabel(
          label: 'Time',
          child: FgButton(label: s.time, icon: LucideIcons.clock, style: FgButtonStyle.secondary, expand: true, onPressed: _pickTime),
        ),
        const SizedBox(height: 20),
        CheckRow(
          value: s.streak,
          onChanged: (v) => _change(s.copyWith(streak: v)),
          title: 'Keep my streak going',
          subtitle: 'At 8 pm, if a streak of 2 days or more would end tonight.',
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(12)),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Padding(padding: EdgeInsets.only(top: 2), child: Icon(LucideIcons.bellRing, size: 16, color: AppColors.limeLight)),
            const SizedBox(width: 8),
            Expanded(child: Text(_phoneText, style: fg(size: 14))),
          ]),
        ),
        if (_error != null) ...[const SizedBox(height: 16), ErrorBox(_error!, compact: true)],
        const SizedBox(height: 16),
        FgButton(
          label: _saved ? 'Saved' : _saving ? 'Saving…' : 'Save reminders',
          icon: _saved ? LucideIcons.circleCheck : null,
          loading: _saving,
          expand: true,
          onPressed: _saving ? null : _save,
        ),
      ],
    );
  }
}
