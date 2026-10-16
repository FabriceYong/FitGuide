const { verifyToken, tokenFromRequest, clearAuthCookie } = require('../utils/jwt');
const { getCorsOrigins } = require('../utils/config');
const userStore = require('../stores/userStore');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Authentication Middleware
 * Verifies the JWT from the httpOnly auth cookie (browsers) or an
 * "Authorization: Bearer" header (other clients) and attaches the public user
 * profile to req.user. Works in both MongoDB and mock-DB modes.
 */
const authMiddleware = async (req, res, next) => {
  const found = tokenFromRequest(req);
  if (!found) {
    return res.status(401).json({ success: false, message: 'No token provided. Authorization required.' });
  }

  // Browsers attach cookies automatically, so a cookie-authenticated write must
  // come from one of our own origins (CSRF defence on top of SameSite).
  // Requests without an Origin header aren't from a cross-site browser page.
  if (found.source === 'cookie' && !SAFE_METHODS.has(req.method)) {
    const origin = req.headers.origin;
    if (origin && !getCorsOrigins().includes(origin)) {
      return res.status(403).json({ success: false, message: 'Request origin not allowed.' });
    }
  }

  let decoded;
  try {
    decoded = verifyToken(found.token);
  } catch (error) {
    if (found.source === 'cookie') clearAuthCookie(res);
    const message = error.name === 'TokenExpiredError' ? 'Token expired. Please login again.' : 'Invalid token.';
    return res.status(401).json({ success: false, message });
  }

  try {
    const user = await userStore.findById(decoded.id);
    if (!user) {
      if (found.source === 'cookie') clearAuthCookie(res);
      return res.status(401).json({ success: false, message: 'User not found. Invalid token.' });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authMiddleware };
