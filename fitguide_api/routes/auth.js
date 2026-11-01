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
const accounts = require('../services/accounts');
const passwordReset = require('../services/passwordReset');
const emailVerification = require('../services/emailVerification');
const dataExport = require('../services/dataExport');
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
  body('showOnLeaderboards').optional().isBoolean().withMessage('showOnLeaderboards must be true or false').toBoolean(),
  body('units').optional().isIn(PROFILE.UNITS).withMessage('units must be metric or imperial'),
  ...[['focusAreas', PROFILE.FOCUS_AREAS, 'focus area'], ['equipment', PROFILE.EQUIPMENT_KITS, 'equipment option'], ['limitations', PROFILE.LIMITATIONS, 'limitation']]
    .flatMap(([field, allowed, noun]) => [
      body(field).optional({ values: 'null' }).isArray({ max: allowed.length }).withMessage(`${field} must be a list`),
      body(`${field}.*`).isIn(allowed).withMessage(`Unknown ${noun}`),
    ]),
  body('workoutMinutes').optional({ values: 'null' }).isInt({ min: PROFILE.WORKOUT_MINUTES[0], max: PROFILE.WORKOUT_MINUTES[1] })
    .withMessage(`Workout length must be ${PROFILE.WORKOUT_MINUTES[0]}–${PROFILE.WORKOUT_MINUTES[1]} minutes`),
  body('daysPerWeek').optional({ values: 'null' }).isInt({ min: PROFILE.DAYS_PER_WEEK[0], max: PROFILE.DAYS_PER_WEEK[1] })
    .withMessage(`Days per week must be ${PROFILE.DAYS_PER_WEEK[0]}–${PROFILE.DAYS_PER_WEEK[1]}`),
  body('birthYear').optional({ values: 'null' }).custom((value) => {
    const year = Number(value);
    return Number.isInteger(year) && year >= PROFILE.MIN_BIRTH_YEAR && year <= new Date().getFullYear() - PROFILE.MIN_AGE;
  }).withMessage(`You must be at least ${PROFILE.MIN_AGE} to use FitGuide`),
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

const emailRule = () => body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email address').normalizeEmail();

/** Email a confirmation link; a failure is logged, and the user can ask again. */
const sendConfirmation = (user) => emailVerification.sendLink(user)
  .catch((err) => console.error('[auth] could not send a confirmation link:', err.message));

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Creates the account and emails a link to confirm the address. No session
// yet: signing in works once the email is confirmed.
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('password').isString().isLength({ min: PROFILE.PASSWORD_MIN }).withMessage(`Password must be at least ${PROFILE.PASSWORD_MIN} characters`),
    ...profileRules,
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      if (await userStore.emailExists(req.body.email)) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }
      const user = await userStore.create(req.body);
      await sendConfirmation(user);
      return res.status(201).json({
        success: true,
        verificationRequired: true,
        email: user.email,
        message: 'Account created. Check your inbox for a link to confirm your email.',
      });
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
      // Only told with the right password, so it reveals nothing to others.
      // A fresh link goes out (at most one a minute), in case the last expired.
      if (!record.user.emailVerified) {
        await sendConfirmation(record.user);
        return res.status(403).json({
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          email: record.user.email,
          message: `Confirm your email first: we've sent a link to ${record.user.email}.`,
        });
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

// ─── PUT /api/auth/password ───────────────────────────────────────────────────
// Change the password. Signs out every other device (their refresh tokens are
// revoked; their access tokens lapse within ACCESS_TOKEN_TTL_SEC) and starts
// a fresh session for this one.
router.put(
  '/password',
  authMiddleware,
  [
    body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
    body('newPassword').isString().isLength({ min: PROFILE.PASSWORD_MIN }).withMessage(`New password must be at least ${PROFILE.PASSWORD_MIN} characters`),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      if (!(await userStore.checkPassword(req.user.id, req.body.currentPassword))) {
        return res.status(403).json({ success: false, code: 'WRONG_PASSWORD', message: 'Your current password is incorrect.' });
      }
      if (req.body.newPassword === req.body.currentPassword) {
        return res.status(400).json({ success: false, message: 'Choose a password different from your current one.' });
      }
      await userStore.setPassword(req.user.id, req.body.newPassword);
      await Promise.all([authTokens.revokeAll(req.user.id), passwordReset.cancelLinks(req.user.id)]);
      return startSession(req, res, 200, 'Password changed.', req.user);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/auth/verify-email ──────────────────────────────────────────────
// Confirm the email from the emailed link, then start a session.
router.post(
  '/verify-email',
  [body('token').isString().notEmpty().withMessage('The link is incomplete')],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const user = await emailVerification.confirm(req.body.token);
      return startSession(req, res, 200, 'Email confirmed.', user);
    } catch (err) {
      if (err instanceof emailVerification.VerificationError) return res.status(err.status).json({ success: false, code: err.code, message: err.message });
      next(err);
    }
  }
);

// ─── POST /api/auth/resend-verification ───────────────────────────────────────
// Send the confirmation link again. The same answer whatever the email, sent
// before the lookup finishes, so it doesn't reveal who has an account.
router.post('/resend-verification', [emailRule()], rejectInvalid, (req, res) => {
  emailVerification.resend(req.body.email).catch((err) => console.error('[auth] could not resend a confirmation link:', err.message));
  res.status(200).json({ success: true, message: "If that email has an account waiting to be confirmed, we've sent a new link." });
});

// ─── POST /api/auth/forgot-password ───────────────────────────────────────────
// Email a reset link if an account uses this address. The answer is the same
// either way, and it is sent before the lookup finishes, so neither the reply
// nor its timing reveals whether the email has an account.
router.post(
  '/forgot-password',
  [body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email address').normalizeEmail()],
  rejectInvalid,
  (req, res) => {
    passwordReset.requestReset(req.body.email).catch((err) => console.error('[auth] could not send a reset link:', err.message));
    res.status(200).json({ success: true, message: "If an account uses that email, we've sent it a link to reset the password." });
  }
);

// ─── POST /api/auth/reset-password ────────────────────────────────────────────
// Set a new password from an emailed link. Signs out every device, then
// starts a session here.
router.post(
  '/reset-password',
  [
    body('token').isString().notEmpty().withMessage('The reset link is incomplete'),
    body('password').isString().isLength({ min: PROFILE.PASSWORD_MIN }).withMessage(`Password must be at least ${PROFILE.PASSWORD_MIN} characters`),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const user = await passwordReset.resetPassword(req.body.token, req.body.password);
      return startSession(req, res, 200, 'Your password has been reset.', user);
    } catch (err) {
      if (err instanceof passwordReset.ResetError) return res.status(err.status).json({ success: false, code: err.code, message: err.message });
      next(err);
    }
  }
);

// ─── DELETE /api/auth/account ─────────────────────────────────────────────────
// Permanently delete the signed-in user and their data (see
// services/accounts.js), after cancelling any subscription. Needs the password.
router.delete(
  '/account',
  authMiddleware,
  [body('password').isString().notEmpty().withMessage('Password is required')],
  rejectInvalid,
  async (req, res, next) => {
    try {
      if (!(await userStore.checkPassword(req.user.id, req.body.password))) {
        return res.status(403).json({ success: false, code: 'WRONG_PASSWORD', message: 'Your password is incorrect.' });
      }
      await accounts.deleteAccount(req.user.id);
      clearSessionCookies(res);
      return res.status(200).json({ success: true, message: 'Your account has been deleted.' });
    } catch (err) {
      if (err instanceof accounts.AccountError) return res.status(err.status).json({ success: false, message: err.message });
      next(err);
    }
  }
);

// ─── GET /api/auth/export ─────────────────────────────────────────────────────
// "Download my data": everything kept about the account, as a JSON file
// (services/dataExport.js). /export/workouts.csv and /export/body-metrics.csv
// are the same logs as spreadsheets.
const sendDownload = (res, filename, type, body) => {
  res.set({ 'Content-Type': type, 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' });
  res.send(body);
};
const stamp = () => new Date().toISOString().slice(0, 10);

router.get('/export', authMiddleware, async (req, res, next) => {
  try {
    const data = await dataExport.everything(req.user.id);
    if (!data) return res.status(404).json({ success: false, message: 'User not found.' });
    sendDownload(res, `fitguide-data-${stamp()}.json`, 'application/json; charset=utf-8', JSON.stringify(data, null, 2));
  } catch (err) {
    next(err);
  }
});

router.get('/export/workouts.csv', authMiddleware, async (req, res, next) => {
  try {
    sendDownload(res, `fitguide-workouts-${stamp()}.csv`, 'text/csv; charset=utf-8', await dataExport.workoutsCsv(req.user.id));
  } catch (err) {
    next(err);
  }
});

router.get('/export/body-metrics.csv', authMiddleware, async (req, res, next) => {
  try {
    sendDownload(res, `fitguide-body-${stamp()}.csv`, 'text/csv; charset=utf-8', await dataExport.bodyMetricsCsv(req.user.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
