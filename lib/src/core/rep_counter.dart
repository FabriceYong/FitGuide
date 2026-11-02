import 'dart:math' as math;

/// Counting reps from the camera: the app finds the body's joints in each
/// video frame (33 pose landmarks, the same numbering as ML Kit's
/// PoseLandmarkType), and this turns a joint's angle over time into reps and
/// form cues (packages/shared/repCounter.js on the website).
///
/// A rep counts when the joint bends past `down` and straightens past `up`
/// again. Coming back up after bending only part of the way gives the
/// exercise's depth cue instead of a rep.

/// A landmark: position in the frame and how surely it was seen (0–1).
class PosePoint {
  const PosePoint(this.x, this.y, [this.visibility = 1]);
  final double x;
  final double y;
  final double visibility;
}

// Pose landmark numbers.
const _leftShoulder = 11, _rightShoulder = 12, _leftElbow = 13, _rightElbow = 14, _leftWrist = 15, _rightWrist = 16;
const _leftHip = 23, _rightHip = 24, _leftKnee = 25, _rightKnee = 26, _leftAnkle = 27, _rightAnkle = 28;

class RepExercise {
  const RepExercise({
    required this.name,
    required this.joints,
    required this.down,
    required this.up,
    required this.shallowCue,
    required this.setup,
    this.line,
    this.lineMin = 0,
    this.lineCue,
  });
  final String name;

  /// [a, b, c] landmark numbers for each side; the angle is at b.
  final List<List<int>> joints;
  final double down;
  final double up;
  final String shallowCue;
  final String setup;

  /// A line that should stay near straight at the bottom (push-up body line).
  final List<List<int>>? line;
  final double lineMin;
  final String? lineCue;
}

const repExercises = {
  'squat': RepExercise(
    name: 'Squats',
    joints: [
      [_leftHip, _leftKnee, _leftAnkle],
      [_rightHip, _rightKnee, _rightAnkle],
    ],
    down: 100,
    up: 160,
    shallowCue: 'Go a little lower',
    setup: 'Stand side-on to the camera, about 2 metres away, so your whole body is in view.',
  ),
  'pushup': RepExercise(
    name: 'Push-ups',
    joints: [
      [_leftShoulder, _leftElbow, _leftWrist],
      [_rightShoulder, _rightElbow, _rightWrist],
    ],
    down: 95,
    up: 155,
    shallowCue: 'Lower your chest a little more',
    setup: 'Put the phone on the floor side-on to you, about 1.5 metres away.',
    line: [
      [_leftShoulder, _leftHip, _leftAnkle],
      [_rightShoulder, _rightHip, _rightAnkle],
    ],
    lineMin: 155,
    lineCue: 'Keep your body in a straight line',
  ),
};

/// Which camera exercise a step is, from its name ("Goblet Squats" → squat), or null.
String? repExerciseFor(String name) {
  final text = name.toLowerCase();
  if (RegExp(r'push[\s-]?ups?\b|press[\s-]?ups?\b').hasMatch(text)) return 'pushup';
  if (RegExp(r'\bsquats?\b').hasMatch(text) && !RegExp(r'jump|pistol|split|sumo jump').hasMatch(text)) return 'squat';
  return null;
}

/// The angle at [b], in degrees, between [a] and [c].
double angleAt(PosePoint a, PosePoint b, PosePoint c) {
  final ab = math.atan2(a.y - b.y, a.x - b.x);
  final cb = math.atan2(c.y - b.y, c.x - b.x);
  var deg = ((ab - cb) * 180 / math.pi).abs();
  if (deg > 180) deg = 360 - deg;
  return deg;
}

/// A joint's angle from a frame's landmarks: the side the camera sees best,
/// or null when neither side is clearly seen.
double? jointAngle(Map<int, PosePoint> landmarks, List<List<int>> sides, {double minVisibility = 0.5}) {
  double? best;
  var bestSeen = -1.0;
  for (final side in sides) {
    final points = [for (final i in side) landmarks[i]];
    if (points.any((p) => p == null)) continue;
    final seen = points.map((p) => p!.visibility).reduce(math.min);
    if (seen < minVisibility || seen <= bestSeen) continue;
    bestSeen = seen;
    best = angleAt(points[0]!, points[1]!, points[2]!);
  }
  return best;
}

/// What a frame did: 'rep', 'shallow', 'form' or null, and what to say.
class RepUpdate {
  const RepUpdate(this.reps, this.event, this.cue, this.angle);
  final int reps;
  final String? event;
  final String? cue;
  final int? angle;
}

/// Counts reps of one exercise, a frame at a time.
class RepCounter {
  RepCounter(String exercise) : _ex = repExercises[exercise] ?? (throw ArgumentError('No camera counting for $exercise'));

  final RepExercise _ex;
  int reps = 0;
  String _phase = 'start'; // start → up → down → up …
  double? _smooth;
  double _lowest = 180;
  bool _formCued = false;

  RepUpdate update(Map<int, PosePoint> landmarks) {
    final raw = jointAngle(landmarks, _ex.joints);
    if (raw == null) return RepUpdate(reps, null, null, null);
    // Smooth out jitter between frames.
    final angle = _smooth = _smooth == null ? raw : _smooth! * 0.5 + raw * 0.5;
    String? event;
    String? cue;

    if (_phase == 'start') {
      if (angle >= _ex.up) _phase = 'up';
    } else if (_phase == 'up') {
      _lowest = math.min(_lowest, angle);
      if (angle <= _ex.down) {
        _phase = 'down';
      } else if (angle >= _ex.up && _lowest < _ex.up - 25) {
        // Bent part of the way and came back up: not a rep.
        event = 'shallow';
        cue = _ex.shallowCue;
        _lowest = 180;
      } else if (angle >= _ex.up) {
        _lowest = 180;
      }
    } else {
      final line = _ex.line;
      if (line != null && !_formCued) {
        final straight = jointAngle(landmarks, line);
        if (straight != null && straight < _ex.lineMin) {
          event = 'form';
          cue = _ex.lineCue;
          _formCued = true;
        }
      }
      if (angle >= _ex.up) {
        reps += 1;
        _phase = 'up';
        _lowest = 180;
        _formCued = false;
        event = 'rep';
        cue = null;
      }
    }
    return RepUpdate(reps, event, cue, angle.round());
  }
}
