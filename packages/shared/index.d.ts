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
  readonly MIN_BIRTH_YEAR: number;
  readonly MIN_AGE: number;
  readonly FOCUS_AREAS: readonly FocusArea[];
  readonly EQUIPMENT_KITS: readonly EquipmentKit[];
  readonly LIMITATIONS: readonly Limitation[];
  readonly WORKOUT_MINUTES: Range;
  readonly DAYS_PER_WEEK: Range;
};

// ── Tailoring (tailoring.js) ──────────────────────────────────────────────────
export type FocusArea = 'Full Body' | 'Core' | 'Glutes' | 'Legs' | 'Back' | 'Chest' | 'Shoulders' | 'Arms';
export type EquipmentKit = 'none' | 'yoga-props' | 'weights' | 'bands' | 'gym' | 'pool' | 'boxing';
export type Limitation = 'knees' | 'lower-back' | 'shoulders' | 'wrists' | 'low-impact';

/** The profile fields tailoring reads. All optional: missing ones are ignored. */
export interface TailoringProfile {
  gender?: string;
  height?: number;
  weight?: number;
  birthYear?: number | null;
  goal?: string;
  fitnessLevel?: string;
  focusAreas?: readonly string[];
  equipment?: readonly string[];
  workoutMinutes?: number | null;
  limitations?: readonly string[];
  plan?: string;
  role?: string;
}

/** The workout fields tailoring reads. */
export interface TailorableWorkout {
  slug: string;
  category: string;
  difficulty: string;
  duration: number;
  intensity?: string;
  equipment?: readonly string[];
  targetMuscles?: readonly string[];
  tags?: readonly string[];
  cautions?: readonly string[];
  prerequisites?: readonly string[];
  isPremium?: boolean;
}

export interface WorkoutFit {
  score: number;
  /** Up to three short reasons it suits the user, best first. */
  reasons: string[];
  /** The user's limitations this workout loads. */
  conflicts: Limitation[];
  /** Equipment it needs that the user said they don't have. */
  missingEquipment: string[];
}

export declare const FOCUS_AREAS: Readonly<Record<FocusArea, readonly string[]>>;
export declare const EQUIPMENT_KITS: Readonly<Record<EquipmentKit, { label: string; items: readonly string[] }>>;
export declare const LIMITATIONS: Readonly<Record<Limitation, { label: string }>>;
export declare function suggestedFocusAreas(profile: { goal?: string; gender?: string }): FocusArea[];
export declare function restingKcal(profile: TailoringProfile & { weight: number; height: number }, year?: number): number;
export declare function calorieFactor(profile: TailoringProfile | null | undefined, year?: number): number;
export declare function personalCalories<T extends number | null | undefined>(kcal: T, profile: TailoringProfile | null | undefined, year?: number): T;
export declare function heartRateCalories(effort: { avgHr?: number | null; durationSec: number }, profile: TailoringProfile | null | undefined, year?: number): number | null;
export declare function requiredEquipment(workout: TailorableWorkout): string[];
export declare function limitationConflicts(workout: TailorableWorkout, limitations: readonly string[] | undefined): Limitation[];
export declare function workoutFit(workout: TailorableWorkout, profile?: TailoringProfile, options?: { recentSlugs?: readonly string[] }): WorkoutFit;
export declare function rankWorkouts<W extends TailorableWorkout>(
  workouts: readonly W[],
  profile: TailoringProfile | null | undefined,
  options?: { recentSlugs?: readonly string[]; day?: number; limit?: number },
): (WorkoutFit & { workout: W })[];

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

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export declare const NUTRITION: {
  readonly MEALS: readonly Meal[];
  readonly FOOD_CATEGORIES: readonly string[];
  readonly DIET_TAGS: Readonly<Record<string, string>>;
  readonly MAX_SERVINGS: number;
};
