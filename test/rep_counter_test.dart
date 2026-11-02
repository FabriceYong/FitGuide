import 'dart:math' as math;

import 'package:fitguide/src/core/rep_counter.dart';
import 'package:flutter_test/flutter_test.dart';

/// The same cases as fitguide_api/test/repCounter.test.js for the website's counter.
void main() {
  double rad(double d) => d * math.pi / 180;

  /// The left knee bent to [knee] and the left elbow to [elbow].
  Map<int, PosePoint> frame({double knee = 180, double elbow = 180, double visibility = 0.9}) => {
        25: PosePoint(0, 0, visibility), // knee
        23: PosePoint(1, 0, visibility), // hip
        27: PosePoint(math.cos(rad(knee)), math.sin(rad(knee)), visibility), // ankle
        13: PosePoint(0, 0, visibility), // elbow
        11: PosePoint(1, 0, visibility), // shoulder
        15: PosePoint(math.cos(rad(elbow)), math.sin(rad(elbow)), visibility), // wrist
      };

  ({int reps, List<String> events}) run(String exercise, List<double> angles, String joint) {
    final counter = RepCounter(exercise);
    final events = <String>[];
    for (final a in angles) {
      for (var i = 0; i < 4; i++) {
        final r = counter.update(joint == 'knee' ? frame(knee: a) : frame(elbow: a));
        if (r.event != null) events.add(r.cue != null ? '${r.event}: ${r.cue}' : r.event!);
      }
    }
    return (reps: counter.reps, events: events);
  }

  test('measures a joint angle', () {
    expect(angleAt(const PosePoint(1, 0), const PosePoint(0, 0), const PosePoint(0, 1)).round(), 90);
    expect(jointAngle(frame(knee: 120), [[23, 25, 27]])!.round(), 120);
    expect(jointAngle(frame(visibility: 0.2), [[23, 25, 27]]), isNull);
  });

  test('counts full squats', () {
    final r = run('squat', [175, 140, 90, 85, 140, 175, 120, 88, 170, 178], 'knee');
    expect(r.reps, 2);
    expect(r.events, ['rep', 'rep']);
  });

  test('does not count a half squat, and says to go lower', () {
    final r = run('squat', [175, 130, 120, 175, 90, 175], 'knee');
    expect(r.reps, 1);
    expect(r.events, ['shallow: Go a little lower', 'rep']);
  });

  test('waits for the person to stand up before counting', () {
    expect(run('squat', [80, 90, 170, 80, 175], 'knee').reps, 1);
  });

  test('counts push-ups and says when the hips sag', () {
    expect(run('pushup', [170, 80, 170, 85, 165], 'elbow').reps, 2);

    Map<int, PosePoint> pushup(double elbow, double line) => {
          13: const PosePoint(0, 0, 0.9),
          11: const PosePoint(1, 0, 0.9),
          15: PosePoint(math.cos(rad(elbow)), math.sin(rad(elbow)), 0.9),
          23: const PosePoint(2, 0, 0.9),
          27: PosePoint(2 + math.cos(rad(180 - line)), math.sin(rad(180 - line)), 0.9),
        };
    final counter = RepCounter('pushup');
    final cues = <String>[];
    for (final (elbow, line) in [(170.0, 178.0), (80.0, 140.0), (80.0, 140.0), (170.0, 178.0), (80.0, 175.0), (170.0, 178.0)]) {
      for (var i = 0; i < 4; i++) {
        final r = counter.update(pushup(elbow, line));
        if (r.event == 'form') cues.add(r.cue!);
      }
    }
    expect(counter.reps, 2);
    expect(cues, ['Keep your body in a straight line']);
  });

  test('knows which steps it can count', () {
    expect(repExerciseFor('Goblet Squats'), 'squat');
    expect(repExerciseFor('Jump Squats'), isNull);
    expect(repExerciseFor('Push-Ups'), 'pushup');
    expect(repExerciseFor('Incline press-up'), 'pushup');
    expect(repExerciseFor('Plank'), isNull);
  });
}
