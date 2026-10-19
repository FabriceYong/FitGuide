'use client';

/**
 * Training data: logged workout sessions, programs and enrollments, body
 * metrics and the progress summary. Calls that depend on the calendar send
 * the browser's UTC offset so the API groups days in the user's local time.
 */
import { apiRequest } from '../lib/api';

const tz = () => ({ tzOffset: new Date().getTimezoneOffset() });

/** The user's local date as YYYY-MM-DD. */
export function localToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Progress ──────────────────────────────────────────────────────────────────
export const fetchProgressSummary = () => apiRequest('/progress/summary', { auth: true, query: tz() });

// ── Sessions ──────────────────────────────────────────────────────────────────
// Sessions finished without a connection wait here and are sent once back online.
const QUEUE_KEY = 'fitguide_pending_sessions';

const readQueue = () => {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        return [];
    }
};
const writeQueue = (items) => {
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
 * @returns {Promise<{ session: object, newRecords: object[], queued?: boolean }>}
 */
export async function logSession(session) {
    try {
        return await apiRequest('/sessions', { method: 'POST', auth: true, body: session });
    } catch (err) {
        if (err.status !== 0) throw err;
        writeQueue([...readQueue(), session]);
        return { session: { ...session, calories: null }, newRecords: [], queued: true };
    }
}

export const queuedSessionCount = () => (typeof window === 'undefined' ? 0 : readQueue().length);

/** Send queued sessions. Ones the server rejects (e.g. invalid) are dropped. */
export async function flushQueuedSessions() {
    const queue = readQueue();
    if (!queue.length) return 0;
    const left = [];
    let sent = 0;
    for (const session of queue) {
        try {
            await apiRequest('/sessions', { method: 'POST', auth: true, body: session });
            sent += 1;
        } catch (err) {
            if (err.status === 0 || err.status === 401 || err.status >= 500) left.push(session);
        }
    }
    writeQueue(left);
    return sent;
}
export const fetchSessions = (query = {}) => apiRequest('/sessions', { auth: true, query });
export const deleteSession = (id) => apiRequest(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });

// ── Programs ──────────────────────────────────────────────────────────────────
export const fetchPrograms = () => apiRequest('/programs');
export const fetchEnrollments = () => apiRequest('/enrollments', { auth: true, query: tz() });
export const fetchEnrollment = (id) => apiRequest(`/enrollments/${encodeURIComponent(id)}`, { auth: true, query: tz() });
/** Start a program. Throws ApiError 409 (code ACTIVE_ENROLLMENT) if another is active and replace isn't set. */
export const enrollInProgram = (programSlug, { replace = false, startDate = localToday() } = {}) => apiRequest('/enrollments', {
    method: 'POST', auth: true, query: tz(), body: { programSlug, startDate, replace },
});
export const leaveProgram = (id) => apiRequest(`/enrollments/${encodeURIComponent(id)}`, {
    method: 'PATCH', auth: true, query: tz(), body: { status: 'abandoned' },
});

// ── Body metrics ──────────────────────────────────────────────────────────────
export const fetchBodyMetrics = () => apiRequest('/body-metrics', { auth: true });
export const logBodyMetric = (entry) => apiRequest('/body-metrics', { method: 'POST', auth: true, query: tz(), body: entry });
export const deleteBodyMetric = (id) => apiRequest(`/body-metrics/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
