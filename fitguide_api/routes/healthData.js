const express = require('express');
const { body, query } = require('express-validator');
const healthData = require('../services/healthData');
const { authMiddleware } = require('../middleware/authMiddleware');
const { rejectInvalid } = require('../utils/validate');
const { tzOffsetFrom, today, isValidYmd } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof healthData.HealthDataError) return res.status(400).json({ success: false, message: err.message });
    return next(err);
  }
};

// ─── GET /api/health-data?days=30 ─────────────────────────────────────────────
// Steps, resting heart rate, sleep and active calories per day, merged
// across manual entry, CSV imports, the phone's health store and connected
// services; plus blood pressure readings.
router.get('/', [query('days').optional().isInt({ min: 1, max: 365 }).toInt()], rejectInvalid, handle(async (req, res) => {
  res.json({ success: true, ...(await healthData.summary(req.user.id, today(tzOffsetFrom(req)), req.query.days || 30)) });
}));

// ─── POST /api/health-data/sync ───────────────────────────────────────────────
// The mobile app's upload from Apple Health / Health Connect (see
// services/healthData.syncFromPhone for the body).
router.post('/sync', handle(async (req, res) => {
  const tzOffset = tzOffsetFrom(req);
  res.json({ success: true, ...(await healthData.syncFromPhone(req.user.id, req.body, today(tzOffset), tzOffset)) });
}));

// ─── POST /api/health-data/blood-pressure ─────────────────────────────────────
// Body: { systolic, diastolic, pulse?, measuredAt? } — a reading typed in.
router.post('/blood-pressure', handle(async (req, res) => {
  res.status(201).json({ success: true, reading: await healthData.addBloodPressure(req.user.id, req.body || {}, tzOffsetFrom(req)) });
}));

// ─── DELETE /api/health-data/blood-pressure/:id ───────────────────────────────
router.delete('/blood-pressure/:id', handle(async (req, res) => {
  if (!(await healthData.deleteBloodPressure(req.user.id, req.params.id))) {
    return res.status(404).json({ success: false, message: 'Reading not found.' });
  }
  res.json({ success: true });
}));

// ─── PUT /api/health-data/:date ───────────────────────────────────────────────
// Body: { steps?, restingHr?, sleepMinutes?, activeCalories? } — manual entry.
router.put('/:date', handle(async (req, res) => {
  const { date } = req.params;
  if (!isValidYmd(date)) return res.status(400).json({ success: false, message: 'Date must be YYYY-MM-DD.' });
  if (date > today(tzOffsetFrom(req))) return res.status(400).json({ success: false, message: 'Date cannot be in the future.' });
  await healthData.saveManual(req.user.id, date, req.body || {});
  res.json({ success: true });
}));

// ─── POST /api/health-data/import ─────────────────────────────────────────────
// Body: { csv } — rows of date,steps,resting_hr,sleep_hours,active_calories.
router.post(
  '/import',
  [body('csv').isString().isLength({ min: 1, max: 90000 }).withMessage('Paste or upload a CSV file (up to about 1000 days).')],
  rejectInvalid,
  handle(async (req, res) => {
    res.json({ success: true, ...(await healthData.importCsv(req.user.id, req.body.csv, today(tzOffsetFrom(req)))) });
  }),
);

module.exports = router;
