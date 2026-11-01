'use client';

/** A member's own workouts, made in the workout builder (the API's services/myWorkouts.js). */
import { apiRequest } from '../lib/api';
import type { Workout } from '../types/catalog';

export interface BuilderExercise {
  name: string;
  sets: number;
  /** "10" or a range "8-10"; or seconds instead. */
  reps?: string | null;
  seconds?: number | null;
  /** Log a weight for each set. */
  weighted: boolean;
  /** Straight on to the next exercise, resting after both (a superset). */
  supersetNext: boolean;
}

export interface BuilderAnswers {
  title: string;
  category: string;
  restSec: number;
  exercises: BuilderExercise[];
}

export type MyWorkout = Workout & { builtFrom: BuilderAnswers; updatedAt: string };

export const fetchMyWorkouts = async (): Promise<MyWorkout[]> => (await apiRequest('/my-workouts', { auth: true })).workouts;

export const fetchMyWorkout = async (slug: string): Promise<MyWorkout> =>
  (await apiRequest(`/my-workouts/${encodeURIComponent(slug)}`, { auth: true })).workout;

/** Create a workout, or change the one with this slug. */
export const saveMyWorkout = async (answers: BuilderAnswers, slug?: string): Promise<MyWorkout> => (await apiRequest(
  slug ? `/my-workouts/${encodeURIComponent(slug)}` : '/my-workouts',
  { method: slug ? 'PUT' : 'POST', auth: true, body: answers },
)).workout;

export const deleteMyWorkout = async (slug: string): Promise<void> => {
  await apiRequest(`/my-workouts/${encodeURIComponent(slug)}`, { method: 'DELETE', auth: true });
};
