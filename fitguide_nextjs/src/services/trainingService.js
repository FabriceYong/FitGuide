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
/** @returns {Promise<{ session: object, newRecords: object[] }>} */
export const logSession = (session) => apiRequest('/sessions', { method: 'POST', auth: true, body: session });
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
