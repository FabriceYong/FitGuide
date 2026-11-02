import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../services/crew_service.dart';
import '../../widgets/forms.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';
import '../common/site_page.dart';
import 'crews.dart';

/// A crew: this week's goal, members, the last 7 days' workouts and the
/// chat (community/CrewView.tsx).
class CrewScreen extends StatefulWidget {
  const CrewScreen({super.key, required this.id});
  final String id;

  @override
  State<CrewScreen> createState() => _CrewScreenState();
}

class _CrewScreenState extends State<CrewScreen> {
  Crew? _crew;
  List<CrewMessage> _messages = [];
  String? _error;
  bool _sending = false;
  final _text = TextEditingController();
  final _goal = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _text.dispose();
    _goal.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final crew = await fetchCrew(widget.id);
      if (!mounted) return;
      setState(() {
        _crew = crew;
        _messages = crew.messages;
        _goal.text = '${crew.weeklyGoal}';
      });
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    }
  }

  Future<void> _act(Future<void> Function() task) async {
    setState(() => _error = null);
    try {
      await task();
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    }
  }

  Future<void> _send() async {
    final text = _text.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    await _act(() async {
      final message = await sendCrewMessage(widget.id, text);
      if (!mounted) return;
      _text.clear();
      setState(() => _messages = [..._messages, message]);
    });
    if (mounted) setState(() => _sending = false);
  }

  Future<void> _leave(Crew crew) async {
    final ok = await confirmDialog(context, title: 'Leave ${crew.name}?', message: 'You can join again with the invite code while there’s room.', confirmText: 'Leave', danger: true);
    if (!ok || !mounted) return;
    await _act(() async {
      await leaveCrew(crew.id);
      if (mounted) Navigator.of(context).pop();
    });
  }

  Widget _section(String title, IconData icon, List<Widget> children) => FgCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Icon(icon, size: 18, color: AppColors.limeLight),
            const SizedBox(width: 8),
            Semantics(header: true, child: Text(title, style: fg(size: 16, weight: FontWeight.w800))),
          ]),
          const SizedBox(height: 12),
          ...children,
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final crew = _crew;
    if (crew == null) {
      return SitePage(active: '/community', child: _error != null ? ErrorBox(_error!) : const LoadingRow('Loading the crew…'));
    }
    final reached = crew.thisWeek >= crew.weeklyGoal;
    final goal = _section('This week’s goal', LucideIcons.target, [
      Text.rich(TextSpan(style: fg(size: 14), children: [
        TextSpan(text: '${crew.thisWeek}', style: fg(size: 20, weight: FontWeight.w800)),
        TextSpan(text: ' of ${crew.weeklyGoal} workouts'),
        if (reached) TextSpan(text: ' · reached!', style: fg(size: 14, weight: FontWeight.w700, color: AppColors.emerald400)),
      ])),
      const SizedBox(height: 8),
      GoalBar(done: crew.thisWeek, goal: crew.weeklyGoal, label: '${crew.thisWeek} of ${crew.weeklyGoal} workouts this week'),
      if (crew.isOwner) ...[
        const SizedBox(height: 12),
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          SizedBox(
            width: 120,
            child: FormFieldLabel(
              label: 'Change the goal',
              child: FgTextField(controller: _goal, keyboardType: TextInputType.number, inputFormatters: [FilteringTextInputFormatter.digitsOnly], semanticLabel: 'Workouts a week'),
            ),
          ),
          const SizedBox(width: 8),
          FgButton(
            label: 'Save',
            style: FgButtonStyle.ghost,
            radius: 12,
            fontSize: 14,
            onPressed: () => _act(() async {
              final updated = await updateCrewGoal(crew.id, int.tryParse(_goal.text) ?? 0);
              if (mounted) setState(() => _crew = updated);
            }),
          ),
        ]),
      ],
    ]);
    final activity = _section('Last 7 days', LucideIcons.dumbbell, [
      if (crew.activity.isEmpty)
        Text('No workouts yet this week. Be the first.', style: fg(size: 14, color: AppColors.white70))
      else
        ...spaced([
          for (final a in crew.activity)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(10)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text.rich(TextSpan(style: fg(size: 14), children: [
                  TextSpan(text: a.isYou ? 'You' : a.name, style: fg(size: 14, weight: FontWeight.w700)),
                  TextSpan(text: ' · ${a.workoutTitle}'),
                ])),
                Text('${formatSeconds(a.durationSec)} · ${formatDateTime(a.completedAt)}', style: fg(size: 11, color: AppColors.white70)),
              ]),
            ),
        ], 6),
    ]);
    final chat = _section('Chat', LucideIcons.messageCircle, [
      if (_messages.isEmpty) Text('Say hello to your crew.', style: fg(size: 14, color: AppColors.white70)),
      for (final m in _messages)
        Align(
          alignment: m.isYou ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 300),
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: m.isYou ? AppColors.limeLight.withValues(alpha: 0.15) : AppColors.whiteA(0.05),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (!m.isYou) Text(m.name, style: fg(size: 11, weight: FontWeight.w700, color: AppColors.limeLight)),
              Text(m.text, style: fg(size: 14)),
              Text(formatDateTime(m.createdAt), style: fg(size: 10, color: AppColors.white70)),
            ]),
          ),
        ),
      const SizedBox(height: 6),
      Row(children: [
        Expanded(child: FgTextField(controller: _text, hint: 'Message your crew', maxLength: 500, semanticLabel: 'Message your crew', onSubmitted: (_) => _send())),
        const SizedBox(width: 8),
        IconButton.filled(
          tooltip: 'Send',
          style: IconButton.styleFrom(backgroundColor: AppColors.limeLight, foregroundColor: AppColors.noirEclipse, fixedSize: const Size(46, 46)),
          onPressed: _sending ? null : _send,
          icon: _sending
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.noirEclipse))
              : const Icon(LucideIcons.send, size: 18),
        ),
      ]),
    ]);
    final members = _section('Members', LucideIcons.users, [
      for (final m in crew.members)
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(children: [
            Expanded(child: Text('${m.isYou ? 'You' : m.name}${m.isOwner ? ' 👑' : ''}', style: fg(size: 14))),
            Text('${m.workoutsThisWeek} this week', style: fg(size: 12, color: AppColors.white70)),
            if (crew.isOwner && !m.isYou)
              IconButton(
                tooltip: 'Remove ${m.name}',
                visualDensity: VisualDensity.compact,
                icon: const Icon(LucideIcons.userMinus, size: 16, color: AppColors.white70),
                onPressed: () => _act(() async {
                  await removeCrewMember(crew.id, m.id);
                  await _load();
                }),
              ),
          ]),
        ),
      const SizedBox(height: 6),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(10)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Invite people with this code. Crew members see each other’s workouts here.', style: fg(size: 12, color: AppColors.white70)),
          const SizedBox(height: 4),
          Row(children: [
            Expanded(child: SelectableText(crew.inviteCode, style: fg(size: 16, weight: FontWeight.w800, letterSpacing: 2))),
            IconButton(
              tooltip: 'Copy the invite code',
              icon: const Icon(LucideIcons.copy, size: 16, color: AppColors.white70),
              onPressed: () => Clipboard.setData(ClipboardData(text: crew.inviteCode)),
            ),
          ]),
        ]),
      ),
      const SizedBox(height: 12),
      FgButton(label: 'Leave the crew', icon: LucideIcons.logOut, style: FgButtonStyle.ghost, textColor: AppColors.red300, radius: 12, fontSize: 14, onPressed: () => _leave(crew)),
    ]);

    return SitePage(
      active: '/community',
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: spaced([
        PageTitle(crew.name, icon: LucideIcons.shield, size: atLeast(context, Breakpoints.md) ? 36 : 28),
        if (_error != null) ErrorLine(_error!),
        ...withSidebar(context, [goal, activity, chat], [members]),
      ], 16)),
    );
  }
}
