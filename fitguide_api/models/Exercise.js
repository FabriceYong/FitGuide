const mongoose = require('mongoose');

// How a set of this exercise is measured, which decides what a personal record means.
const TRACKING_TYPES = ['reps', 'weighted', 'duration', 'distance'];

const exerciseSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // Other names the exercise goes by, e.g. in workout steps ("Plank hold").
    aliases: [{ type: String, trim: true, lowercase: true }],
    category: { type: String, enum: ['Strength', 'Cardio', 'Mobility', 'Core', 'Plyometric'], required: true },
    trackingType: { type: String, enum: TRACKING_TYPES, required: true },
    primaryMuscles: [{ type: String, trim: true }],
    equipment: [{ type: String, trim: true }],
    instructions: [{ type: String, trim: true }],
    formCues: [{ type: String, trim: true }],
    commonMistakes: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

exerciseSchema.methods.toPublicObject = function () {
  const { _id, __v, ...rest } = this.toObject();
  return { id: rest.slug, ...rest };
};

const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = Exercise;
module.exports.TRACKING_TYPES = TRACKING_TYPES;
