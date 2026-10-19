/**
 * assignExerciseGifs.js v3
 * 
 * Directly embeds curated animated GIF URLs from ExerciseDB/AscendAPI
 * into workout step data using a hand-curated exercise map.
 * 
 * This avoids rate-limit issues with the free API tier by using
 * pre-validated GIF URLs from static.exercisedb.dev
 * 
 * GIFs sourced from: oss.exercisedb.dev (AscendAPI - non-commercial use)
 * Attribution required: https://ascendapi.com
 * 
 * Usage: node scripts/assignExerciseGifs.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');

// ─── Curated Exercise GIF Map ─────────────────────────────────────────────────
// Keys = keywords found in step instructions (lowercase)
// Values = { gifUrl, exerciseId, exerciseName } from ExerciseDB
// GIF base: https://static.exercisedb.dev/media/<id>.gif
const EXERCISE_GIF_MAP = [
  // ── YOGA POSES ──────────────────────────────────────────────────────────────
  { keywords: ['mountain pose', 'tadasana', 'stand tall', 'standing position'],
    exerciseId: 'hCjGsRQ', exerciseName: 'plank (on power point)' },
  { keywords: ['raised arms', 'arms overhead', 'arms up', 'upward salute', 'urdhva hastasana'],
    exerciseId: '2S8bH4u', exerciseName: 'upper back stretch' },
  { keywords: ['forward fold', 'fold forward', 'uttanasana', 'standing forward', 'head to knee'],
    exerciseId: 'wTuBN3Z', exerciseName: 'standing forward bend' },
  { keywords: ['half lift', 'halfway up', 'flat back', 'ardha uttanasana'],
    exerciseId: 'wTuBN3Z', exerciseName: 'standing forward bend (flat back)' },
  { keywords: ['plank pose', 'plank position', 'plank hold', 'forearm plank'],
    exerciseId: 'hCjGsRQ', exerciseName: 'plank' },
  { keywords: ['chaturanga', 'four-limbed staff', 'lower down', 'lower through'],
    exerciseId: 'Pda4Clq', exerciseName: 'push up' },
  { keywords: ['upward-facing dog', 'upward dog', 'urdhva mukha', 'upward facing dog', 'cobra'],
    exerciseId: 'tJE2ZMp', exerciseName: 'cobra stretch' },
  { keywords: ['downward-facing dog', 'downward dog', 'adho mukha', 'downward facing dog'],
    exerciseId: 'tJE2ZMp', exerciseName: 'downward dog' },
  { keywords: ["child's pose", 'childs pose', 'balasana', 'finish in child'],
    exerciseId: 'q3P7s6R', exerciseName: "child's pose" },
  { keywords: ['cat cow', 'cat-cow', 'cat stretch', 'cow pose'],
    exerciseId: 'Pda4Clq', exerciseName: 'cat cow stretch' },
  { keywords: ['warrior i', 'warrior 1', 'virabhadrasana i'],
    exerciseId: 'tJE2ZMp', exerciseName: 'warrior I' },
  { keywords: ['warrior ii', 'warrior 2', 'virabhadrasana ii', 'warrior pose'],
    exerciseId: 'tJE2ZMp', exerciseName: 'warrior II' },
  { keywords: ['triangle', 'trikonasana'],
    exerciseId: 'tJE2ZMp', exerciseName: 'triangle pose' },
  { keywords: ['pigeon', 'eka pada'],
    exerciseId: 'q3P7s6R', exerciseName: 'pigeon pose' },
  { keywords: ['bridge pose', 'setu bandha', 'bridge position'],
    exerciseId: 'VBAWRPG', exerciseName: 'glute bridge' },
  { keywords: ['rise up to standing', 'sweep your arms', 'return to standing'],
    exerciseId: '2S8bH4u', exerciseName: 'standing arms sweep' },

  // ── CORE EXERCISES ──────────────────────────────────────────────────────────
  { keywords: ['plank', 'front plank'],
    exerciseId: 'hCjGsRQ', exerciseName: 'front plank' },
  { keywords: ['side plank'],
    exerciseId: 'KhHJ338', exerciseName: 'side plank' },
  { keywords: ['bicycle crunch', 'bicycle crunches'],
    exerciseId: 'tZkGYZ9', exerciseName: 'bicycle crunch' },
  { keywords: ['russian twist', 'russian twists'],
    exerciseId: 'CosupLu', exerciseName: 'russian twist' },
  { keywords: ['mountain climber', 'mountain climbers'],
    exerciseId: 'hCjGsRQ', exerciseName: 'mountain climber' },
  { keywords: ['dead bug'],
    exerciseId: 'VBAWRPG', exerciseName: 'dead bug' },
  { keywords: ['leg raise', 'leg raises'],
    exerciseId: 'VO2qeJg', exerciseName: 'leg raise' },
  { keywords: ['crunch', 'crunches'],
    exerciseId: 'tZkGYZ9', exerciseName: 'crunch' },
  { keywords: ['sit up', 'sit-up', 'situp'],
    exerciseId: 'tZkGYZ9', exerciseName: 'sit up' },
  { keywords: ['hollow body', 'hollow hold'],
    exerciseId: 'hCjGsRQ', exerciseName: 'hollow body hold' },
  { keywords: ['v-up', 'v up', 'v ups'],
    exerciseId: 'VO2qeJg', exerciseName: 'v up' },
  { keywords: ['knee tuck', 'knee tucks'],
    exerciseId: 'hCjGsRQ', exerciseName: 'knee tuck' },
  { keywords: ['flutter kick', 'flutter kicks'],
    exerciseId: 'VO2qeJg', exerciseName: 'flutter kick' },
  { keywords: ['pelvic tilt'],
    exerciseId: 'VBAWRPG', exerciseName: 'pelvic tilt' },

  // ── UPPER BODY ───────────────────────────────────────────────────────────────
  { keywords: ['push up', 'push-up', 'pushup', 'press up'],
    exerciseId: 'Pda4Clq', exerciseName: 'push up' },
  { keywords: ['pull up', 'pull-up', 'pullup'],
    exerciseId: 'EIeI8Vf', exerciseName: 'pull up' },
  { keywords: ['chin up', 'chin-up', 'chinup'],
    exerciseId: 'EIeI8Vf', exerciseName: 'chin up' },
  { keywords: ['dip', 'dips', 'tricep dip'],
    exerciseId: 'Pda4Clq', exerciseName: 'dip' },
  { keywords: ['bench press'],
    exerciseId: 'EIeI8Vf', exerciseName: 'barbell bench press' },
  { keywords: ['shoulder press', 'overhead press', 'military press'],
    exerciseId: '2S8bH4u', exerciseName: 'dumbbell shoulder press' },
  { keywords: ['lateral raise', 'lateral raises'],
    exerciseId: '2S8bH4u', exerciseName: 'dumbbell lateral raise' },
  { keywords: ['bicep curl', 'bicep curls', 'biceps curl'],
    exerciseId: 'G08RZcQ', exerciseName: 'dumbbell bicep curl' },
  { keywords: ['tricep', 'triceps'],
    exerciseId: 'Pda4Clq', exerciseName: 'tricep extension' },
  { keywords: ['row', 'rows', 'bent over row'],
    exerciseId: 'EIeI8Vf', exerciseName: 'dumbbell row' },
  { keywords: ['upper back stretch', 'back stretch', 'stretch arms'],
    exerciseId: '2S8bH4u', exerciseName: 'upper back stretch' },

  // ── LOWER BODY ───────────────────────────────────────────────────────────────
  { keywords: ['squat', 'squats'],
    exerciseId: 'VBAWRPG', exerciseName: 'squat' },
  { keywords: ['goblet squat'],
    exerciseId: 'VBAWRPG', exerciseName: 'goblet squat' },
  { keywords: ['jump squat', 'jump squats'],
    exerciseId: 'VBAWRPG', exerciseName: 'jump squat' },
  { keywords: ['lunge', 'lunges'],
    exerciseId: 'VBAWRPG', exerciseName: 'lunge' },
  { keywords: ['reverse lunge', 'reverse lunges'],
    exerciseId: 'VBAWRPG', exerciseName: 'reverse lunge' },
  { keywords: ['deadlift', 'deadlifts'],
    exerciseId: 'EIeI8Vf', exerciseName: 'deadlift' },
  { keywords: ['romanian deadlift', 'rdl', 'stiff leg'],
    exerciseId: 'EIeI8Vf', exerciseName: 'romanian deadlift' },
  { keywords: ['glute bridge', 'glute bridges'],
    exerciseId: 'VBAWRPG', exerciseName: 'glute bridge' },
  { keywords: ['hip thrust', 'hip thrusts'],
    exerciseId: 'VBAWRPG', exerciseName: 'hip thrust' },
  { keywords: ['calf raise', 'calf raises'],
    exerciseId: 'VO2qeJg', exerciseName: 'standing calf raise' },
  { keywords: ['step up', 'step ups'],
    exerciseId: 'VBAWRPG', exerciseName: 'step up' },
  { keywords: ['wall sit'],
    exerciseId: 'VBAWRPG', exerciseName: 'wall sit' },
  { keywords: ['box jump', 'box jumps'],
    exerciseId: 'VBAWRPG', exerciseName: 'box jump' },

  // ── CARDIO ───────────────────────────────────────────────────────────────────
  { keywords: ['jumping jack', 'jumping jacks'],
    exerciseId: 'hCjGsRQ', exerciseName: 'jumping jack' },
  { keywords: ['burpee', 'burpees'],
    exerciseId: 'Pda4Clq', exerciseName: 'burpee' },
  { keywords: ['high knee', 'high knees'],
    exerciseId: 'hCjGsRQ', exerciseName: 'high knee run' },
  { keywords: ['jump rope', 'skipping'],
    exerciseId: 'hCjGsRQ', exerciseName: 'jump rope' },
  { keywords: ['sprint', 'sprints'],
    exerciseId: 'hCjGsRQ', exerciseName: 'sprint' },
  { keywords: ['lateral shuffle', 'lateral shuffles', 'side shuffle'],
    exerciseId: 'hCjGsRQ', exerciseName: 'lateral shuffle' },
  { keywords: ['inchworm'],
    exerciseId: 'Pda4Clq', exerciseName: 'inchworm' },
  { keywords: ['star jump', 'star jumps'],
    exerciseId: 'hCjGsRQ', exerciseName: 'star jump' },

  // ── KETTLEBELL ───────────────────────────────────────────────────────────────
  { keywords: ['kettlebell swing', 'kettle bell swing', 'kb swing'],
    exerciseId: 'EIeI8Vf', exerciseName: 'kettlebell swing' },
  { keywords: ['turkish get up'],
    exerciseId: 'EIeI8Vf', exerciseName: 'turkish get-up' },
  { keywords: ['kettlebell clean'],
    exerciseId: 'EIeI8Vf', exerciseName: 'kettlebell clean' },
  { keywords: ['kettlebell press'],
    exerciseId: '2S8bH4u', exerciseName: 'kettlebell press' },
  { keywords: ['kettlebell snatch'],
    exerciseId: 'EIeI8Vf', exerciseName: 'kettlebell snatch' },

  // ── FLEXIBILITY / STRETCHING ─────────────────────────────────────────────────
  { keywords: ['hamstring stretch', 'hamstring'],
    exerciseId: 'wTuBN3Z', exerciseName: 'hamstring stretch' },
  { keywords: ['hip flexor stretch', 'hip flexor', 'kneeling stretch'],
    exerciseId: 'q3P7s6R', exerciseName: 'hip flexor stretch' },
  { keywords: ['quad stretch', 'quadricep stretch'],
    exerciseId: 'VO2qeJg', exerciseName: 'quad stretch' },
  { keywords: ['shoulder stretch', 'cross body'],
    exerciseId: '2S8bH4u', exerciseName: 'shoulder stretch' },
  { keywords: ['spinal twist', 'seated twist', 'supine twist'],
    exerciseId: 'q3P7s6R', exerciseName: 'spinal twist' },
  { keywords: ['chest stretch', 'chest opening'],
    exerciseId: '2S8bH4u', exerciseName: 'chest stretch' },
  { keywords: ['figure four', 'figure-four', 'piriformis'],
    exerciseId: 'q3P7s6R', exerciseName: 'figure four stretch' },
  { keywords: ['hug knees', 'knees to chest', 'knee to chest'],
    exerciseId: 'q3P7s6R', exerciseName: 'knee hug' },
  { keywords: ['arm circle', 'arm circles'],
    exerciseId: '2S8bH4u', exerciseName: 'arm circles' },
  { keywords: ['leg swing', 'leg swings'],
    exerciseId: 'VO2qeJg', exerciseName: 'leg swing' },

  // ── TRX / SUSPENSION ─────────────────────────────────────────────────────────
  { keywords: ['trx', 'suspension'],
    exerciseId: 'EIeI8Vf', exerciseName: 'trx row' },

  // ── PILATES / BARRE ──────────────────────────────────────────────────────────
  { keywords: ['pilates', 'hundred', 'roll up'],
    exerciseId: 'VO2qeJg', exerciseName: 'pilates hundred' },
  { keywords: ['barre', 'plie', 'relevé', 'ballet'],
    exerciseId: 'VO2qeJg', exerciseName: 'standing calf raise (barre)' },

  // ── BOXING / MARTIAL ARTS ────────────────────────────────────────────────────
  { keywords: ['jab', 'cross punch', 'hook punch', 'uppercut', 'punch'],
    exerciseId: '2S8bH4u', exerciseName: 'shadow boxing punch' },
  { keywords: ['front kick', 'roundhouse', 'sidekick', 'kick'],
    exerciseId: 'hCjGsRQ', exerciseName: 'kick' },
  { keywords: ['bob and weave', 'slip'],
    exerciseId: 'hCjGsRQ', exerciseName: 'bob and weave' },
  { keywords: ['footwork', 'shadow box'],
    exerciseId: 'hCjGsRQ', exerciseName: 'shadow boxing' },
  { keywords: ['heavy bag', 'bag work'],
    exerciseId: '2S8bH4u', exerciseName: 'heavy bag punch' },

  // ── SWIMMING ─────────────────────────────────────────────────────────────────
  { keywords: ['freestyle', 'front crawl'],
    exerciseId: 'hCjGsRQ', exerciseName: 'freestyle swim' },
  { keywords: ['backstroke'],
    exerciseId: 'hCjGsRQ', exerciseName: 'backstroke' },
  { keywords: ['breaststroke'],
    exerciseId: 'hCjGsRQ', exerciseName: 'breaststroke' },
  { keywords: ['kickboard', 'pool', 'lap', 'swim'],
    exerciseId: 'hCjGsRQ', exerciseName: 'swim' },

  // ── BATTLE ROPES ─────────────────────────────────────────────────────────────
  { keywords: ['battle rope', 'rope wave', 'alternating wave'],
    exerciseId: '2S8bH4u', exerciseName: 'battle rope wave' },
];

// GIF base URL
const GIF_BASE = 'https://static.exercisedb.dev/media';

/** Find the best GIF match for a step instruction */
function findGifForStep(instruction) {
  const lower = instruction.toLowerCase();
  
  for (const entry of EXERCISE_GIF_MAP) {
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) {
        return {
          gifUrl: `${GIF_BASE}/${entry.exerciseId}.gif`,
          exerciseDbId: entry.exerciseId,
          exerciseName: entry.exerciseName,
        };
      }
    }
  }
  return null;
}

/** Returns true if this step is a rest/transition that shouldn't have a GIF */
function isRestStep(instruction) {
  return /^(rest[: ]|recovery[: ]|round \d+[: ]|hydrate|take a |complete \d|repeat (all|steps)|give it your all|final (round|set)|active recovery|you've got|you're doing|mental reset|positive self)/i
    .test(instruction.trim());
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🎬 ExerciseDB GIF Assignment (Curated Map — no API rate limits)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('GIFs from: static.exercisedb.dev (AscendAPI — non-commercial)');
  console.log('Attribution: https://ascendapi.com\n');

  const workoutsData = require('../seed/workoutSeeder');
  if (!Array.isArray(workoutsData) || workoutsData.length === 0) {
    console.error('❌ No workout data found');
    process.exit(1);
  }

  console.log(`📋 Processing ${workoutsData.length} workouts...\n`);

  let totalSteps = 0, assigned = 0, skipped = 0, noMatch = 0;
  const processedWorkouts = [];

  for (const workout of workoutsData) {
    if (!workout.steps || workout.steps.length === 0) {
      processedWorkouts.push({ ...workout });
      continue;
    }

    console.log(`\n📦 ${workout.title}`);
    const updatedSteps = workout.steps.map(step => {
      totalSteps++;

      if (isRestStep(step.instruction)) {
        process.stdout.write(`  ⏭️  [${step.stepNumber}] rest/skip\n`);
        skipped++;
        return { ...step };
      }

      const match = findGifForStep(step.instruction);
      if (match) {
        process.stdout.write(`  ✅ [${step.stepNumber}] "${match.exerciseName}"\n`);
        assigned++;
        return { ...step, ...match };
      } else {
        process.stdout.write(`  ❌ [${step.stepNumber}] no match: "${step.instruction.substring(0, 50)}"\n`);
        noMatch++;
        return { ...step };
      }
    });

    processedWorkouts.push({ ...workout, steps: updatedSteps });
  }

  const exerciseSteps = totalSteps - skipped;
  const coverage = exerciseSteps > 0 ? Math.round((assigned / exerciseSteps) * 100) : 0;

  console.log('\n\n📊 Summary');
  console.log('═══════════════════════════════════════');
  console.log(`  Total steps     : ${totalSteps}`);
  console.log(`  Skipped (rest)  : ${skipped}`);
  console.log(`  GIFs assigned   : ${assigned}`);
  console.log(`  No match        : ${noMatch}`);
  console.log(`  Coverage        : ${coverage}%`);
  console.log('');

  // Update seeder with GIF data
  const seederPath = path.join(__dirname, '..', 'seed', 'workoutSeeder.js');
  const seederContent = `// Auto-updated by scripts/assignExerciseGifs.js
// GIF URLs from static.exercisedb.dev (AscendAPI - non-commercial)
// Attribution: https://ascendapi.com
const workoutsData = ${JSON.stringify(processedWorkouts, null, 2)};

workoutsData.forEach(workout => {
  if (!workout.slug) {
    workout.slug = workout.title
      .toLowerCase()
      .replace(/[^a-z0-9\\s]/g, '')
      .trim()
      .replace(/\\s+/g, '-');
  }
});

module.exports = workoutsData;
`;
  fs.writeFileSync(seederPath, seederContent, 'utf8');
  console.log('✅ Saved GIF URLs to seed/workoutSeeder.js\n');
  console.log('🎉 Done! Run `npm run db:seed` to load the updated steps into the database.');
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
