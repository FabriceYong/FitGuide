const { verifyToken, tokenFromRequest, clearAuthCookie } = require('../utils/jwt');
const { isForeignOriginWrite } = require('../utils/config');
const userStore = require('../stores/userStore');

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

  if (found.source === 'cookie' && isForeignOriginWrite(req)) {
    return res.status(403).json({ success: false, message: 'Request origin not allowed.' });
  }

  let decoded;
  try {
    decoded = verifyToken(found.token);
  } catch (error) {
    if (found.source === 'cookie') clearAuthCookie(res);
    // TOKEN_EXPIRED tells clients to call POST /api/auth/refresh and retry.
    const expired = error.name === 'TokenExpiredError';
    return res.status(401).json({ success: false, code: expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN', message: expired ? 'Session expired.' : 'Invalid token.' });
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

/**
 * Attach req.user when a valid token is present, but let anonymous requests
 * through (for public pages that show more to signed-in or PLUS members).
 */
const optionalAuth = async (req, _res, next) => {
  const found = tokenFromRequest(req);
  if (!found) return next();
  try {
    const user = await userStore.findById(verifyToken(found.token).id);
    if (user) req.user = user;
  } catch {
    // Invalid or expired token: treat as anonymous.
  }
  return next();
};

module.exports = { authMiddleware, optionalAuth };
