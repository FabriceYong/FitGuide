/** Display helpers for logged training data. */

export function formatRecord(r) {
    if (r.unit === 'kg') return `${r.value} kg${r.reps ? ` × ${r.reps}` : ''}`;
    if (r.unit === 'sec') return formatSeconds(r.value);
    if (r.unit === 'm') return r.value >= 1000 ? `${(r.value / 1000).toFixed(2)} km` : `${r.value} m`;
    return `${r.value} reps`;
}

export function formatSeconds(total) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    if (!m) return `${s}s`;
    return s ? `${m}m ${s}s` : `${m} min`;
}

/** 'YYYY-MM-DD' → "Wed 14 Oct" in the user's locale. */
export const formatDay = (ymd, options = { weekday: 'short', day: 'numeric', month: 'short' }) =>
    new Date(`${ymd}T12:00:00`).toLocaleDateString(undefined, options);

export const formatDateTime = (iso) =>
    new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
