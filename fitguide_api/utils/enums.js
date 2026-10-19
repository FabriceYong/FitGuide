/**
 * Allowed values for enumerated fields. The database stores them as text, so
 * these lists are the single source of truth for validation.
 */
module.exports = {
  GENDERS: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
  FITNESS_LEVELS: ['Beginner', 'Intermediate', 'Advanced'],
  ACTIVITY_STATUSES: ['Active', 'Inactive', 'Moderately Active', 'Very Active'],
  GOALS: ['Vitality', 'Muscle', 'Weight', 'Flexibility'],
  DIETS: ['Keto Diet', 'Mediterranean Diet', 'Paleo Diet', 'Intermittent Fasting', 'Flexible Balanced Plan'],

  WORKOUT_CATEGORIES: ['HIIT', 'Yoga', 'Strength', 'Cardio', 'Flexibility', 'Pilates', 'CrossFit', 'Dance', 'Martial Arts', 'Swimming'],
  DIFFICULTIES: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
  INTENSITIES: ['Low', 'Moderate', 'High', 'Very High'],

  EXERCISE_CATEGORIES: ['Strength', 'Cardio', 'Mobility', 'Core', 'Plyometric'],
  // How a set of an exercise is measured, which decides what a personal record means.
  TRACKING_TYPES: ['reps', 'weighted', 'duration', 'distance'],

  SESSION_STATUSES: ['completed', 'partial'],
  ENROLLMENT_STATUSES: ['active', 'completed', 'abandoned'],
};
