'use client';

/**
 * Single client for the FitGuide API.
 * Every request to the backend should go through apiRequest() so the base URL,
 * auth header, JSON handling and error shape are the same everywhere.
 */

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');

// Origin of the API server (without /api), used for files under /uploads.
export const API_ORIGIN = API_BASE.replace(/\/api$/, '');

const TOKEN_KEY = 'fitguide_token';
export const UNAUTHORIZED_EVENT = 'fitguide:unauthorized';

export function getToken() {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export function setToken(token) {
    if (typeof window === 'undefined') return;
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch {
        // storage unavailable (private mode); the session just won't persist
    }
}

export const hasToken = () => Boolean(getToken());

/**
 * Turn a stored asset path ("/uploads/avatars/x.png") into a full URL.
 * Absolute, blob: and data: URLs are returned unchanged.
 */
export function assetUrl(path) {
    if (!path) return null;
    if (/^(https?:|blob:|data:)/.test(path)) return path;
    return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
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
 * @param {boolean} [options.auth=false] Send the stored token
 * @returns {Promise<object>} Parsed JSON response
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
    const token = auth ? getToken() : null;
    if (auth && !token) {
        throw new ApiError('Please sign in to continue.', 401);
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(url, {
            method,
            headers,
            body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
        });
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
            // Token missing, expired or revoked: let AuthContext sign the user out.
            window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
        }
        const validation = Array.isArray(data?.errors) ? data.errors.map((e) => e.msg).join('. ') : null;
        throw new ApiError(validation || data?.message || `Request failed (HTTP ${response.status}).`, response.status, data);
    }
    return data;
}
