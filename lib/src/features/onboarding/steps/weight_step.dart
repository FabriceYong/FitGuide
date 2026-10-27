import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/shared/profile_options.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../widgets/forms.dart';
import '../../../widgets/ui.dart';

/// Target weight with ±1 and ±5 kg steps.
class WeightStep extends StatefulWidget {
  const WeightStep({super.key, required this.targetWeight, required this.onChanged});
  final int targetWeight;
  final ValueChanged<int> onChanged;

  @override
  State<WeightStep> createState() => _WeightStepState();
}

class _WeightStepState extends State<WeightStep> {
  static const _kgToLb = 2.20462;
  String _unit = 'kg';

  void _adjust(int deltaKg) {
    final min = Profile.weightKg[0];
    final max = Profile.weightKg[1];
    widget.onChanged((widget.targetWeight + deltaKg).clamp(min, max));
  }

  @override
  Widget build(BuildContext context) {
    final w = widget.targetWeight;
    final display = _unit == 'kg' ? w : (w * _kgToLb).round();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading(
          title: "What's your target weight?",
          description: "Used to set your daily calorie target. If you don't have one, leave it at your current weight.",
        ),
        Align(
          alignment: Alignment.centerRight,
          child: Segmented<String>(label: 'Units', options: const [('kg', 'kg'), ('lb', 'lb')], value: _unit, onChanged: (u) => setState(() => _unit = u)),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.whiteA(0.03),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.white30A(0.3)),
          ),
          child: Column(
            children: [
              // Buttons at the ends, the weight in the space between them.
              Row(
                children: [
                  _StepButton(icon: LucideIcons.minus, label: '1 kg less', onTap: w <= Profile.weightKg[0] ? null : () => _adjust(-1)),
                  Expanded(
                    child: Semantics(
                      liveRegion: true,
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text('$display', style: fg(size: 36, weight: FontWeight.w700, features: tabularFigures)),
                            const SizedBox(width: 6),
                            Text(_unit, style: fg(size: 18, weight: FontWeight.w600, color: AppColors.limeLight)),
                          ],
                        ),
                      ),
                    ),
                  ),
                  _StepButton(icon: LucideIcons.plus, label: '1 kg more', onTap: w >= Profile.weightKg[1] ? null : () => _adjust(1)),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (final delta in [-5, 5]) ...[
                    if (delta > 0) const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: () => _adjust(delta),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 36),
                        side: BorderSide(color: AppColors.white30A(0.3)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        foregroundColor: AppColors.white70,
                      ),
                      child: Text('${delta > 0 ? '+$delta' : '$delta'} kg', style: fg(size: 14, weight: FontWeight.w500, color: AppColors.white70)),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({required this.icon, required this.label, this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return TapPadding(
      child: Opacity(
        opacity: onTap == null ? 0.4 : 1,
        child: Semantics(
          button: true,
          enabled: onTap != null,
          label: label,
          child: Material(
            color: Colors.transparent,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: BorderSide(color: AppColors.white30A(0.4))),
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(width: 44, height: 44, child: Icon(icon, size: 20)),
            ),
          ),
        ),
      ),
    );
  }
}
