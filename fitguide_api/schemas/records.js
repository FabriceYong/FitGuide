/**
 * Validation for per-user records, applied by the stores before every write
 * (routes validate request shape first; these are the data rules the
 * database relies on).
 */
const { z } = require('zod');
const { TRAINING } = require('@fitguide/shared');
const { SESSION_STATUSES, ENROLLMENT_STATUSES } = require('../utils/enums');

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date (YYYY-MM-DD)');
const int = (min, max) => z.number().int().min(min).max(max);
const optionalNumber = (min, max) => z.number().min(min).max(max).nullish();

const setLog = z.object({
  exerciseSlug: z.string().max(100).nullish(),
  exerciseName: z.string().trim().min(1).max(200),
  setNumber: int(1, 100).nullish(),
  reps: int(0, 1000).nullish(),
  weightKg: optionalNumber(0, 1000),
  durationSec: int(0, 36000).nullish(),
  distanceM: optionalNumber(0, 1000000),
  rpe: int(1, 10).nullish(),
});

const workoutSession = z.object({
  workoutSlug: z.string().min(1),
  workoutTitle: z.string().min(1),
  category: z.string().nullish(),
  status: z.enum(SESSION_STATUSES).default('completed'),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date(),
  durationSec: int(0, 24 * 60 * 60),
  calories: z.number().int().min(0).default(0),
  stepsCompleted: int(0, 500).default(0),
  totalSteps: int(0, 500).default(0),
  perceivedEffort: int(1, 10).nullish(),
  notes: z.string().max(1000).default(''),
  sets: z.array(setLog).max(200).default([]),
  enrollmentId: z.string().nullish(),
  programWeek: int(1, 52).nullish(),
  programDay: int(1, 7).nullish(),
});

const completedDay = z.object({
  week: int(1, 52),
  day: int(1, 7),
  sessionId: z.string().min(1),
  completedAt: z.coerce.date(),
});

const enrollment = z.object({
  programSlug: z.string().min(1),
  startDate: ymd,
  status: z.enum(ENROLLMENT_STATUSES).default('active'),
  completedDays: z.array(completedDay).default([]),
  endedAt: z.coerce.date().nullish(),
});

// Measurement fields a body-metric entry may hold, with plausible ranges.
const { MEASUREMENT_RANGES } = TRAINING;
const MEASUREMENT_FIELDS = Object.keys(MEASUREMENT_RANGES);

const bodyMetric = z.object({
  date: ymd,
  ...Object.fromEntries(Object.entries(MEASUREMENT_RANGES).map(([field, [min, max]]) => [field, optionalNumber(min, max)])),
  notes: z.string().trim().max(500).default(''),
});

/**
 * Parse with a schema, throwing an error the central error handler turns
 * into a 400 ("ValidationError").
 */
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const err = new Error(result.error.issues
    .map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`)
    .join('; '));
  err.name = 'ValidationError';
  throw err;
}

module.exports = {
  schemas: { setLog, workoutSession, enrollment, bodyMetric },
  MEASUREMENT_FIELDS,
  MEASUREMENT_RANGES,
  validate,
};
