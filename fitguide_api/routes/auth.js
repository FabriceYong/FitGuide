const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PROFILE } = require('@fitguide/shared');
const { GENDERS, FITNESS_LEVELS, ACTIVITY_STATUSES, GOALS, DIETS } = require('../utils/enums');

const [MIN_HEIGHT, MAX_HEIGHT] = PROFILE.HEIGHT_CM;
const [MIN_WEIGHT, MAX_WEIGHT] = PROFILE.WEIGHT_KG;
const userStore = require('../stores/userStore');
const { signToken, setAuthCookie, setRefreshCookies, clearSessionCookies, REFRESH_COOKIE } = require('../utils/jwt');
const authTokens = require('../services/authTokens');
const { isForeignOriginWrite } = require('../utils/config');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Optional profile fields share the same rules on register and profile update.
const profileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('gender').optional().isIn(GENDERS).withMessage('Invalid gender'),
  body('height').optional().isFloat({ min: MIN_HEIGHT, max: MAX_HEIGHT }).withMessage(`Height must be between ${MIN_HEIGHT} and ${MAX_HEIGHT} cm`),
  body('weight').optional().isFloat({ min: MIN_WEIGHT, max: MAX_WEIGHT }).withMessage(`Weight must be between ${MIN_WEIGHT} and ${MAX_WEIGHT} kg`),
  body('targetWeight').optional().isFloat({ min: MIN_WEIGHT, max: MAX_WEIGHT }).withMessage(`Target weight must be between ${MIN_WEIGHT} and ${MAX_WEIGHT} kg`),
  body('fitnessLevel').optional().isIn(FITNESS_LEVELS).withMessage('Invalid fitness level'),
  body('activityStatus').optional().isIn(ACTIVITY_STATUSES).withMessage('Invalid activity status'),
  body('goal').optional().isIn(GOALS).withMessage('Invalid goal'),
  body('diet').optional().isIn(DIETS).withMessage('Invalid diet'),
  body('avatarUrl').optional({ values: 'null' }).isString().isLength({ max: 500 }),
];

const wantsBearer = (req) => String(req.get('X-Auth-Transport') || '').toLowerCase() === 'bearer';

/**
 * Start or continue a session: a short-lived access token plus a refresh
 * token. Browsers get both as httpOnly cookies and never see them. Clients
 * that can't use cookies (e.g. a mobile app) send "X-Auth-Transport: bearer"
 * to also get them in the body, then pass the access token back as
 * "Authorization: Bearer <token>" and the refresh token to /auth/refresh.
 */
const sendSession = (req, res, status, body, userId, refreshToken) => {
  const token = signToken(userId);
  setAuthCookie(res, token);
  setRefreshCookies(res, refreshToken);
  return res.status(status).json({ success: true, ...body, ...(wantsBearer(req) && { token, refreshToken }) });
};

const startSession = async (req, res, status, message, user) => (
  sendSession(req, res, status, { message, user }, user.id, await authTokens.issue(user.id))
);

const refreshTokenFrom = (req) => req.cookies?.[REFRESH_COOKIE] || (typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : null);

const rejectInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ...profileRules,
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      if (await userStore.emailExists(req.body.email)) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }
      const user = await userStore.create(req.body);
      return startSession(req, res, 201, 'Account created successfully!', user);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const record = await userStore.findByEmailWithPassword(req.body.email);
      const isMatch = record && await bcrypt.compare(req.body.password, record.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }
      return startSession(req, res, 200, 'Login successful!', record.user);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
// Swap the refresh token (cookie, or body.refreshToken for bearer clients)
// for a new one and a new access token. Replaying a used token revokes the
// whole session.
router.post('/refresh', async (req, res, next) => {
  try {
    if (req.cookies?.[REFRESH_COOKIE] && isForeignOriginWrite(req)) {
      return res.status(403).json({ success: false, message: 'Request origin not allowed.' });
    }
    const result = await authTokens.rotate(refreshTokenFrom(req));
    const user = result.ok ? await userStore.findById(result.userId) : null;
    if (!user) {
      clearSessionCookies(res);
      return res.status(401).json({ success: false, code: 'SESSION_ENDED', message: 'Please sign in again.' });
    }
    return sendSession(req, res, 200, { user }, user.id, result.token);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Ends the session: revokes the refresh token and clears the cookies. No auth
// required, so an expired session can still be cleared.
router.post('/logout', async (req, res, next) => {
  try {
    await authTokens.revoke(refreshTokenFrom(req));
    clearSessionCookies(res);
    res.status(200).json({ success: true, message: 'Signed out.' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Validates the token and returns the current user's profile.
router.get('/me', authMiddleware, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
// Updates the signed-in user's own profile. The target user always comes from
// the token, never from the request body.
router.put('/profile', authMiddleware, profileRules, rejectInvalid, async (req, res, next) => {
  try {
    const user = await userStore.updateProfile(req.user.id, req.body);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, message: 'Profile updated successfully!', user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
