import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../widgets/ui.dart';
import 'exercise_demos.dart';

/// Plays an [ExerciseDemo] on a loop: a figure moving between its key poses.
/// Shows the demo's key pose without moving when [animate] is false or the
/// system asks for reduced motion.
class ExerciseDemoView extends StatefulWidget {
  const ExerciseDemoView(this.demo, {super.key, required this.color, this.animate = true, this.padding = EdgeInsets.zero});

  final ExerciseDemo demo;
  final Color color;
  final bool animate;

  /// Space to keep clear, e.g. for labels drawn over the demo.
  final EdgeInsets padding;

  @override
  State<ExerciseDemoView> createState() => _ExerciseDemoViewState();
}

class _ExerciseDemoViewState extends State<ExerciseDemoView> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: widget.demo.period);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(ExerciseDemoView old) {
    super.didUpdateWidget(old);
    if (old.demo != widget.demo) {
      _controller.duration = widget.demo.period;
      _controller.value = 0;
    }
    _sync();
  }

  bool get _moving => widget.animate && widget.demo.frames.length > 1 && !MediaQuery.disableAnimationsOf(context);

  void _sync() {
    if (_moving) {
      if (!_controller.isAnimating) _controller.repeat();
    } else {
      _controller.stop();
      _controller.value = widget.demo.stillFrame / widget.demo.frames.length;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      image: true,
      label: 'Demonstration: ${widget.demo.name}',
      child: CustomPaint(
        size: Size.infinite,
        painter: ExerciseDemoPainter(widget.demo, _controller, color: widget.color, padding: widget.padding),
      ),
    );
  }
}

class ExerciseDemoPainter extends CustomPainter {
  ExerciseDemoPainter(this.demo, this.progress, {required this.color, this.padding = EdgeInsets.zero}) : super(repaint: progress);

  final ExerciseDemo demo;
  final Animation<double> progress;
  final Color color;
  final EdgeInsets padding;

  @override
  void paint(Canvas canvas, Size size) {
    final area = padding.deflateRect(Offset.zero & size).deflate(math.min(size.width, size.height) * .06);
    if (area.isEmpty) return;
    final b = demo.bounds;
    // Same figure size across demos: fit a standing person's height, unless
    // the movement needs more room.
    final scale = math.min(area.width / b.width, area.height / math.max(b.height, 112));
    final dx = area.center.dx - b.center.dx * scale;
    final dy = area.bottom - b.bottom * scale - (area.height - b.height * scale).clamp(0, double.infinity) * .12;
    final fig = demo.figureAt(progress.value);

    canvas.save();
    canvas.translate(dx, dy);
    canvas.scale(scale);

    final left = (area.left - dx) / scale, right = (area.right - dx) / scale;
    final hanging = demo.anchor == Anchor.hang;
    final muted = Paint()..color = color.withValues(alpha: .18);

    if (!hanging) {
      // Floor and a soft shadow under the figure.
      canvas.drawLine(Offset(left, 1.5), Offset(right, 1.5), muted..strokeWidth = 1.2);
      final xs = [fig.hip.dx, fig.shoulder.dx, fig.leg1[2].dx, fig.arm1.last.dx];
      final cx = (xs.reduce(math.min) + xs.reduce(math.max)) / 2;
      final w = (xs.reduce(math.max) - xs.reduce(math.min)) / 2 + 14;
      canvas.drawOval(Rect.fromCenter(center: Offset(cx, 1.5), width: w * 2, height: 5), Paint()..color = Colors.black.withValues(alpha: .25));
    }
    _propsBehind(canvas, fig, left, right);

    final far = color.withValues(alpha: demo.front ? 1 : .4);
    if (!demo.front) {
      _limb(canvas, fig.arm2, far);
      _limb(canvas, fig.leg2, far);
    } else {
      _limb(canvas, fig.leg2, far);
    }
    _limb(canvas, fig.leg1, color);
    final torso = Path()
      ..moveTo(fig.hip.dx, fig.hip.dy)
      ..quadraticBezierTo(fig.spine.dx, fig.spine.dy, fig.shoulder.dx, fig.shoulder.dy);
    canvas.drawPath(torso, _stroke(color, 7));
    canvas.drawLine(fig.shoulder, fig.head, _stroke(color, 4));
    canvas.drawCircle(fig.head, headRadius, Paint()..color = color);
    if (demo.front) _limb(canvas, fig.arm2, far);
    _limb(canvas, fig.arm1, color);
    _propsInHand(canvas, fig);

    canvas.restore();
  }

  Paint _stroke(Color c, double w) => Paint()
    ..color = c
    ..strokeWidth = w
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round
    ..style = PaintingStyle.stroke;

  void _limb(Canvas canvas, List<Offset> points, Color c) {
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final p in points.skip(1)) {
      path.lineTo(p.dx, p.dy);
    }
    canvas.drawPath(path, _stroke(c, 5));
  }

  void _propsBehind(Canvas canvas, Figure fig, double left, double right) {
    final gear = Paint()..color = color.withValues(alpha: .35);
    final line = _stroke(color.withValues(alpha: .45), 2.5);
    for (final prop in demo.props) {
      switch (prop) {
        case Prop.bench:
          final top = math.max(fig.hip.dy, fig.shoulder.dy) + 4.5;
          final x0 = math.min(fig.hip.dx, fig.shoulder.dx) - 4, x1 = math.max(fig.hip.dx, fig.shoulder.dx) + 4;
          canvas.drawRRect(RRect.fromLTRBR(x0, top, x1, top + 4, const Radius.circular(2)), gear);
          canvas.drawLine(Offset(x0 + 5, top + 4), Offset(x0 + 5, 0), line);
          canvas.drawLine(Offset(x1 - 5, top + 4), Offset(x1 - 5, 0), line);
        case Prop.dipBench:
          final hand = fig.arm1.last;
          final top = hand.dy + 2.5;
          canvas.drawRRect(RRect.fromLTRBR(hand.dx - 16, top, hand.dx + 6, top + 4, const Radius.circular(2)), gear);
          canvas.drawLine(Offset(hand.dx - 12, top + 4), Offset(hand.dx - 12, 0), line);
          canvas.drawLine(Offset(hand.dx + 2, top + 4), Offset(hand.dx + 2, 0), line);
        case Prop.wall:
          final x = [...fig.leg1, ...fig.leg2].map((o) => o.dx).reduce(math.max) + 5;
          canvas.drawRect(Rect.fromLTRB(x, -120, x + 4, 0), gear);
        case Prop.bar:
          final y = fig.arm1.last.dy - 1;
          canvas.drawLine(Offset(left, y), Offset(right, y), _stroke(color.withValues(alpha: .5), 3));
        case Prop.roller:
          // Under the calves
          final mid = (fig.leg1[1] + fig.leg1[2]) / 2;
          final r = math.max(3.0, -mid.dy / 2 - 1);
          canvas.drawCircle(Offset(mid.dx, -r), r, gear);
        default:
          break;
      }
    }
  }

  void _propsInHand(Canvas canvas, Figure fig) {
    final gear = Paint()..color = color.withValues(alpha: .55);
    final edge = _stroke(color, 1.5);
    for (final prop in demo.props) {
      switch (prop) {
        case Prop.barbell:
          final at = demo.front ? (fig.arm1.last + fig.arm2.last) / 2 : fig.arm1.last;
          canvas.drawCircle(at, 9, gear);
          canvas.drawCircle(at, 9, edge);
          canvas.drawCircle(at, 2, Paint()..color = color);
        case Prop.dumbbells:
          for (final hand in [fig.arm1.last, fig.arm2.last]) {
            canvas.drawCircle(hand, 4, gear);
            canvas.drawCircle(hand, 4, edge);
          }
        case Prop.gloves:
          for (final hand in [fig.arm2.last, fig.arm1.last]) {
            canvas.drawCircle(hand, 4.2, Paint()..color = color);
          }
        case Prop.ball:
          final at = (fig.arm1.last + fig.arm2.last) / 2 + const Offset(1, 3);
          canvas.drawCircle(at, 5.5, gear);
          canvas.drawCircle(at, 5.5, edge);
        default:
          break;
      }
    }
  }

  @override
  bool shouldRepaint(ExerciseDemoPainter old) => old.demo != demo || old.color != color || old.padding != padding;
}

/// A picture of a movement: flips between its frames (start and end
/// position) unless the system asks for reduced motion. [fallback] shows when
/// a frame fails to load.
class DemoPictures extends StatefulWidget {
  const DemoPictures(this.frames, {super.key, this.fallback, this.semanticLabel, this.fit = BoxFit.contain, this.animate = true});

  final List<String> frames;
  final Widget? fallback;
  final String? semanticLabel;
  final BoxFit fit;
  final bool animate;

  @override
  State<DemoPictures> createState() => _DemoPicturesState();
}

class _DemoPicturesState extends State<DemoPictures> {
  Timer? _timer;
  bool _second = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _timer?.cancel();
    _second = false;
    if (widget.animate && widget.frames.length > 1 && !MediaQuery.disableAnimationsOf(context)) {
      _timer = Timer.periodic(const Duration(milliseconds: 1300), (_) => setState(() => _second = !_second));
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final frames = widget.frames;
    if (frames.isEmpty) return widget.fallback ?? const SizedBox.shrink();
    // Light backing: some drawings are dark lines on a transparent background.
    return Semantics(
      image: true,
      label: widget.semanticLabel,
      child: DecoratedBox(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            fit: StackFit.expand,
            children: [
              NetImage(frames.first, fit: widget.fit, fallback: widget.fallback),
              if (frames.length > 1)
                AnimatedOpacity(
                  opacity: _second ? 1 : 0,
                  duration: const Duration(milliseconds: 250),
                  child: NetImage(frames[1], fit: widget.fit, fallback: widget.fallback),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
