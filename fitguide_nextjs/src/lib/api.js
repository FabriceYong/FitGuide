'use client';

/**
 * Single client for the FitGuide API.
 * Every request to the backend should go through apiRequest() so the base URL,
 * credentials (auth cookie), JSON handling and error shape are the same everywhere.
 */

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');

// Origin of the API server (without /api), used for files under /uploads.
export const API_ORIGIN = API_BASE.replace(/\/api$/, '');

// The session token lives in an httpOnly cookie set by the API, so scripts
// never see it. We only remember (non-secret) that a session exists, so calls
// that need an account can be skipped for guests without a network round trip.
const SESSION_KEY = 'fitguide_session';
// Written by older builds that kept the JWT in localStorage. Removed on load.
const LEGACY_TOKEN_KEY = 'fitguide_token';
export const UNAUTHORIZED_EVENT = 'fitguide:unauthorized';

export function hasSession() {
    if (typeof window === 'undefined') return false;
    try {
        return localStorage.getItem(SESSION_KEY) === '1';
    } catch {
        return false;
    }
}

export function setSession(active) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        if (active) localStorage.setItem(SESSION_KEY, '1');
        else localStorage.removeItem(SESSION_KEY);
    } catch {
        // storage unavailable (private mode); the session just won't persist
    }
}

/**
 * Turn a stored asset path ("/uploads/avatars/x.png") into a full URL.
 * Absolute, blob: and data: URLs are returned unchanged.
 */
export function assetUrl(path) {
    if (!path) return null;
    if (/^(https?:|blob:|data:)/.test(path)) return path;
    return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

// One refresh at a time: concurrent 401s share the same attempt.
let refreshing = null;

/**
 * Ask the API for a new access token using the httpOnly refresh cookie.
 * @returns {Promise<boolean>} whether the session is still alive
 */
export function refreshSession() {
    if (!refreshing) {
        refreshing = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
            .then((res) => res.ok)
            .catch(() => false)
            .finally(() => { refreshing = null; });
    }
    return refreshing;
}

export class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Call the API.
 * @param {string} path      Path under the API base, e.g. '/workouts'
 * @param {object} options
 * @param {string} [options.method='GET']
 * @param {object} [options.body]      JSON body
 * @param {FormData} [options.formData] Multipart body (file uploads)
 * @param {object} [options.query]     Query params; empty values are skipped
 * @param {boolean} [options.auth=false] Needs a signed-in account: fails fast
 *        without a session, and a 401 signs the user out
 * @returns {Promise<any>} Parsed JSON response
 * @throws {ApiError} On network failure (status 0) or a non-2xx response
 */
export async function apiRequest(path, { method = 'GET', body, formData, query, auth = false } = {}) {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    });
    const url = `${API_BASE}${path}${params.toString() ? `?${params}` : ''}`;

    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && !hasSession()) {
        throw new ApiError('Please sign in to continue.', 401);
    }

    const send = () => fetch(url, {
        method,
        headers,
        credentials: 'include', // send/receive the httpOnly auth cookie
        body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
    });

    let response;
    try {
        response = await send();
        // Access tokens are short-lived: on a 401, refresh once and retry.
        if (response.status === 401 && hasSession() && !path.startsWith('/auth/') && await refreshSession()) {
            response = await send();
        }
    } catch {
        throw new ApiError('Could not reach the FitGuide server. Check your connection and try again.', 0);
    }

    let data = null;
    try {
        data = await response.json();
    } catch {
        // non-JSON response
    }

    if (!response.ok) {
        if (response.status === 401 && auth && typeof window !== 'undefined') {
            // Session cookie missing, expired or revoked: let AuthContext sign the user out.
            window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
        }
        const validation = Array.isArray(data?.errors) ? data.errors.map((e) => e.msg).join('. ') : null;
        throw new ApiError(validation || data?.message || `Request failed (HTTP ${response.status}).`, response.status, data);
    }
    return data;
}
