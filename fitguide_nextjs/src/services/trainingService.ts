'use client';

/**
 * Training data: logged workout sessions, programs and enrollments, body
 * metrics and the progress summary. Calls that depend on the calendar send
 * the browser's UTC offset so the API groups days in the user's local time.
 */
import type { MeasurementField } from '@fitguide/shared';
import { ApiError, apiRequest } from '../lib/api';
import type { ProgramSummary } from '../types/catalog';
import type { Plan } from './planService';

const tz = () => ({ tzOffset: new Date().getTimezoneOffset() });

/** The user's local date as YYYY-MM-DD. */
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ActivityDay {
  date: string;
  sessions: number;
  minutes: number;
  calories: number;
}

export interface PersonalRecord {
  exerciseSlug: string | null;
  exerciseName: string;
  workoutTitle: string;
  achievedAt: string;
  unit: 'kg' | 'reps' | 'sec' | 'm';
  value: number;
  reps?: number | null;
  estimatedOneRepMaxKg?: number | null;
}

export interface SessionRecord {
  id: string;
  workoutSlug: string;
  workoutTitle: string;
  completedAt: string;
  durationSec: number;
  calories: number | null;
  perceivedEffort?: number | null;
  status: 'completed' | 'partial';
  enrollmentId?: string | null;
  programWeek?: number | null;
  programDay?: number | null;
}

export interface ProgressSummary {
  today: string;
  totals: { sessions: number; minutes: number; calories: number; externalActivities: number };
  thisWeek: { sessions: number; minutes: number; calories: number; activeDays: number };
  streak: { current: number; longest: number; trainedToday: boolean };
  /** The last 12 weeks, oldest first. */
  days: ActivityDay[];
  personalRecords: PersonalRecord[];
  body: {
    latestWeight: { date: string; weightKg: number } | null;
    weightChangeKg: number | null;
    weightChangeSince: string | null;
    weights: { date: string; weightKg: number }[];
    latestMeasurements: Partial<Record<MeasurementField, { value: number; date: string }>>;
  };
  activeEnrollment: Plan | null;
}

export type BodyMetric = { id: string; date: string } & Partial<Record<MeasurementField, number | null>>;

// ── Progress ──────────────────────────────────────────────────────────────────
export const fetchProgressSummary = (): Promise<{ summary: ProgressSummary; recentSessions: SessionRecord[] }> =>
  apiRequest('/progress/summary', { auth: true, query: tz() });

// ── Sessions ──────────────────────────────────────────────────────────────────
// Sessions finished without a connection wait here and are sent once back online.
const QUEUE_KEY = 'fitguide_pending_sessions';

type NewSession = Record<string, unknown>;

const readQueue = (): NewSession[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};
const writeQueue = (items: NewSession[]) => {
  try {
    if (items.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    // storage unavailable: nothing more we can do offline
  }
};

/**
 * Save a finished session. Offline (status 0), it's queued and
 * { queued: true } comes back instead of the saved session.
 */
export async function logSession(session: NewSession): Promise<{ session: Record<string, unknown>; newRecords: PersonalRecord[]; queued?: boolean }> {
  try {
    return await apiRequest('/sessions', { method: 'POST', auth: true, body: session });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 0) throw err;
    writeQueue([...readQueue(), session]);
    return { session: { ...session, calories: null }, newRecords: [], queued: true };
  }
}

export const queuedSessionCount = () => (typeof window === 'undefined' ? 0 : readQueue().length);

/** Send queued sessions. Ones the server rejects (e.g. invalid) are dropped. */
export async function flushQueuedSessions() {
  const queue = readQueue();
  if (!queue.length) return 0;
  const left: NewSession[] = [];
  let sent = 0;
  for (const session of queue) {
    try {
      await apiRequest('/sessions', { method: 'POST', auth: true, body: session });
      sent += 1;
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 0 || status === 401 || status >= 500) left.push(session);
    }
  }
  writeQueue(left);
  return sent;
}
export const fetchSessions = (query: Record<string, string | number> = {}) => apiRequest('/sessions', { auth: true, query });
export const deleteSession = (id: string) => apiRequest(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });

// ── Programs ──────────────────────────────────────────────────────────────────
export const fetchPrograms = (): Promise<{ programs: ProgramSummary[] }> => apiRequest('/programs');
export const fetchEnrollments = (): Promise<{ active: Plan | null; enrollments: Plan[] }> =>
  apiRequest('/enrollments', { auth: true, query: tz() });
export const fetchEnrollment = (id: string) => apiRequest(`/enrollments/${encodeURIComponent(id)}`, { auth: true, query: tz() });
/** Start a program. Throws ApiError 409 (code ACTIVE_ENROLLMENT) if another is active and replace isn't set. */
export const enrollInProgram = (programSlug: string, { replace = false, startDate = localToday() } = {}) => apiRequest('/enrollments', {
  method: 'POST', auth: true, query: tz(), body: { programSlug, startDate, replace },
});
export const leaveProgram = (id: string) => apiRequest(`/enrollments/${encodeURIComponent(id)}`, {
  method: 'PATCH', auth: true, query: tz(), body: { status: 'abandoned' },
});

// ── Body metrics ──────────────────────────────────────────────────────────────
export const fetchBodyMetrics = (): Promise<{ metrics: BodyMetric[] }> => apiRequest('/body-metrics', { auth: true });
export const logBodyMetric = (entry: { date: string } & Partial<Record<MeasurementField, number>>): Promise<{ metric: BodyMetric; user?: Record<string, unknown> }> =>
  apiRequest('/body-metrics', { method: 'POST', auth: true, query: tz(), body: entry });
export const deleteBodyMetric = (id: string) => apiRequest(`/body-metrics/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
