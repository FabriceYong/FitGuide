const mongoose = require('mongoose');
const Workout = require('../models/Workout');
const workoutsData = require('./workoutSeeder');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Add it to fitguide_api/.env (see .env.example).');
  process.exit(1);
}

async function seedWorkouts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('Clearing existing workouts...');
    await Workout.deleteMany({});
    console.log('✅ Cleared existing workouts');

    console.log(`Inserting ${workoutsData.length} workouts...`);
    const result = await Workout.insertMany(workoutsData);
    console.log(`✅ Successfully seeded ${result.length} workouts!`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding workouts:', error);
    process.exit(1);
  }
}

seedWorkouts();