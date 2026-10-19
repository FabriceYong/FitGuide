/**
 * Settings read from the environment that more than one module needs.
 * Read lazily (functions, not constants) so tests can set process.env first.
 */

const getCorsOrigins = () => (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const intFromEnv = (name, fallback) => {
  const value = parseInt(process.env[name], 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Browsers attach cookies automatically, so a cookie-authenticated write must
 * come from one of our own origins (CSRF defence on top of SameSite).
 * Requests without an Origin header aren't from a cross-site browser page.
 */
const isForeignOriginWrite = (req) => {
  if (SAFE_METHODS.has(req.method)) return false;
  const { origin } = req.headers;
  return Boolean(origin) && !getCorsOrigins().includes(origin);
};

module.exports = { getCorsOrigins, intFromEnv, isForeignOriginWrite };
