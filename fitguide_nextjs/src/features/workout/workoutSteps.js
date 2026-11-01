/**
 * The steps of a workout: its own, or a default set built from its category,
 * title and length (shared by the player and the details page; the app's
 * default_steps.dart). Also reads a step's target from its text: reps
 * ("Burpees × 10 reps") or time ("× 40 seconds").
 */
import { requiredEquipment } from './catalogFilter';
import { weightText } from '../../lib/units';

/** The workout's steps, numbered. */
export function stepsFor(workout) {
  return workout?.steps?.length ? workout.steps : defaultSteps(workout);
}

/**
 * A step measured in reps, or null for a timed one: { reps: '10', sets?: '3' }.
 * Only when the text names reps and not a time ("× 40 seconds").
 */
export function repTarget(step) {
  const text = String(step?.instruction || '');
  if (/\b\d+\s*(s|sec|secs|seconds?|min|mins|minutes?)\b/i.test(text)) return null;
  const m = /(?:(\d+)\s*(?:sets?)?\s*[×x]\s*)?(\d+(?:\s*[–-]\s*\d+)?)\s*reps?\b/i.exec(text);
  if (!m) return null;
  return { reps: m[2].replace(/\s+/g, ''), ...(m[1] && { sets: m[1] }) };
}

/** Whether logging a weight makes sense: the workout needs equipment. */
export const usesWeights = (workout) => requiredEquipment({ equipment: workout?.equipment || [] }).length > 0;

/** "2:30" for a step length in seconds. */
export const stepClock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** "Round 1 — Exercise A: Explosive Burpees × 10 reps" → "Explosive Burpees"; the name a reader sees first. */
export function stepName(step) {
  const text = String(step?.exerciseName || step?.instruction || '').trim();
  const afterColon = text.includes(':') && text.indexOf(':') < 70 ? text.slice(text.indexOf(':') + 1) : text;
  const name = afterColon.split(/\s+[—–-]\s+|\s+[×x]\s+\d|\s+\(/)[0].trim();
  return name || text;
}

/** The name a step's set is saved under (and looked up by for "last time"). */
export const setName = (step, index) => String(step?.exerciseName || step?.instruction || `Step ${index + 1}`).slice(0, 200);

/** "10 reps × 40 kg", "12 reps" or "40 kg" (or lb) for a logged or suggested set. */
export function setLabel({ reps, weightKg }, units = 'metric') {
  return [reps > 0 && `${reps} reps`, weightKg > 0 && weightText(weightKg, units)].filter(Boolean).join(' × ');
}

/** Why the player suggests a set (a suggestion from the API's previous-sets). */
export function suggestionReason(suggestion) {
  if (suggestion.reason === 'add_weight') return 'You hit the top of the range last time, so add weight.';
  if (suggestion.reason === 'reach_range') return `Same weight. Aim for ${suggestion.reps} reps.`;
  return suggestion.weightKg ? 'Same weight, one more rep.' : 'One more rep than last time.';
}

export function defaultSteps(workout) {
  const cat = (workout?.category || '').toLowerCase();
  const title = (workout?.title || '').toLowerCase();
  const durationMins = workout?.duration || 20;
  const totalSeconds = durationMins * 60;

  // Target step count: ~1 step per 2.5 minutes, clamped between 6 and 24
  const targetCount = Math.max(6, Math.min(24, Math.round(durationMins / 2.5)));

  // Helper: pick n items from pool, distributing duration evenly
  function buildSteps(pool) {
    // Always include first 2 (warmup) and last 1-2 (cooldown) from pool
    const warmupCount = Math.min(2, Math.floor(targetCount * 0.15));
    const cooldownCount = Math.min(2, Math.floor(targetCount * 0.1));
    const mainCount = targetCount - warmupCount - cooldownCount;

    const warmupSteps = pool.slice(0, warmupCount);
    const cooldownSteps = pool.slice(pool.length - cooldownCount);
    const mainPool = pool.slice(warmupCount, pool.length - cooldownCount);

    // Cycle through main pool to fill mainCount slots
    const mainSteps = [];
    for (let i = 0; i < mainCount; i++) {
      mainSteps.push(mainPool[i % mainPool.length]);
    }

    const allSteps = [...warmupSteps, ...mainSteps, ...cooldownSteps];
    const perStepDuration = Math.floor(totalSeconds / allSteps.length);

    return allSteps.map((step, i) => ({
      ...step,
      stepNumber: i + 1,
      duration: step.fixedDuration || perStepDuration,
    }));
  }

  // ── YOGA ─────────────────────────────────────────────────────────────
  if (cat.includes('yoga') || title.includes('yoga') || title.includes('zen') || title.includes('flow') || title.includes('stretch') || title.includes('flexibility')) {
    return buildSteps([
      { instruction: 'Opening Centering: Breath Awareness & Pranayama', formCues: ['Close eyes, sit tall', 'Inhale 4s, hold 2s, exhale 6s', 'Let thoughts settle'], breathingPattern: 'Slow 4-2-6 pranayama breath', commonMistakes: ['Rushing this phase', 'Tension in shoulders'] },
      { instruction: 'Neck Rolls & Shoulder Circles — Releasing Tension', formCues: ['Move very slowly', 'Drop ear to shoulder gently', 'Keep jaw relaxed'], breathingPattern: 'Steady natural breath' },
      { instruction: 'Cat-Cow Flow — Spinal Awakening (10 rounds)', formCues: ['Arch back up on Cat exhale', 'Dip belly on Cow inhale', 'Move vertebra by vertebra'], breathingPattern: 'Inhale Cow, exhale Cat' },
      { instruction: 'Thread the Needle — Shoulder & Upper Back Release', formCues: ['Keep hips stacked over knees', 'Melt shoulder toward mat', 'Hold each side equally'], breathingPattern: 'Soften breath into the shoulder' },
      { instruction: 'Downward Dog Hold & Pedal Calves', formCues: ['Press palms flat, fingers spread', 'Lengthen spine away from hips', 'Gently alternate heel drops'], breathingPattern: 'Inhale lengthen, exhale deepen', commonMistakes: ['Rounding upper back', 'Weight too far forward'] },
      { instruction: 'Sun Salutation A — Full Flow (3 rounds)', formCues: ['Match each movement to breath', 'Keep core engaged throughout', 'Lengthen before folding'], breathingPattern: 'Synchronized inhale/exhale flow', commonMistakes: ['Collapsing lower back in Cobra'] },
      { instruction: 'Sun Salutation B — Extended Flow with Warriors (3 rounds)', formCues: ['Sink low in Warrior I', 'Square hips fully to front', 'Arms energetically reaching up'], breathingPattern: 'Deep rhythmic breath' },
      { instruction: 'Crescent Lunge — Hip Flexor Opener (Left & Right)', formCues: ['Stack front knee over ankle', 'Tuck pelvis slightly', 'Reach arms skyward'], breathingPattern: 'Inhale lengthen, exhale sink deeper', commonMistakes: ['Letting knee cave inward'] },
      { instruction: 'Warrior I — Grounding & Presence', formCues: ['Heel-to-heel alignment', 'Hips square to front', 'Gaze forward, arms strong'], breathingPattern: 'Expansive steady breath' },
      { instruction: 'Warrior II — Power & Openness', formCues: ['Arms extended strong like wings', 'Front thigh parallel to floor', 'Gaze over front fingers'], breathingPattern: 'Calm warrior breath' },
      { instruction: 'Extended Side Angle & Reverse Warrior', formCues: ['Reach top arm overhead', 'Feel long lateral line', 'Keep grounded back foot'], breathingPattern: 'Exhale into side body stretch' },
      { instruction: 'Triangle Pose (Trikonasana) — Left & Right', formCues: ['Hinge at hip, not waist', 'Stack shoulders vertically', 'Gaze up at top hand'], breathingPattern: 'Open breath into chest' },
      { instruction: 'Tree Pose (Vrikshasana) — Balance & Focus', formCues: ['Ground through big toe mound', 'Place foot above or below knee', 'Fix gaze on still point'], breathingPattern: 'Calm centering breath', commonMistakes: ['Foot pressing on knee joint'] },
      { instruction: 'Pigeon Pose — Deep Hip Opener (Left then Right)', formCues: ['Keep hips level', 'Flex front foot to protect knee', 'Fold forward over shin'], breathingPattern: 'Long slow exhale into hip', commonMistakes: ['Letting hips twist off-center'] },
      { instruction: 'Bridge Pose (Setu Bandhasana) — 3 holds x 30s', formCues: ['Press all four corners of feet', 'Drive hips high', 'Clasp hands under back'], breathingPattern: 'Inhale up, exhale hold' },
      { instruction: 'Seated Forward Fold (Paschimottanasana)', formCues: ['Hinge deeply from hip joints', 'Reach for feet or shins', 'Let head hang heavy'], breathingPattern: 'Exhale fold deeper each breath' },
      { instruction: 'Supine Spinal Twist — Left & Right', formCues: ['Keep both shoulders on mat', 'Guide knee across body gently', 'Look opposite to knee'], breathingPattern: 'Exhale into the twist' },
      { instruction: 'Happy Baby Pose — Releasing Lower Back', formCues: ['Hold outer edges of feet', 'Rock gently side to side', 'Relax lower back into mat'], breathingPattern: 'Playful easy breath' },
      { instruction: 'Legs Up the Wall (Viparita Karani) — 2 mins', formCues: ['Scoot hips close to wall', 'Arms at sides, palms up', 'Soften completely'], breathingPattern: 'Effortless restorative breath' },
      { instruction: 'Final Savasana — Deep Body Scan & Integration', fixedDuration: 180, formCues: ['Lie completely still', 'Release every muscle consciously', 'Allow full nervous system reset'], breathingPattern: 'Natural effortless breathing', commonMistakes: ['Moving or rushing out of Savasana'] },
    ]);
  }

  // ── STRENGTH / HYPERTROPHY ─────────────────────────────────────────
  if (cat.includes('strength') || title.includes('strength') || title.includes('pump') || title.includes('hypertrophy') || title.includes('muscle') || title.includes('lifting') || title.includes('weight')) {
    const sets = workout?.sets || 4;
    return buildSteps([
      { instruction: 'Warm-Up: Dynamic Joint Mobility Circuit', formCues: ['Leg swings front/back and lateral', 'Hip circles both directions', 'Arm circles and thoracic rotations'], breathingPattern: 'Natural energizing breath', commonMistakes: ['Skipping warm-up entirely'] },
      { instruction: 'Activation: Glute Bridges & Band Pull-Aparts', formCues: ['Squeeze glutes hard at top', 'Keep ribcage down on bridges', 'Pull band to chest level for scapular health'], breathingPattern: 'Exhale on bridge push', commonMistakes: ['Using lower back instead of glutes'] },
      { instruction: `Barbell Back Squats — Set 1 of ${sets} (8–10 reps)`, formCues: ['Bar on mid-traps', 'Break at hips and knees simultaneously', 'Knees track over toes', 'Chest proud throughout'], breathingPattern: 'Inhale descent, brace, exhale ascent', commonMistakes: ['Knees caving in', 'Butt wink at depth'] },
      { instruction: `Barbell Back Squats — Set 2 of ${sets} (8–10 reps)`, formCues: ['Slightly increase weight if Set 1 felt easy', 'Same technique, maintain bar path', 'Full depth if mobility allows'], breathingPattern: 'Belly breath at top, brace, exhale effort', commonMistakes: ['Forward torso lean'] },
      { instruction: `Barbell Back Squats — Set 3 of ${sets} (8–10 reps)`, formCues: ['Drive floor away with feet', 'Think "spread the floor" for knee tracking', 'Keep wrists neutral on bar'], breathingPattern: 'Rhythmic controlled breathing', commonMistakes: ['Half reps with heavy weight'] },
      { instruction: `Barbell Back Squats — Set 4 of ${sets} — Push to Near Failure`, formCues: ['Last 2 reps should be challenging', 'Spotter or safety bars in place', 'Explosive intent even as weight gets hard'], breathingPattern: 'Aggressive exhale on final reps' },
      { instruction: `Flat Barbell or Dumbbell Bench Press — Set 1 of ${sets}`, formCues: ['Feet flat on floor, back slightly arched', 'Bar over lower chest', 'Control descent to light touch on chest'], breathingPattern: 'Inhale down, exhale press', commonMistakes: ['Flared elbows 90°', 'Bouncing bar off chest'] },
      { instruction: `Flat Bench Press — Set 2 of ${sets} (6–8 reps)`, formCues: ['Drive through heels for leg drive', 'Keep shoulders retracted and depressed', 'Full lockout at top'], breathingPattern: 'Power exhale on press', commonMistakes: ['Wrists bending backward'] },
      { instruction: `Flat Bench Press — Set 3 of ${sets}`, formCues: ['Squeeze bar hard for lat activation', 'Think "bend the bar" for better chest engagement', 'Controlled 2-second descent'], breathingPattern: 'Steady rhythmic breath' },
      { instruction: 'Romanian Deadlifts (RDLs) — 3 Sets × 10 reps', formCues: ['Hip hinge, not knee bend', 'Bar stays close to shins/quads', 'Feel deep hamstring stretch at bottom', 'Hips drive forward to stand'], breathingPattern: 'Inhale top, exhale hinge down', commonMistakes: ['Rounding lower back', 'Bar drifting away from body'] },
      { instruction: 'Barbell or Dumbbell Bent-Over Rows — 3 Sets', formCues: ['Hinge to 45°, chest parallel to floor', 'Drive elbows back past torso', 'Squeeze shoulder blades at top', 'Lower slowly with control'], breathingPattern: 'Exhale on pull, inhale on lower', commonMistakes: ['Using momentum to swing weight'] },
      { instruction: 'Overhead Barbell or Dumbbell Press — 3 Sets × 8 reps', formCues: ['Press directly overhead, slightly behind head', 'Engage core hard to prevent back arch', 'Full lockout at top', 'Brace abs throughout'], breathingPattern: 'Exhale pressing up, inhale descending', commonMistakes: ['Arching lower back excessively'] },
      { instruction: 'Lat Pulldowns or Pull-Ups — 3 Sets × 8–12 reps', formCues: ['Initiate with lat depression, not arms', 'Pull bar to upper chest', 'Lean back slightly (15°)', 'Controlled return to full arm extension'], breathingPattern: 'Exhale on pull-down', commonMistakes: ['Pulling behind neck'] },
      { instruction: 'Cable or Dumbbell Lateral Raises — 3 Sets', formCues: ['Slight lean forward', 'Lead with elbows, not wrists', 'Raise to just above shoulder height', 'Control the descent slowly'], breathingPattern: 'Exhale on raise, hold briefly', commonMistakes: ['Too heavy — shrugging traps'] },
      { instruction: 'Dumbbell Bicep Curls — 3 Sets × 12 reps', formCues: ['Upper arms pinned to sides', 'Supinate wrist at top', 'Full range of motion', '2-second eccentric phase'], breathingPattern: 'Exhale on curl, inhale lower', commonMistakes: ['Swinging torso for momentum'] },
      { instruction: 'Tricep Dips or Overhead Extensions — 3 Sets', formCues: ['Lean slightly forward on dips', 'Lock out fully at top', 'Keep elbows pointing back on extensions'], breathingPattern: 'Exhale on push/extension' },
      { instruction: 'Face Pulls & Rear Delt Flyes — Shoulder Health Finisher', formCues: ['Pull to face level, rotate externally', 'Squeeze rear delts at end range', 'Light weight, high reps for joint health'], breathingPattern: 'Controlled rhythmic breathing', commonMistakes: ['Going too heavy'] },
      { instruction: 'Abdominal Finisher: Plank, Dead Bug & Cable Crunches', formCues: ['Planks: squeeze everything', 'Dead bug: lower back pressed flat', 'Cable crunches: flex spine, not hips'], breathingPattern: 'Exhale hard on crunch' },
      { instruction: 'Foam Rolling & Static Stretch — Quads, Hamstrings, Lats', formCues: ['Slow roll, pause on tender spots', 'Hold stretches 30–45 seconds each', 'Breathe into areas of tightness'], breathingPattern: 'Deep relaxation breaths' },
      { instruction: 'Cool Down: Full Body Static Stretch & Recovery Protocol', fixedDuration: 180, formCues: ['Child\'s Pose 30s', 'Pigeon Pose each side 30s', 'Doorway chest stretch 30s', 'Seated hamstring fold 30s'], breathingPattern: 'Long slow recovery breathing', commonMistakes: ['Skipping cool-down after heavy lifting'] },
    ]);
  }

  // ── CARDIO / ENDURANCE ────────────────────────────────────────────
  if (cat.includes('cardio') || title.includes('cardio') || title.includes('endurance') || title.includes('sprint') || title.includes('booster') || title.includes('run') || title.includes('aerobic')) {
    return buildSteps([
      { instruction: 'Warm-Up: Easy March in Place & Arm Swings', formCues: ['Land softly, don\'t slam feet', 'Gradually increase pace', 'Swing arms naturally with stride'], breathingPattern: 'Natural easy breathing', commonMistakes: ['Going too hard too fast'] },
      { instruction: 'Warm-Up Mobility: Leg Swings & Hip Circles', formCues: ['Hold wall for balance', '10 swings each direction per leg', 'Large controlled hip circle loops'], breathingPattern: 'Relaxed breath' },
      { instruction: 'Base Pace Cardio: Steady-State Jog or Step Touch', formCues: ['Find conversational pace', 'Keep shoulders relaxed', 'Midfoot strike for efficiency'], breathingPattern: 'In through nose, out through mouth' },
      { instruction: 'Speed Interval 1: High Knees — 40 seconds MAX EFFORT', formCues: ['Drive knees up to hip height', 'Pump arms aggressively', 'Stay on balls of feet'], breathingPattern: 'Fast, forced exhales', commonMistakes: ['Looking down — keep head up'] },
      { instruction: 'Active Recovery: Slow Walk — 20 seconds', formCues: ['Slow completely down', 'Open chest and breathe', 'Prepare mentally for next interval'], breathingPattern: 'Recovery breath — inhale deeply' },
      { instruction: 'Speed Interval 2: Jumping Jacks — 40 seconds', formCues: ['Full range overhead on each jack', 'Soft knee landing every time', 'Maintain rhythm throughout'], breathingPattern: 'Consistent rhythmic exhales' },
      { instruction: 'Active Recovery: Walk it Out — 20 seconds', formCues: ['Shake out legs', 'Roll shoulders back', 'Control breathing before next push'], breathingPattern: 'Recovery inhales' },
      { instruction: 'Speed Interval 3: Skater Hops — 40 seconds', formCues: ['Lateral leap side to side', 'Touch down with opposite hand', 'Soft landings, absorb impact through knees'], breathingPattern: 'Explosive exhale on each hop' },
      { instruction: 'Active Recovery: Slow March — 20 seconds', formCues: ['Slower tempo to bring HR down slightly', 'Breathe through nose', 'Stay loose'], breathingPattern: 'Controlled recovery breath' },
      { instruction: 'Speed Interval 4: Butt Kicks — 40 seconds', formCues: ['Drive heels to glutes rapidly', 'Keep torso upright', 'Arms pump alongside body'], breathingPattern: 'Short sharp exhales' },
      { instruction: 'Speed Interval 5: Speed Mountain Climbers — 40 seconds', formCues: ['Plank position, hips level', 'Drive knees alternating rapidly', 'Keep wrists under shoulders'], breathingPattern: 'Power breath rhythm', commonMistakes: ['Hips piking up too high'] },
      { instruction: 'Speed Interval 6: Shadow Boxing Combinations — 40 seconds', formCues: ['Jab-cross-hook-uppercut combos', 'Stay light on feet', 'Engage core on every punch'], breathingPattern: 'Sharp exhale on each strike' },
      { instruction: 'Speed Interval 7: Lateral Shuffles — 40 seconds', formCues: ['Low athletic stance', 'Quick side-to-side shuffle steps', 'Touch floor on each end'], breathingPattern: 'Continuous steady breath' },
      { instruction: 'Speed Interval 8: Fast Feet & Drop Squats — 40 seconds', formCues: ['Rapid stutter-steps', 'Drop to squat every 4 counts', 'Explode back up quickly'], breathingPattern: 'Pulsing exhale rhythm' },
      { instruction: 'Intensity Challenge: Final 2-Minute All-Out Effort', formCues: ['Choose your hardest move', 'Push past comfort zone', 'Give everything you have left'], breathingPattern: 'Maximum output breath', commonMistakes: ['Holding back on the final push'] },
      { instruction: 'Active Cool Down: Walk, Roll Shoulders & Shake Out', formCues: ['Slow walk for 60 seconds', 'Roll shoulders front and back', 'Shake out legs and arms'], breathingPattern: 'Long inhales to slow HR' },
      { instruction: 'Standing Lower Body Stretch: Quad, Hip Flexor, Calf', formCues: ['Quad stretch: hold ankle behind', 'Hip flexor: lunge stance, tuck pelvis', 'Calf stretch: push heel into floor'], breathingPattern: 'Exhale into each stretch' },
      { instruction: 'Cool Down: Full Supine Stretch & Breathing Down', fixedDuration: 120, formCues: ['Lying hamstring strap stretch', 'Supine spinal twist both sides', 'Final breath body scan'], breathingPattern: 'Deep recovery breaths', commonMistakes: ['Sitting down immediately after cardio'] },
    ]);
  }

  // ── CORE / ABS / STABILITY ─────────────────────────────────────────
  if (cat.includes('core') || title.includes('core') || title.includes('abs') || title.includes('stability') || title.includes('pilates')) {
    return buildSteps([
      { instruction: 'Warm-Up: Pelvic Tilts & Belly Button to Spine Activation', formCues: ['Lie on back, knees bent', 'Flatten lumbar to mat gently', 'Draw navel in and up without holding breath'], breathingPattern: 'Exhale to hollow, inhale release', commonMistakes: ['Holding breath during activation'] },
      { instruction: 'Diaphragmatic Breathing: 360° Core Expansion (10 breaths)', formCues: ['Breathe into belly AND sides AND back', 'Feel full 360° rib expansion', 'Engage pelvic floor on exhale'], breathingPattern: '3D diaphragmatic breath' },
      { instruction: 'Dead Bug Activation — 3 Sets × 10 reps each side', formCues: ['Lower back GLUED to floor throughout', 'Extend opposite arm and leg together', 'Return slowly with control', 'Never let back arch'], breathingPattern: 'Exhale as limbs extend, inhale return', commonMistakes: ['Lower back losing contact with floor'] },
      { instruction: 'Forearm Plank Hold — 3 × 45 seconds', formCues: ['Elbows under shoulders exactly', 'Squeeze glutes and quads', 'Anterior pelvic tilt correction', 'Push floor away with elbows'], breathingPattern: 'Slow steady breath — do NOT hold', commonMistakes: ['Hips too high or sagging', 'Head drooping'] },
      { instruction: 'Plank with Shoulder Taps — 2 × 20 taps total', formCues: ['Keep hips square — minimal rotation', 'Feet wider for more stability', 'Move slowly and deliberately'], breathingPattern: 'Exhale on each tap', commonMistakes: ['Rocking hips widely side to side'] },
      { instruction: 'Controlled Bicycle Crunches — 3 × 20 reps', formCues: ['Rotate shoulder to opposite knee — not elbow', 'Extend far leg low but don\'t touch floor', 'Slow down — slower is harder', 'Keep lower back imprinted on mat'], breathingPattern: 'Exhale on every rotation', commonMistakes: ['Neck pulling, rushing speed'] },
      { instruction: 'Reverse Crunches — 3 × 15 reps', formCues: ['Knees to chest, curl tailbone up', 'Control the lowering phase', 'Do not swing legs'], breathingPattern: 'Exhale on lift, inhale descend', commonMistakes: ['Using momentum to swing legs up'] },
      { instruction: 'Side Plank — Left Side 3 × 30 seconds', formCues: ['Stack feet or stagger for easier mod', 'Drive hip up toward ceiling', 'Reach top arm high', 'Keep neck neutral'], breathingPattern: 'Steady calm breath', commonMistakes: ['Hip sagging toward floor'] },
      { instruction: 'Side Plank — Right Side 3 × 30 seconds', formCues: ['Mirror left side cues', 'Keep full-body alignment', 'Top arm variation: reach forward for added challenge'], breathingPattern: 'Calm controlled breathing' },
      { instruction: 'Side Plank Hip Dips — 2 × 12 per side', formCues: ['Forearm plank side position', 'Dip hip to floor and drive back up', 'Control movement with obliques'], breathingPattern: 'Exhale on hip drive up' },
      { instruction: 'Russian Twists — 3 × 20 reps (weighted or bodyweight)', formCues: ['Lean back to 45°, feet slightly lifted', 'Rotate fully side to side from ribs', 'Hold weight at chest height'], breathingPattern: 'Exhale on each rotation', commonMistakes: ['Only moving arms, no torso rotation'] },
      { instruction: 'Hollow Body Hold — 3 × 20-30 seconds', formCues: ['Legs extended and low (not touching floor)', 'Arms overhead or across chest', 'Lower back pressed fully flat', 'Eyes looking at thighs'], breathingPattern: 'Shallow breath — maintain tension', commonMistakes: ['Allowing back to arch off floor'] },
      { instruction: 'V-Sit Hold & Pulses — 2 × 15', formCues: ['Balance on tailbone, arms and legs extended', 'Create V-shape with body', 'Pulse small for extra burn'], breathingPattern: 'Exhale on each pulse hold' },
      { instruction: 'Flutter Kicks — 3 × 30 seconds', formCues: ['Hands under glutes for support', 'Legs low to floor (harder) or higher (easier)', 'Small rapid alternating kicks'], breathingPattern: 'Continuous controlled breath' },
      { instruction: 'Toe Touch Crunches — 2 × 15', formCues: ['Legs vertical, reach for feet', 'Lift shoulder blades off mat', 'Controlled lowering'], breathingPattern: 'Sharp exhale on crunch up' },
      { instruction: 'Plank to Down Dog Flow — 2 × 10 transitions', formCues: ['Push to downward dog from plank', 'Press heels toward floor in Dog', 'Return to plank with control'], breathingPattern: 'Inhale Dog, exhale Plank' },
      { instruction: 'Cool Down: Cobra, Child\'s Pose & Supine Spinal Twist', fixedDuration: 120, formCues: ['Cobra: hold 20s, gentle backbend', 'Child\'s Pose: arms extended, breathe into back', 'Twist: both sides 20s each'], breathingPattern: 'Deep slow recovery breathing', commonMistakes: ['Rushing out of cool-down'] },
    ]);
  }

  // ── HIIT / TABATA / FULL BODY (Default) ───────────────────────────
  const rounds = Math.max(2, Math.round(durationMins / 8));
  const hiitPool = [
    { instruction: 'Warm-Up: Dynamic Mobility Circuit — Leg Swings, Hip Circles, Arm Swings', formCues: ['Build from slow to moderate pace', 'Full range of motion on all swings', 'Breathe deep and prepare mentally'], breathingPattern: 'Natural energizing breath', commonMistakes: ['Starting too fast, skipping this phase'] },
    { instruction: 'Warm-Up Activation: Jumping Jacks & High Knees — 60s easy', formCues: ['Moderate intensity only', 'Get blood flowing and body warm', 'Establish your breathing rhythm'], breathingPattern: 'Steady easy rhythm' },
  ];
  for (let r = 1; r <= rounds; r++) {
    hiitPool.push(
      { instruction: `Round ${r} — Exercise A: Explosive Burpees × 10 reps`, formCues: ['Chest to floor at bottom', 'Jump and clap overhead at top', 'Move fast but maintain form'], breathingPattern: 'Exhale on every jump', commonMistakes: ['Collapsed hips in plank portion'] },
      { instruction: `Round ${r} — Exercise B: Jump Squats × 15 reps`, formCues: ['Squat to 90°, explode upward', 'Land with soft bent knees', 'Immediate re-descent into squat'], breathingPattern: 'Exhale on jump' },
      { instruction: `Round ${r} — Exercise C: Mountain Climbers × 40 seconds`, formCues: ['Plank with hips level', 'Drive knees fast alternately', 'Keep core braced and strong'], breathingPattern: 'Rapid steady exhales', commonMistakes: ['Letting hips rise too high'] },
      { instruction: `Round ${r} — Exercise D: Push-Up Variations × 12 reps`, formCues: ['Wide, narrow, or diamond grip variations', 'Full range, chest touching floor', 'Explosive up on concentric'], breathingPattern: 'Exhale on push' },
      { instruction: `Round ${r} — Exercise E: Bicycle Crunches × 30 seconds`, formCues: ['Opposite elbow to knee each rep', 'Extend far leg low', 'Slow and deliberate motion'], breathingPattern: 'Exhale on each rotation' },
      { instruction: `Round ${r} — Rest Period: Walk It Out & Breathe`, fixedDuration: 30, formCues: ['Reduce heart rate slightly', 'Breathe through nose', 'Prepare for next round mentally'], breathingPattern: 'Recovery breath' },
    );
  }
  hiitPool.push(
    { instruction: 'Final Burnout: Tabata Protocol — 4 minutes (8 rounds 20s on / 10s off)', formCues: ['Choose ONE exercise and go ALL OUT', 'Burpees, jump squats, or mountain climbers', 'Every single interval at maximum effort'], breathingPattern: 'Maximum effort — gasp if needed', commonMistakes: ['Pacing when it should be all-out'] },
    { instruction: 'Cool Down: Active Walk & Full Body Shake-Out', formCues: ['2 minutes easy walk', 'Shake out arms, legs, roll neck', 'Heart rate should drop noticeably'], breathingPattern: 'Long deep recovery inhales' },
    { instruction: 'Stretching: Quads, Hip Flexors & Hamstrings', formCues: ['Standing quad pull 20s each', 'Low lunge hip flexor 20s each', 'Standing toe-touch 20s'], breathingPattern: 'Exhale into each stretch' },
    { instruction: 'Stretching: Chest Opener, Shoulder Cross-Body & Tricep Overhead', formCues: ['Doorway chest stretch 20s', 'Cross-body shoulder 20s each', 'Overhead tricep 20s each'], breathingPattern: 'Deep recovery breaths' },
    { instruction: 'Cool Down: Child\'s Pose & Supine Breathing Recovery', fixedDuration: 120, formCues: ['Full child\'s pose: arms forward', 'Breathe into back body', 'Final body scan, release all tension'], breathingPattern: 'Long slow recovery breathing' },
  );
  return buildSteps(hiitPool);
}
