'use client';

/**
 * Enhanced Workout Execution Component
 * Professional Dark UI Redesign (FitGuide Next.js)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useExerciseGif } from './hooks/useExerciseGif';
import { SessionSummary } from './SessionSummary';
import {
  X, Play, Pause, ChevronLeft, ChevronRight, Check, Clock,
  Flame, Target, AlertTriangle, Volume2, VolumeX, Info,
  Zap, Activity
} from 'lucide-react';

// Circular Timer SVG Component
function CircularTimer({ timeRemaining, totalDuration, color, isPlaying }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalDuration > 0 ? timeRemaining / totalDuration : 1;
  const offset = circumference * (1 - fraction);
  const timerColor =
    timeRemaining <= 5  ? '#f87171' :
    timeRemaining <= 10 ? '#fb923c' :
    color;

  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="drop-shadow-2xl">
      <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7"/>
      <circle
        cx="65" cy="65" r={radius} fill="none" stroke={timerColor} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 65 65)"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
      />
      <circle
        cx="65" cy="65" r={radius} fill="none" stroke={timerColor} strokeWidth="2"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 65 65)" opacity="0.35"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease', filter: 'blur(3px)' }}
      />
      {isPlaying && (
        <circle cx="65" cy={65 - radius} r="4.5" fill={timerColor}
          transform={`rotate(${360 * (1 - fraction)} 65 65)`}
          style={{ transition: 'transform 1s linear' }} />
      )}
    </svg>
  );
}

/**
 * Guided workout player. When the workout ends (or the user stops early and
 * chooses to save) it opens SessionSummary, which saves the session.
 *
 * @param {object} [props.program]  { enrollmentId, week, day } when this is a scheduled program day
 * @param {(result?: object) => void} props.onComplete  Called when the user leaves the summary
 */
export const EnhancedWorkoutExecution = ({ workout, tintColor = '#00C4B4', program = null, onExit, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [stepTotalDuration, setStepTotalDuration] = useState(0);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isResting, setIsResting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  // { status: 'completed' | 'partial', completedAt } while the end-of-session summary is open
  const [summary, setSummary] = useState(null);
  // Optional reps/weight the user logged per step: { [stepIndex]: { reps, weightKg } }
  const [setInputs, setSetInputs] = useState({});
  const startedAtRef = useRef(new Date().toISOString());
  const stepSecondsRef = useRef({}); // active seconds spent on each step
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gifLoaded, setGifLoaded] = useState(false);

  const steps = workout?.steps && workout.steps.length > 0
    ? workout.steps
    : generateEnhancedDefaultSteps();

  const currentStep = steps[currentStepIndex];
  const { gifUrl: liveGifUrl, loading: gifLoading } = useExerciseGif(currentStep?.gifUrl, currentStep?.instruction || '');
  const displayMediaUrl = liveGifUrl || currentStep?.imageUrl || null;

  useEffect(() => { setGifLoaded(false); }, [currentStepIndex]);

  const totalSteps = steps.length;
  const progress = ((completedSteps.size) / totalSteps) * 100;
  const estimatedCaloriesBurned = Math.floor((totalElapsedTime / 60) * ((workout?.calories || 200) / (workout?.duration || 30)));

  function generateEnhancedDefaultSteps() {
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

  const playBeep = () => {
    try {
      if (soundEnabled) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.value = 0.25;
        osc.start();
        setTimeout(() => osc.stop(), 100);
      }
    } catch (_) {}
  };

  useEffect(() => {
    let interval;
    if (isPlaying && timeRemaining > 0) {
      interval = window.setInterval(() => {
        setTimeRemaining(prev => {
          if (soundEnabled && (prev === 10 || prev === 5 || prev === 3)) playBeep();
          if (prev <= 1) {
            if (workout?.restPeriod && !isResting && currentStepIndex < totalSteps - 1) {
              startRestPeriod();
            } else if (currentStepIndex < totalSteps - 1) {
              handleStepComplete();
            } else {
              handleWorkoutComplete();
            }
            return 0;
          }
          return prev - 1;
        });
        setTotalElapsedTime(prev => prev + 1);
        if (!isResting) stepSecondsRef.current[currentStepIndex] = (stepSecondsRef.current[currentStepIndex] || 0) + 1;
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeRemaining, currentStepIndex, isResting]);

  useEffect(() => {
    const dur = currentStep?.duration || 60;
    setTimeRemaining(dur);
    setStepTotalDuration(dur);
    setIsPlaying(false);
  }, [currentStepIndex]);

  const startRestPeriod = () => {
    setIsResting(true);
    const rest = workout?.restPeriod || 30;
    setTimeRemaining(rest);
    setStepTotalDuration(rest);
    if (soundEnabled) playBeep();
  };

  const handlePlayPause = () => setIsPlaying(p => !p);

  const handleStepComplete = useCallback(() => {
    setCompletedSteps(prev => new Set(prev).add(currentStepIndex));
    if (currentStepIndex === totalSteps - 1) {
      handleWorkoutComplete();
    } else {
      setIsResting(false);
      setCurrentStepIndex(i => i + 1);
    }
  }, [currentStepIndex, totalSteps]);

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(i => i - 1);
      setIsResting(false);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) handleStepComplete();
  };

  const handleWorkoutComplete = () => {
    setIsPlaying(false);
    setCompletedSteps(prev => new Set(prev).add(currentStepIndex));
    if (soundEnabled) playBeep();
    setSummary({ status: 'completed', completedAt: new Date().toISOString() });
  };

  const handleSaveAndExit = () => {
    setShowExitDialog(false);
    setIsPlaying(false);
    setSummary({ status: 'partial', completedAt: new Date().toISOString() });
  };

  const updateSetInput = (field, value) => {
    setSetInputs(prev => ({ ...prev, [currentStepIndex]: { ...prev[currentStepIndex], [field]: value } }));
  };

  /** The session as the API expects it (effort and notes are added by SessionSummary). */
  const buildSessionDraft = () => {
    const parse = (value, fn) => (value === undefined || value === '' ? undefined : fn(value));
    const wallClockSec = Math.round((Date.parse(summary.completedAt) - Date.parse(startedAtRef.current)) / 1000);
    const sets = steps.map((step, idx) => {
      const seconds = stepSecondsRef.current[idx] || 0;
      const input = setInputs[idx] || {};
      const reps = parse(input.reps, (v) => Math.max(0, parseInt(v, 10)));
      const weightKg = parse(input.weightKg, (v) => Math.max(0, parseFloat(v)));
      if (!completedSteps.has(idx) && !seconds && reps === undefined && weightKg === undefined) return null;
      return {
        exerciseName: String(step.exerciseName || step.instruction || `Step ${idx + 1}`).slice(0, 200),
        reps: Number.isFinite(reps) ? reps : undefined,
        weightKg: Number.isFinite(weightKg) ? weightKg : undefined,
        durationSec: seconds || undefined,
      };
    }).filter(Boolean);
    return {
      workoutSlug: workout.slug,
      workoutTitle: workout.title,
      startedAt: startedAtRef.current,
      completedAt: summary.completedAt,
      // Timer time if the timer was used, otherwise time since the player opened.
      durationSec: totalElapsedTime > 0 ? totalElapsedTime : wallClockSec,
      stepsCompleted: completedSteps.size,
      totalSteps,
      sets,
      ...(program && { enrollmentId: program.enrollmentId, programWeek: program.week, programDay: program.day }),
    };
  };

  const handleExit = () => {
    if (totalElapsedTime > 30 || completedSteps.size > 0) setShowExitDialog(true);
    else onExit();
  };

  const formatTime = s => {
    const m = Math.floor(s / 60);
    return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => timeRemaining <= 5 ? '#f87171' : timeRemaining <= 10 ? '#fb923c' : tintColor;

  return (
    <div className="min-h-screen text-white relative overflow-hidden bg-[#0A0C10] font-sans">

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 opacity-20">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl" style={{ background: tintColor }} />
        <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full blur-3xl bg-indigo-600 opacity-30" />
      </div>

      {/* ── TOP NAVIGATION HUD ── */}
      <div className="relative z-30 flex items-center justify-between px-6 py-4 bg-[#0A0C10]/90 backdrop-blur-md border-b border-white/10">
        <button onClick={handleExit} aria-label="Exit workout" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
          <X className="w-5 h-5 text-white" aria-hidden="true" />
        </button>

        <div className="flex-1 mx-6 max-w-xl">
          <div className="flex justify-between text-xs text-white/50 mb-1.5 font-medium">
            <span className="truncate">{workout?.title}</span>
            <span>{completedSteps.size} of {totalSteps} completed</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: tintColor }} />
          </div>
        </div>

        <button onClick={() => setSoundEnabled(p => !p)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
          {soundEnabled ? <Volume2 className="w-5 h-5 text-white" /> : <VolumeX className="w-5 h-5 text-white/40" />}
        </button>
      </div>

      {/* ── REST OVERLAY ── */}
      {isResting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0C10]/95 backdrop-blur-2xl animate-fade-in">
          <div className="text-center px-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: tintColor }}>Rest Period</p>
            <div className="relative flex items-center justify-center mb-8">
              <CircularTimer timeRemaining={timeRemaining} totalDuration={workout?.restPeriod || 30} color={tintColor} isPlaying />
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black" style={{ color: tintColor }}>{timeRemaining}</span>
              </div>
            </div>
            <h2 className="text-3xl font-extrabold mb-2">Take a Breather</h2>
            <p className="text-white/60 mb-8 text-base">You're doing fantastic! Grab some water 💧</p>
            <button onClick={handleStepComplete} className="px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all hover:scale-105" style={{ backgroundColor: tintColor, color: '#0A0C10' }}>
              Skip Rest
            </button>
          </div>
        </div>
      )}

      {/* ── CELEBRATION OVERLAY ── */}
      {summary && (
        <SessionSummary
          draft={buildSessionDraft()}
          status={summary.status}
          caloriesPerMinute={(workout?.calories || 0) / (workout?.duration || 1)}
          tintColor={tintColor}
          onDone={(result) => (summary.status === 'completed' || result ? onComplete(result) : onExit())}
          onResume={summary.status === 'partial' ? () => setSummary(null) : undefined}
        />
      )}

      {/* ── MAIN SPLIT CONTENT ── */}
      <div className="relative z-10 flex flex-col lg:flex-row h-[calc(100vh-65px)] max-w-[1340px] mx-auto">

        {/* LEFT COLUMN: Full Details & Steps */}
        <div className="flex-1 overflow-y-auto px-6 py-6 lg:py-8 lg:pr-6 custom-scrollbar">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Title & Badges */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {workout?.category && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border" style={{ backgroundColor: `${tintColor}15`, color: tintColor, borderColor: `${tintColor}30` }}>
                    {workout.category}
                  </span>
                )}
                {workout?.difficulty && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white/60">
                    {workout.difficulty}
                  </span>
                )}
                {workout?.intensity && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500/10 border border-orange-500/20 text-orange-400">
                    {workout.intensity} Intensity
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-extrabold leading-tight mb-3">{workout?.title}</h1>
              {workout?.description && (
                <p className="text-sm text-white/70 leading-relaxed border-t border-white/10 pt-3 mt-3">
                  {workout.description}
                </p>
              )}
            </div>

            {/* Live Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#131921] border border-white/10 p-4 rounded-2xl text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                <span className="text-lg font-bold">{Math.floor(totalElapsedTime / 60)}m</span>
                <p className="text-xs text-white/40">Elapsed</p>
              </div>
              <div className="bg-[#131921] border border-white/10 p-4 rounded-2xl text-center">
                <Flame className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                <span className="text-lg font-bold">{estimatedCaloriesBurned}</span>
                <p className="text-xs text-white/40">Calories</p>
              </div>
              <div className="bg-[#131921] border border-white/10 p-4 rounded-2xl text-center">
                <Zap className="w-5 h-5 mx-auto mb-1" style={{ color: tintColor }} />
                <span className="text-lg font-bold">{totalSteps - completedSteps.size}</span>
                <p className="text-xs text-white/40">Remaining</p>
              </div>
            </div>

            {/* Workout Steps List */}
            <div className="bg-[#131921] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" style={{ color: tintColor }} />
                Workout Steps ({totalSteps})
              </h3>
              <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                {steps.map((step, idx) => {
                  const isCurrent = idx === currentStepIndex;
                  const isDone = completedSteps.has(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => { setCurrentStepIndex(idx); setIsResting(false); }}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                        isCurrent
                          ? 'bg-white/10 border-2'
                          : isDone
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                      style={{ borderColor: isCurrent ? tintColor : undefined }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{
                          backgroundColor: isDone ? '#22c55e' : isCurrent ? tintColor : 'rgba(255,255,255,0.15)',
                          color: isDone || isCurrent ? '#0A0C10' : '#fff'
                        }}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm" style={{ color: isCurrent ? tintColor : isDone ? '#4ade80' : '#fff' }}>
                            Step {step.stepNumber || idx + 1}
                          </span>
                          {step.duration && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                              {Math.floor(step.duration / 60)}:{(step.duration % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/70 truncate mt-0.5">{step.instruction}</p>
                      </div>
                      {isCurrent && (
                        <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: tintColor }} />
                      )}
                      {step.gifUrl && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black/40">
                          <img src={step.gifUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Tips & Breathing Guidance */}
            {currentStep && (currentStep.formCues?.length > 0 || currentStep.breathingPattern || currentStep.commonMistakes?.length > 0) && (
              <div className="bg-[#131921] border border-white/10 rounded-2xl p-6 space-y-4">
                <h4 className="text-lg font-bold flex items-center gap-2">
                  <Info className="w-5 h-5" style={{ color: tintColor }} />
                  Form Cues & Guidance
                </h4>

                {currentStep.formCues?.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="font-bold text-xs uppercase tracking-wider mb-2" style={{ color: tintColor }}>✓ Form Cues</p>
                    <ul className="space-y-1.5 text-sm text-white/80">
                      {currentStep.formCues.map((cue, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span style={{ color: tintColor }}>•</span>
                          <span>{cue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentStep.breathingPattern && (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                    <p className="font-bold text-xs uppercase tracking-wider mb-1 text-indigo-400">Breathing Pattern</p>
                    <p className="text-sm text-white/80">{currentStep.breathingPattern}</p>
                  </div>
                )}

                {currentStep.commonMistakes?.length > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                    <p className="font-bold text-xs uppercase tracking-wider mb-2 text-orange-400">⚠ Common Mistakes</p>
                    <ul className="space-y-1.5 text-sm text-orange-200">
                      {currentStep.commonMistakes.map((m, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-400">×</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Equipment & Target Muscles */}
            {((workout?.equipment?.length > 0) || (workout?.targetMuscles?.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workout?.equipment?.length > 0 && (
                  <div className="bg-[#131921] border border-white/10 rounded-2xl p-6">
                    <h4 className="text-base font-bold mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-400" />
                      Equipment
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {workout.equipment.map((item, i) => (
                        <span key={i} className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {workout?.targetMuscles?.length > 0 && (
                  <div className="bg-[#131921] border border-white/10 rounded-2xl p-6">
                    <h4 className="text-base font-bold mb-3 flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-400" />
                      Target Muscles
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {workout.targetMuscles.map((m, i) => (
                        <span key={i} className="px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-semibold">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Benefits */}
            {workout?.benefits?.length > 0 && (
              <div className="bg-[#131921] border border-white/10 rounded-2xl p-6">
                <h4 className="text-base font-bold mb-3 flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  Benefits
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-white/70">
                  {workout.benefits.map((b, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prerequisites & Cautions */}
            {((workout?.prerequisites?.length > 0) || (workout?.cautions?.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workout?.prerequisites?.length > 0 && (
                  <div className="bg-[#131921] border border-white/10 rounded-2xl p-6">
                    <h4 className="text-base font-bold mb-3 flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-400" />
                      Prerequisites
                    </h4>
                    <ul className="space-y-1.5 text-xs text-white/70">
                      {workout.prerequisites.map((p, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {workout?.cautions?.length > 0 && (
                  <div className="bg-[#131921] border border-white/10 rounded-2xl p-6">
                    <h4 className="text-base font-bold mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-400" />
                      Safety & Cautions
                    </h4>
                    <ul className="space-y-1.5 text-xs text-orange-200">
                      {workout.cautions.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Comprehensive Workout Details */}
            <div className="bg-[#131921] border border-white/10 rounded-2xl p-6">
              <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" style={{ color: tintColor }} />
                Workout Specifications
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-white/40 mb-1">Duration</p>
                  <p className="text-base font-bold">{workout?.duration || 30} min</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-white/40 mb-1">Difficulty</p>
                  <p className="text-base font-bold">{workout?.difficulty || 'All Levels'}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-white/40 mb-1">Intensity</p>
                  <p className="text-base font-bold">{workout?.intensity || 'Moderate'}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-white/40 mb-1">Est. Burn</p>
                  <p className="text-base font-bold">{workout?.calories || 200} kcal</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Demo & Timer Controls */}
        <div className="lg:w-[440px] flex-shrink-0 overflow-y-auto px-6 py-6 lg:py-8 lg:pl-4 border-l border-white/10 bg-white/[0.02]">
          <div className="space-y-6">

            {/* Top: Workout Steps Heading / Current Step */}
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              <h2 className="text-xl font-extrabold mt-1 leading-snug">{currentStep?.instruction}</h2>
            </div>

            {/* Square Container: Media Demo (NO duplicate timer overlay) */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#131921] border border-white/10 shadow-2xl">
              {gifLoading && !gifLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${tintColor}20` }}>
                    <Target className="w-7 h-7 animate-spin" style={{ color: tintColor }} />
                  </div>
                </div>
              )}
              {displayMediaUrl ? (
                <img
                  src={displayMediaUrl}
                  alt={currentStep?.instruction}
                  className={`w-full h-full object-cover transition-opacity duration-500 ${gifLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setGifLoaded(true)}
                  onError={() => setGifLoaded(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-6 text-center">
                  <div>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border" style={{ backgroundColor: `${tintColor}15`, borderColor: `${tintColor}30` }}>
                      <Target className="w-10 h-10" style={{ color: tintColor }} />
                    </div>
                    <p className="font-bold text-sm mb-1">Follow the instructions</p>
                    <p className="text-xs text-white/50">Maintain proper form throughout</p>
                  </div>
                </div>
              )}

              {/* Bottom Step Counter Badge */}
              <div className="absolute bottom-3 left-3 right-3 z-10">
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#0A0C10]/85 backdrop-blur-md border border-white/10">
                  <span className="font-semibold text-xs text-white/80">Exercise {currentStepIndex + 1} of {totalSteps}</span>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-xs" style={{ backgroundColor: tintColor, color: '#0A0C10' }}>
                    {currentStepIndex + 1}
                  </div>
                </div>
              </div>
            </div>

            {/* Single Circular Timer Component */}
            <div className="flex flex-col items-center gap-4 py-1">
              <div className="relative flex items-center justify-center">
                <CircularTimer timeRemaining={timeRemaining} totalDuration={stepTotalDuration} color={tintColor} isPlaying={isPlaying} />
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black tabular-nums" style={{ color: getTimeColor() }}>
                    {formatTime(timeRemaining)}
                  </span>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">remaining</span>
                </div>
              </div>

              {/* Play / Pause Playback Controls at Bottom */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePreviousStep}
                  disabled={currentStepIndex === 0}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all border border-white/20 hover:scale-105 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: tintColor }}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-[#0A0C10]" />
                  ) : (
                    <Play className="w-8 h-8 text-[#0A0C10] ml-1" />
                  )}
                </button>

                <button
                  onClick={handleNextStep}
                  disabled={currentStepIndex === totalSteps - 1}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Optional set log for the current step */}
            <div className="bg-[#131921] border border-white/10 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Log this set (optional)</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <input
                    type="number" min="0" max="1000" inputMode="numeric" aria-label="Reps"
                    value={setInputs[currentStepIndex]?.reps ?? ''}
                    onChange={(e) => updateSetInput('reps', e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-white outline-none"
                    placeholder="0"
                  />
                  <span className="text-xs text-white/40">reps</span>
                </label>
                <label className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <input
                    type="number" min="0" max="1000" step="0.5" inputMode="decimal" aria-label="Weight in kilograms"
                    value={setInputs[currentStepIndex]?.weightKg ?? ''}
                    onChange={(e) => updateSetInput('weightKg', e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-white outline-none"
                    placeholder="0"
                  />
                  <span className="text-xs text-white/40">kg</span>
                </label>
              </div>
            </div>

            {/* Mark Complete CTA */}
            <button
              onClick={handleWorkoutComplete}
              className="w-full py-4 rounded-xl font-extrabold flex items-center justify-center gap-2 text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer border border-white/10"
              style={{ backgroundColor: tintColor, color: '#0A0C10' }}
            >
              <Check className="w-5 h-5" />
              Mark Complete
            </button>

            {/* Step Stats Footer */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#131921] border border-white/10 p-3 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tintColor}15` }}>
                  <Clock className="w-4 h-4" style={{ color: tintColor }} />
                </div>
                <div>
                  <p className="text-[10px] text-white/40">Step Duration</p>
                  <p className="text-sm font-bold">
                    {currentStep?.duration ? `${Math.floor(currentStep.duration / 60)}:${(currentStep.duration % 60).toString().padStart(2, '0')}` : '–'}
                  </p>
                </div>
              </div>

              <div className="bg-[#131921] border border-white/10 p-3 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] text-white/40">Intensity</p>
                  <p className="text-sm font-bold">{workout?.intensity || 'Moderate'}</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── EXIT CONFIRMATION DIALOG ── */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#131921] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Exit Workout?</h3>
            <p className="text-sm text-white/60 mb-6">
              You've completed {completedSteps.size} of {totalSteps} exercises. Are you sure you want to quit?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitDialog(false)}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 transition-all"
              >
                Keep Going
              </button>
              <button
                onClick={onExit}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 transition-all text-white"
              >
                Exit
              </button>
            </div>
            <button
              onClick={handleSaveAndExit}
              className="mt-3 w-full py-3 rounded-xl font-bold text-sm border border-white/15 hover:bg-white/5 transition-all"
            >
              Save progress &amp; exit
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
