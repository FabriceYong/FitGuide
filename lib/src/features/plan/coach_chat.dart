import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/analytics.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../services/plan_service.dart';
import '../../widgets/forms.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';

const _suggestions = [
  'What should I focus on this week?',
  'My knees hurt on lunges. What can I do instead?',
  'Swap my next workout for something shorter.',
];

/// Chat with the AI coach. Calls [onPlanChanged] when the coach edits the
/// plan (features/plan/CoachChat.tsx).
class CoachChat extends StatefulWidget {
  const CoachChat({super.key, required this.onPlanChanged});
  final VoidCallback onPlanChanged;

  @override
  State<CoachChat> createState() => _CoachChatState();
}

class _CoachChatState extends State<CoachChat> {
  final _text = TextEditingController();
  final _scroll = ScrollController();
  bool? _available;
  List<CoachMessage> _messages = [];
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _text.addListener(() => setState(() {}));
    fetchCoach().then((data) {
      if (!mounted) return;
      setState(() {
        _available = data.available;
        _messages = data.messages;
      });
      _toEnd();
    }).catchError((Object err) {
      if (mounted) setState(() => _error = '$err');
    });
  }

  @override
  void dispose() {
    _text.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _toEnd() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      });

  Future<void> _send(String message) async {
    final trimmed = message.trim();
    if (trimmed.isEmpty || _sending) return;
    final pending = CoachMessage(id: 'pending-${DateTime.now().millisecondsSinceEpoch}', role: 'user', text: trimmed, createdAt: DateTime.now().toIso8601String());
    setState(() {
      _sending = true;
      _error = null;
      _messages = [..._messages, pending];
    });
    _text.clear();
    _toEnd();
    try {
      final result = await sendCoachMessage(trimmed);
      if (!mounted) return;
      setState(() => _messages = [..._messages, result.reply]);
      track('coach_message', path: '/plan');
      if (result.changedPlan) widget.onPlanChanged();
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _messages = _messages.where((m) => m.id != pending.id).toList();
        _error = err is ApiError ? err.message : '$err';
      });
      _text.text = trimmed;
    } finally {
      if (mounted) setState(() => _sending = false);
      _toEnd();
    }
  }

  Future<void> _startOver() async {
    final ok = await confirmDialog(context, title: 'Start a new conversation?', message: 'The current one will be deleted.', confirmText: 'New chat');
    if (!ok) return;
    await resetCoach();
    if (mounted) setState(() => _messages = []);
  }

  @override
  Widget build(BuildContext context) {
    final available = _available == true;
    return Semantics(
      label: 'AI coach',
      container: true,
      child: Container(
        // `h-[600px] max-h-[80vh]`: shorter on a phone held sideways.
        height: math.min(600, MediaQuery.sizeOf(context).height * 0.8),
        decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.white30A(0.1))),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.white30A(0.1)))),
              child: Row(children: [
                const Icon(LucideIcons.bot, size: 20, color: AppColors.limeLight),
                const SizedBox(width: 8),
                Expanded(child: Text('Coach', style: fg(size: 16, weight: FontWeight.w800))),
                if (_messages.isNotEmpty)
                  InkWell(
                    onTap: _startOver,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(children: [
                        const Icon(LucideIcons.rotateCcw, size: 14, color: AppColors.white70),
                        const SizedBox(width: 6),
                        Text('New chat', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
                      ]),
                    ),
                  ),
              ]),
            ),
            Expanded(
              child: Semantics(
                liveRegion: true,
                // Bubbles take up to 85% of the chat's width, wherever it sits.
                child: LayoutBuilder(builder: (context, box) => ListView(
                  controller: _scroll,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  children: [
                    if (_available == false) Text("The coach isn't available on this server yet.", style: fg(size: 14, color: AppColors.white70)),
                    if (available && _messages.isEmpty) ...[
                      Text('Ask about your plan, form, swaps or recovery. The coach sees your profile, plan and recent sessions.', style: fg(size: 14, color: AppColors.white70)),
                      const SizedBox(height: 12),
                      for (final s in _suggestions)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Material(
                            color: AppColors.whiteA(0.05),
                            borderRadius: BorderRadius.circular(12),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () => _send(s),
                              child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), child: Text(s, style: fg(size: 14))),
                            ),
                          ),
                        ),
                    ],
                    for (final m in _messages)
                      Align(
                        alignment: m.role == 'user' ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          constraints: BoxConstraints(maxWidth: box.maxWidth * 0.85),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: m.role == 'user' ? AppColors.limeLight : AppColors.noirEclipse,
                            borderRadius: BorderRadius.circular(16),
                            border: m.role == 'user' ? null : Border.all(color: AppColors.white30A(0.1)),
                          ),
                          child: Text(
                            m.text,
                            semanticsLabel: '${m.role == 'user' ? 'You' : 'Coach'}: ${m.text}',
                            style: fg(size: 14, height: 1.6, color: m.role == 'user' ? AppColors.noirEclipse : AppColors.white),
                          ),
                        ),
                      ),
                    if (_sending) const LoadingRow('Coach is thinking…', padding: EdgeInsets.zero),
                  ],
                )),
              ),
            ),
            if (_error != null) Padding(padding: const EdgeInsets.fromLTRB(20, 0, 20, 8), child: ErrorLine(_error!)),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.white30A(0.1)))),
              child: Row(children: [
                Expanded(
                  child: FgTextField(
                    controller: _text,
                    enabled: available && !_sending,
                    hint: available ? 'Ask your coach…' : 'Coach unavailable',
                    maxLength: 2000,
                    fontSize: 14,
                    radius: 12,
                    border: AppColors.white30A(0.2),
                    textInputAction: TextInputAction.send,
                    onSubmitted: _send,
                    semanticLabel: 'Message the coach',
                  ),
                ),
                const SizedBox(width: 8),
                Opacity(
                  opacity: available && !_sending && _text.text.trim().isNotEmpty ? 1 : 0.5,
                  child: Semantics(
                    button: true,
                    label: 'Send',
                    excludeSemantics: true,
                    child: Material(
                      color: AppColors.limeLight,
                      borderRadius: BorderRadius.circular(12),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: available && !_sending && _text.text.trim().isNotEmpty ? () => _send(_text.text) : null,
                        child: const SizedBox(width: 44, height: 44, child: Icon(LucideIcons.send, size: 16, color: AppColors.noirEclipse)),
                      ),
                    ),
                  ),
                ),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}
