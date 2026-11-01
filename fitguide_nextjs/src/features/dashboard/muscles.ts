/**
 * Body regions for the muscle filter. Workouts and exercises name muscles
 * in more detail ("Quads", "Lower Back"); each region covers those names.
 */
import { MUSCLE_REGIONS } from '@fitguide/shared';

export const REGIONS = ['Shoulders', 'Chest', 'Arms', 'Core', 'Back', 'Legs'] as const;
export type Region = (typeof REGIONS)[number];

const REGION_MUSCLES = MUSCLE_REGIONS;

/** Whether a muscle list works any of the regions ("Full Body" works them all). */
export function worksRegions(muscles: string[], regions: Region[]) {
  if (!regions.length) return true;
  if (muscles.includes('Full Body')) return true;
  return regions.some((r) => REGION_MUSCLES[r].some((m) => muscles.includes(m)));
}
