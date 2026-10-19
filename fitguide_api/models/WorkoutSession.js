const mongoose = require('mongoose');

// One logged set (or timed step) of an exercise within a session.
const setLogSchema = new mongoose.Schema(
  {
    exerciseSlug: { type: String, default: null }, // matched to the exercise library when possible
    exerciseName: { type: String, required: true, trim: true, maxlength: 200 },
    setNumber: { type: Number, min: 1 },
    reps: { type: Number, min: 0 },
    weightKg: { type: Number, min: 0 },
    durationSec: { type: Number, min: 0 },
    distanceM: { type: Number, min: 0 },
    rpe: { type: Number, min: 1, max: 10 },
  },
  { _id: false }
);

const workoutSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    workoutSlug: { type: String, required: true },
    workoutTitle: { type: String, required: true }, // snapshot, so history survives catalog edits
    category: { type: String, default: null },
    status: { type: String, enum: ['completed', 'partial'], default: 'completed' },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
    durationSec: { type: Number, required: true, min: 0 },
    calories: { type: Number, min: 0, default: 0 },
    stepsCompleted: { type: Number, min: 0, default: 0 },
    totalSteps: { type: Number, min: 0, default: 0 },
    perceivedEffort: { type: Number, min: 1, max: 10, default: null }, // session RPE
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    sets: [setLogSchema],
    // Set when the session was a scheduled program day.
    enrollmentId: { type: String, default: null },
    programWeek: { type: Number, default: null },
    programDay: { type: Number, default: null },
  },
  { timestamps: true }
);

workoutSessionSchema.index({ userId: 1, completedAt: -1 });

module.exports = mongoose.model('WorkoutSession', workoutSessionSchema);
