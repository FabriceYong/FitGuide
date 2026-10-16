const jwt = require('jsonwebtoken');

const TOKEN_TTL = '7d';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Browsers get the token in an httpOnly cookie so page scripts (and any XSS)
// can't read it. Other clients (e.g. mobile) may use an Authorization header.
const AUTH_COOKIE = 'fitguide_token';

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

const signToken = (userId) => jwt.sign({ id: String(userId) }, getSecret(), { expiresIn: TOKEN_TTL });

const verifyToken = (token) => jwt.verify(token, getSecret());

/**
 * COOKIE_SAMESITE defaults to 'lax', which works when the web app and API are
 * on the same site (e.g. localhost:3000 and localhost:5001). Use 'none' only if
 * they are on different sites; that forces Secure (HTTPS).
 */
function cookieOptions() {
  const sameSite = ['strict', 'lax', 'none'].includes(process.env.COOKIE_SAMESITE) ? process.env.COOKIE_SAMESITE : 'lax';
  const secure = sameSite === 'none'
    || process.env.COOKIE_SECURE === 'true'
    || (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production');
  return { httpOnly: true, sameSite, secure, path: '/' };
}

const setAuthCookie = (res, token) => res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: TOKEN_TTL_MS });

const clearAuthCookie = (res) => res.clearCookie(AUTH_COOKIE, cookieOptions());

/**
 * Find the token on a request. The Authorization header wins over the cookie.
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
  getSecret,
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  tokenFromRequest,
};
