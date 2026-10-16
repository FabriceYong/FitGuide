const { verifyToken } = require('../utils/jwt');
const userStore = require('../stores/userStore');

/**
 * Authentication Middleware
 * Verifies the JWT from the Authorization header and attaches the public user
 * profile to req.user. Works in both MongoDB and mock-DB modes.
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided. Authorization required.' });
  }

  let decoded;
  try {
    decoded = verifyToken(authHeader.substring(7));
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Token expired. Please login again.' : 'Invalid token.';
    return res.status(401).json({ success: false, message });
  }

  try {
    const user = await userStore.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found. Invalid token.' });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authMiddleware };
