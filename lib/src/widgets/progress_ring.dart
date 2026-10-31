import 'dart:math' as math;

import 'package:flutter/material.dart';

/// A ring that fills with progress toward a goal (steps, calories, protein),
/// with [child] in the middle (components/ProgressRing.tsx). Over the goal it
/// stays full. Decorative: say the numbers in text or a semantics label.
class ProgressRing extends StatelessWidget {
  const ProgressRing({super.key, required this.value, required this.goal, required this.color, this.size = 96, this.stroke = 9, this.child});
  final double value;
  final double goal;
  final Color color;
  final double size;
  final double stroke;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final fraction = goal > 0 ? (value / goal).clamp(0.0, 1.0) : 0.0;
    return SizedBox.square(
      dimension: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: fraction),
            duration: const Duration(milliseconds: 800),
            curve: Curves.easeOut,
            builder: (context, v, _) => CustomPaint(size: Size.square(size), painter: _RingPainter(v, color, stroke)),
          ),
          if (child != null) Padding(padding: EdgeInsets.all(stroke + 4), child: FittedBox(fit: BoxFit.scaleDown, child: child)),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.fraction, this.color, this.stroke);
  final double fraction;
  final Color color;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(stroke / 2, stroke / 2, size.width - stroke, size.height - stroke);
    final track = Paint()
      ..color = Colors.white.withValues(alpha: 0.08)
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    canvas.drawArc(rect, 0, math.pi * 2, false, track);
    if (fraction <= 0) return;
    final arc = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, -math.pi / 2, math.pi * 2 * fraction, false, arc);
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.fraction != fraction || old.color != color || old.stroke != stroke;
}
