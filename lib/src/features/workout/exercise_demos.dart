import 'dart:math' as math;
import 'dart:ui';

import '../../models/catalog.dart';

/// Animated demonstrations for workout steps, drawn by the app so every
/// movement has one that matches it, with no network or licensing needed.
///
/// A demo is a few key poses of a stick figure. Angles are in degrees:
/// 0 points down, 90 forward (the way the figure faces), 180 up, -90 back.
/// Side-view figures face right; front-view ones face the viewer.

typedef Limb = (double, double);

/// One key pose. [t] torso (hip to shoulders), [h] head turn from the torso,
/// [c] spine curve (+ rounds the back, - arches it), [a1]/[a2] near/far arm
/// (upper arm, forearm), [l1]/[l2] near/far leg (thigh, shin). In front view
/// 1 is the limb on the viewer's left. [lift] raises the figure off the floor
/// (a jump); [pt] points the toes; [f] fixes the foot angle (90 = flat).
class Pose {
  const Pose({
    this.t = 180,
    this.h = 0,
    this.c = 0,
    this.a1 = (8, 14),
    this.a2 = (-6, 2),
    this.l1 = (0, 0),
    this.l2 = (0, 0),
    this.lift = 0,
    this.pt = false,
    this.f,
  });

  final double t, h, c, lift;
  final Limb a1, a2, l1, l2;
  final bool pt;
  final double? f;

  static double _l(double a, double b, double x) => a + (b - a) * x;
  static Limb _ll(Limb a, Limb b, double x) => (_l(a.$1, b.$1, x), _l(a.$2, b.$2, x));

  static Pose lerp(Pose a, Pose b, double x) => Pose(
        t: _l(a.t, b.t, x),
        h: _l(a.h, b.h, x),
        c: _l(a.c, b.c, x),
        a1: _ll(a.a1, b.a1, x),
        a2: _ll(a.a2, b.a2, x),
        l1: _ll(a.l1, b.l1, x),
        l2: _ll(a.l2, b.l2, x),
        lift: _l(a.lift, b.lift, x),
        pt: x < .5 ? a.pt : b.pt,
        f: a.f != null && b.f != null ? _l(a.f!, b.f!, x) : (x < .5 ? a.f : b.f),
      );
}

/// Which point stays put while the figure moves.
enum Anchor { foot, farFoot, hand, hip, hang }

/// Equipment drawn with the figure.
enum Prop { barbell, dumbbells, bench, dipBench, wall, bar, roller, ball, gloves }

class ExerciseDemo {
  const ExerciseDemo(
    this.name,
    this.frames, {
    this.patterns = const [],
    this.weak = false,
    this.front = false,
    this.anchor = Anchor.foot,
    this.beat = .9,
    this.hold = .3,
    this.props = const {},
    this.still,
  });

  final String name;
  final List<Pose> frames;

  /// Regular expressions (case-insensitive) that name this movement.
  final List<String> patterns;

  /// Only used when no other demo matches (e.g. a plain "stretch").
  final bool weak;
  final bool front;
  final Anchor anchor;

  /// Seconds from one key pose to the next, and the share of that spent
  /// holding the pose.
  final double beat, hold;
  final Set<Prop> props;

  /// The key pose to show when not animating.
  final int? still;

  int get stillFrame => still ?? (frames.length > 1 ? 1 : 0);
  Duration get period => Duration(milliseconds: (beat * frames.length * 1000).round());

  /// The pose at [progress] (0..1) through one loop of the key poses.
  Pose poseAt(double progress) {
    if (frames.length == 1) return frames.first;
    final n = frames.length;
    final p = (progress % 1) * n;
    final i = p.floor() % n;
    final local = p - p.floor();
    final x = local <= hold ? 0.0 : _ease((local - hold) / (1 - hold));
    return Pose.lerp(frames[i], frames[(i + 1) % n], x);
  }

  static double _ease(double x) => x < .5 ? 2 * x * x : 1 - math.pow(-2 * x + 2, 2) / 2;

  Figure figureAt(double progress) => Figure.of(poseAt(progress), this);

  /// Everything the figure covers over a loop, for fitting it to the canvas.
  Rect get bounds => _bounds[name] ??= () {
        Rect? r;
        for (var i = 0; i <= 64; i++) {
          final b = figureAt(i / 64).bounds;
          r = r == null ? b : r.expandToInclude(b);
        }
        return r!;
      }();

  static final _bounds = <String, Rect>{};
}

// ─── Geometry ────────────────────────────────────────────────────────────────

const torsoLength = 30.0, neckLength = 3.0, headRadius = 7.0;
const upperArm = 17.0, forearm = 17.0, thigh = 26.0, shin = 26.0, footLength = 6.0;
const _shoulderHalf = 7.0, _hipHalf = 4.5;

Offset _dir(double deg) {
  final r = deg * math.pi / 180;
  return Offset(math.sin(r), math.cos(r));
}

/// A posed figure in world units: hip at the origin before placing, then
/// moved so it stands on the floor (y = 0, up is negative) or hangs from a bar.
class Figure {
  Figure._(this.hip, this.shoulder, this.spine, this.head, this.arm1, this.arm2, this.leg1, this.leg2);

  factory Figure.of(Pose p, ExerciseDemo demo) {
    final front = demo.front;
    final up = _dir(p.t);
    final side = _dir(p.t - 90);
    const hip = Offset.zero;
    final shoulder = up * torsoLength;
    final spine = shoulder / 2 - side * (p.c * 2);
    final head = shoulder + _dir(p.t + p.h) * (neckLength + headRadius);

    List<Offset> arm(Limb a, double s) {
      final root = front ? shoulder + side * (_shoulderHalf * s) : shoulder;
      final elbow = root + _dir(a.$1) * upperArm;
      return [root, elbow, elbow + _dir(a.$2) * forearm];
    }

    List<Offset> leg(Limb l, double s) {
      final root = front ? hip + side * (_hipHalf * s) : hip;
      final knee = root + _dir(l.$1) * thigh;
      final ankle = knee + _dir(l.$2) * shin;
      final foot = front ? 90 * s : (p.f ?? (p.pt ? l.$2 : l.$2 + 90));
      return [root, knee, ankle, ankle + _dir(foot) * (front ? footLength * .6 : footLength)];
    }

    final figure = Figure._(hip, shoulder, spine, head, arm(p.a1, -1), arm(p.a2, 1), leg(p.l1, -1), leg(p.l2, 1));

    final Offset shift;
    if (demo.anchor == Anchor.hang) {
      shift = -figure.arm1.last;
    } else {
      final pin = switch (demo.anchor) {
        Anchor.farFoot => figure.leg2[2],
        Anchor.hand => figure.arm1.last,
        Anchor.hip => figure.hip,
        _ => figure.leg1[2],
      };
      shift = Offset(-pin.dx, -figure.lowest - p.lift);
    }
    return figure._moved(shift);
  }

  final Offset hip, shoulder, spine, head;
  final List<Offset> arm1, arm2, leg1, leg2;

  Iterable<Offset> get _points => [hip, shoulder, ...arm1, ...arm2, ...leg1, ...leg2];

  double get lowest => math.max(_points.map((o) => o.dy).reduce(math.max), head.dy + headRadius);

  Rect get bounds {
    var r = Rect.fromCircle(center: head, radius: headRadius);
    for (final o in _points) {
      r = r.expandToInclude(Rect.fromCircle(center: o, radius: 3));
    }
    return r;
  }

  Figure _moved(Offset d) => Figure._(
        hip + d,
        shoulder + d,
        spine + d,
        head + d,
        [for (final o in arm1) o + d],
        [for (final o in arm2) o + d],
        [for (final o in leg1) o + d],
        [for (final o in leg2) o + d],
      );
}

// ─── Matching ────────────────────────────────────────────────────────────────

final _compiled = <ExerciseDemo, List<RegExp>>{};

List<RegExp> _regexps(ExerciseDemo d) => _compiled[d] ??= [for (final p in d.patterns) RegExp(p, caseSensitive: false)];

/// The demo for a step, or null when none fits (better nothing than a wrong one).
ExerciseDemo? demoForStep(WorkoutStep step) => matchDemo(step.exerciseName, step.instruction);

/// Looks at the exercise name, then the instruction's title ("Mountain
/// Climbers: Start in plank...") and then the rest of it. Within a text the
/// earliest mention wins, then the longest ("side plank" over "plank").
ExerciseDemo? matchDemo(String? name, String instruction) {
  final text = instruction.trim();
  final colon = text.indexOf(':');
  final hasTitle = colon > 0 && colon < 70;
  final texts = [
    if (name != null && name.trim().isNotEmpty) name,
    if (hasTitle) text.substring(0, colon),
    hasTitle ? text.substring(colon + 1) : text,
  ];
  for (final weak in [false, true]) {
    for (final t in texts) {
      ExerciseDemo? best;
      var at = 1 << 30, length = 0;
      for (final demo in exerciseDemos) {
        if (demo.weak != weak) continue;
        for (final re in _regexps(demo)) {
          final m = re.firstMatch(t);
          if (m == null) continue;
          final len = m.end - m.start;
          if (m.start < at || (m.start == at && len > length)) {
            best = demo;
            at = m.start;
            length = len;
          }
        }
      }
      if (best != null) return best;
    }
  }
  return null;
}

// ─── Poses ───────────────────────────────────────────────────────────────────

// Side view
const _stand = Pose();
const _prayer = Pose(a1: (20, 140), a2: (20, 140));
const _armsUp = Pose(t: 186, c: -2, h: 12, a1: (172, 176), a2: (170, 174));
const _fold = Pose(t: 25, c: 3, h: -5, a1: (-45, 40), a2: (-45, 40));
const _halfLift = Pose(t: 60, h: 25, a1: (-35, -65), a2: (-35, -65));
const _plank = Pose(t: 114.5, h: -5, a1: (0, 0), a2: (0, 0), l1: (-65.5, -65.5), l2: (-65.5, -65.5));
const _plankLow = Pose(t: 102.5, h: -5, a1: (-70, 45), a2: (-70, 45), l1: (-77.5, -77.5), l2: (-77.5, -77.5));
const _forearmPlank = Pose(t: 102, h: -5, a1: (0, 90), a2: (0, 90), l1: (-78, -78), l2: (-78, -78));
const _upDog = Pose(t: 146, c: -3, h: 15, a1: (0, 0), a2: (0, 0), l1: (-87, -87), l2: (-87, -87), pt: true);
const _downDog = Pose(t: 43, a1: (43, 43), a2: (43, 43), l1: (-25, -25), l2: (-25, -25), f: 70);
const _crouch = Pose(t: 130, h: 30, c: 2, a1: (5, 5), a2: (5, 5), l1: (110, -30), l2: (110, -30), f: 90);
const _jump = Pose(t: 182, a1: (172, 176), a2: (170, 174), lift: 12, pt: true);
const _squat = Pose(t: 145, h: 20, a1: (90, 92), a2: (90, 92), l1: (85, -25), l2: (85, -25), f: 90);
const _lunge = Pose(a1: (10, 30), a2: (-10, 10), l1: (80, 0), l2: (-15, -90));
const _table = Pose(t: 105.5, a1: (0, 0), a2: (0, 0), l1: (0, -90), l2: (0, -90), pt: true);
const _supine = Pose(t: -90, a1: (85, 90), a2: (85, 90), l1: (90, 90), l2: (90, 90));
const _supineKnees = Pose(t: -90, a1: (85, 90), a2: (85, 90), l1: (140, 15), l2: (140, 15));
const _prone = Pose(t: 93, a1: (-140, 30), a2: (-140, 30), l1: (-90, -90), l2: (-90, -90), pt: true);
const _seated = Pose(t: 180, a1: (15, 75), a2: (15, 75), l1: (82, -96), l2: (88, -84));
const _hinge = Pose(t: 95, h: 15, a1: (0, 0), a2: (0, 0), l1: (18, -5), l2: (18, -5), f: 90);

// Front view
const _fStand = Pose(a1: (-8, -4), a2: (8, 4));
const _fWarrior = Pose(a1: (-90, -90), a2: (90, 90), l1: (-48, -48), l2: (70, 0));
const _fSidePlank = Pose(t: 102, a1: (180, 180), a2: (0, 90), l1: (-78, -78), l2: (-78, -78));

const exerciseDemos = <ExerciseDemo>[
  // Standing and yoga
  ExerciseDemo('Mountain pose', [_stand, _prayer], patterns: [r'mountain pose', r'tadasana', r'heart cent(er|re)'], beat: 1.6, hold: .5),
  ExerciseDemo('Raised arms', [_stand, _armsUp], patterns: [r'rais(e|ed) (your )?arms', r'arms overhead', r'sweep(ing)? (your )?arms', r'upward salute'], beat: 1.4, hold: .4),
  ExerciseDemo('Forward fold', [_stand, _fold], patterns: [r'forward fold', r'fold forward', r'uttanasana'], beat: 1.5, hold: .45, still: 1),
  ExerciseDemo('Half lift', [_fold, _halfLift], patterns: [r'half lift', r'lift halfway', r'ardha'], beat: 1.4, hold: .45),
  ExerciseDemo('Sun salutation', [_prayer, _armsUp, _fold, _halfLift, _plank, _plankLow, _upDog, _downDog], patterns: [r'sun salutation', r'surya namaskar'], anchor: Anchor.hand, beat: 1.1, hold: .35, still: 7),
  ExerciseDemo('Crescent lunge', [
    Pose(a1: (176, 178), a2: (174, 176), l1: (80, 0), l2: (-15, -90)),
    Pose(c: -1.5, h: 10, a1: (178, 180), a2: (176, 178), l1: (84, 0), l2: (-18, -92)),
  ], patterns: [r'crescent'], beat: 1.6, hold: .4, anchor: Anchor.farFoot),
  ExerciseDemo('Lunge', [_stand, _lunge], patterns: [r'\blunges?\b'], beat: .9, anchor: Anchor.farFoot),
  ExerciseDemo('Warrior I', [
    Pose(t: 182, a1: (176, 178), a2: (174, 176), l1: (60, 0), l2: (-41, -41), f: 90),
    Pose(t: 184, c: -1.5, h: 10, a1: (178, 180), a2: (176, 178), l1: (60, 0), l2: (-41, -41), f: 90),
  ], patterns: [r'warrior (i|1|one)\b'], beat: 1.6, hold: .4, anchor: Anchor.farFoot),
  ExerciseDemo('Warrior II', [
    _fWarrior,
    Pose(a1: (-92, -90), a2: (92, 90), l1: (-50, -50), l2: (75, 0)),
  ], patterns: [r'warrior (ii|2|two)\b'], front: true, beat: 1.6, hold: .4, anchor: Anchor.hip),
  ExerciseDemo('Side angle & reverse warrior', [
    Pose(t: 125, a1: (125, 125), a2: (20, 50), l1: (-48, -48), l2: (70, 0)),
    Pose(t: 205, a1: (-20, -15), a2: (200, 200), l1: (-48, -48), l2: (70, 0)),
  ], patterns: [r'side angle', r'reverse warrior'], front: true, beat: 1.6, hold: .4, anchor: Anchor.hip),
  ExerciseDemo('Triangle pose', [
    Pose(t: 100, a1: (180, 180), a2: (0, 0), l1: (-32, -32), l2: (32, 32)),
    Pose(t: 260, a1: (360, 360), a2: (180, 180), l1: (-32, -32), l2: (32, 32)),
  ], patterns: [r'triangle', r'trikonasana'], front: true, beat: 1.8, hold: .45, anchor: Anchor.hip),
  ExerciseDemo('Tree pose', [
    Pose(a1: (-40, 100), a2: (40, -100), l2: (60, -80)),
    Pose(a1: (-195, 170), a2: (195, -170), l2: (60, -80)),
  ], patterns: [r'tree pose', r'vrikshasana'], front: true, beat: 1.6, hold: .45, anchor: Anchor.foot),
  ExerciseDemo('Neck rolls', [
    Pose(h: -35, a1: (-8, -4), a2: (8, 4)),
    Pose(h: 35, a1: (-8, -4), a2: (8, 4)),
  ], patterns: [r'neck rolls?', r'shoulder (circles|rolls)'], front: true, beat: 1.4, hold: .2),
  ExerciseDemo('Seated breathing', [
    _seated,
    Pose(t: 179, c: -1.2, a1: (16, 76), a2: (16, 76), l1: (82, -96), l2: (88, -84)),
  ], patterns: [r'centering', r'pranayama', r'breath awareness', r'diaphragmatic', r'meditat'], beat: 2.2, hold: .3, anchor: Anchor.hip),
  ExerciseDemo('Leg swings', [
    Pose(a1: (85, 88), a2: (80, 85), l1: (50, 45)),
    Pose(a1: (85, 88), a2: (80, 85), l1: (-35, -35)),
  ], patterns: [r'leg swings?', r'mobility', r'hip circles?'], beat: .7, hold: .1, anchor: Anchor.farFoot),
  ExerciseDemo('Quad stretch', [
    Pose(a1: (-15, -12), a2: (85, 90), l1: (-12, -158)),
    Pose(c: -1, a1: (-15, -12), a2: (150, 160), l1: (-12, -158)),
  ], patterns: [r'\bquads?\b', r'hip flexors?', r'calf stretch', r'lower body stretch'], beat: 1.6, hold: .4, anchor: Anchor.farFoot),
  ExerciseDemo('Chest opener', [
    Pose(a1: (-30, -20), a2: (-30, -20)),
    Pose(c: -2, h: 8, a1: (-55, -50), a2: (-55, -50)),
  ], patterns: [r'chest opener', r'doorway', r'cross[- ]body'], beat: 1.5, hold: .4),
  ExerciseDemo('Standing stretch', [
    Pose(t: 165, a1: (160, 165), a2: (168, 160), l1: (-6, -6), l2: (6, 6)),
    Pose(t: 195, a1: (192, 200), a2: (200, 195), l1: (-6, -6), l2: (6, 6)),
  ], patterns: [r'stretch'], weak: true, front: true, beat: 1.6, hold: .4, anchor: Anchor.hip),

  // Cardio
  ExerciseDemo('March in place', [
    Pose(a1: (-30, -10), a2: (35, 70), l1: (70, 0)),
    Pose(a1: (35, 70), a2: (-30, -10), l2: (70, 0)),
  ], patterns: [r'\bmarch(ing)?\b'], beat: .55, hold: .2, anchor: Anchor.hip),
  ExerciseDemo('Warm-up march', [
    Pose(a1: (-30, -10), a2: (35, 70), l1: (70, 0)),
    Pose(a1: (35, 70), a2: (-30, -10), l2: (70, 0)),
  ], patterns: [r'warm[- ]?up'], weak: true, beat: .55, hold: .2, anchor: Anchor.hip),
  ExerciseDemo('Walk', [
    Pose(a1: (-20, -10), a2: (25, 45), l1: (22, 5), l2: (-22, -35)),
    Pose(a1: (25, 45), a2: (-20, -10), l1: (-22, -35), l2: (22, 5)),
  ], patterns: [r'\bwalk(ing|s)?\b'], beat: .6, hold: 0, anchor: Anchor.hip),
  ExerciseDemo('Jog', [
    Pose(t: 170, a1: (-40, 60), a2: (40, 150), l1: (45, -15), l2: (-25, -90), lift: 3),
    Pose(t: 170, a1: (40, 150), a2: (-40, 60), l1: (-25, -90), l2: (45, -15), lift: 3),
  ], patterns: [r'\bjog', r'\brun(s|ning)?\b', r'\bsprint'], beat: .4, hold: 0, anchor: Anchor.hip),
  ExerciseDemo('High knees', [
    Pose(t: 175, a1: (-45, 45), a2: (50, 150), l1: (95, 0), lift: 2),
    Pose(t: 175, a1: (50, 150), a2: (-45, 45), l2: (95, 0), lift: 2),
  ], patterns: [r'high knees?'], beat: .3, hold: .05, anchor: Anchor.hip),
  ExerciseDemo('Butt kicks', [
    Pose(t: 175, a1: (30, 120), a2: (-40, 40), l1: (-5, -165), lift: 2),
    Pose(t: 175, a1: (-40, 40), a2: (30, 120), l2: (-5, -165), lift: 2),
  ], patterns: [r'butt kicks?', r'heel kicks?'], beat: .3, hold: .05, anchor: Anchor.hip),
  ExerciseDemo('Jumping jacks', [
    Pose(a1: (-10, -6), a2: (10, 6)),
    Pose(a1: (-165, -170), a2: (165, 170), l1: (-22, -22), l2: (22, 22)),
  ], patterns: [r'jumping jacks?', r'star jumps?'], front: true, beat: .35, hold: .1, anchor: Anchor.hip),
  ExerciseDemo('Skater hops', [
    Pose(t: 195, a1: (-120, -130), a2: (-30, -40), l1: (-25, 10), l2: (-30, -50)),
    Pose(t: 165, a1: (30, 40), a2: (120, 130), l1: (30, 50), l2: (25, -10)),
  ], patterns: [r'skaters?'], front: true, beat: .5, hold: .15, anchor: Anchor.hip),
  ExerciseDemo('Lateral shuffle', [
    Pose(t: 180, a1: (-30, 40), a2: (30, -40), l1: (-35, -5), l2: (35, 5)),
    Pose(t: 180, a1: (-30, 40), a2: (30, -40), l1: (-15, 0), l2: (15, 0)),
  ], patterns: [r'shuffles?'], front: true, beat: .3, hold: .1, anchor: Anchor.hip),
  ExerciseDemo('Fast feet', [
    Pose(t: 150, h: 25, a1: (40, 120), a2: (40, 120), l1: (55, -20), l2: (40, -25), lift: 1),
    Pose(t: 150, h: 25, a1: (40, 120), a2: (40, 120), l1: (40, -25), l2: (55, -20), lift: 1),
  ], patterns: [r'fast feet'], beat: .2, hold: 0, anchor: Anchor.hip),
  ExerciseDemo('Shadow boxing', [
    Pose(t: 175, a1: (25, 160), a2: (20, 165), l1: (18, 0), l2: (-18, -10)),
    Pose(t: 172, a1: (92, 92), a2: (20, 165), l1: (18, 0), l2: (-18, -10)),
    Pose(t: 175, a1: (25, 160), a2: (20, 165), l1: (18, 0), l2: (-18, -10)),
    Pose(t: 168, a1: (25, 160), a2: (92, 92), l1: (18, 0), l2: (-18, -10)),
  ], patterns: [r'shadow ?box', r'\bjabs?\b', r'\bpunch', r'boxing'], props: {Prop.gloves}, beat: .32, hold: .25, anchor: Anchor.farFoot),
  ExerciseDemo('Burpee', [_stand, _crouch, _plank, _crouch, _jump], patterns: [r'burpees?', r'tabata', r'all[- ]out'], beat: .45, hold: .15, anchor: Anchor.hip, still: 2),
  ExerciseDemo('Mountain climbers', [
    Pose(t: 114.5, h: -5, a1: (0, 0), a2: (0, 0), l1: (55, -95), l2: (-65.5, -65.5)),
    Pose(t: 114.5, h: -5, a1: (0, 0), a2: (0, 0), l1: (-65.5, -65.5), l2: (55, -95)),
  ], patterns: [r'mountain climbers?'], beat: .35, hold: .1, anchor: Anchor.hand),

  // Lower body
  ExerciseDemo('Squat', [_stand, _squat], patterns: [r'\bsquats?\b'], beat: .9),
  ExerciseDemo('Barbell back squat', [
    Pose(a1: (-45, 160), a2: (-45, 160)),
    Pose(t: 140, h: 25, a1: (-85, 120), a2: (-85, 120), l1: (85, -25), l2: (85, -25), f: 90),
  ], patterns: [r'back squats?', r'barbell squats?'], props: {Prop.barbell}, beat: 1),
  ExerciseDemo('Jump squat', [
    Pose(t: 145, h: 20, a1: (-40, -30), a2: (-40, -30), l1: (85, -25), l2: (85, -25), f: 90),
    Pose(t: 178, a1: (150, 160), a2: (150, 160), lift: 12, pt: true),
  ], patterns: [r'jump squats?', r'squat jumps?'], beat: .5, hold: .15),
  ExerciseDemo('Romanian deadlift', [
    Pose(a1: (0, 0), a2: (0, 0)),
    _hinge,
  ], patterns: [r'romanian', r'\brdls?\b', r'deadlifts?'], props: {Prop.barbell}, beat: 1.1),
  ExerciseDemo('Glute bridge', [
    _supineKnees,
    Pose(t: -50, a1: (90, 90), a2: (90, 90), l1: (105, 0), l2: (105, 0)),
  ], patterns: [r'bridges?\b', r'setu bandha', r'hip thrusts?'], beat: .9),

  // Upper body
  ExerciseDemo('Push-up', [_plank, _plankLow], patterns: [r'push[- ]?ups?', r'press[- ]?ups?'], anchor: Anchor.hand, beat: .8),
  ExerciseDemo('Chaturanga', [_plank, _plankLow], patterns: [r'chaturanga', r'four[- ]limbed'], anchor: Anchor.hand, beat: 1.4, hold: .45),
  ExerciseDemo('Bench press', [
    Pose(t: -90, a1: (15, 175), a2: (15, 175), l1: (90, 0), l2: (90, 0)),
    Pose(t: -90, a1: (178, 180), a2: (178, 180), l1: (90, 0), l2: (90, 0)),
  ], patterns: [r'bench press', r'chest press'], props: {Prop.bench, Prop.barbell}, beat: .9),
  ExerciseDemo('Bent-over row', [
    Pose(t: 110, h: 20, a1: (0, 0), a2: (0, 0), l1: (20, -5), l2: (20, -5), f: 90),
    Pose(t: 110, h: 20, a1: (-70, 10), a2: (-70, 10), l1: (20, -5), l2: (20, -5), f: 90),
  ], patterns: [r'bent[- ]over', r'\brows?\b'], props: {Prop.barbell}, beat: .9),
  ExerciseDemo('Overhead press', [
    Pose(a1: (25, 165), a2: (25, 165)),
    Pose(a1: (178, 180), a2: (178, 180)),
  ], patterns: [r'overhead( \w+){0,4} press', r'shoulder press', r'military press'], props: {Prop.barbell}, beat: .9),
  ExerciseDemo('Pull-up', [
    Pose(a1: (180, 180), a2: (180, 180), l1: (5, -15), l2: (10, -25)),
    Pose(a1: (40, 175), a2: (40, 175), l1: (5, -15), l2: (10, -25)),
  ], patterns: [r'pull[- ]?ups?', r'pull[- ]?downs?', r'chin[- ]?ups?'], props: {Prop.bar}, anchor: Anchor.hang, beat: 1),
  ExerciseDemo('Lateral raise', [
    _fStand,
    Pose(a1: (-85, -88), a2: (85, 88)),
  ], patterns: [r'lateral raises?', r'side raises?'], props: {Prop.dumbbells}, front: true, beat: .9),
  ExerciseDemo('Biceps curl', [
    Pose(a1: (0, 0), a2: (0, 0)),
    Pose(a1: (5, 165), a2: (5, 165)),
  ], patterns: [r'bicep', r'\bcurls?\b'], props: {Prop.dumbbells}, beat: .8),
  ExerciseDemo('Triceps dip', [
    Pose(a1: (-12, -12), a2: (-12, -12), l1: (90, 0), l2: (90, 0), f: 90),
    Pose(a1: (-75, 15), a2: (-75, 15), l1: (115, 0), l2: (115, 0), f: 90),
  ], patterns: [r'tricep\w* dips?', r'\bdips\b', r'bench dips?'], props: {Prop.dipBench}, anchor: Anchor.hand, beat: .9),
  ExerciseDemo('Overhead triceps extension', [
    Pose(a1: (178, 178), a2: (178, 178)),
    Pose(a1: (178, 345), a2: (178, 345)),
  ], patterns: [r'overhead (tricep\w* )?extensions?', r'skull ?crushers?'], props: {Prop.dumbbells}, beat: .9),
  ExerciseDemo('Face pull', [
    Pose(a1: (85, 90), a2: (85, 90)),
    Pose(a1: (-80, 110), a2: (-80, 110)),
  ], patterns: [r'face pulls?', r'rear delt'], beat: .9),

  // Floor and core
  ExerciseDemo('Plank', [
    _plank,
    Pose(t: 113, c: .8, h: -5, a1: (0, 0), a2: (0, 0), l1: (-64, -64), l2: (-64, -64)),
  ], patterns: [r'\bplank\b', r'plank pose', r'high plank'], anchor: Anchor.hand, beat: 1.8, hold: .3),
  ExerciseDemo('Forearm plank', [
    _forearmPlank,
    Pose(t: 101, c: .8, h: -5, a1: (0, 90), a2: (0, 90), l1: (-77, -77), l2: (-77, -77)),
  ], patterns: [r'forearm plank', r'plank hold', r'elbow plank'], anchor: Anchor.hand, beat: 1.8, hold: .3),
  ExerciseDemo('Plank shoulder taps', [
    _plank,
    Pose(t: 114.5, h: -5, a1: (70, -140), a2: (0, 0), l1: (-65.5, -65.5), l2: (-65.5, -65.5)),
  ], patterns: [r'shoulder taps?', r'plank with shoulder tap'], anchor: Anchor.hip, beat: .6, hold: .2),
  ExerciseDemo('Plank to down dog', [_plank, _downDog], patterns: [r'plank to down(ward)?[- ]?(facing )?dog'], anchor: Anchor.hand, beat: 1.1),
  ExerciseDemo('Side plank', [
    _fSidePlank,
    Pose(t: 103, c: -.6, a1: (180, 180), a2: (0, 90), l1: (-77, -77), l2: (-77, -77)),
  ], patterns: [r'side plank'], front: true, anchor: Anchor.hand, beat: 1.8, hold: .3),
  ExerciseDemo('Side plank hip dips', [
    _fSidePlank,
    Pose(t: 96, a1: (180, 180), a2: (0, 90), l1: (-84, -84), l2: (-84, -84)),
  ], patterns: [r'side plank hip dips?', r'hip dips?'], front: true, anchor: Anchor.hand, beat: .8),
  ExerciseDemo('Upward-facing dog', [_plankLow, _upDog], patterns: [r'\bup(ward)?[- ]?(facing )?dog'], anchor: Anchor.hand, beat: 1.4, hold: .45),
  ExerciseDemo('Downward-facing dog', [
    _downDog,
    Pose(t: 43, a1: (43, 43), a2: (43, 43), l1: (-15, -50), l2: (-25, -25), f: 70),
    _downDog,
    Pose(t: 43, a1: (43, 43), a2: (43, 43), l1: (-25, -25), l2: (-15, -50), f: 70),
  ], patterns: [r'\bdown(ward)?[- ]?(facing )?dog'], anchor: Anchor.hand, beat: .9, hold: .3, still: 0),
  ExerciseDemo('Cat-cow', [
    Pose(t: 105.5, c: 5, h: -30, a1: (0, 0), a2: (0, 0), l1: (0, -90), l2: (0, -90), pt: true),
    Pose(t: 105.5, c: -4, h: 25, a1: (0, 0), a2: (0, 0), l1: (0, -90), l2: (0, -90), pt: true),
  ], patterns: [r'cat[- ]?cow', r'cat stretch'], anchor: Anchor.hand, beat: 1.6, hold: .35),
  ExerciseDemo('Bird dog', [
    _table,
    Pose(t: 105.5, a1: (95, 95), a2: (0, 0), l1: (0, -90), l2: (-95, -95), pt: true),
  ], patterns: [r'bird[- ]?dog'], anchor: Anchor.hip, beat: 1.2, hold: .4),
  ExerciseDemo('Thread the needle', [
    Pose(t: 105.5, a1: (180, 180), a2: (0, 0), l1: (0, -90), l2: (0, -90), pt: true),
    Pose(t: 92, h: -25, a1: (-80, -85), a2: (10, 10), l1: (0, -90), l2: (0, -90), pt: true),
  ], patterns: [r'thread the needle'], anchor: Anchor.hip, beat: 1.4, hold: .4),
  ExerciseDemo("Child's pose", [
    Pose(t: 72, h: -20, c: 5, a1: (100, 92), a2: (100, 92), l1: (65, -90), l2: (65, -90), pt: true),
    Pose(t: 74, h: -20, c: 6, a1: (100, 92), a2: (100, 92), l1: (65, -90), l2: (65, -90), pt: true),
  ], patterns: [r"child'?s pose", r'balasana'], anchor: Anchor.hip, beat: 2, hold: .3),
  ExerciseDemo('Cobra', [
    _prone,
    Pose(t: 120, c: -3, h: 15, a1: (-40, 80), a2: (-40, 80), l1: (-90, -90), l2: (-90, -90), pt: true),
  ], patterns: [r'\bcobra', r'bhujangasana'], anchor: Anchor.hip, beat: 1.4, hold: .4),
  ExerciseDemo('Pigeon pose', [
    Pose(t: 175, a1: (10, 5), a2: (10, 5), l1: (80, -100), l2: (-92, -92), pt: true),
    Pose(t: 95, h: -10, c: 2, a1: (95, 92), a2: (95, 92), l1: (80, -100), l2: (-92, -92), pt: true),
  ], patterns: [r'pigeon'], anchor: Anchor.hip, beat: 1.6, hold: .45),
  ExerciseDemo('Seated forward fold', [
    Pose(t: 175, a1: (170, 175), a2: (170, 175), l1: (90, 90), l2: (90, 90)),
    Pose(t: 115, c: 3, h: -15, a1: (95, 95), a2: (95, 95), l1: (90, 90), l2: (90, 90)),
  ], patterns: [r'seated forward fold', r'paschimottanasana', r'hamstring fold'], anchor: Anchor.hip, beat: 1.6, hold: .45),
  ExerciseDemo('Supine spinal twist', [
    Pose(t: -90, a1: (-75, -80), a2: (-75, -80), l1: (150, 60), l2: (150, 60)),
    Pose(t: -90, a1: (-75, -80), a2: (-75, -80), l1: (105, 40), l2: (110, 45)),
  ], patterns: [r'spinal twist', r'supine twist'], anchor: Anchor.hip, beat: 1.6, hold: .45),
  ExerciseDemo('Happy baby', [
    Pose(t: -90, a1: (172, 172), a2: (172, 172), l1: (-115, 178), l2: (-115, 178)),
    Pose(t: -87, a1: (168, 170), a2: (168, 170), l1: (-112, 175), l2: (-112, 175)),
  ], patterns: [r'happy baby'], anchor: Anchor.hip, beat: 1.2, hold: .2),
  ExerciseDemo('Knees to chest', [
    Pose(t: -90, a1: (150, 80), a2: (150, 80), l1: (-130, 120), l2: (-130, 120)),
    Pose(t: -95, a1: (145, 75), a2: (145, 75), l1: (-140, 115), l2: (-140, 115)),
  ], patterns: [r'knees? to (your )?chest', r'hug (your )?knees'], anchor: Anchor.hip, beat: 1.4, hold: .3),
  ExerciseDemo('Legs up the wall', [
    Pose(t: -90, a1: (70, 80), a2: (70, 80), l1: (180, 180), l2: (180, 180)),
    Pose(t: -90, c: -.6, a1: (70, 80), a2: (70, 80), l1: (180, 180), l2: (180, 180)),
  ], patterns: [r'legs up the wall', r'viparita karani'], props: {Prop.wall}, anchor: Anchor.hip, beat: 2.2, hold: .3),
  ExerciseDemo('Savasana', [
    _supine,
    Pose(t: -90, c: -.8, a1: (85, 90), a2: (85, 90), l1: (90, 90), l2: (90, 90)),
  ], patterns: [r'savasana', r'corpse pose', r'body scan'], anchor: Anchor.hip, beat: 2.4, hold: .3),
  ExerciseDemo('Pelvic tilt', [
    _supineKnees,
    Pose(t: -88, c: 1.2, a1: (85, 90), a2: (85, 90), l1: (140, 15), l2: (140, 15)),
  ], patterns: [r'pelvic tilts?', r'core engagement', r'belly button'], beat: 1.6, hold: .3),
  ExerciseDemo('Supine hamstring stretch', [
    Pose(t: -90, a1: (150, 160), a2: (150, 160), l1: (180, 180), l2: (90, 90)),
    Pose(t: -90, a1: (155, 165), a2: (155, 165), l1: (195, 195), l2: (90, 90)),
  ], patterns: [r'supine stretch', r'hamstring (strap )?stretch'], anchor: Anchor.hip, beat: 1.6, hold: .4),
  ExerciseDemo('Dead bug', [
    Pose(t: -90, a1: (180, 180), a2: (180, 180), l1: (180, 90), l2: (180, 90)),
    Pose(t: -90, a1: (-100, -100), a2: (180, 180), l1: (180, 90), l2: (95, 95)),
  ], patterns: [r'dead ?bugs?'], anchor: Anchor.hip, beat: 1),
  ExerciseDemo('Bicycle crunch', [
    Pose(t: -110, c: 2, a1: (-130, 0), a2: (-130, 0), l1: (-160, 100), l2: (100, 100)),
    Pose(t: -110, c: 2, a1: (-130, 0), a2: (-130, 0), l1: (100, 100), l2: (-160, 100)),
  ], patterns: [r'bicycle'], anchor: Anchor.hip, beat: .55, hold: .15),
  ExerciseDemo('Reverse crunch', [
    Pose(t: -90, a1: (85, 90), a2: (85, 90), l1: (180, 90), l2: (180, 90)),
    Pose(t: -90, c: 1.5, a1: (85, 90), a2: (85, 90), l1: (-150, 150), l2: (-150, 150)),
  ], patterns: [r'reverse crunch'], anchor: Anchor.hip, beat: .9),
  ExerciseDemo('Toe-touch crunch', [
    Pose(t: -90, a1: (180, 180), a2: (180, 180), l1: (180, 180), l2: (180, 180)),
    Pose(t: -115, c: 2, a1: (150, 150), a2: (150, 150), l1: (180, 180), l2: (180, 180)),
  ], patterns: [r'toe[- ]touch'], anchor: Anchor.hip, beat: .8),
  ExerciseDemo('Crunch', [
    _supineKnees,
    Pose(t: -115, c: 2, a1: (110, 110), a2: (110, 110), l1: (140, 15), l2: (140, 15)),
  ], patterns: [r'crunch(es)?\b', r'sit[- ]?ups?'], beat: .8),
  ExerciseDemo('Russian twist', [
    Pose(t: -140, a1: (10, 40), a2: (10, 40), l1: (130, 75), l2: (130, 75)),
    Pose(t: -140, a1: (100, 120), a2: (100, 120), l1: (130, 75), l2: (130, 75)),
  ], patterns: [r'russian twists?'], props: {Prop.ball}, anchor: Anchor.hip, beat: .6, hold: .15),
  ExerciseDemo('Hollow body hold', [
    Pose(t: -100, c: 1, a1: (-100, -100), a2: (-100, -100), l1: (100, 100), l2: (100, 100), pt: true),
    Pose(t: -102, c: 1.4, a1: (-102, -102), a2: (-102, -102), l1: (102, 102), l2: (102, 102), pt: true),
  ], patterns: [r'hollow (body|hold)'], anchor: Anchor.hip, beat: 1.4, hold: .3),
  ExerciseDemo('V-sit', [
    Pose(t: -140, a1: (115, 115), a2: (115, 115), l1: (140, 140), l2: (140, 140), pt: true),
    Pose(t: -145, a1: (112, 112), a2: (112, 112), l1: (135, 135), l2: (135, 135), pt: true),
  ], patterns: [r'v[- ]?sits?', r'boat pose'], anchor: Anchor.hip, beat: .6, hold: .2),
  ExerciseDemo('Flutter kicks', [
    Pose(t: -95, a1: (80, 85), a2: (80, 85), l1: (100, 100), l2: (82, 82), pt: true),
    Pose(t: -95, a1: (80, 85), a2: (80, 85), l1: (82, 82), l2: (100, 100), pt: true),
  ], patterns: [r'flutter kicks?'], anchor: Anchor.hip, beat: .3, hold: 0),
  ExerciseDemo('Foam rolling', [
    Pose(t: -160, a1: (0, 0), a2: (0, 0), l1: (103, 103), l2: (103, 103)),
    Pose(t: -150, a1: (-15, -15), a2: (-15, -15), l1: (101, 101), l2: (101, 101)),
  ], patterns: [r'foam roll'], props: {Prop.roller}, anchor: Anchor.hand, beat: 1.2, hold: .2),

  // Rest between exercises
  ExerciseDemo('Rest & recover', [
    Pose(a1: (-40, 37), a2: (40, -37), l1: (-4, -4), l2: (4, 4)),
    Pose(c: -.6, a1: (-42, 35), a2: (42, -35), l1: (-4, -4), l2: (4, 4)),
  ], patterns: [r'^\s*rest\b', r'\brest period\b', r'^\s*round \d+\s*$', r'^\s*recovery\b'], front: true, beat: 1.8, hold: .3),
];
