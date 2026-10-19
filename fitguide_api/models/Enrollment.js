const mongoose = require('mongoose');

const completedDaySchema = new mongoose.Schema(
  {
    week: { type: Number, required: true },
    day: { type: Number, required: true },
    sessionId: { type: String, required: true },
    completedAt: { type: Date, required: true },
  },
  { _id: false }
);

const enrollmentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    programSlug: { type: String, required: true },
    // Calendar date (YYYY-MM-DD, user's local time) of week 1 day 1.
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
    completedDays: [completedDaySchema],
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

enrollmentSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
