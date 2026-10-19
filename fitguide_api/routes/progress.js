const express = require('express');
const { sessionStore, bodyMetricStore, exerciseStore } = require('../stores/records');
const { describeAll } = require('../services/enrollments');
const { buildSummary } = require('../services/progress');
const { authMiddleware } = require('../middleware/authMiddleware');
const { tzOffsetFrom, today } = require('../utils/dates');
const { prisma } = require('../db/prisma');
const healthData = require('../services/healthData');

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/progress/summary?tzOffset= ──────────────────────────────────────
// Totals, streaks, 12 weeks of daily activity, personal records, body metrics
// and the active program's adherence, computed from the user's own logs.
router.get('/summary', async (req, res, next) => {
  try {
    const tzOffset = tzOffsetFrom(req);
    const todayYmd = today(tzOffset);
    const [sessions, bodyMetrics, enrollments, exercises, external, health] = await Promise.all([
      sessionStore.list(req.user.id, { sortField: 'completedAt' }),
      bodyMetricStore.list(req.user.id, { sortField: 'date' }),
      describeAll(req.user.id, todayYmd),
      exerciseStore.all(),
      prisma.externalActivity.findMany({ where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: 500 }),
      healthData.summary(req.user.id, todayYmd),
    ]);
    // Activities from connected services count as active days.
    const externalActivities = external.map((a) => ({
      completedAt: new Date(a.startedAt.getTime() + a.durationSec * 1000).toISOString(),
      durationSec: a.durationSec,
      calories: a.calories || 0,
    }));
    const summary = buildSummary({
      sessions,
      bodyMetrics,
      enrollments,
      exercisesBySlug: new Map(exercises.map((e) => [e.slug, e])),
      tzOffset,
      todayYmd,
      externalActivities,
    });
    const recentActivities = external.slice(0, 10).map(({ userId: _u, ...a }) => a);
    res.json({ success: true, summary: { ...summary, health }, recentSessions: sessions.slice(0, 10), recentActivities });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
