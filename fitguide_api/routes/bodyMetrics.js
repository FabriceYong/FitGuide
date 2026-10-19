const express = require('express');
const { body } = require('express-validator');
const { MEASUREMENT_FIELDS } = require('../models/BodyMetric');
const { bodyMetricStore } = require('../stores/records');
const userStore = require('../stores/userStore');
const { authMiddleware } = require('../middleware/authMiddleware');
const { rejectInvalid, pick } = require('../utils/validate');
const { tzOffsetFrom, today, isValidYmd } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

// The profile's weight field accepts this range (see models/User.js).
const PROFILE_WEIGHT_RANGE = [30, 250];

// ─── GET /api/body-metrics ────────────────────────────────────────────────────
// Newest first.
router.get('/', async (req, res, next) => {
  try {
    const metrics = await bodyMetricStore.list(req.user.id, { sortField: 'date' });
    res.json({ success: true, count: metrics.length, metrics });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/body-metrics?tzOffset= ─────────────────────────────────────────
// Body: { date (YYYY-MM-DD, default today), weightKg?, bodyFatPct?, waistCm?, … , notes? }
// One entry per day: posting a date that already has one updates it.
// A weigh-in for the latest date also updates the profile weight.
router.post(
  '/',
  [
    body('date').optional().custom(isValidYmd).withMessage('date must be a date (YYYY-MM-DD)'),
    ...MEASUREMENT_FIELDS.map((f) => body(f).optional({ values: 'null' }).isFloat({ min: 0 }).withMessage(`${f} must be a number`).toFloat()),
    body('notes').optional().isString().isLength({ max: 500 }).trim(),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const todayYmd = today(tzOffsetFrom(req));
      const date = req.body.date || todayYmd;
      if (date > todayYmd) return res.status(400).json({ success: false, message: 'Date cannot be in the future.' });

      const fields = pick(req.body, [...MEASUREMENT_FIELDS, 'notes']);
      if (!MEASUREMENT_FIELDS.some((f) => fields[f] != null)) {
        return res.status(400).json({ success: false, message: 'Enter at least one measurement.' });
      }

      const [existing] = await bodyMetricStore.list(req.user.id, { where: { date } });
      const metric = existing
        ? await bodyMetricStore.update(req.user.id, existing.id, (m) => Object.assign(m, fields))
        : await bodyMetricStore.create(req.user.id, { ...fields, date });

      let user;
      const [latest] = await bodyMetricStore.list(req.user.id, { sortField: 'date', limit: 1 });
      const [min, max] = PROFILE_WEIGHT_RANGE;
      if (fields.weightKg != null && latest?.id === metric.id && fields.weightKg >= min && fields.weightKg <= max) {
        user = await userStore.updateProfile(req.user.id, { weight: fields.weightKg });
      }

      res.status(existing ? 200 : 201).json({ success: true, metric, ...(user && { user }) });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /api/body-metrics/:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const removed = await bodyMetricStore.remove(req.user.id, req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'Entry not found.' });
    res.json({ success: true, message: 'Entry deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
