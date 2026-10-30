import 'dart:convert';
import 'dart:io';

import 'package:fitguide/src/features/workout/default_steps.dart';
import 'package:fitguide/src/features/workout/exercise_demo_view.dart';
import 'package:fitguide/src/features/workout/exercise_demos.dart';
import 'package:fitguide/src/models/catalog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  String? demo(String instruction, [String? name]) => matchDemo(name, instruction)?.name;

  test('the demo matches the movement the step describes', () {
    const expected = {
      // Seeded workouts
      'Begin in Mountain Pose (Tadasana). Stand tall with feet hip-width apart': 'Mountain pose',
      'Inhale and raise your arms overhead, bringing palms together in prayer position.': 'Raised arms',
      'Exhale and fold forward from your hips, bringing your hands to the floor (Forward Fold).': 'Forward fold',
      'Inhale and lift halfway up with a flat back (Half Lift).': 'Half lift',
      'Lower down through Chaturanga Dandasana (Four-Limbed Staff Pose)': 'Chaturanga',
      'Inhale into Upward-Facing Dog. Press through your hands': 'Upward-facing dog',
      'Exhale into Downward-Facing Dog. Lift your hips high': 'Downward-facing dog',
      'Look forward and step or jump your feet between your hands. Inhale to Half Lift with a flat back.': 'Half lift',
      'Inhale and rise up to standing, sweeping your arms out to the sides and overhead.': 'Raised arms',
      "Cool down: Finish in Child's Pose for 5 deep breaths": "Child's pose",
      'Warm-up: Start with 2 minutes of gentle core engagement. Lie on your back, knees bent': 'Pelvic tilt',
      'Rest: Take 30 seconds to recover. Stay active with light stretching or march in place.': 'Rest & recover',
      'Russian Twists: Sit with knees bent, feet lifted.': 'Russian twist',
      'Mountain Climbers: Start in plank position. Drive knees toward chest': 'Mountain climbers',
      'Dead Bug: Lie on back, arms extended toward ceiling': 'Dead bug',
      'Side Plank (Right): Lie on right side, prop up on right forearm.': 'Side plank',
      'Round 2: Repeat all exercises for second set.': 'Rest & recover',
      "Cool Down: Lie on back and hug knees to chest for 30 seconds. Then stretch in child's pose": 'Knees to chest',
      // Generated steps whose wording could pull the wrong way
      'Round 1 — Exercise A: Explosive Burpees × 10 reps': 'Burpee',
      'Round 2 — Rest Period: Walk It Out & Breathe': 'Rest & recover',
      'Active Recovery: Slow Walk — 20 seconds': 'Walk',
      'Plank with Shoulder Taps — 2 × 20 taps total': 'Plank shoulder taps',
      'Plank to Down Dog Flow — 2 × 10 transitions': 'Plank to down dog',
      'Side Plank Hip Dips — 2 × 12 per side': 'Side plank hip dips',
      'Warrior I — Grounding & Presence': 'Warrior I',
      'Warrior II — Power & Openness': 'Warrior II',
      'Barbell Back Squats — Set 1 of 4 (8–10 reps)': 'Barbell back squat',
      'Round 1 — Exercise B: Jump Squats × 15 reps': 'Jump squat',
      'Flat Barbell or Dumbbell Bench Press — Set 1 of 4': 'Bench press',
      'Overhead Barbell or Dumbbell Press — 3 Sets × 8 reps': 'Overhead press',
      'Tricep Dips or Overhead Extensions — 3 Sets': 'Triceps dip',
      'Standing Lower Body Stretch: Quad, Hip Flexor, Calf': 'Quad stretch',
      'Cool Down: Full Body Static Stretch & Recovery Protocol': 'Standing stretch',
      'Sun Salutation B — Extended Flow with Warriors (3 rounds)': 'Sun salutation',
    };
    for (final MapEntry(key: instruction, value: name) in expected.entries) {
      expect(demo(instruction), name, reason: instruction);
    }
  });

  test('the exercise name wins over the instruction text', () {
    expect(demo('Zone 1 Steady State Aerobic Run: Jog at a comfortable pace', 'Steady jogging'), 'Jog');
    expect(demo('Warm-up Cat-Cow Stretch: On hands and knees', 'Cat cow pose'), 'Cat-cow');
    expect(demo('Plank Hold: Get into forearm plank position.', 'forearm plank'), 'Forearm plank');
  });

  test('no demo rather than a wrong one', () {
    expect(demo('Visualise your goal and set an intention for today'), isNull);
  });

  test('every generated step has a demo', () {
    for (final category in ['Yoga', 'Strength', 'Cardio', 'Core', 'HIIT']) {
      final workout = Workout({'slug': 'w', 'title': '$category workout', 'category': category, 'duration': 60});
      for (final step in generateDefaultSteps(workout)) {
        expect(demoForStep(step), isNotNull, reason: '$category: ${step.instruction}');
      }
    }
  });

  test('the API has the same demos, so the app and the website pick the same movement', () {
    // fitguide_api/data/exerciseDemos.json is matched by the API for the website.
    final api = (jsonDecode(File('fitguide_api/data/exerciseDemos.json').readAsStringSync()) as List).cast<Map<String, dynamic>>();
    expect(api.map((d) => d['name']), exerciseDemos.map((d) => d.name));
    for (final (i, d) in exerciseDemos.indexed) {
      expect(api[i]['patterns'], d.patterns, reason: d.name);
      expect(api[i]['weak'] ?? false, d.weak, reason: d.name);
    }
  });

  testWidgets('every demo draws, moving and still', (tester) async {
    for (final d in exerciseDemos) {
      for (final animate in [true, false]) {
        await tester.pumpWidget(MaterialApp(
          home: SizedBox(width: 320, height: 240, child: ExerciseDemoView(d, key: ValueKey('${d.name}$animate'), color: Colors.amber, animate: animate)),
        ));
        await tester.pump(const Duration(milliseconds: 700));
        expect(tester.takeException(), isNull, reason: d.name);
        expect(find.bySemanticsLabel('Demonstration: ${d.name}'), findsOneWidget);
      }
    }
  });
}
