'use client';

/** The monthly and yearly recap (the API's services/recap.js). */
import { apiRequest } from '../lib/api';

const tz = () => ({ tzOffset: new Date().getTimezoneOffset() });

export interface Recap {
  kind: 'month' | 'year';
  key: string;
  label: string;
  from: string;
  to: string;
  workouts: number;
  previousWorkouts: number;
  activeDays: number;
  minutes: number;
  calories: number;
  volumeKg: number;
  records: number;
  topRecord: { exerciseName: string; unit: 'kg' | 'reps' | 'sec' | 'm'; value: number; reps: number | null } | null;
  topMuscle: { region: string; workouts: number } | null;
  favouriteWorkout: { title: string; times: number } | null;
  foodDays: number;
}

export type RecapOffer = Pick<Recap, 'kind' | 'key' | 'label' | 'workouts'>;

export const fetchRecap = async (which: { month?: string; year?: number }): Promise<Recap> =>
  (await apiRequest('/progress/recap', { auth: true, query: { ...tz(), ...which } })).recap;

export const fetchRecapOffers = async (): Promise<RecapOffer[]> => (await apiRequest('/progress/recap/offers', { auth: true, query: tz() })).offers;
