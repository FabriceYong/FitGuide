/**
 * Admin CMS: catalog editing, program review, user roles, official
 * challenges, review moderation and usage stats. Admins only.
 */
const express = require('express');
const crypto = require('crypto');
const { body, query } = require('express-validator');
const { prisma, isUniqueViolation } = require('../db/prisma');
const { schemas } = require('../schemas/catalog');
const { validate } = require('../schemas/records');
const catalogAdmin = require('../services/catalogAdmin');
const social = require('../services/social');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { rejectInvalid } = require('../utils/validate');
const { isValidYmd, today, addDays } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware, requireRole('admin'));

const ROLES = ['user', 'creator', 'admin'];

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof catalogAdmin.CatalogError) return res.status(err.status).json({ success: false, message: err.message });
    if (isUniqueViolation(err)) return res.status(409).json({ success: false, message: 'That slug is already used.' });
    return next(err);
  }
};

// ─── Overview ─────────────────────────────────────────────────────────────────

router.get('/stats', handle(async (_req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [users, newUsers, sessionsWeek, activeUsers, reviews, pendingPrograms, workouts, plus] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.workoutSession.count({ where: { completedAt: { gte: weekAgo } } }),
    prisma.workoutSession.groupBy({ by: ['userId'], where: { completedAt: { gte: weekAgo } } }).then((rows) => rows.length),
    prisma.review.count(),
    prisma.program.count({ where: { status: 'pending', ownerId: null } }),
    prisma.workout.count(),
    prisma.user.count({ where: { plan: 'plus' } }).catch(() => 0),
  ]);
  res.json({ success: true, stats: { users, newUsers, sessionsWeek, activeUsers, reviews, pendingPrograms, workouts, plusMembers: plus } });
}));

// ─── Workouts ─────────────────────────────────────────────────────────────────

router.get('/workouts', handle(async (req, res) => {
  const search = req.query.search ? String(req.query.search).slice(0, 100) : '';
  const workouts = await prisma.workout.findMany({
    where: search ? { title: { contains: search, mode: 'insensitive' } } : {},
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, workouts: workouts.map(({ id: _id, ...w }) => w) });
}));

router.post('/workouts', handle(async (req, res) => {
  const data = validate(schemas.workout, req.body);
  const workout = await prisma.workout.create({ data });
  res.status(201).json({ success: true, workout });
}));

router.put('/workouts/:slug', handle(async (req, res) => {
  const { slug, ...data } = validate(schemas.workout, { ...req.body, slug: req.params.slug });
  const { count } = await prisma.workout.updateMany({ where: { slug }, data });
  if (!count) return res.status(404).json({ success: false, message: 'Workout not found.' });
  res.json({ success: true, workout: await prisma.workout.findUnique({ where: { slug } }) });
}));

// Publish/unpublish or mark premium. Workouts are never deleted, because
// sessions, favorites and programs refer to them by slug.
router.patch(
  '/workouts/:slug',
  [body('isPublished').optional().isBoolean().toBoolean(), body('isPremium').optional().isBoolean().toBoolean()],
  rejectInvalid,
  handle(async (req, res) => {
    const data = Object.fromEntries(['isPublished', 'isPremium'].filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
    const { count } = await prisma.workout.updateMany({ where: { slug: req.params.slug }, data });
    if (!count) return res.status(404).json({ success: false, message: 'Workout not found.' });
    res.json({ success: true });
  }),
);

// ─── Exercises ────────────────────────────────────────────────────────────────

router.get('/exercises', handle(async (_req, res) => {
  const exercises = await prisma.exercise.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, exercises: exercises.map(({ id: _id, ...e }) => e) });
}));

router.post('/exercises', handle(async (req, res) => {
  const exercise = await prisma.exercise.create({ data: validate(schemas.exercise, req.body) });
  res.status(201).json({ success: true, exercise });
}));

router.put('/exercises/:slug', handle(async (req, res) => {
  const { slug, ...data } = validate(schemas.exercise, { ...req.body, slug: req.params.slug });
  const { count } = await prisma.exercise.updateMany({ where: { slug }, data });
  if (!count) return res.status(404).json({ success: false, message: 'Exercise not found.' });
  res.json({ success: true });
}));

// ─── Programs ─────────────────────────────────────────────────────────────────

// GET /api/admin/programs?status=pending — catalog and creator programs (not personal plans)
router.get('/programs', [query('status').optional().isIn(['draft', 'pending', 'published', 'rejected'])], rejectInvalid, handle(async (req, res) => {
  const programs = await prisma.program.findMany({
    where: { ownerId: null, ...(req.query.status && { status: req.query.status }) },
    include: catalogAdmin.include,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  });
  res.json({ success: true, programs: programs.map(catalogAdmin.toPublic) });
}));

router.post('/programs', handle(async (req, res) => {
  const program = await catalogAdmin.createProgram(req.body, { creatorId: null, status: 'published' });
  res.status(201).json({ success: true, program });
}));

router.put('/programs/:slug', handle(async (req, res) => {
  res.json({ success: true, program: await catalogAdmin.updateProgram(req.params.slug, req.body) });
}));

// PATCH /api/admin/programs/:slug { status: published|rejected|draft, reviewNote?, isPremium? }
router.patch(
  '/programs/:slug',
  [
    body('status').optional().isIn(['published', 'rejected', 'draft']),
    body('reviewNote').optional({ values: 'null' }).isString().isLength({ max: 500 }),
    body('isPremium').optional().isBoolean().toBoolean(),
  ],
  rejectInvalid,
  handle(async (req, res) => {
    const data = {};
    if (req.body.status) Object.assign(data, { status: req.body.status, isPublished: req.body.status === 'published' });
    if (req.body.reviewNote !== undefined) data.reviewNote = req.body.reviewNote;
    if (req.body.isPremium !== undefined) data.isPremium = req.body.isPremium;
    const { count } = await prisma.program.updateMany({ where: { slug: req.params.slug, ownerId: null }, data });
    if (!count) return res.status(404).json({ success: false, message: 'Program not found.' });
    const program = await prisma.program.findUnique({ where: { slug: req.params.slug }, include: catalogAdmin.include });
    res.json({ success: true, program: catalogAdmin.toPublic(program) });
  }),
);

// ─── Users ────────────────────────────────────────────────────────────────────

router.get('/users', [query('search').optional().isString().isLength({ max: 100 }), query('page').optional().isInt({ min: 1 }).toInt()], rejectInvalid, handle(async (req, res) => {
  const page = req.query.page || 1;
  const search = req.query.search || '';
  const where = search ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }] } : {};
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { sessions: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 50,
      take: 50,
    }),
  ]);
  res.json({ success: true, total, page, users: users.map(({ _count, ...u }) => ({ ...u, sessions: _count.sessions })) });
}));

router.patch('/users/:id', [body('role').isIn(ROLES)], rejectInvalid, handle(async (req, res) => {
  if (req.params.id === req.user.id && req.body.role !== 'admin') {
    return res.status(400).json({ success: false, message: "You can't remove your own admin role." });
  }
  const { count } = await prisma.user.updateMany({ where: { id: req.params.id }, data: { role: req.body.role } });
  if (!count) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true });
}));

// ─── Official challenges ──────────────────────────────────────────────────────

router.post(
  '/challenges',
  [
    body('title').isString().trim().isLength({ min: 3, max: 100 }),
    body('description').optional().isString().trim().isLength({ max: 500 }),
    body('metric').isIn(Object.keys(social.METRICS)),
    body('target').optional({ values: 'null' }).isInt({ min: 1 }).toInt(),
    body('startDate').custom(isValidYmd),
    body('endDate').custom(isValidYmd),
  ],
  rejectInvalid,
  handle(async (req, res) => {
    if (req.body.endDate < req.body.startDate) return res.status(400).json({ success: false, message: 'The end date must be after the start date.' });
    const challenge = await prisma.challenge.create({
      data: {
        title: req.body.title,
        description: req.body.description || '',
        metric: req.body.metric,
        target: req.body.target ?? null,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        visibility: 'public',
        joinCode: crypto.randomBytes(5).toString('hex').toUpperCase(),
        creatorId: null,
      },
    });
    res.status(201).json({ success: true, challenge });
  }),
);

// ─── Moderation ───────────────────────────────────────────────────────────────

router.get('/reviews', handle(async (_req, res) => {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ success: true, reviews });
}));

router.delete('/reviews/:id', handle(async (req, res) => {
  const { count } = await prisma.review.deleteMany({ where: { id: req.params.id } });
  if (!count) return res.status(404).json({ success: false, message: 'Review not found.' });
  res.json({ success: true });
}));

// Kept for the analytics dashboard: the last 30 days of new sign-ups and sessions.
router.get('/activity', handle(async (_req, res) => {
  const since = addDays(today(), -29);
  const start = new Date(`${since}T00:00:00Z`);
  const [users, sessions] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.workoutSession.findMany({ where: { completedAt: { gte: start } }, select: { completedAt: true } }),
  ]);
  const days = Array.from({ length: 30 }, (_, i) => addDays(since, i)).map((date) => ({
    date,
    signups: users.filter((u) => u.createdAt.toISOString().startsWith(date)).length,
    sessions: sessions.filter((s) => s.completedAt.toISOString().startsWith(date)).length,
  }));
  res.json({ success: true, days });
}));

module.exports = router;
