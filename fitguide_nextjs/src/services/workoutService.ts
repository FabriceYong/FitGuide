'use client';

/**
 * The workout catalog. The last catalog the API sent is kept on the device,
 * so the dashboard still lists real workouts when the server can't be
 * reached; it never shows made-up ones.
 */
import { apiRequest, ApiError } from '../lib/api';
import type { Workout } from '../types/catalog';

const CACHE_KEY = 'fitguide_catalog_v1';

interface CachedCatalog {
  savedAt: string;
  workouts: Workout[];
}

export interface WorkoutFilters {
  category?: string;
  difficulty?: string;
  intensity?: string;
  equipment?: string;
  search?: string;
  minDuration?: number;
  maxDuration?: number;
}

export interface CatalogResult {
  workouts: Workout[];
  /** Set when the server was unreachable and this is the saved copy. */
  savedAt?: string;
}

function readCache(): CachedCatalog | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CachedCatalog) : null;
    return parsed && Array.isArray(parsed.workouts) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(workouts: Workout[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), workouts }));
  } catch {
    // storage full or unavailable: the next visit just loads from the server
  }
}

/** Whether an error means "couldn't reach the server" rather than a real answer. */
const isUnreachable = (err: unknown) => err instanceof ApiError && (err.status === 0 || err.status >= 500);

/**
 * All published workouts (unfiltered calls refresh the saved copy). Falls
 * back to the saved copy when offline; throws if there is none.
 */
export async function fetchWorkouts(filters: WorkoutFilters = {}): Promise<CatalogResult> {
  const unfiltered = Object.values(filters).every((v) => v === undefined || v === '');
  try {
    const data = await apiRequest('/workouts', { query: filters });
    const workouts = data.workouts as Workout[];
    if (unfiltered) writeCache(workouts);
    return { workouts };
  } catch (err) {
    const cached = unfiltered && isUnreachable(err) ? readCache() : null;
    if (!cached) throw err;
    return { workouts: cached.workouts, savedAt: cached.savedAt };
  }
}

/**
 * One workout. Resolves { success: false } when it doesn't exist; offline,
 * it's looked up in the saved catalog.
 */
export async function fetchWorkoutBySlug(slug: string): Promise<{ success: boolean; workout?: Workout; message?: string }> {
  try {
    return await apiRequest(`/workouts/${encodeURIComponent(slug)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { success: false, message: 'Workout not found' };
    const workout = isUnreachable(err) ? readCache()?.workouts.find((w) => w.slug === slug) : undefined;
    if (!workout) throw err;
    return { success: true, workout };
  }
}

/** Like a workout (once per account). Returns the new like count. */
export async function likeWorkout(slug: string): Promise<number> {
  const data = await apiRequest(`/workouts/${encodeURIComponent(slug)}/like`, { method: 'POST', auth: true });
  return data.likes as number;
}
