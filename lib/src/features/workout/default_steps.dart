import 'dart:math' as math;

import '../../models/catalog.dart';

/// Steps for a workout that has none in the catalog, built from its category
/// and length (generateEnhancedDefaultSteps in EnhancedWorkoutExecution.js).
class _S {
  const _S(this.instruction, this.formCues, this.breathingPattern, [this.commonMistakes = const [], this.fixedDuration]);
  final String instruction;
  final List<String> formCues;
  final String breathingPattern;
  final List<String> commonMistakes;
  final int? fixedDuration;
}

List<WorkoutStep> generateDefaultSteps(Workout workout) {
  final cat = workout.category.toLowerCase();
  final title = workout.title.toLowerCase();
  final durationMins = workout.duration > 0 ? workout.duration : 20;
  final totalSeconds = durationMins * 60;
  // ~1 step per 2.5 minutes, between 6 and 24.
  final targetCount = math.max(6, math.min(24, (durationMins / 2.5).round()));

  List<WorkoutStep> build(List<_S> pool) {
    final warmupCount = math.min(2, (targetCount * 0.15).floor());
    final cooldownCount = math.min(2, (targetCount * 0.1).floor());
    final mainCount = targetCount - warmupCount - cooldownCount;
    final warmup = pool.sublist(0, warmupCount);
    final cooldown = pool.sublist(pool.length - cooldownCount);
    final mainPool = pool.sublist(warmupCount, pool.length - cooldownCount);
    final main = [for (var i = 0; i < mainCount; i++) mainPool[i % mainPool.length]];
    final all = [...warmup, ...main, ...cooldown];
    final perStep = totalSeconds ~/ all.length;
    return [
      for (final (i, s) in all.indexed)
        WorkoutStep(
          stepNumber: i + 1,
          instruction: s.instruction,
          duration: s.fixedDuration ?? perStep,
          formCues: s.formCues,
          breathingPattern: s.breathingPattern,
          commonMistakes: s.commonMistakes,
        ),
    ];
  }

  bool any(List<String> words) => words.any(title.contains);

  if (cat.contains('yoga') || any(['yoga', 'zen', 'flow', 'stretch', 'flexibility'])) {
    return build(const [
      _S('Opening Centering: Breath Awareness & Pranayama', ['Close eyes, sit tall', 'Inhale 4s, hold 2s, exhale 6s', 'Let thoughts settle'], 'Slow 4-2-6 pranayama breath', ['Rushing this phase', 'Tension in shoulders']),
      _S('Neck Rolls & Shoulder Circles — Releasing Tension', ['Move very slowly', 'Drop ear to shoulder gently', 'Keep jaw relaxed'], 'Steady natural breath'),
      _S('Cat-Cow Flow — Spinal Awakening (10 rounds)', ['Arch back up on Cat exhale', 'Dip belly on Cow inhale', 'Move vertebra by vertebra'], 'Inhale Cow, exhale Cat'),
      _S('Thread the Needle — Shoulder & Upper Back Release', ['Keep hips stacked over knees', 'Melt shoulder toward mat', 'Hold each side equally'], 'Soften breath into the shoulder'),
      _S('Downward Dog Hold & Pedal Calves', ['Press palms flat, fingers spread', 'Lengthen spine away from hips', 'Gently alternate heel drops'], 'Inhale lengthen, exhale deepen', ['Rounding upper back', 'Weight too far forward']),
      _S('Sun Salutation A — Full Flow (3 rounds)', ['Match each movement to breath', 'Keep core engaged throughout', 'Lengthen before folding'], 'Synchronized inhale/exhale flow', ['Collapsing lower back in Cobra']),
      _S('Sun Salutation B — Extended Flow with Warriors (3 rounds)', ['Sink low in Warrior I', 'Square hips fully to front', 'Arms energetically reaching up'], 'Deep rhythmic breath'),
      _S('Crescent Lunge — Hip Flexor Opener (Left & Right)', ['Stack front knee over ankle', 'Tuck pelvis slightly', 'Reach arms skyward'], 'Inhale lengthen, exhale sink deeper', ['Letting knee cave inward']),
      _S('Warrior I — Grounding & Presence', ['Heel-to-heel alignment', 'Hips square to front', 'Gaze forward, arms strong'], 'Expansive steady breath'),
      _S('Warrior II — Power & Openness', ['Arms extended strong like wings', 'Front thigh parallel to floor', 'Gaze over front fingers'], 'Calm warrior breath'),
      _S('Extended Side Angle & Reverse Warrior', ['Reach top arm overhead', 'Feel long lateral line', 'Keep grounded back foot'], 'Exhale into side body stretch'),
      _S('Triangle Pose (Trikonasana) — Left & Right', ['Hinge at hip, not waist', 'Stack shoulders vertically', 'Gaze up at top hand'], 'Open breath into chest'),
      _S('Tree Pose (Vrikshasana) — Balance & Focus', ['Ground through big toe mound', 'Place foot above or below knee', 'Fix gaze on still point'], 'Calm centering breath', ['Foot pressing on knee joint']),
      _S('Pigeon Pose — Deep Hip Opener (Left then Right)', ['Keep hips level', 'Flex front foot to protect knee', 'Fold forward over shin'], 'Long slow exhale into hip', ['Letting hips twist off-center']),
      _S('Bridge Pose (Setu Bandhasana) — 3 holds x 30s', ['Press all four corners of feet', 'Drive hips high', 'Clasp hands under back'], 'Inhale up, exhale hold'),
      _S('Seated Forward Fold (Paschimottanasana)', ['Hinge deeply from hip joints', 'Reach for feet or shins', 'Let head hang heavy'], 'Exhale fold deeper each breath'),
      _S('Supine Spinal Twist — Left & Right', ['Keep both shoulders on mat', 'Guide knee across body gently', 'Look opposite to knee'], 'Exhale into the twist'),
      _S('Happy Baby Pose — Releasing Lower Back', ['Hold outer edges of feet', 'Rock gently side to side', 'Relax lower back into mat'], 'Playful easy breath'),
      _S('Legs Up the Wall (Viparita Karani) — 2 mins', ['Scoot hips close to wall', 'Arms at sides, palms up', 'Soften completely'], 'Effortless restorative breath'),
      _S('Final Savasana — Deep Body Scan & Integration', ['Lie completely still', 'Release every muscle consciously', 'Allow full nervous system reset'], 'Natural effortless breathing', ['Moving or rushing out of Savasana'], 180),
    ]);
  }

  if (cat.contains('strength') || any(['strength', 'pump', 'hypertrophy', 'muscle', 'lifting', 'weight'])) {
    const sets = 4;
    return build(const [
      _S('Warm-Up: Dynamic Joint Mobility Circuit', ['Leg swings front/back and lateral', 'Hip circles both directions', 'Arm circles and thoracic rotations'], 'Natural energizing breath', ['Skipping warm-up entirely']),
      _S('Activation: Glute Bridges & Band Pull-Aparts', ['Squeeze glutes hard at top', 'Keep ribcage down on bridges', 'Pull band to chest level for scapular health'], 'Exhale on bridge push', ['Using lower back instead of glutes']),
      _S('Barbell Back Squats — Set 1 of $sets (8–10 reps)', ['Bar on mid-traps', 'Break at hips and knees simultaneously', 'Knees track over toes', 'Chest proud throughout'], 'Inhale descent, brace, exhale ascent', ['Knees caving in', 'Butt wink at depth']),
      _S('Barbell Back Squats — Set 2 of $sets (8–10 reps)', ['Slightly increase weight if Set 1 felt easy', 'Same technique, maintain bar path', 'Full depth if mobility allows'], 'Belly breath at top, brace, exhale effort', ['Forward torso lean']),
      _S('Barbell Back Squats — Set 3 of $sets (8–10 reps)', ['Drive floor away with feet', 'Think "spread the floor" for knee tracking', 'Keep wrists neutral on bar'], 'Rhythmic controlled breathing', ['Half reps with heavy weight']),
      _S('Barbell Back Squats — Set 4 of $sets — Push to Near Failure', ['Last 2 reps should be challenging', 'Spotter or safety bars in place', 'Explosive intent even as weight gets hard'], 'Aggressive exhale on final reps'),
      _S('Flat Barbell or Dumbbell Bench Press — Set 1 of $sets', ['Feet flat on floor, back slightly arched', 'Bar over lower chest', 'Control descent to light touch on chest'], 'Inhale down, exhale press', ['Flared elbows 90°', 'Bouncing bar off chest']),
      _S('Flat Bench Press — Set 2 of $sets (6–8 reps)', ['Drive through heels for leg drive', 'Keep shoulders retracted and depressed', 'Full lockout at top'], 'Power exhale on press', ['Wrists bending backward']),
      _S('Flat Bench Press — Set 3 of $sets', ['Squeeze bar hard for lat activation', 'Think "bend the bar" for better chest engagement', 'Controlled 2-second descent'], 'Steady rhythmic breath'),
      _S('Romanian Deadlifts (RDLs) — 3 Sets × 10 reps', ['Hip hinge, not knee bend', 'Bar stays close to shins/quads', 'Feel deep hamstring stretch at bottom', 'Hips drive forward to stand'], 'Inhale top, exhale hinge down', ['Rounding lower back', 'Bar drifting away from body']),
      _S('Barbell or Dumbbell Bent-Over Rows — 3 Sets', ['Hinge to 45°, chest parallel to floor', 'Drive elbows back past torso', 'Squeeze shoulder blades at top', 'Lower slowly with control'], 'Exhale on pull, inhale on lower', ['Using momentum to swing weight']),
      _S('Overhead Barbell or Dumbbell Press — 3 Sets × 8 reps', ['Press directly overhead, slightly behind head', 'Engage core hard to prevent back arch', 'Full lockout at top', 'Brace abs throughout'], 'Exhale pressing up, inhale descending', ['Arching lower back excessively']),
      _S('Lat Pulldowns or Pull-Ups — 3 Sets × 8–12 reps', ['Initiate with lat depression, not arms', 'Pull bar to upper chest', 'Lean back slightly (15°)', 'Controlled return to full arm extension'], 'Exhale on pull-down', ['Pulling behind neck']),
      _S('Cable or Dumbbell Lateral Raises — 3 Sets', ['Slight lean forward', 'Lead with elbows, not wrists', 'Raise to just above shoulder height', 'Control the descent slowly'], 'Exhale on raise, hold briefly', ['Too heavy — shrugging traps']),
      _S('Dumbbell Bicep Curls — 3 Sets × 12 reps', ['Upper arms pinned to sides', 'Supinate wrist at top', 'Full range of motion', '2-second eccentric phase'], 'Exhale on curl, inhale lower', ['Swinging torso for momentum']),
      _S('Tricep Dips or Overhead Extensions — 3 Sets', ['Lean slightly forward on dips', 'Lock out fully at top', 'Keep elbows pointing back on extensions'], 'Exhale on push/extension'),
      _S('Face Pulls & Rear Delt Flyes — Shoulder Health Finisher', ['Pull to face level, rotate externally', 'Squeeze rear delts at end range', 'Light weight, high reps for joint health'], 'Controlled rhythmic breathing', ['Going too heavy']),
      _S('Abdominal Finisher: Plank, Dead Bug & Cable Crunches', ['Planks: squeeze everything', 'Dead bug: lower back pressed flat', 'Cable crunches: flex spine, not hips'], 'Exhale hard on crunch'),
      _S('Foam Rolling & Static Stretch — Quads, Hamstrings, Lats', ['Slow roll, pause on tender spots', 'Hold stretches 30–45 seconds each', 'Breathe into areas of tightness'], 'Deep relaxation breaths'),
      _S('Cool Down: Full Body Static Stretch & Recovery Protocol', ['Child\'s Pose 30s', 'Pigeon Pose each side 30s', 'Doorway chest stretch 30s', 'Seated hamstring fold 30s'], 'Long slow recovery breathing', ['Skipping cool-down after heavy lifting'], 180),
    ]);
  }

  if (cat.contains('cardio') || any(['cardio', 'endurance', 'sprint', 'booster', 'run', 'aerobic'])) {
    return build(const [
      _S('Warm-Up: Easy March in Place & Arm Swings', ['Land softly, don\'t slam feet', 'Gradually increase pace', 'Swing arms naturally with stride'], 'Natural easy breathing', ['Going too hard too fast']),
      _S('Warm-Up Mobility: Leg Swings & Hip Circles', ['Hold wall for balance', '10 swings each direction per leg', 'Large controlled hip circle loops'], 'Relaxed breath'),
      _S('Base Pace Cardio: Steady-State Jog or Step Touch', ['Find conversational pace', 'Keep shoulders relaxed', 'Midfoot strike for efficiency'], 'In through nose, out through mouth'),
      _S('Speed Interval 1: High Knees — 40 seconds MAX EFFORT', ['Drive knees up to hip height', 'Pump arms aggressively', 'Stay on balls of feet'], 'Fast, forced exhales', ['Looking down — keep head up']),
      _S('Active Recovery: Slow Walk — 20 seconds', ['Slow completely down', 'Open chest and breathe', 'Prepare mentally for next interval'], 'Recovery breath — inhale deeply'),
      _S('Speed Interval 2: Jumping Jacks — 40 seconds', ['Full range overhead on each jack', 'Soft knee landing every time', 'Maintain rhythm throughout'], 'Consistent rhythmic exhales'),
      _S('Active Recovery: Walk it Out — 20 seconds', ['Shake out legs', 'Roll shoulders back', 'Control breathing before next push'], 'Recovery inhales'),
      _S('Speed Interval 3: Skater Hops — 40 seconds', ['Lateral leap side to side', 'Touch down with opposite hand', 'Soft landings, absorb impact through knees'], 'Explosive exhale on each hop'),
      _S('Active Recovery: Slow March — 20 seconds', ['Slower tempo to bring HR down slightly', 'Breathe through nose', 'Stay loose'], 'Controlled recovery breath'),
      _S('Speed Interval 4: Butt Kicks — 40 seconds', ['Drive heels to glutes rapidly', 'Keep torso upright', 'Arms pump alongside body'], 'Short sharp exhales'),
      _S('Speed Interval 5: Speed Mountain Climbers — 40 seconds', ['Plank position, hips level', 'Drive knees alternating rapidly', 'Keep wrists under shoulders'], 'Power breath rhythm', ['Hips piking up too high']),
      _S('Speed Interval 6: Shadow Boxing Combinations — 40 seconds', ['Jab-cross-hook-uppercut combos', 'Stay light on feet', 'Engage core on every punch'], 'Sharp exhale on each strike'),
      _S('Speed Interval 7: Lateral Shuffles — 40 seconds', ['Low athletic stance', 'Quick side-to-side shuffle steps', 'Touch floor on each end'], 'Continuous steady breath'),
      _S('Speed Interval 8: Fast Feet & Drop Squats — 40 seconds', ['Rapid stutter-steps', 'Drop to squat every 4 counts', 'Explode back up quickly'], 'Pulsing exhale rhythm'),
      _S('Intensity Challenge: Final 2-Minute All-Out Effort', ['Choose your hardest move', 'Push past comfort zone', 'Give everything you have left'], 'Maximum output breath', ['Holding back on the final push']),
      _S('Active Cool Down: Walk, Roll Shoulders & Shake Out', ['Slow walk for 60 seconds', 'Roll shoulders front and back', 'Shake out legs and arms'], 'Long inhales to slow HR'),
      _S('Standing Lower Body Stretch: Quad, Hip Flexor, Calf', ['Quad stretch: hold ankle behind', 'Hip flexor: lunge stance, tuck pelvis', 'Calf stretch: push heel into floor'], 'Exhale into each stretch'),
      _S('Cool Down: Full Supine Stretch & Breathing Down', ['Lying hamstring strap stretch', 'Supine spinal twist both sides', 'Final breath body scan'], 'Deep recovery breaths', ['Sitting down immediately after cardio'], 120),
    ]);
  }

  if (cat.contains('core') || any(['core', 'abs', 'stability', 'pilates'])) {
    return build(const [
      _S('Warm-Up: Pelvic Tilts & Belly Button to Spine Activation', ['Lie on back, knees bent', 'Flatten lumbar to mat gently', 'Draw navel in and up without holding breath'], 'Exhale to hollow, inhale release', ['Holding breath during activation']),
      _S('Diaphragmatic Breathing: 360° Core Expansion (10 breaths)', ['Breathe into belly AND sides AND back', 'Feel full 360° rib expansion', 'Engage pelvic floor on exhale'], '3D diaphragmatic breath'),
      _S('Dead Bug Activation — 3 Sets × 10 reps each side', ['Lower back GLUED to floor throughout', 'Extend opposite arm and leg together', 'Return slowly with control', 'Never let back arch'], 'Exhale as limbs extend, inhale return', ['Lower back losing contact with floor']),
      _S('Forearm Plank Hold — 3 × 45 seconds', ['Elbows under shoulders exactly', 'Squeeze glutes and quads', 'Anterior pelvic tilt correction', 'Push floor away with elbows'], 'Slow steady breath — do NOT hold', ['Hips too high or sagging', 'Head drooping']),
      _S('Plank with Shoulder Taps — 2 × 20 taps total', ['Keep hips square — minimal rotation', 'Feet wider for more stability', 'Move slowly and deliberately'], 'Exhale on each tap', ['Rocking hips widely side to side']),
      _S('Controlled Bicycle Crunches — 3 × 20 reps', ['Rotate shoulder to opposite knee — not elbow', 'Extend far leg low but don\'t touch floor', 'Slow down — slower is harder', 'Keep lower back imprinted on mat'], 'Exhale on every rotation', ['Neck pulling, rushing speed']),
      _S('Reverse Crunches — 3 × 15 reps', ['Knees to chest, curl tailbone up', 'Control the lowering phase', 'Do not swing legs'], 'Exhale on lift, inhale descend', ['Using momentum to swing legs up']),
      _S('Side Plank — Left Side 3 × 30 seconds', ['Stack feet or stagger for easier mod', 'Drive hip up toward ceiling', 'Reach top arm high', 'Keep neck neutral'], 'Steady calm breath', ['Hip sagging toward floor']),
      _S('Side Plank — Right Side 3 × 30 seconds', ['Mirror left side cues', 'Keep full-body alignment', 'Top arm variation: reach forward for added challenge'], 'Calm controlled breathing'),
      _S('Side Plank Hip Dips — 2 × 12 per side', ['Forearm plank side position', 'Dip hip to floor and drive back up', 'Control movement with obliques'], 'Exhale on hip drive up'),
      _S('Russian Twists — 3 × 20 reps (weighted or bodyweight)', ['Lean back to 45°, feet slightly lifted', 'Rotate fully side to side from ribs', 'Hold weight at chest height'], 'Exhale on each rotation', ['Only moving arms, no torso rotation']),
      _S('Hollow Body Hold — 3 × 20-30 seconds', ['Legs extended and low (not touching floor)', 'Arms overhead or across chest', 'Lower back pressed fully flat', 'Eyes looking at thighs'], 'Shallow breath — maintain tension', ['Allowing back to arch off floor']),
      _S('V-Sit Hold & Pulses — 2 × 15', ['Balance on tailbone, arms and legs extended', 'Create V-shape with body', 'Pulse small for extra burn'], 'Exhale on each pulse hold'),
      _S('Flutter Kicks — 3 × 30 seconds', ['Hands under glutes for support', 'Legs low to floor (harder) or higher (easier)', 'Small rapid alternating kicks'], 'Continuous controlled breath'),
      _S('Toe Touch Crunches — 2 × 15', ['Legs vertical, reach for feet', 'Lift shoulder blades off mat', 'Controlled lowering'], 'Sharp exhale on crunch up'),
      _S('Plank to Down Dog Flow — 2 × 10 transitions', ['Push to downward dog from plank', 'Press heels toward floor in Dog', 'Return to plank with control'], 'Inhale Dog, exhale Plank'),
      _S('Cool Down: Cobra, Child\'s Pose & Supine Spinal Twist', ['Cobra: hold 20s, gentle backbend', 'Child\'s Pose: arms extended, breathe into back', 'Twist: both sides 20s each'], 'Deep slow recovery breathing', ['Rushing out of cool-down'], 120),
    ]);
  }

  // HIIT / Tabata / full body (default)
  final rounds = math.max(2, (durationMins / 8).round());
  final pool = <_S>[
    const _S('Warm-Up: Dynamic Mobility Circuit — Leg Swings, Hip Circles, Arm Swings', ['Build from slow to moderate pace', 'Full range of motion on all swings', 'Breathe deep and prepare mentally'], 'Natural energizing breath', ['Starting too fast, skipping this phase']),
    const _S('Warm-Up Activation: Jumping Jacks & High Knees — 60s easy', ['Moderate intensity only', 'Get blood flowing and body warm', 'Establish your breathing rhythm'], 'Steady easy rhythm'),
    for (var r = 1; r <= rounds; r++) ...[
      _S('Round $r — Exercise A: Explosive Burpees × 10 reps', const ['Chest to floor at bottom', 'Jump and clap overhead at top', 'Move fast but maintain form'], 'Exhale on every jump', const ['Collapsed hips in plank portion']),
      _S('Round $r — Exercise B: Jump Squats × 15 reps', const ['Squat to 90°, explode upward', 'Land with soft bent knees', 'Immediate re-descent into squat'], 'Exhale on jump'),
      _S('Round $r — Exercise C: Mountain Climbers × 40 seconds', const ['Plank with hips level', 'Drive knees fast alternately', 'Keep core braced and strong'], 'Rapid steady exhales', const ['Letting hips rise too high']),
      _S('Round $r — Exercise D: Push-Up Variations × 12 reps', const ['Wide, narrow, or diamond grip variations', 'Full range, chest touching floor', 'Explosive up on concentric'], 'Exhale on push'),
      _S('Round $r — Exercise E: Bicycle Crunches × 30 seconds', const ['Opposite elbow to knee each rep', 'Extend far leg low', 'Slow and deliberate motion'], 'Exhale on each rotation'),
      _S('Round $r — Rest Period: Walk It Out & Breathe', const ['Reduce heart rate slightly', 'Breathe through nose', 'Prepare for next round mentally'], 'Recovery breath', const [], 30),
    ],
    const _S('Final Burnout: Tabata Protocol — 4 minutes (8 rounds 20s on / 10s off)', ['Choose ONE exercise and go ALL OUT', 'Burpees, jump squats, or mountain climbers', 'Every single interval at maximum effort'], 'Maximum effort — gasp if needed', ['Pacing when it should be all-out']),
    const _S('Cool Down: Active Walk & Full Body Shake-Out', ['2 minutes easy walk', 'Shake out arms, legs, roll neck', 'Heart rate should drop noticeably'], 'Long deep recovery inhales'),
    const _S('Stretching: Quads, Hip Flexors & Hamstrings', ['Standing quad pull 20s each', 'Low lunge hip flexor 20s each', 'Standing toe-touch 20s'], 'Exhale into each stretch'),
    const _S('Stretching: Chest Opener, Shoulder Cross-Body & Tricep Overhead', ['Doorway chest stretch 20s', 'Cross-body shoulder 20s each', 'Overhead tricep 20s each'], 'Deep recovery breaths'),
    const _S('Cool Down: Child\'s Pose & Supine Breathing Recovery', ['Full child\'s pose: arms forward', 'Breathe into back body', 'Final body scan, release all tension'], 'Long slow recovery breathing', [], 120),
  ];
  return build(pool);
}
