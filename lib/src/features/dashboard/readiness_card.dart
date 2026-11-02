import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../services/readiness_service.dart';
import '../../widgets/progress_ring.dart';
import '../../widgets/ui.dart';

const _energy = ['Drained', 'Low', 'OK', 'Good', 'Great'];
const _soreness = ['None', 'A little', 'Sore', 'Quite', 'Very'];
const _bandColors = {'push': AppColors.emerald500, 'steady': AppColors.limeLight, 'easy': AppColors.amber500};

/// "Strength A: Goblet squats" → "Goblet squats".
String _workout(String title) => title.replaceFirst(RegExp(r'^.*?: '), '');

/// The home tab's daily readiness: a quick check-in (energy and soreness),
/// then a 0–100 score with why, and on a low day an easier workout for
/// today (dashboard/components/ReadinessCard.tsx).
class ReadinessCard extends StatefulWidget {
  const ReadinessCard({super.key, this.onPlanChanged, this.bottomGap = 0});
  final VoidCallback? onPlanChanged;

  /// Space below the card when it shows.
  final double bottomGap;

  @override
  State<ReadinessCard> createState() => _ReadinessCardState();
}

class _ReadinessCardState extends State<ReadinessCard> {
  Readiness? _readiness;
  bool _editing = false;
  int? _energyValue;
  int? _sorenessValue;
  bool _busy = false;
  String? _swapped;
  String? _error;

  @override
  void initState() {
    super.initState();
    fetchReadiness().then((r) {
      if (mounted) setState(() => _readiness = r);
    }).catchError((Object _) {});
  }

  Future<void> _submit() async {
    final energy = _energyValue;
    final soreness = _sorenessValue;
    if (energy == null || soreness == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final r = await checkInReadiness(energy, soreness);
      if (mounted) {
        setState(() {
          _readiness = r;
          _editing = false;
          _swapped = null;
        });
      }
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _swap(EasierSwap s) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await swapPlanDay(s.week, s.day, s.workoutSlug);
      if (!mounted) return;
      setState(() => _swapped = _workout(s.newTitle));
      widget.onPlanChanged?.call();
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _scale(String label, List<String> options, int? value, ValueChanged<int> onChanged) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
      const SizedBox(height: 6),
      Row(children: [
        for (final (i, o) in options.indexed) ...[
          if (i > 0) const SizedBox(width: 6),
          Expanded(
            child: Semantics(
              inMutuallyExclusiveGroup: true,
              checked: value == i + 1,
              label: '$label: $o',
              excludeSemantics: true,
              button: true,
              child: Material(
                color: value == i + 1 ? AppColors.limeLight : AppColors.whiteA(0.1),
                borderRadius: BorderRadius.circular(8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () => onChanged(i + 1),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    child: Text(o, textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: fg(size: 11, weight: FontWeight.w700, color: value == i + 1 ? AppColors.noirEclipse : AppColors.white)),
                  ),
                ),
              ),
            ),
          ),
        ],
      ]),
    ]);
  }

  Widget _header() => Row(children: [
        const Icon(LucideIcons.gauge, size: 20, color: AppColors.limeLight),
        const SizedBox(width: 8),
        Semantics(header: true, child: Text('Today’s readiness', style: fg(size: 16, weight: FontWeight.w800))),
      ]);

  Widget _form() => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _header(),
        const SizedBox(height: 8),
        Text('Two taps tell you how hard to go today. It also uses your sleep and resting heart rate when your phone or watch shares them.',
            style: fg(size: 13, color: AppColors.white70)),
        const SizedBox(height: 12),
        _scale('Energy', _energy, _energyValue, (v) => setState(() => _energyValue = v)),
        const SizedBox(height: 12),
        _scale('Soreness', _soreness, _sorenessValue, (v) => setState(() => _sorenessValue = v)),
        if (_error != null) ...[const SizedBox(height: 8), ErrorLine(_error!)],
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerLeft,
          child: FgButton(
            label: 'See my readiness',
            loading: _busy,
            radius: 12,
            fontSize: 14,
            fontWeight: FontWeight.w700,
            onPressed: _energyValue == null || _sorenessValue == null || _busy ? null : _submit,
          ),
        ),
      ]);

  Widget _result(Readiness r) {
    final color = _bandColors[r.band] ?? AppColors.limeLight;
    final swap = r.easierSwap;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _header(),
      const SizedBox(height: 12),
      Row(children: [
        Semantics(
          label: 'Readiness ${r.score} out of 100',
          excludeSemantics: true,
          child: ProgressRing(
            value: r.score.toDouble(),
            goal: 100,
            color: color,
            size: 76,
            stroke: 8,
            child: Text('${r.score}', style: fg(size: 22, weight: FontWeight.w800)),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(r.headline, style: fg(size: 17, weight: FontWeight.w800, color: color)),
            const SizedBox(height: 2),
            Text(r.advice, style: fg(size: 13, color: AppColors.white70)),
          ]),
        ),
      ]),
      if (r.reasons.isNotEmpty) ...[
        const SizedBox(height: 12),
        Wrap(spacing: 6, runSpacing: 6, children: [
          for (final reason in r.reasons)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: AppColors.whiteA(0.05), borderRadius: BorderRadius.circular(999), border: Border.all(color: AppColors.white30A(0.15))),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                if (reason.effect == 'up') const Icon(LucideIcons.arrowUp, size: 12, color: AppColors.emerald400),
                if (reason.effect == 'down') const Icon(LucideIcons.arrowDown, size: 12, color: AppColors.amber400),
                if (reason.effect != 'none') const SizedBox(width: 4),
                Text(reason.text, style: fg(size: 11, weight: FontWeight.w600)),
              ]),
            ),
        ]),
      ],
      if (swap != null && _swapped == null) ...[
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text.rich(TextSpan(style: fg(size: 14), children: [
              TextSpan(text: 'Today: ${_workout(swap.title)} → '),
              TextSpan(text: _workout(swap.newTitle), style: fg(size: 14, weight: FontWeight.w700)),
            ])),
            const SizedBox(height: 10),
            FgButton(label: 'Swap to the easier one', loading: _busy, radius: 12, fontSize: 13, fontWeight: FontWeight.w700, height: 40, onPressed: _busy ? null : () => _swap(swap)),
          ]),
        ),
      ],
      if (_swapped != null) ...[const SizedBox(height: 12), StatusBox('Swapped. Today’s session is now $_swapped.')],
      if (_error != null) ...[const SizedBox(height: 8), ErrorLine(_error!)],
      const SizedBox(height: 8),
      Align(
        alignment: Alignment.centerLeft,
        child: LinkText('Change my answers', size: 12, weight: FontWeight.w700, onTap: () => setState(() {
          _energyValue = r.energy;
          _sorenessValue = r.soreness;
          _editing = true;
        })),
      ),
      const SizedBox(height: 4),
      Text('A guide for training, not a medical measure.', style: fg(size: 11, color: AppColors.white70)),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final r = _readiness;
    if (r == null) return const SizedBox.shrink();
    return Padding(
      padding: EdgeInsets.only(bottom: widget.bottomGap),
      child: FgCard(child: !r.checkedIn || _editing ? _form() : _result(r)),
    );
  }
}
