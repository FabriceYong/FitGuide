'use client';

/** Nutrition: targets, food search, the daily food log and meal plans. */
import { apiRequest } from '../lib/api';
import type { Meal } from '@fitguide/shared';

const tz = () => ({ tzOffset: new Date().getTimezoneOffset() });

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Targets extends Macros {
  bmr: number;
  tdee: number;
  age: number;
  ageIsEstimate: boolean;
  diet: string;
  goal: string;
  notes: string[];
}

export interface Food extends Macros {
  slug: string;
  name: string;
  category: string;
  servingLabel: string;
  fiber: number;
  diets: string[];
  isCustom: boolean;
}

export interface LogEntry extends Macros {
  id: string;
  date: string;
  meal: Meal;
  foodSlug: string | null;
  name: string;
  servings: number;
}

export interface DayLog {
  date: string;
  meals: Record<Meal, LogEntry[]>;
  totals: Macros;
  targets: Targets;
}

export interface MealPlanItem extends Macros {
  foodSlug: string;
  name: string;
  servingLabel: string;
  servings: number;
}

export interface MealPlan {
  date: string;
  target: Targets;
  meals: { meal: Meal; items: MealPlanItem[]; totals: Macros }[];
  totals: Macros;
}

export type NewEntry =
  | { date: string; meal: Meal; servings: number; foodSlug: string }
  | ({ date: string; meal: Meal; servings: number; name: string } & Macros);

export const fetchDayLog = (date: string): Promise<DayLog> => apiRequest('/nutrition/log', { auth: true, query: { date, ...tz() } });

export const searchFoods = async (search: string): Promise<Food[]> =>
  (await apiRequest('/nutrition/foods', { auth: true, query: { search } })).foods;

export const logFood = (entry: NewEntry): Promise<{ entry: LogEntry }> =>
  apiRequest('/nutrition/log', { method: 'POST', auth: true, query: tz(), body: entry });

export const deleteLogEntry = (id: string) => apiRequest(`/nutrition/log/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });

export const fetchMealPlan = (date: string): Promise<MealPlan> => apiRequest('/nutrition/meal-plan', { auth: true, query: { date, ...tz() } });

// ── Reading a meal from a photo or a description ──────────────────────────────
export interface Allowance { used: number; max: number; left: number }
export interface MealReadingStatus { available: boolean; allowance: { photos: Allowance; texts: Allowance } }

/** One food read from the meal: a list food with servings (foodSlug), or a one-off with its own estimate. */
export interface ReadItem extends Macros {
  name: string;
  portion: string;
  grams: number;
  confidence: 'high' | 'medium' | 'low';
  foodSlug: string | null;
  foodName: string | null;
  servings: number;
}
export interface MealReading { items: ReadItem[]; note: string | null; allowance: MealReadingStatus['allowance'] }

export const fetchMealReadingStatus = (): Promise<MealReadingStatus> => apiRequest('/nutrition/recognize', { auth: true });

export function readMealPhoto(file: File): Promise<MealReading> {
  const formData = new FormData();
  formData.append('photo', file);
  return apiRequest('/nutrition/recognize/photo', { method: 'POST', auth: true, formData });
}

export const readMealText = (text: string): Promise<MealReading> =>
  apiRequest('/nutrition/recognize/text', { method: 'POST', auth: true, body: { text } });

export const fetchNutritionHistory = (days = 14): Promise<{ days: (Macros & { date: string })[]; targets: Targets }> =>
  apiRequest('/nutrition/history', { auth: true, query: { days, ...tz() } });
