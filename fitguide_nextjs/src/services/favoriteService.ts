'use client';

/**
 * Favorites API. Workouts are identified by slug.
 * All calls require a signed-in account (guests have no server-side favorites).
 */
import { apiRequest, hasSession } from '../lib/api';
import type { Workout } from '../types/catalog';

/** Get the user's favorite workouts; [] when signed out. */
export const getFavorites = async (): Promise<Workout[]> => {
  if (!hasSession()) return [];
  const data = await apiRequest('/favorites', { auth: true });
  return data.favorites || [];
};

/** Add a workout to favorites. Returns the updated favorite workouts. */
export const addToFavorites = async (slug: string): Promise<Workout[]> => {
  const data = await apiRequest(`/favorites/${encodeURIComponent(slug)}`, { method: 'POST', auth: true });
  return data.favorites || [];
};

/** Remove a workout from favorites. Returns the updated favorite workouts. */
export const removeFromFavorites = async (slug: string): Promise<Workout[]> => {
  const data = await apiRequest(`/favorites/${encodeURIComponent(slug)}`, { method: 'DELETE', auth: true });
  return data.favorites || [];
};

/** Check whether a workout is a favorite; false when signed out or on error. */
export const checkIsFavorite = async (slug: string): Promise<boolean> => {
  if (!hasSession()) return false;
  try {
    const data = await apiRequest(`/favorites/check/${encodeURIComponent(slug)}`, { auth: true });
    return Boolean(data.isFavorite);
  } catch {
    return false;
  }
};
