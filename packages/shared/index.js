/**
 * Values the API and the web app must agree on: allowed enum values and
 * numeric limits. Each app builds its own validation (zod) from these, so a
 * form and the endpoint it posts to can't drift apart.
 *
 * Plain CommonJS with no dependencies, so it loads in Node and in the
 * Next.js bundle alike.
 */

const PROFILE = {
  GENDERS: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
  FITNESS_LEVELS: ['Beginner', 'Intermediate', 'Advanced'],
  ACTIVITY_STATUSES: ['Active', 'Inactive', 'Moderately Active', 'Very Active'],
  GOALS: ['Vitality', 'Muscle', 'Weight', 'Flexibility'],
  DIETS: ['Keto Diet', 'Mediterranean Diet', 'Paleo Diet', 'Intermittent Fasting', 'Flexible Balanced Plan'],
  // [min, max] in cm / kg
  HEIGHT_CM: [50, 250],
  WEIGHT_KG: [30, 250],
  NAME_MAX: 100,
  PASSWORD_MIN: 6,
};

const CATALOG = {
  WORKOUT_CATEGORIES: ['HIIT', 'Yoga', 'Strength', 'Cardio', 'Flexibility', 'Pilates', 'CrossFit', 'Dance', 'Martial Arts', 'Swimming'],
  DIFFICULTIES: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
  INTENSITIES: ['Low', 'Moderate', 'High', 'Very High'],
  EXERCISE_CATEGORIES: ['Strength', 'Cardio', 'Mobility', 'Core', 'Plyometric'],
  // How a set of an exercise is measured, which decides what a personal record means.
  TRACKING_TYPES: ['reps', 'weighted', 'duration', 'distance'],
};

const TRAINING = {
  SESSION_STATUSES: ['completed', 'partial'],
  ENROLLMENT_STATUSES: ['active', 'completed', 'abandoned'],
  // Body-metric fields with plausible [min, max] ranges.
  MEASUREMENT_RANGES: {
    weightKg: [20, 400],
    bodyFatPct: [1, 75],
    waistCm: [20, 300],
    chestCm: [20, 300],
    hipsCm: [20, 300],
    armCm: [5, 100],
    thighCm: [10, 150],
  },
  NOTES_MAX: 1000,
};

module.exports = { PROFILE, CATALOG, TRAINING };
