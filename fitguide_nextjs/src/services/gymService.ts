'use client';

/** Gyms near a point and place search for the gym map (OpenStreetMap data, via the API). */
import { apiRequest } from '../lib/api';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Gym extends LatLng {
  id: string;
  /** null when the map data has no name for it. */
  name: string | null;
  address: string | null;
  distanceKm: number;
}

export interface Place extends LatLng {
  label: string;
}

/** The search distances offered, in km. */
export const RADII = [2, 5, 10, 25] as const;

export const fetchNearbyGyms = async (at: LatLng, radiusKm: number): Promise<Gym[]> =>
  (await apiRequest('/gyms/nearby', { query: { lat: at.lat, lng: at.lng, radius: radiusKm } })).gyms;

export const searchPlaces = async (q: string): Promise<Place[]> => (await apiRequest('/gyms/places', { query: { q } })).places;

export const gymName = (gym: Gym) => gym.name || 'Unnamed gym';

/** "350 m" or "1.2 km". */
export function formatDistance(km: number) {
  if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** About how long it takes to walk there at 5 km/h, for gyms within 2 km. */
export function walkTime(km: number) {
  if (km > 2) return null;
  return `${Math.max(1, Math.round((km / 5) * 60))} min walk`;
}

/** Turn-by-turn directions in the device's maps app: Apple Maps on Apple devices, Google Maps elsewhere. */
export function directionsUrl(gym: LatLng) {
  const apple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  return apple
    ? `https://maps.apple.com/?daddr=${gym.lat},${gym.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${gym.lat},${gym.lng}`;
}
