import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../services/ai_service.dart';
import '../../services/plan_service.dart';
import '../../widgets/ui.dart';

const _planChange = {'easier': 'Your plan might be a bit much right now.', 'harder': "You're ready for more."};

/// The weekly check-in on Progress (WeeklyCheckin.tsx): on request, a short
/// read of the last 7 days against the 7 before, what went well and one focus
/// for the coming week, with "Adjust my plan" when it suggests a change.
class WeeklyCheckinCard extends StatefulWidget {
  const WeeklyCheckinCard({super.key});

  @override
  State<WeeklyCheckinCard> createState() => _WeeklyCheckinCardState();
}

class _WeeklyCheckinCardState extends State<WeeklyCheckinCard> {
  AiAllowance? _allowance;
  Checkin? _checkin;
  String? _busy;
  String? _error;
  String? _adapted;

  @override
  void initState() {
    super.initState();
    fetchAiStatus()
        .then((s) {
          if (mounted && s.available) setState(() => _allowance = s.left('checkin'));
        })
        .catchError((Object _) {});
  }

  Future<void> _get() async {
    setState(() {
      _busy = 'checkin';
      _error = null;
    });
    try {
      final res = await fetchCheckin();
      if (mounted) {
        setState(() {
          _checkin = res.checkin;
          _allowance = res.allowance;
        });
      }
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _adapt() async {
    setState(() {
      _busy = 'adapt';
      _error = null;
    });
    try {
      final r = await adaptPlan();
      if (mounted) setState(() => _adapted = r.direction == 'keep' ? '${r.reason} No changes made.' : '${r.reason} The rest of your plan is now ${r.direction}.');
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Widget _pill(String text) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    decoration: BoxDecoration(color: AppColors.whiteA(0.1), borderRadius: BorderRadius.circular(999)),
    child: Text(text, style: fg(size: 12)),
  );

  @override
  Widget build(BuildContext context) {
    final allowance = _allowance;
    if (allowance == null) return const SizedBox.shrink();
    final c = _checkin;
    // Carries its own gap above so nothing is left behind when it hides.
    return Padding(
      padding: const EdgeInsets.only(top: 32),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.royalNebula.withValues(alpha: 0.4)),
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [AppColors.royalNebula.withValues(alpha: 0.2), AppColors.obsidianWave]),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(LucideIcons.sparkles, size: 18, color: AppColors.limeLight),
                const SizedBox(width: 8),
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text('Weekly check-in', style: fg(size: 20, weight: FontWeight.w800)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text('How your last 7 days went, what went well and one thing to focus on next.', style: fg(size: 13, color: AppColors.white70)),
            if (_error != null) ...[const SizedBox(height: 10), ErrorLine(_error!)],
            if (c == null) ...[
              const SizedBox(height: 14),
              Align(
                alignment: Alignment.centerLeft,
                child: FgButton(
                  label: _busy == 'checkin' ? 'Looking at your week…' : 'Get my check-in',
                  icon: LucideIcons.sparkles,
                  loading: _busy == 'checkin',
                  height: 44,
                  radius: 12,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  onPressed: _busy != null || allowance.left == 0 ? null : _get,
                ),
              ),
              if (allowance.left == 0) ...[const SizedBox(height: 8), Text("You've had today's check-ins. Come back tomorrow.", style: fg(size: 12, color: AppColors.white70))],
            ] else ...[
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _pill('${c.workouts} workout${c.workouts == 1 ? '' : 's'}'),
                  _pill('${c.minutes} active min'),
                  if (c.averageSteps != null) _pill('${c.averageSteps} steps a day'),
                  _pill('Food logged ${c.daysFoodLogged} of 7 days'),
                ],
              ),
              const SizedBox(height: 12),
              Text(c.summary, style: fg(size: 15, color: AppColors.whiteA(0.9), height: 1.5)),
              if (c.wins.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  'WHAT WENT WELL',
                  style: fg(size: 11, weight: FontWeight.w700, color: AppColors.limeLight, letterSpacing: 0.8),
                ),
                for (final w in c.wins)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(top: 2),
                          child: Icon(LucideIcons.check, size: 16, color: AppColors.limeLight),
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Text(w, style: fg(size: 14))),
                      ],
                    ),
                  ),
              ],
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 2),
                      child: Icon(LucideIcons.target, size: 16, color: AppColors.amber300),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: 'This week: ',
                              style: fg(size: 14, weight: FontWeight.w700),
                            ),
                            TextSpan(text: c.focus),
                          ],
                        ),
                        style: fg(size: 14),
                      ),
                    ),
                  ],
                ),
              ),
              if (_planChange[c.planChange] != null && _adapted == null) ...[
                const SizedBox(height: 12),
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    Text(_planChange[c.planChange]!, style: fg(size: 13, color: AppColors.white70)),
                    FgButton(
                      label: 'Adjust my plan',
                      style: FgButtonStyle.secondary,
                      loading: _busy == 'adapt',
                      height: 38,
                      radius: 12,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      onPressed: _busy != null ? null : _adapt,
                    ),
                  ],
                ),
              ],
              if (_adapted != null) ...[const SizedBox(height: 10), Text(_adapted!, style: fg(size: 13, color: AppColors.limeLight))],
              const SizedBox(height: 10),
              Text('Written by AI from your own numbers. General guidance, not medical advice.', style: fg(size: 11, color: AppColors.white70)),
            ],
          ],
        ),
      ),
    );
  }
}
