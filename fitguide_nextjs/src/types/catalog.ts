/**
 * Shapes of the catalog data the API sends (workouts, exercises, programs,
 * reviews, articles). Field names match fitguide_api's responses.
 */

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';

export interface WorkoutStep {
  stepNumber: number;
  instruction: string;
  duration?: number;
  exerciseName?: string;
  exerciseSlug?: string;
  gifUrl?: string | null;
  [key: string]: unknown;
}

/** A workout as GET /api/workouts returns it. `id` is the slug. */
export interface Workout {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription?: string | null;
  category: string;
  difficulty: Difficulty;
  duration: number;
  calories?: number | null;
  intensity: string;
  equipment: string[];
  targetMuscles: string[];
  benefits: string[];
  steps: WorkoutStep[];
  thumbnailUrl?: string | null;
  tags: string[];
  cautions?: string[];
  prerequisites?: string[];
  isPremium: boolean;
  locked?: boolean;
  viewCount: number;
  likeCount: number;
  averageRating: number;
  totalReviews: number;
}

export interface Exercise {
  slug: string;
  name: string;
  aliases: string[];
  category: 'Strength' | 'Cardio' | 'Mobility' | 'Core' | 'Plyometric';
  trackingType: 'reps' | 'weighted' | 'duration' | 'distance';
  primaryMuscles: string[];
  equipment: string[];
  instructions: string[];
  formCues: string[];
  commonMistakes: string[];
}

export interface ProgramSummary {
  slug: string;
  title: string;
  description: string;
  level: string;
  goal: string;
  weeks: number;
  daysPerWeek: number;
  averageMinutes?: number | null;
  isPremium?: boolean;
}

export interface Review {
  id: string;
  userId: string | null;
  name: string;
  userAvatar: string | null;
  rating: number;
  comment: string;
  workoutRegiment: string | null;
  /** The reviewed workout's slug (null for a general review). */
  workoutId: string | null;
  beforeImage: string | null;
  afterImage: string | null;
  likes: number;
  createdAt: string;
  /** The author completed this workout in FitGuide. */
  verified: boolean;
}

/** An item from one of the RSS feeds the API proxies. */
export interface FeedArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  thumbnail: string;
  author: string;
}
