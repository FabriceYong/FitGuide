import 'package:fitguide/src/core/images.dart';
import 'package:fitguide/src/features/workout/catalog_filter.dart';
import 'package:fitguide/src/features/workout/workout_steps.dart';
import 'package:fitguide/src/models/catalog.dart';
import 'package:flutter_test/flutter_test.dart';

WorkoutStep step(String instruction, {int? duration}) => WorkoutStep(stepNumber: 1, instruction: instruction, duration: duration);

void main() {
  test('reads a rep target, and leaves timed steps timed', () {
    expect(repTarget(step('Round 1 — Exercise A: Explosive Burpees × 10 reps')), (reps: '10', sets: null));
    expect(repTarget(step('Romanian Deadlifts (RDLs) — 3 Sets × 10 reps')), (reps: '10', sets: '3'));
    expect(repTarget(step('Lat Pulldowns or Pull-Ups — 3 Sets × 8–12 reps')), (reps: '8–12', sets: '3'));
    expect(repTarget(step('Round 1 — Exercise C: Mountain Climbers × 40 seconds')), isNull);
    expect(repTarget(step('Forearm Plank Hold — 3 × 45 seconds')), isNull);
    expect(repTarget(step('Cool Down: Child\'s Pose & Supine Breathing Recovery')), isNull);
  });

  test('names a step the way a reader would, with its target', () {
    expect(stepName(step('Round 1 — Exercise A: Explosive Burpees × 10 reps')), 'Explosive Burpees');
    expect(stepName(step('Warm-Up: Dynamic Mobility Circuit — Leg Swings, Hip Circles, Arm Swings')), 'Dynamic Mobility Circuit');
    expect(stepName(step('Romanian Deadlifts (RDLs) — 3 Sets × 10 reps')), 'Romanian Deadlifts');
    expect(targetLabel(step('Burpees × 10 reps', duration: 150)), '10 reps');
    expect(targetLabel(step('RDLs — 3 Sets × 10 reps')), '3 × 10 reps');
    expect(targetLabel(step('Plank — 45 seconds', duration: 45)), '0:45');
    expect(spokenTarget(step('Plank', duration: 150)), '2 minutes 30 seconds');
    expect(spokenTarget(step('Pull-ups — 3 Sets × 8–12 reps')), '3 sets of 8 to 12 reps');
  });

  test('a timer is not equipment', () {
    final tabata = Workout({'slug': 't', 'title': 'Tabata', 'equipment': ['None', 'Timer']});
    final strength = Workout({'slug': 's', 'title': 'Strength', 'equipment': ['Dumbbells', 'Optional: Mat']});
    expect(requiredEquipment(tabata), isEmpty);
    expect(usesWeights(tabata), isFalse);
    expect(requiredEquipment(strength), ['Dumbbells']);
    expect(usesWeights(strength), isTrue);
  });

  test('picks the same photo for a workout as the website does', () {
    // djb2, as textHash in utils/unsplashImages.ts.
    expect(textHash(''), 5381);
    expect(textHash('abc'), 193485963);
    expect(workoutSpecificImage('Core Strength Circuit', 'Strength'), contains('1571019613454') ,
        reason: '"core" uses the core photos; this title picks the crunch photo on both platforms');
  });
}
