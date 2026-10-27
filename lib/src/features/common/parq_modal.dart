import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/storage.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/modal.dart';
import '../../widgets/ui.dart';

/// The seven questions of the original PAR-Q (Physical Activity Readiness
/// Questionnaire). A "yes" to any means: talk to a doctor first.
const _questions = [
  (
    'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?',
    'A known heart condition needs medical clearance first.'
  ),
  ('Do you feel pain in your chest when you do physical activity?', 'Chest pain during activity should be checked by a doctor.'),
  ('In the past month, have you had chest pain when you were not doing physical activity?', 'Chest pain at rest should be checked by a doctor.'),
  ('Do you lose your balance because of dizziness or do you ever lose consciousness?', 'Dizziness or fainting should be assessed before exercising.'),
  (
    'Do you have a bone or joint problem (for example, back, knee or hip) that could be made worse by a change in your physical activity?',
    'A bone or joint problem may need adapted exercises.'
  ),
  (
    'Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?',
    'Some medicines change how your body responds to exercise.'
  ),
  ('Do you know of any other reason why you should not do physical activity?', 'Mention any other concern to your doctor.'),
];

const parqStorageKey = 'fitguide_parq_result';

/// Whether this device has a saved PAR-Q answer set.
bool hasParqResult() => Storage.has(parqStorageKey);

Future<void> showParqModal(BuildContext context) =>
    showFgModal<void>(context, title: 'Health check (PAR-Q)', builder: (_) => const _ParqBody());

class _ParqBody extends StatefulWidget {
  const _ParqBody();

  @override
  State<_ParqBody> createState() => _ParqBodyState();
}

class _ParqBodyState extends State<_ParqBody> {
  String _step = 'intro';
  final List<bool> _answers = [];

  void _answer(bool yes) {
    setState(() => _answers.add(yes));
    if (_answers.length == _questions.length) {
      Storage.setJson(parqStorageKey, {'answers': _answers, 'flagged': _answers.any((a) => a), 'completedAt': DateTime.now().toIso8601String()});
      setState(() => _step = 'result');
    }
  }

  Widget _answerButton(String label, Color color, VoidCallback onTap) {
    return Expanded(
      child: Material(
        color: color.withValues(alpha: 0.1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: color.withValues(alpha: 0.4))),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(label, textAlign: TextAlign.center, style: fg(size: 18, weight: FontWeight.w800, color: color)),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_step == 'intro') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Seven yes-or-no questions from the Physical Activity Readiness Questionnaire (PAR-Q), a screening widely used before starting an exercise program. It takes about a minute.',
            style: fg(size: 14, color: AppColors.white70, height: 1.6),
          ),
          const SizedBox(height: 16),
          Text('Your answers stay on this device. This is a screening aid, not a diagnosis or medical advice.', style: fg(size: 12, color: AppColors.white70)),
          const SizedBox(height: 16),
          FgButton(label: 'Start', trailingIcon: LucideIcons.chevronRight, expand: true, height: 52, radius: 12, fontWeight: FontWeight.w800, onPressed: () => setState(() => _step = 'questions')),
        ],
      );
    }
    if (_step == 'questions' && _answers.length < _questions.length) {
      final current = _answers.length;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Question ${current + 1} of ${_questions.length}', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
          const SizedBox(height: 8),
          FgProgressBar(percent: current / _questions.length * 100, height: 6),
          const SizedBox(height: 20),
          Semantics(liveRegion: true, child: Text(_questions[current].$1, style: fg(size: 16, weight: FontWeight.w600, height: 1.6))),
          const SizedBox(height: 20),
          Row(
            children: [
              _answerButton('Yes', AppColors.orange300, () => _answer(true)),
              const SizedBox(width: 12),
              _answerButton('No', AppColors.limeLight, () => _answer(false)),
            ],
          ),
          if (current > 0) ...[
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerLeft,
              child: InkWell(
                onTap: () => setState(() => _answers.removeLast()),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(LucideIcons.chevronLeft, size: 16, color: AppColors.white70),
                    Text('Previous question', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
                  ],
                ),
              ),
            ),
          ],
        ],
      );
    }
    final flagged = [for (final (i, q) in _questions.indexed) if (_answers[i]) q];
    return Semantics(
      liveRegion: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (flagged.isEmpty) ...[
            const Icon(LucideIcons.shieldCheck, size: 56, color: AppColors.limeLight),
            const SizedBox(height: 16),
            Text('No flags raised', textAlign: TextAlign.center, style: fg(size: 20, weight: FontWeight.w800, color: AppColors.limeLight)),
            const SizedBox(height: 12),
            Text(
              'You answered no to every question, so you can reasonably start becoming more active. Start gently, build up gradually, and stop if you feel unwell. If your health changes, take the check again.',
              textAlign: TextAlign.center,
              style: fg(size: 14, color: AppColors.white70, height: 1.6),
            ),
          ] else ...[
            const Icon(LucideIcons.triangleAlert, size: 56, color: AppColors.orange300),
            const SizedBox(height: 16),
            Text('Talk to a doctor first', textAlign: TextAlign.center, style: fg(size: 20, weight: FontWeight.w800, color: AppColors.orange300)),
            const SizedBox(height: 12),
            Text(
              'You answered yes to ${flagged.length == 1 ? 'one question' : '${flagged.length} questions'}. Speak with a doctor before becoming much more physically active, and tell them which ones.',
              textAlign: TextAlign.center,
              style: fg(size: 14, color: AppColors.white70, height: 1.6),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.orange500.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.orange500.withValues(alpha: 0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: spaced([
                  for (final q in flagged)
                    Container(
                      padding: const EdgeInsets.only(left: 12),
                      decoration: BoxDecoration(border: Border(left: BorderSide(color: AppColors.orange400.withValues(alpha: 0.5), width: 2))),
                      child: Text(q.$2, style: fg(size: 12, color: AppColors.white70)),
                    ),
                ], 8),
              ),
            ),
          ],
          const SizedBox(height: 20),
          FgButton(label: 'Done', expand: true, height: 52, radius: 12, fontWeight: FontWeight.w800, onPressed: () => Navigator.of(context).pop()),
        ],
      ),
    );
  }
}
