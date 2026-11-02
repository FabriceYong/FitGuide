/**
 * The daily readiness score: a morning check-in, and the score worked out
 * from it with sleep, resting heart rate and recent training.
 */
const express = require('express');
const { body } = require('express-validator');
const readiness = require('../services/readiness');
const { authMiddleware } = require('../middleware/authMiddleware');
const { rejectInvalid } = require('../utils/validate');
const { tzOffsetFrom, today } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/readiness?tzOffset= ─────────────────────────────────────────────
// Today's check-in and score ({ checkedIn: false } until the member checks in).
router.get('/', async (req, res, next) => {
  try {
    const tzOffset = tzOffsetFrom(req);
    res.json({ success: true, readiness: await readiness.today(req.user.id, today(tzOffset), tzOffset) });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/readiness?tzOffset= ─────────────────────────────────────────────
// Body: { energy: 1–5, soreness: 1–5 } — today's check-in (again to change it).
router.put(
  '/',
  [
    body('energy').isInt({ min: 1, max: 5 }).withMessage('Energy must be 1–5').toInt(),
    body('soreness').isInt({ min: 1, max: 5 }).withMessage('Soreness must be 1–5').toInt(),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const tzOffset = tzOffsetFrom(req);
      const todayYmd = today(tzOffset);
      await readiness.checkIn(req.user.id, todayYmd, req.body);
      res.json({ success: true, readiness: await readiness.today(req.user.id, todayYmd, tzOffset) });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
