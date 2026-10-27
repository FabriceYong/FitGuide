import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import 'ui.dart';

/// Body regions for the muscle filter (features/dashboard/muscles.ts).
const regions = ['Shoulders', 'Chest', 'Arms', 'Core', 'Back', 'Legs'];

const _regionMuscles = {
  'Shoulders': ['Shoulders'],
  'Chest': ['Chest'],
  'Arms': ['Arms', 'Biceps', 'Triceps'],
  'Core': ['Core', 'Abs', 'Obliques', 'Hip Flexors'],
  'Back': ['Back', 'Upper Back', 'Lower Back', 'Spine', 'Posterior Chain'],
  'Legs': ['Legs', 'Glutes', 'Quads', 'Hamstrings', 'Calves', 'Hips'],
};

/// Whether a muscle list works any of the regions ("Full Body" works them all).
bool worksRegions(List<String> muscles, List<String> selected) {
  if (selected.isEmpty) return true;
  if (muscles.contains('Full Body')) return true;
  return selected.any((r) => (_regionMuscles[r] ?? const []).any(muscles.contains));
}

const _front = [
  ('Shoulders', 'M74,58 C66,62 60,70 60,78 L72,82 L76,64 Z'),
  ('Shoulders', 'M126,58 C134,62 140,70 140,78 L128,82 L124,64 Z'),
  ('Chest', 'M78,64 L122,64 C122,64 124,84 120,94 L80,94 C76,84 78,64 78,64 Z'),
  ('Core', 'M80,97 L120,97 L114,136 L86,136 Z'),
  ('Arms', 'M58,82 L52,115 L44,115 L50,82 Z'),
  ('Arms', 'M43,117 L38,145 L32,143 L37,117 Z'),
  ('Arms', 'M142,82 L148,115 L156,115 L150,82 Z'),
  ('Arms', 'M157,117 L162,145 L168,143 L163,117 Z'),
  ('Legs', 'M85,142 L99,142 L97,215 L78,215 Z'),
  ('Legs', 'M79,222 L95,222 L91,285 C91,285 80,287 77,290 Z'),
  ('Legs', 'M115,142 L101,142 L103,215 L122,215 Z'),
  ('Legs', 'M121,222 L105,222 L109,285 C109,285 120,287 123,290 Z'),
];
const _back = [
  ('Shoulders', 'M74,58 C66,62 60,70 60,78 L72,82 L76,64 Z'),
  ('Shoulders', 'M126,58 C134,62 140,70 140,78 L128,82 L124,64 Z'),
  ('Back', 'M78,64 L122,64 C122,64 126,88 116,108 L84,108 C74,88 78,64 78,64 Z'),
  ('Back', 'M84,111 L116,111 L114,136 L86,136 Z'),
  ('Legs', 'M85,138 L115,138 L120,165 L80,165 Z'),
  ('Arms', 'M58,82 L52,115 L44,115 L50,82 Z'),
  ('Arms', 'M43,117 L38,145 L32,143 L37,117 Z'),
  ('Arms', 'M142,82 L148,115 L156,115 L150,82 Z'),
  ('Arms', 'M157,117 L162,145 L168,143 L163,117 Z'),
  ('Legs', 'M85,168 L99,168 L97,222 L78,222 Z'),
  ('Legs', 'M79,228 L95,228 L91,285 C91,285 80,287 77,290 Z'),
  ('Legs', 'M115,168 L101,168 L103,222 L122,222 Z'),
  ('Legs', 'M121,228 L105,228 L109,285 C109,285 120,287 123,290 Z'),
];

/// Muscle-region filter: toggle buttons, with a body figure that lights up
/// the picks (dashboard/components/BodyMap.tsx).
class BodyMap extends StatefulWidget {
  const BodyMap({super.key, required this.selected, required this.onToggle, required this.onClear});
  final List<String> selected;
  final ValueChanged<String> onToggle;
  final VoidCallback onClear;

  @override
  State<BodyMap> createState() => _BodyMapState();
}

class _BodyMapState extends State<BodyMap> {
  String _view = 'front';

  String _svg() {
    final paths = _view == 'front' ? _front : _back;
    const outline = 'fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" stroke-width="1"';
    final buffer = StringBuffer('<svg viewBox="0 0 200 320" xmlns="http://www.w3.org/2000/svg">')
      ..write('<circle cx="100" cy="30" r="16" $outline/>')
      ..write('<path d="M92,46 L108,46 L106,58 L94,58 Z" $outline/>');
    for (final (region, d) in paths) {
      final on = widget.selected.contains(region);
      buffer.write(on
          ? '<path d="$d" fill="#00C4B4" stroke="#0A0C10" stroke-width="1.5"/>'
          : '<path d="$d" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>');
    }
    buffer.write('</svg>');
    return buffer.toString();
  }

  Widget _toggle(String label, bool on, VoidCallback onTap, {bool filled = true}) {
    final toggle = Semantics(
      button: true,
      selected: on,
      child: Material(
        color: on ? (filled ? AppColors.limeLight : AppColors.whiteA(0.15)) : (filled ? AppColors.whiteA(0.05) : Colors.transparent),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: filled ? BorderSide(color: on ? AppColors.limeLight : AppColors.white30A(0.2)) : BorderSide.none,
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Text(label, style: fg(size: 12, weight: FontWeight.w700, color: on ? (filled ? AppColors.noirEclipse : AppColors.white) : AppColors.white70)),
          ),
        ),
      ),
    );
    return TapPadding(child: toggle);
  }

  @override
  Widget build(BuildContext context) {
    final controls = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.target, size: 20, color: AppColors.limeLight),
            const SizedBox(width: 8),
            Flexible(child: Text('Target muscles', style: fg(size: 18, weight: FontWeight.w700))),
          ],
        ),
        const SizedBox(height: 16),
        Text('Pick one or more areas. Full-body workouts count for every area.', style: fg(size: 12, color: AppColors.white70)),
        const SizedBox(height: 16),
        Semantics(
          label: 'Muscle areas',
          container: true,
          child: Wrap(spacing: 8, children: [for (final r in regions) _toggle(r, widget.selected.contains(r), () => widget.onToggle(r))]),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: [
                  _toggle('Front', _view == 'front', () => setState(() => _view = 'front'), filled: false),
                  _toggle('Back', _view == 'back', () => setState(() => _view = 'back'), filled: false),
                ],
              ),
            ),
            const SizedBox(width: 12),
            if (widget.selected.isNotEmpty)
              TapPadding(
                child: InkWell(
                  onTap: widget.onClear,
                  child: Row(
                    children: [
                      const Icon(LucideIcons.rotateCcw, size: 12, color: AppColors.red300),
                      const SizedBox(width: 4),
                      Text('Clear', style: fg(size: 12, weight: FontWeight.w600, color: AppColors.red300)),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ],
    );
    final figure = ExcludeSemantics(
      child: Container(
        width: 192,
        height: 288,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.noirEclipse.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.white30A(0.1)),
        ),
        child: SvgPicture.string(_svg(), key: ValueKey('$_view${widget.selected.join()}')),
      ),
    );
    final wide = atLeast(context, Breakpoints.md);
    return Container(
      padding: EdgeInsets.all(wide ? 24 : 20),
      decoration: BoxDecoration(color: AppColors.obsidianWave, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.white30A(0.2))),
      // The figure beside the controls on a tablet, under them on a phone.
      child: wide
          ? Row(children: [Expanded(child: controls), const SizedBox(width: 24), figure])
          : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [controls, const SizedBox(height: 16), Center(child: figure)]),
    );
  }
}
