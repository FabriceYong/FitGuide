const express = require('express');
const { sessionStore, bodyMetricStore, exerciseStore } = require('../stores/records');
const { describeAll } = require('../services/enrollments');
const { buildSummary } = require('../services/progress');
const { authMiddleware } = require('../middleware/authMiddleware');
const { tzOffsetFrom, today } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/progress/summary?tzOffset= ──────────────────────────────────────
// Totals, streaks, 12 weeks of daily activity, personal records, body metrics
// and the active program's adherence, computed from the user's own logs.
router.get('/summary', async (req, res, next) => {
  try {
    const tzOffset = tzOffsetFrom(req);
    const todayYmd = today(tzOffset);
    const [sessions, bodyMetrics, enrollments, exercises] = await Promise.all([
      sessionStore.list(req.user.id, { sortField: 'completedAt' }),
      bodyMetricStore.list(req.user.id, { sortField: 'date' }),
      describeAll(req.user.id, todayYmd),
      exerciseStore.all(),
    ]);
    const summary = buildSummary({
      sessions,
      bodyMetrics,
      enrollments,
      exercisesBySlug: new Map(exercises.map((e) => [e.slug, e])),
      tzOffset,
      todayYmd,
    });
    res.json({ success: true, summary, recentSessions: sessions.slice(0, 10) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
