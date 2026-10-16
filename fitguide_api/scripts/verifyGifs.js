// Quick verification script — checks GIF data in the mock database
const data = require('../mock_db_data.json');

const yoga = data.workouts.find(w => w.slug === 'morning-yoga-flow');
const core = data.workouts.find(w => w.slug === 'core-power-blast');

function showWorkout(workout) {
  if (!workout) { console.log('  NOT FOUND'); return; }
  const stepsWithGif = (workout.steps || []).filter(s => s.gifUrl);
  console.log(`  Steps total: ${(workout.steps || []).length}, With GIF: ${stepsWithGif.length}`);
  stepsWithGif.slice(0, 5).forEach(s => {
    console.log(`    [${s.stepNumber}] ${s.exerciseName} => ${s.gifUrl}`);
  });
}

console.log('\n=== Morning Sun Salutation Flow ===');
showWorkout(yoga);

console.log('\n=== Core Strength Circuit ===');
showWorkout(core);

console.log('\n=== All workouts GIF count ===');
let total = 0;
data.workouts.forEach(w => {
  const n = (w.steps || []).filter(s => s.gifUrl).length;
  if (n > 0) {
    console.log(`  ${w.title}: ${n} GIF steps`);
    total += n;
  }
});
console.log(`\nTotal GIF steps across all workouts: ${total}`);
