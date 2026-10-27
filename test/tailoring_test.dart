import 'package:fitguide/src/core/shared/tailoring.dart';
import 'package:fitguide/src/models/catalog.dart';
import 'package:fitguide/src/models/user.dart';
import 'package:flutter_test/flutter_test.dart';

/// The port of packages/shared/tailoring.js must pick and explain workouts
/// exactly as the website and API do.
Workout workout(Map<String, dynamic> fields) => Workout({
      'slug': 'w',
      'title': 'Workout',
      'category': 'Strength',
      'difficulty': 'Beginner',
      'duration': 30,
      'intensity': 'Moderate',
      'equipment': <String>[],
      'targetMuscles': <String>[],
      ...fields,
    });

void main() {
  test('suggested focus areas follow goal and gender', () {
    expect(suggestedFocusAreas(goal: 'Muscle', gender: 'Male'), ['Full Body', 'Chest', 'Back', 'Legs', 'Arms']);
    expect(suggestedFocusAreas(goal: 'Weight', gender: 'Female'), ['Full Body', 'Core', 'Legs', 'Glutes']);
    expect(suggestedFocusAreas(goal: null, gender: 'Prefer not to say'), ['Full Body', 'Core']);
  });

  test('calorie factor scales with resting energy and is clamped', () {
    expect(calorieFactor(null), 1);
    expect(calorieFactor(AppUser({'weight': 70})), 1, reason: 'no height: reference adult');
    // 10*70 + 6.25*175 - 5*30 + 5 = 1648.75 → 1648.75 / 1680
    expect(calorieFactor(AppUser({'weight': 70, 'height': 175, 'gender': 'Male'}), 2026), closeTo(0.9814, 0.0001));
    expect(calorieFactor(AppUser({'weight': 250, 'height': 250, 'gender': 'Male'})), 1.8);
    expect(personalCalories(300, AppUser({'weight': 70, 'height': 175, 'gender': 'Male', 'birthYear': DateTime.now().year - 30})), 294);
  });

  test('workout fit explains why it suits the profile', () {
    final user = AppUser({
      'goal': 'Muscle',
      'fitnessLevel': 'Beginner',
      'focusAreas': ['Chest', 'Arms'],
      'workoutMinutes': 30,
      'equipment': ['weights'],
    });
    final fit = workoutFit(workout({'targetMuscles': ['Chest', 'Arms'], 'equipment': ['Dumbbells', 'Mat']}), user);
    expect(fit.reasons, ['Works your chest and arms', 'Fits your 30 minutes', 'Uses your dumbbells']);
    expect(fit.missingEquipment, isEmpty);
  });

  test('missing equipment and limitations push a workout down', () {
    final user = AppUser({'equipment': ['none'], 'limitations': ['knees', 'low-impact']});
    final fit = workoutFit(workout({'equipment': ['Barbell'], 'category': 'HIIT', 'cautions': ['Protect your knees on landings']}), user);
    expect(fit.missingEquipment, ['Barbell']);
    expect(fit.conflicts, ['knees', 'low-impact']);
  });

  test('ranking prefers the best fit and rotates ties by day', () {
    final user = AppUser({'goal': 'Flexibility', 'fitnessLevel': 'Beginner'});
    final yoga = workout({'slug': 'yoga', 'category': 'Yoga'});
    final hiit = workout({'slug': 'hiit', 'category': 'HIIT', 'difficulty': 'Advanced'});
    expect(rankWorkouts([hiit, yoga], user).first.workout.slug, 'yoga');

    final a = workout({'slug': 'a'});
    final b = workout({'slug': 'b'});
    expect(rankWorkouts([a, b], null, day: 0).first.workout.slug, 'a');
    expect(rankWorkouts([a, b], null, day: 1).first.workout.slug, 'b');
  });
}
