/**
 * Stores for the training data added in Phase 2.
 *  - Catalog (read-only, by slug): exercises, programs.
 *  - Per-user records: workout sessions, program enrollments, body metrics.
 */
const Exercise = require('../models/Exercise');
const Program = require('../models/Program');
const WorkoutSession = require('../models/WorkoutSession');
const Enrollment = require('../models/Enrollment');
const BodyMetric = require('../models/BodyMetric');
const exercisesData = require('../seed/exerciseSeeder');
const programsData = require('../seed/programSeeder');
const { createCatalogStore } = require('./catalogStore');
const { createOwnedStore } = require('./ownedStore');

const exerciseCatalog = createCatalogStore(Exercise, exercisesData);
const programStore = createCatalogStore(Program, programsData, { mongoFilter: { isPublished: true } });

/** Lowercase words only: "Child's Pose" → "child s pose", "Push-Ups" → "push ups". */
const normalizeName = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Find the library exercise a free-text name refers to: an exact name/alias
 * match first, otherwise the longest name/alias that starts a word in it
 * ("Barbell Back Squats — Set 2 of 4" → back-squat).
 */
function matchExercise(name, exercises) {
  const text = normalizeName(name);
  if (!text) return null;
  let best = null;
  for (const exercise of exercises) {
    for (const candidate of [exercise.slug.replace(/-/g, ' '), normalizeName(exercise.name), ...(exercise.aliases || []).map(normalizeName)]) {
      if (!candidate) continue;
      if (candidate === text) return exercise;
      const at = ` ${text} `.indexOf(` ${candidate}`);
      if (at !== -1 && (!best || candidate.length > best.length)) best = { exercise, length: candidate.length };
    }
  }
  return best ? best.exercise : null;
}

const exerciseStore = { ...exerciseCatalog, normalizeName, matchExercise };

module.exports = {
  exerciseStore,
  programStore,
  sessionStore: createOwnedStore(WorkoutSession, 'workoutSessions'),
  enrollmentStore: createOwnedStore(Enrollment, 'enrollments'),
  bodyMetricStore: createOwnedStore(BodyMetric, 'bodyMetrics'),
};
