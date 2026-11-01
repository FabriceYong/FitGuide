/**
 * Admin CMS: catalog editing, articles, review of coach programs, workouts
 * and articles, coach
 * applications, user roles, official challenges, review moderation and usage
 * stats. Admins only.
 */
const express = require('express');
const crypto = require('crypto');
const { body, query } = require('express-validator');
const { prisma, isUniqueViolation } = require('../db/prisma');
const { schemas } = require('../schemas/catalog');
const { validate } = require('../schemas/records');
const catalogAdmin = require('../services/catalogAdmin');
const articles = require('../services/articles');
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
    if (err instanceof catalogAdmin.CatalogError || err instanceof articles.ArticleError) return res.status(err.status).json({ success: false, message: err.message });
    if (isUniqueViolation(err)) return res.status(409).json({ success: false, message: 'That slug is already used.' });
    return next(err);
  }
};

// ─── Overview ─────────────────────────────────────────────────────────────────

router.get('/stats', handle(async (_req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [users, newUsers, sessionsWeek, activeUsers, reviews, pendingPrograms, workouts, plus, pendingWorkouts, pendingCoaches, coaches, pendingArticles, publishedArticles] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.workoutSession.count({ where: { completedAt: { gte: weekAgo } } }),
    prisma.workoutSession.groupBy({ by: ['userId'], where: { completedAt: { gte: weekAgo } } }).then((rows) => rows.length),
    prisma.review.count(),
    prisma.program.count({ where: { status: 'pending', ownerId: null } }),
    prisma.workout.count({ where: { ownerId: null } }),
    prisma.user.count({ where: { plan: 'plus' } }).catch(() => 0),
    prisma.workout.count({ where: { status: 'pending' } }),
    prisma.coachProfile.count({ where: { status: 'pending' } }),
    prisma.user.count({ where: { role: 'creator' } }),
    prisma.article.count({ where: { status: 'pending' } }),
    prisma.article.count({ where: { status: 'published' } }),
  ]);
  res.json({
    success: true,
    stats: { users, newUsers, sessionsWeek, activeUsers, reviews, pendingPrograms, workouts, plusMembers: plus, pendingWorkouts, pendingCoaches, coaches, pendingArticles, publishedArticles },
  });
}));

// ─── Articles ─────────────────────────────────────────────────────────────────

// GET /api/admin/articles?status=pending — other people's drafts stay private.
router.get('/articles', [query('status').optional().isIn(['draft', 'pending', 'published', 'rejected'])], rejectInvalid, handle(async (req, res) => {
  res.json({ success: true, articles: await articles.listForAdmin({ status: req.query.status, adminId: req.user.id }) });
}));

// POST /api/admin/articles { ...article, publish? } — an admin's own article,
// published straight away unless publish is false.
router.post('/articles', handle(async (req, res) => {
  const { publish = true, ...input } = req.body || {};
  res.status(201).json({ success: true, article: await articles.create(input, { authorId: req.user.id, publish: publish !== false }) });
}));

// Fix any article's text (a typo in a coach's piece, say) without changing its status.
router.put('/articles/:slug', handle(async (req, res) => {
  res.json({ success: true, article: await articles.update({ slug: String(req.params.slug) }, req.body) });
}));

// PATCH /api/admin/articles/:slug { status: published | rejected | draft, reviewNote? }
router.patch('/articles/:slug', [body('status').isIn(['published', 'rejected', 'draft'])], rejectInvalid, handle(async (req, res) => {
  res.json({ success: true, article: await articles.setStatus(req.params.slug, req.body) });
}));

router.delete('/articles/:slug', handle(async (req, res) => {
  await articles.remove(req.params.slug);
  res.json({ success: true });
}));

// ─── Workouts ─────────────────────────────────────────────────────────────────

// GET /api/admin/workouts?search=&status=pending — coach workouts come with their author.
router.get('/workouts', [query('status').optional().isIn(['draft', 'pending', 'published', 'rejected'])], rejectInvalid, handle(async (req, res) => {
  const search = req.query.search ? String(req.query.search).slice(0, 100) : '';
  const workouts = await prisma.workout.findMany({
    where: {
      ownerId: null, // members' own workouts are theirs alone
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      // A coach's drafts stay private until they submit them.
      ...(req.query.status ? { status: req.query.status } : { NOT: { status: 'draft', creatorId: { not: null } } }),
    },
    include: { creator: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, workouts: workouts.map(({ id: _id, creatorId: _c, ...w }) => w) });
}));

router.post('/workouts', handle(async (req, res) => {
  const data = validate(schemas.workout, req.body);
  const workout = await prisma.workout.create({ data });
  res.status(201).json({ success: true, workout });
}));

router.put('/workouts/:slug', handle(async (req, res) => {
  const { slug, ...fields } = validate(schemas.workout, { ...req.body, slug: req.params.slug });
  const data = { ...fields, steps: catalogAdmin.withDemoNames(fields.steps), ...(fields.isPublished && { status: 'published' }) };
  const { count } = await prisma.workout.updateMany({ where: { slug, ownerId: null }, data });
  if (!count) return res.status(404).json({ success: false, message: 'Workout not found.' });
  res.json({ success: true, workout: await prisma.workout.findUnique({ where: { slug } }) });
}));

// Publish/unpublish or mark premium, or review a coach's workout
// ({ status: published|rejected|draft, reviewNote }). Workouts are never
// deleted, because sessions, favorites and programs refer to them by slug.
router.patch(
  '/workouts/:slug',
  [
    body('isPublished').optional().isBoolean().toBoolean(),
    body('isPremium').optional().isBoolean().toBoolean(),
    body('status').optional().isIn(['published', 'rejected', 'draft']),
    body('reviewNote').optional({ values: 'null' }).isString().isLength({ max: 500 }),
  ],
  rejectInvalid,
  handle(async (req, res) => {
    const data = Object.fromEntries(['isPublished', 'isPremium', 'reviewNote'].filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
    if (req.body.isPublished) data.status = 'published';
    if (req.body.status) Object.assign(data, { status: req.body.status, isPublished: req.body.status === 'published' });
    const { count } = await prisma.workout.updateMany({ where: { slug: req.params.slug, ownerId: null }, data });
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
    if (req.body.status === 'published') {
      const program = await prisma.program.findFirst({ where: { slug: req.params.slug, ownerId: null } });
      const waiting = program ? await catalogAdmin.unpublishedWorkouts(program.id) : [];
      if (waiting.length) {
        return res.status(409).json({ success: false, message: `Publish the coach's workouts first: ${waiting.join(', ')}` });
      }
    }
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

// ─── Coach applications ───────────────────────────────────────────────────────

// GET /api/admin/coaches?status=pending — applications and approved coaches
router.get('/coaches', [query('status').optional().isIn(['pending', 'approved', 'declined'])], rejectInvalid, handle(async (req, res) => {
  const profiles = await prisma.coachProfile.findMany({
    where: req.query.status ? { status: req.query.status } : {},
    include: { user: { select: { name: true, email: true, role: true } } },
    orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
  });
  res.json({
    success: true,
    coaches: profiles.map(({ user, ...p }) => ({ ...p, name: user.name, email: user.email, role: user.role })),
  });
}));

// PATCH /api/admin/coaches/:userId { status: approved|declined, reviewNote? }
// Approving makes the member a coach (the creator role); declining an
// approved coach takes the role away again. Admins keep their own role.
router.patch(
  '/coaches/:userId',
  [body('status').isIn(['approved', 'declined']), body('reviewNote').optional({ values: 'null' }).isString().isLength({ max: 500 })],
  rejectInvalid,
  handle(async (req, res) => {
    const profile = await prisma.coachProfile.findUnique({ where: { userId: req.params.userId }, include: { user: { select: { role: true } } } });
    if (!profile) return res.status(404).json({ success: false, message: 'Application not found.' });
    const role = req.body.status === 'approved' ? 'creator' : 'user';
    await prisma.$transaction([
      prisma.coachProfile.update({
        where: { userId: profile.userId },
        data: { status: req.body.status, reviewNote: req.body.reviewNote ?? null },
      }),
      ...(profile.user.role === 'admin' ? [] : [prisma.user.update({ where: { id: profile.userId }, data: { role } })]),
    ]);
    res.json({ success: true });
  }),
);

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

// ─── Analytics ────────────────────────────────────────────────────────────────

// GET /api/admin/analytics?days=30 — page views, visitors, top pages and events
router.get('/analytics', [query('days').optional().isInt({ min: 1, max: 90 }).toInt()], rejectInvalid, handle(async (req, res) => {
  const days = req.query.days || 30;
  const since = addDays(today(), -(days - 1));
  const start = new Date(`${since}T00:00:00Z`);
  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: start } },
    select: { name: true, path: true, visitorId: true, device: true, createdAt: true },
  });
  const views = events.filter((e) => e.name === 'page_view');
  const daily = Array.from({ length: days }, (_, i) => addDays(since, i)).map((date) => {
    const ofDay = views.filter((e) => e.createdAt.toISOString().startsWith(date));
    return { date, pageViews: ofDay.length, visitors: new Set(ofDay.map((e) => e.visitorId).filter(Boolean)).size };
  });
  const count = (items, key) => Object.entries(items.reduce((acc, e) => {
    const k = e[key] || 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {})).map(([k, n]) => ({ [key]: k, count: n })).sort((a, b) => b.count - a.count);
  res.json({
    success: true,
    days: daily,
    visitors: new Set(views.map((e) => e.visitorId).filter(Boolean)).size,
    topPages: count(views, 'path').slice(0, 10),
    devices: count(views, 'device'),
    events: count(events.filter((e) => e.name !== 'page_view'), 'name'),
  });
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
