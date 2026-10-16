const mongoose = require('mongoose');
const Workout = require('../models/Workout');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Add it to fitguide_api/.env (see .env.example).');
  process.exit(1);
}

async function verifyWorkouts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const workouts = await Workout.find({});
    console.log(`\n📊 Total workouts in database: ${workouts.length}`);

    // Group by category
    const categoryCounts = {};
    workouts.forEach(w => {
      categoryCounts[w.category] = (categoryCounts[w.category] || 0) + 1;
    });

    console.log('\n📈 Workouts by category:');
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });

    // Find workouts with detailed steps
    const workoutsWithSteps = workouts.filter(w => w.steps && w.steps.length > 0);
    console.log(`\n✨ Workouts with detailed steps: ${workoutsWithSteps.length}`);
    workoutsWithSteps.forEach(w => {
      console.log(`   - ${w.title} (${w.steps.length} steps)`);
    });

    // Show sample workout
    console.log('\n🔍 Sample workout details:');
    const sampleWorkout = workouts[0];
    console.log(`   Title: ${sampleWorkout.title}`);
    console.log(`   Slug: ${sampleWorkout.slug}`);
    console.log(`   Category: ${sampleWorkout.category}`);
    console.log(`   Duration: ${sampleWorkout.duration} min`);
    console.log(`   Difficulty: ${sampleWorkout.difficulty}`);
    console.log(`   Equipment: ${sampleWorkout.equipment.join(', ')}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying workouts:', error);
    process.exit(1);
  }
}

verifyWorkouts();
