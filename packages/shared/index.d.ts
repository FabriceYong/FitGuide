type Range = readonly [min: number, max: number];

export declare const PROFILE: {
  readonly GENDERS: readonly ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
  readonly FITNESS_LEVELS: readonly ['Beginner', 'Intermediate', 'Advanced'];
  readonly ACTIVITY_STATUSES: readonly ['Active', 'Inactive', 'Moderately Active', 'Very Active'];
  readonly GOALS: readonly ['Vitality', 'Muscle', 'Weight', 'Flexibility'];
  readonly DIETS: readonly ['Keto Diet', 'Mediterranean Diet', 'Paleo Diet', 'Intermittent Fasting', 'Flexible Balanced Plan'];
  readonly HEIGHT_CM: Range;
  readonly WEIGHT_KG: Range;
  readonly NAME_MAX: number;
  readonly PASSWORD_MIN: number;
};

export declare const CATALOG: {
  readonly WORKOUT_CATEGORIES: readonly string[];
  readonly DIFFICULTIES: readonly ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
  readonly INTENSITIES: readonly ['Low', 'Moderate', 'High', 'Very High'];
  readonly EXERCISE_CATEGORIES: readonly ['Strength', 'Cardio', 'Mobility', 'Core', 'Plyometric'];
  readonly TRACKING_TYPES: readonly ['reps', 'weighted', 'duration', 'distance'];
};

export type MeasurementField = 'weightKg' | 'bodyFatPct' | 'waistCm' | 'chestCm' | 'hipsCm' | 'armCm' | 'thighCm';

export declare const TRAINING: {
  readonly SESSION_STATUSES: readonly ['completed', 'partial'];
  readonly ENROLLMENT_STATUSES: readonly ['active', 'completed', 'abandoned'];
  readonly MEASUREMENT_RANGES: Readonly<Record<MeasurementField, Range>>;
  readonly NOTES_MAX: number;
};

export type Goal = (typeof PROFILE.GOALS)[number];
export type FitnessLevel = (typeof PROFILE.FITNESS_LEVELS)[number];
export type Diet = (typeof PROFILE.DIETS)[number];
