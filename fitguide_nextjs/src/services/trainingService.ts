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
  /** From the wearer's watch (synced by the mobile app); calories then come from it. */
  avgHr?: number | null;
  calorieSource?: 'estimate' | 'heart_rate';
  perceivedEffort?: number | null;
  status: 'completed' | 'partial';
  enrollmentId?: string | null;
  programWeek?: number | null;
  programDay?: number | null;
}

/** A badge for real progress (the API's services/achievements.js). */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
  progress: { value: number; goal: number };
}

export interface WeekStreak {
  goal: number;
  weeks: number;
  best: number;
  thisWeek: { weekStart: string; activeDays: number; met: boolean; daysLeft: number };
  passAvailable: boolean;
  lastWeekSaved: boolean;
  history: { weekStart: string; activeDays: number; met: boolean; saved: boolean }[];
}

export interface ProgressSummary {
  today: string;
  totals: { sessions: number; minutes: number; calories: number; externalActivities: number };
  thisWeek: { sessions: number; minutes: number; calories: number; activeDays: number };
  streak: { current: number; longest: number; trainedToday: boolean };
  /** Weeks in a row with at least `goal` active days (one short week a month let off). */
  weekStreak: WeekStreak;
  /** The last 12 weeks, oldest first. */
  days: ActivityDay[];
  personalRecords: PersonalRecord[];
  achievements: Achievement[];
  /** Workouts in the last 7 days that worked each body region. */
  muscles: { regions: Record<string, number> };
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
// Sessions finished without a connection wait here, each with the account it
// belongs to, and are sent once that account is signed in and back online.
// Every session carries a clientId, so the API saves a resent one only once.
const QUEUE_KEY = 'fitguide_pending_sessions_v2';
// Written by builds that didn't record whose session it was. Never sent: it
// could belong to anyone who used this device.
const LEGACY_QUEUE_KEY = 'fitguide_pending_sessions';

type NewSession = Record<string, unknown> & { clientId?: string };
interface QueuedSession {
  userId: string;
  session: NewSession & { clientId: string };
}

const PROGRAM_FIELDS = ['enrollmentId', 'programWeek', 'programDay'];

/** A random id for a new session (see the API's clientId). */
export function newClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

const readQueue = (): QueuedSession[] => {
  try {
    localStorage.removeItem(LEGACY_QUEUE_KEY);
    const items = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(items) ? items.filter((q) => q && typeof q.userId === 'string' && q.session?.clientId) : [];
  } catch {
    return [];
  }
};
const writeQueue = (items: QueuedSession[]) => {
  try {
    if (items.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    // storage unavailable: nothing more we can do offline
  }
};

const postSession = (session: NewSession) => apiRequest('/sessions', { method: 'POST', auth: true, body: session });

/**
 * Save a finished session for the signed-in user. Pass the same clientId when
 * retrying a save, so it can't be stored twice. Offline (status 0), it's
 * queued for this user and { queued: true } comes back instead.
 */
export async function logSession(
  session: NewSession,
  userId: string,
): Promise<{ session: Record<string, unknown>; newRecords: PersonalRecord[]; queued?: boolean }> {
  const body = { ...session, clientId: session.clientId || newClientId() };
  try {
    return await postSession(body);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 0) throw err;
    writeQueue([...readQueue(), { userId, session: body }]);
    return { session: { ...body, calories: null }, newRecords: [], queued: true };
  }
}

export const queuedSessionCount = (userId: string) => (typeof window === 'undefined' ? 0 : readQueue().filter((q) => q.userId === userId).length);

/** Forget a user's queued sessions (their account is being deleted). */
export function discardQueuedSessions(userId: string) {
  writeQueue(readQueue().filter((q) => q.userId !== userId));
}

// Not the session's fault: try again on the next flush.
const retryLater = (status: number) => status === 0 || status === 401 || status === 408 || status === 429 || status >= 500;

/** Send one queued session: 'sent', 'retry' (keep it), or 'dropped' (the API won't take it). */
async function sendQueued(session: NewSession): Promise<'sent' | 'retry' | 'dropped'> {
  try {
    await postSession(session);
    return 'sent';
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    if (retryLater(status)) return 'retry';
    // The program may have ended while offline, so the day can't count for it
    // any more. Keep the workout itself.
    if (status === 400 && session.enrollmentId) {
      return sendQueued(Object.fromEntries(Object.entries(session).filter(([k]) => !PROGRAM_FIELDS.includes(k))));
    }
    return 'dropped';
  }
}

// One flush at a time per user, so a session isn't sent by two flushes at once.
const flushing = new Map<string, Promise<{ sent: number; dropped: number }>>();

/**
 * Send this user's queued sessions. Sessions the API refuses for good (the
 * workout is gone, PLUS ended, invalid data) are removed and counted as dropped.
 */
export function flushQueuedSessions(userId: string): Promise<{ sent: number; dropped: number }> {
  const running = flushing.get(userId);
  if (running) return running;
  const flush = (async () => {
    const mine = readQueue().filter((q) => q.userId === userId);
    const done = new Set<string>();
    let sent = 0;
    let dropped = 0;
    for (const { session } of mine) {
      const result = await sendQueued(session);
      if (result === 'retry') continue;
      done.add(session.clientId);
      if (result === 'sent') sent += 1;
      else dropped += 1;
    }
    // Re-read, so a session queued while this ran is kept.
    writeQueue(readQueue().filter((q) => !(q.userId === userId && done.has(q.session.clientId))));
    return { sent, dropped };
  })().finally(() => flushing.delete(userId));
  flushing.set(userId, flush);
  return flush;
}
/** The same set last time, and what to aim for now (fitguide_api/services/progress.js). */
export interface PreviousSet {
  last: { reps: number | null; weightKg: number | null; completedAt: string } | null;
  suggestion: { reps: number; weightKg?: number; reason: 'add_weight' | 'reach_range' | 'more_reps' } | null;
}

/** For each step (its saved name and rep target), the same set last time; in step order. */
export const fetchPreviousSets = async (steps: { name: string; reps?: string }[]): Promise<PreviousSet[]> =>
  (await apiRequest('/sessions/previous-sets', { method: 'POST', auth: true, body: { steps } })).steps;

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
/** Let the program's coach see how you're doing and send you notes (or stop). */
export const shareWithCoach = async (id: string, share: boolean): Promise<Plan> => (await apiRequest(`/enrollments/${encodeURIComponent(id)}`, {
  method: 'PATCH', auth: true, query: tz(), body: { shareWithCoach: share },
})).enrollment;

/** A note from the coach of a program you share your progress with. */
export interface CoachNote {
  id: string;
  text: string;
  createdAt: string;
  coachName: string;
  programTitle: string;
}
export const fetchCoachNotes = async (): Promise<CoachNote[]> => (await apiRequest('/enrollments/notes', { auth: true })).notes;
export const markCoachNoteRead = (id: string) => apiRequest(`/enrollments/notes/${encodeURIComponent(id)}/read`, { method: 'POST', auth: true });

// ── Body metrics ──────────────────────────────────────────────────────────────
export const fetchBodyMetrics = (): Promise<{ metrics: BodyMetric[] }> => apiRequest('/body-metrics', { auth: true });
export const logBodyMetric = (entry: { date: string } & Partial<Record<MeasurementField, number>>): Promise<{ metric: BodyMetric; user?: Record<string, unknown> }> =>
  apiRequest('/body-metrics', { method: 'POST', auth: true, query: tz(), body: entry });
export const deleteBodyMetric = (id: string) => apiRequest(`/body-metrics/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
