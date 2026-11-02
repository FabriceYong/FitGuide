'use client';

/** The daily readiness score (the API's services/readiness.js). */
import { apiRequest } from '../lib/api';

const tz = () => ({ tzOffset: new Date().getTimezoneOffset() });

export interface Readiness {
  date: string;
  checkedIn: boolean;
  energy?: number;
  soreness?: number;
  score?: number;
  band?: 'push' | 'steady' | 'easy';
  headline?: string;
  advice?: string;
  reasons?: { text: string; effect: 'up' | 'down' | 'none' }[];
  /** On a low day: an easier workout for today's session of a personal plan. */
  easierSwap?: { week: number; day: number; title: string; newTitle: string; workoutSlug: string } | null;
}

export const fetchReadiness = async (): Promise<Readiness> => (await apiRequest('/readiness', { auth: true, query: tz() })).readiness;

export const checkInReadiness = async (energy: number, soreness: number): Promise<Readiness> =>
  (await apiRequest('/readiness', { method: 'PUT', auth: true, query: tz(), body: { energy, soreness } })).readiness;

/** Put another workout on an open day of the personal plan. */
export const swapPlanDay = (week: number, day: number, workoutSlug: string) =>
  apiRequest('/plan/days', { method: 'PATCH', auth: true, query: tz(), body: { week, day, workoutSlug } });
