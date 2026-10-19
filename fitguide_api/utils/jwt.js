const jwt = require('jsonwebtoken');
const { intFromEnv } = require('./config');

// Browsers get tokens in httpOnly cookies so page scripts (and any XSS) can't
// read them. Other clients (e.g. mobile) may use an Authorization header.
const AUTH_COOKIE = 'fitguide_token';
// Long-lived refresh token, only sent to the auth routes.
const REFRESH_COOKIE = 'fitguide_refresh';
// Non-secret "a session exists" hint, readable by the web app's server so it
// can redirect signed-out visitors from private pages. Grants nothing.
const SESSION_HINT_COOKIE = 'fitguide_session';

const accessTtlSec = () => intFromEnv('ACCESS_TOKEN_TTL_SEC', 15 * 60);
const refreshTtlMs = () => intFromEnv('REFRESH_TOKEN_TTL_DAYS', 30) * 24 * 60 * 60 * 1000;

/**
 * JWT_SECRET is required. There is deliberately no fallback value: a default
 * secret would let anyone who has read this code mint valid tokens.
 */
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters (see .env.example).');
  }
  return secret;
}

const signToken = (userId) => jwt.sign({ id: String(userId) }, getSecret(), { expiresIn: accessTtlSec() });

const verifyToken = (token) => jwt.verify(token, getSecret());

/**
 * COOKIE_SAMESITE defaults to 'lax', which works when the web app and API are
 * on the same site (e.g. localhost:3000 and localhost:5001). Use 'none' only if
 * they are on different sites; that forces Secure (HTTPS). COOKIE_DOMAIN
 * (e.g. ".example.com") shares the cookies between app. and api. subdomains.
 */
function cookieOptions(path = '/') {
  const sameSite = ['strict', 'lax', 'none'].includes(process.env.COOKIE_SAMESITE) ? process.env.COOKIE_SAMESITE : 'lax';
  const secure = sameSite === 'none'
    || process.env.COOKIE_SECURE === 'true'
    || (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production');
  return {
    httpOnly: true,
    sameSite,
    secure,
    path,
    ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
  };
}

const REFRESH_PATH = '/api/auth';

const setAuthCookie = (res, token) => res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: accessTtlSec() * 1000 });

function setRefreshCookies(res, refreshToken) {
  res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieOptions(REFRESH_PATH), maxAge: refreshTtlMs() });
  res.cookie(SESSION_HINT_COOKIE, '1', { ...cookieOptions(), httpOnly: false, maxAge: refreshTtlMs() });
}

const clearAuthCookie = (res) => res.clearCookie(AUTH_COOKIE, cookieOptions());

/** Clear every session cookie (sign-out, revoked or replayed refresh token). */
function clearSessionCookies(res) {
  clearAuthCookie(res);
  res.clearCookie(REFRESH_COOKIE, cookieOptions(REFRESH_PATH));
  res.clearCookie(SESSION_HINT_COOKIE, { ...cookieOptions(), httpOnly: false });
}

/**
 * Find the access token on a request. The Authorization header wins over the cookie.
 * @returns {{ token: string, source: 'header' | 'cookie' } | null}
 */
function tokenFromRequest(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return { token: header.substring(7), source: 'header' };
  const cookie = req.cookies?.[AUTH_COOKIE];
  if (cookie) return { token: cookie, source: 'cookie' };
  return null;
}

module.exports = {
  AUTH_COOKIE,
  REFRESH_COOKIE,
  SESSION_HINT_COOKIE,
  getSecret,
  signToken,
  verifyToken,
  refreshTtlMs,
  setAuthCookie,
  setRefreshCookies,
  clearAuthCookie,
  clearSessionCookies,
  tokenFromRequest,
};
