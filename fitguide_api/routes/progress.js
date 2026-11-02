const express = require('express');
const { sessionStore, bodyMetricStore, exerciseStore } = require('../stores/records');
const workoutStore = require('../stores/workoutStore');
const { describeAll } = require('../services/enrollments');
const { buildSummary } = require('../services/progress');
const { authMiddleware } = require('../middleware/authMiddleware');
const { tzOffsetFrom, today } = require('../utils/dates');
const { prisma } = require('../db/prisma');
const healthData = require('../services/healthData');
const starter = require('../services/starter');
const { strengthLevels } = require('../services/strength');
const recaps = require('../services/recap');

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
    // Target muscles of the workouts done this week (the muscle map).
    const weekSlugs = [...new Set(sessions.filter((s) => Date.now() - new Date(s.completedAt) < 8 * 24 * 60 * 60 * 1000).map((s) => s.workoutSlug))];
    const workoutMuscles = new Map((await workoutStore.getManyBySlugs(weekSlugs, { ownerId: req.user.id })).map((w) => [w.slug, w.targetMuscles || []]));
    const summary = buildSummary({
      workoutMuscles,
      sessions,
      bodyMetrics,
      enrollments,
      exercisesBySlug: new Map(exercises.map((e) => [e.slug, e])),
      tzOffset,
      todayYmd,
      externalActivities,
      // Weeks count when the member trains on as many days as they said they would.
      weeklyGoal: Math.min(7, Math.max(1, req.user.daysPerWeek || 3)),
    });
    const recentActivities = external.slice(0, 10).map(({ userId: _u, ...a }) => a);
    // Against the latest weigh-in, else the profile's weight.
    const bodyweightKg = summary.body.latestWeight?.weightKg || req.user.weight;
    const strength = { bodyweightKg, levels: strengthLevels(sessions, bodyweightKg, req.user.gender) };
    res.json({ success: true, summary: { ...summary, health, strength }, recentSessions: sessions.slice(0, 10), recentActivities });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/progress/recap?month=YYYY-MM | year=YYYY&tzOffset= ──────────────
// A month's (default: last month's) or a year's training in a few numbers.
router.get('/recap', async (req, res, next) => {
  try {
    const tzOffset = tzOffsetFrom(req);
    const todayYmd = today(tzOffset);
    const { month, year } = req.query;
    if (month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month))) return res.status(400).json({ success: false, message: 'month must be YYYY-MM' });
    if (year !== undefined && !/^\d{4}$/.test(String(year))) return res.status(400).json({ success: false, message: 'year must be YYYY' });
    const which = year !== undefined ? { year: Number(year) } : { month: String(month ?? recaps.lastMonth(todayYmd)) };
    res.json({ success: true, recap: await recaps.recap(req.user.id, which, tzOffset, todayYmd) });
  } catch (err) {
    if (err instanceof recaps.RecapError) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
});

// ─── GET /api/progress/recap/offers?tzOffset= ─────────────────────────────────
// Recaps to offer on the home page: last month's in a month's first week,
// and last year's in January's first two weeks, when anything was logged.
router.get('/recap/offers', async (req, res, next) => {
  try {
    const tzOffset = tzOffsetFrom(req);
    const todayYmd = today(tzOffset);
    const day = Number(todayYmd.slice(8));
    const which = [];
    if (day <= 7) which.push({ month: recaps.lastMonth(todayYmd) });
    if (todayYmd.slice(5, 7) === '01' && day <= 14) which.push({ year: Number(todayYmd.slice(0, 4)) - 1 });
    const found = await Promise.all(which.map((w) => recaps.recap(req.user.id, w, tzOffset, todayYmd)));
    res.json({ success: true, offers: found.filter((r) => r.workouts > 0).map(({ kind, key, label, workouts }) => ({ kind, key, label, workouts })) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/progress/starter ────────────────────────────────────────────────
// The first-week starter steps, each done or not, and whether to show them.
router.get('/starter', async (req, res, next) => {
  try {
    res.json({ success: true, starter: await starter.journey(req.user.id) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/progress/starter/hide ──────────────────────────────────────────
router.post('/starter/hide', async (req, res, next) => {
  try {
    await starter.hide(req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
