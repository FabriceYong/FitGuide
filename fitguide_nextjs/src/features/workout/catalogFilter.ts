/** Searching and filtering the workout catalog (the Explore tab and /workouts; the app's catalog_filter.dart). */
import type { Workout } from '../../types/catalog';

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
export const DURATIONS = [
  { label: 'Any length', max: 0 },
  { label: 'Up to 20 min', max: 20 },
  { label: 'Up to 30 min', max: 30 },
  { label: 'Up to 45 min', max: 45 },
];

export const stripOptional = (e: string) => e.replace(/^Optional:\s*/i, '');
/** Equipment a workout can't be done without. */
export const requiredEquipment = (w: Workout) => w.equipment.filter((e) => e !== 'None' && !/^Optional:/i.test(e));

export interface CatalogFilter {
  query?: string;
  category?: string;
  level?: string;
  /** An equipment name, or 'none' for workouts that need nothing. */
  equipment?: string;
  maxMinutes?: number;
}

export function matchesFilter(w: Workout, { query = '', category = '', level = '', equipment = '', maxMinutes = 0 }: CatalogFilter) {
  if (category && w.category !== category) return false;
  // "All Levels" workouts suit every level.
  if (level && w.difficulty !== level && w.difficulty !== 'All Levels') return false;
  if (equipment === 'none' ? requiredEquipment(w).length > 0 : equipment && !w.equipment.map(stripOptional).includes(equipment)) return false;
  if (maxMinutes && w.duration > maxMinutes) return false;
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [w.title, w.description, w.shortDescription || '', w.category, ...w.tags].some((s) => s.toLowerCase().includes(term));
}

/** Categories with how many workouts each has, largest first. */
export function categoryCounts(workouts: Workout[]) {
  const counts = new Map<string, number>();
  for (const w of workouts) counts.set(w.category, (counts.get(w.category) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export const equipmentNames = (workouts: Workout[]) =>
  [...new Set(workouts.flatMap((w) => w.equipment.map(stripOptional)))].filter((e) => e !== 'None').sort();
