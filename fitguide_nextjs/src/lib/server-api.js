/**
 * Server components only. Fetch public catalog data (workouts, programs) while rendering on the
 * server, so those pages arrive as complete HTML that search engines can index.
 * API_URL lets the server reach the API on an internal address; it falls back
 * to the public URL.
 */
const SERVER_API_BASE = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * GET a public API path. Responses are cached for `revalidate` seconds.
 * @returns {Promise<object | null>} The JSON body, or null for a 404
 * @throws {Error} If the API is unreachable or returns another error
 */
export async function serverGet(path, { revalidate = 300 } = {}) {
    const res = await fetch(`${SERVER_API_BASE}${path}`, { next: { revalidate } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`FitGuide API ${path} returned HTTP ${res.status}`);
    return res.json();
}

/** Like serverGet, but returns null instead of throwing when the API can't be reached. */
export async function serverGetOrNull(path, options) {
    try {
        return await serverGet(path, options);
    } catch (err) {
        console.error(err.message);
        return null;
    }
}
