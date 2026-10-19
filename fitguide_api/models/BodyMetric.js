const mongoose = require('mongoose');

// Body measurements a user can log over time. Every field except the date is
// optional, so one entry can hold just a weigh-in or a full set of measurements.
const MEASUREMENT_FIELDS = ['weightKg', 'bodyFatPct', 'waistCm', 'chestCm', 'hipsCm', 'armCm', 'thighCm'];

const bodyMetricSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // user's local date
    weightKg: { type: Number, min: 20, max: 400 },
    bodyFatPct: { type: Number, min: 1, max: 75 },
    waistCm: { type: Number, min: 20, max: 300 },
    chestCm: { type: Number, min: 20, max: 300 },
    hipsCm: { type: Number, min: 20, max: 300 },
    armCm: { type: Number, min: 5, max: 100 },
    thighCm: { type: Number, min: 10, max: 150 },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

bodyMetricSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('BodyMetric', bodyMetricSchema);
module.exports.MEASUREMENT_FIELDS = MEASUREMENT_FIELDS;
