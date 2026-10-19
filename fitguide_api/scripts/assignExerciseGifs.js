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
// Only IDs whose GIF was checked by eye to show the named exercise. The old
// map reused a handful of IDs for unrelated moves (a plank for Mountain
// Pose, a forearm plank for Russian twists) and five of its IDs no longer
// resolve. Steps without a match get no GIF; the player then looks one up by
// name through /api/exercise-media. Order matters: the first match wins.
const EXERCISE_GIF_MAP = [
  { keywords: ['forearm plank', 'forearms on the ground', 'plank hold'],
    exerciseId: 'CosupLu', exerciseName: 'forearm plank' },
  { keywords: ['plank pose', 'high plank'],
    exerciseId: 'hCjGsRQ', exerciseName: 'plank' },
  { keywords: ['bicycle crunch', 'bicycle crunches'],
    exerciseId: 'tZkGYZ9', exerciseName: 'bicycle crunch' },
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
    const updatedSteps = workout.steps.map(original => {
      totalSteps++;
      // Drop any GIF a previous run assigned, so a removed mapping doesn't linger.
      const step = { ...original };
      if (step.exerciseDbId) {
        delete step.gifUrl;
        delete step.exerciseDbId;
        delete step.exerciseName;
      }

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
