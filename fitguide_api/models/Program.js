const mongoose = require('mongoose');

// One scheduled day of a program. `day` is the day within the week (1-7), so
// with an enrollment start date every ProgramDay maps to a calendar date.
const programDaySchema = new mongoose.Schema(
  {
    week: { type: Number, required: true, min: 1 },
    day: { type: Number, required: true, min: 1, max: 7 },
    title: { type: String, required: true, trim: true },
    workoutSlug: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const programSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'], required: true },
    goal: { type: String, required: true, trim: true },
    weeks: { type: Number, required: true, min: 1 },
    daysPerWeek: { type: Number, required: true, min: 1, max: 7 },
    days: [programDaySchema],
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

programSchema.methods.toPublicObject = function () {
  const { _id, __v, ...rest } = this.toObject();
  return { id: rest.slug, ...rest };
};

module.exports = mongoose.model('Program', programSchema);
