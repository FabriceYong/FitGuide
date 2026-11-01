const express = require('express');
const { body } = require('express-validator');
const reminders = require('../services/reminders');
const { authMiddleware } = require('../middleware/authMiddleware');
const { rejectInvalid } = require('../utils/validate');
const { tzOffsetFrom, today } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

const upcomingFor = (req) => {
  const tzOffset = tzOffsetFrom(req);
  return reminders.upcoming(req.user.id, tzOffset, today(tzOffset));
};

// ─── GET /api/reminders?tzOffset= ─────────────────────────────────────────────
// The settings, the key browsers subscribe with (null when push isn't set up
// on this server), and the next two weeks of reminders for the app to schedule.
router.get('/', async (req, res, next) => {
  try {
    const [settings, upcoming] = await Promise.all([reminders.settings(req.user.id), upcomingFor(req)]);
    res.json({ success: true, settings, push: { publicKey: reminders.publicKey() }, upcoming });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/reminders?tzOffset= ─────────────────────────────────────────────
// Body: { days?: weekdays (0 = Sunday … 6), time?: "HH:MM", streak?: boolean, timeZone?: IANA name }
router.put(
  '/',
  [
    body('days').optional().isArray({ max: 7 }).withMessage('days must be a list of weekdays'),
    body('days.*').isInt({ min: 0, max: 6 }).withMessage('Each day must be 0 (Sunday) to 6 (Saturday)').toInt(),
    body('time').optional().custom(reminders.isTime).withMessage('time must be HH:MM'),
    body('streak').optional().isBoolean().withMessage('streak must be true or false').toBoolean(),
    body('timeZone').optional().custom(reminders.isTimeZone).withMessage('timeZone must be a time zone name'),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const settings = await reminders.update(req.user.id, req.body);
      res.json({ success: true, settings, upcoming: await upcomingFor(req) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/reminders/push ─────────────────────────────────────────────────
// Body: a browser's PushSubscription ({ endpoint, keys: { p256dh, auth } }) and its timeZone.
router.post(
  '/push',
  [
    body('endpoint').custom(reminders.isPushEndpoint).withMessage('endpoint must be a browser push service address'),
    body('keys.p256dh').isString().isLength({ min: 1, max: 200 }).withMessage('keys.p256dh is required'),
    body('keys.auth').isString().isLength({ min: 1, max: 100 }).withMessage('keys.auth is required'),
    body('timeZone').optional().custom(reminders.isTimeZone).withMessage('timeZone must be a time zone name'),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      if (!reminders.isConfigured()) return res.status(503).json({ success: false, message: 'Browser reminders aren’t set up on this server.' });
      await reminders.subscribe(req.user.id, req.body);
      res.status(201).json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /api/reminders/push ───────────────────────────────────────────────
// Body: { endpoint }. This browser stops getting reminders.
router.delete('/push', [body('endpoint').isString().isLength({ max: 2048 })], rejectInvalid, async (req, res, next) => {
  try {
    await reminders.unsubscribe(req.user.id, req.body.endpoint);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
