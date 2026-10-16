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

module.exports = { getCorsOrigins, intFromEnv };
