/**
 * Creator studio for coaches (the creator role): their dashboard, coach
 * profile, and the workouts, programs and articles they write. These are
 * submitted for review, and an admin publishes or rejects them (see
 * routes/admin.js).
 */
const express = require('express');
const { PROFILE } = require('@fitguide/shared');
const { prisma } = require('../db/prisma');
const { schemas } = require('../schemas/catalog');
const { validate } = require('../schemas/records');
const catalogAdmin = require('../services/catalogAdmin');
const articles = require('../services/articles');
const { imageUpload, videoUpload, uploadErrorHandler } = require('../utils/uploads');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { tzOffsetFrom, today, daysBetween } = require('../utils/dates');
const { apiBaseOf: apiBase } = require('../utils/exerciseDemos');

const router = express.Router();
router.use(authMiddleware, requireRole('creator', 'admin'));

const EDITABLE = ['draft', 'rejected'];

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof catalogAdmin.CatalogError || err instanceof articles.ArticleError) return res.status(err.status).json({ success: false, message: err.message });
    return next(err);
  }
};

const mine = (req) => ({ slug: String(req.params.slug), creatorId: req.user.id });

// ─── Dashboard ────────────────────────────────────────────────────────────────

const countBy = (keys, values) => Object.fromEntries(keys.map((k) => [k, values.filter((v) => v === k).length]));

// GET /api/creator/dashboard?tzOffset= — who follows each of the coach's
// programs: how many are enrolled, and the fitness level and program week of
// the people following it now. Counts only; no member names.
router.get('/dashboard', handle(async (req, res) => {
  const todayYmd = today(tzOffsetFrom(req));
  const programs = await prisma.program.findMany({
    where: { creatorId: req.user.id },
    select: {
      slug: true,
      title: true,
      status: true,
      level: true,
      weeks: true,
      inPerson: true,
      _count: { select: { days: true } },
      enrollments: { select: { status: true, startDate: true, user: { select: { fitnessLevel: true } }, _count: { select: { completedDays: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const rows = programs.map(({ enrollments, _count, ...p }) => {
    const active = enrollments.filter((e) => e.status === 'active');
    const weekOf = (e) => Math.min(p.weeks, Math.max(1, Math.floor(daysBetween(e.startDate, todayYmd) / 7) + 1));
    const weeks = active.map(weekOf);
    const progress = active.map((e) => (_count.days ? e._count.completedDays / _count.days : 0));
    return {
      ...p,
      totalDays: _count.days,
      enrolled: {
        total: enrollments.length,
        active: active.length,
        completed: enrollments.filter((e) => e.status === 'completed').length,
        left: enrollments.filter((e) => e.status === 'abandoned').length,
      },
      levels: countBy(PROFILE.FITNESS_LEVELS, active.map((e) => e.user.fitnessLevel)),
      weeks: Array.from({ length: p.weeks }, (_, i) => ({ week: i + 1, people: weeks.filter((w) => w === i + 1).length })),
      averageProgressPct: progress.length ? Math.round((progress.reduce((a, b) => a + b, 0) / progress.length) * 100) : null,
    };
  });

  const sum = (key) => rows.reduce((n, r) => n + r.enrolled[key], 0);
  res.json({
    success: true,
    totals: {
      programs: rows.length,
      published: rows.filter((r) => r.status === 'published').length,
      enrolled: sum('total'),
      active: sum('active'),
      completed: sum('completed'),
      levels: Object.fromEntries(PROFILE.FITNESS_LEVELS.map((l) => [l, rows.reduce((n, r) => n + r.levels[l], 0)])),
    },
    programs: rows,
  });
}));

// ─── Coach profile ────────────────────────────────────────────────────────────

const profileFields = ({ bio, specialties, contactEmail, phone, location }) => ({ bio, specialties, contactEmail, phone, location });

router.get('/profile', handle(async (req, res) => {
  const profile = await prisma.coachProfile.findUnique({ where: { userId: req.user.id } });
  res.json({ success: true, profile: profile && { ...profileFields(profile), status: profile.status } });
}));

// PUT /api/creator/profile { bio, specialties, contactEmail, phone, location }
router.put('/profile', handle(async (req, res) => {
  const data = validate(schemas.coachProfile, req.body);
  // Coaches already hold the role, so a profile written here is approved.
  const profile = await prisma.coachProfile.upsert({
    where: { userId: req.user.id },
    create: { ...data, userId: req.user.id, status: 'approved' },
    update: data,
  });
  res.json({ success: true, profile: { ...profileFields(profile), status: profile.status } });
}));

// ─── Workouts ─────────────────────────────────────────────────────────────────

router.get('/workouts', handle(async (req, res) => {
  const workouts = await prisma.workout.findMany({ where: { creatorId: req.user.id }, orderBy: { updatedAt: 'desc' } });
  res.json({ success: true, workouts: workouts.map((w) => catalogAdmin.workoutForStudio(w, apiBase(req))) });
}));

router.post('/workouts', handle(async (req, res) => {
  const workout = await catalogAdmin.createWorkout(req.body, { creatorId: req.user.id });
  res.status(201).json({ success: true, workout: catalogAdmin.workoutForStudio(workout, apiBase(req)) });
}));

// Edit a draft (or a rejected workout, which goes back to draft).
router.put('/workouts/:slug', handle(async (req, res) => {
  const existing = await prisma.workout.findFirst({ where: mine(req) });
  if (!existing) return res.status(404).json({ success: false, message: 'Workout not found.' });
  if (!EDITABLE.includes(existing.status)) {
    return res.status(409).json({ success: false, message: 'Only drafts and rejected workouts can be edited.' });
  }
  const workout = await catalogAdmin.updateWorkout(existing.slug, req.body);
  res.json({ success: true, workout: catalogAdmin.workoutForStudio(workout, apiBase(req)) });
}));

// Ask for the workout to be published in the catalog.
router.post('/workouts/:slug/submit', handle(async (req, res) => {
  const { count } = await prisma.workout.updateMany({ where: { ...mine(req), status: { in: EDITABLE } }, data: { status: 'pending', reviewNote: null } });
  if (!count) return res.status(409).json({ success: false, message: 'Only drafts and rejected workouts can be submitted.' });
  res.json({ success: true });
}));

router.delete('/workouts/:slug', handle(async (req, res) => {
  const existing = await prisma.workout.findFirst({ where: mine(req) });
  if (!existing) return res.status(404).json({ success: false, message: 'Workout not found.' });
  if (existing.status === 'published') {
    return res.status(409).json({ success: false, message: 'Published workouts can’t be deleted. Ask an admin to unpublish it.' });
  }
  const usedBy = await prisma.programDay.count({ where: { workoutSlug: existing.slug } });
  if (usedBy) return res.status(409).json({ success: false, message: 'A program uses this workout. Take it out of the program first.' });
  await prisma.workout.delete({ where: { id: existing.id } });
  res.json({ success: true });
}));

// ─── Programs ─────────────────────────────────────────────────────────────────

router.get('/programs', handle(async (req, res) => {
  const programs = await prisma.program.findMany({
    where: { creatorId: req.user.id },
    include: catalogAdmin.include,
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, programs: programs.map(catalogAdmin.toPublic) });
}));

router.post('/programs', handle(async (req, res) => {
  const program = await catalogAdmin.createProgram(req.body, { creatorId: req.user.id, status: 'draft' });
  res.status(201).json({ success: true, program });
}));

// Edit a draft (or a rejected program, which goes back to draft).
router.put('/programs/:slug', handle(async (req, res) => {
  const existing = await prisma.program.findFirst({ where: mine(req) });
  if (!existing) return res.status(404).json({ success: false, message: 'Program not found.' });
  if (!EDITABLE.includes(existing.status)) {
    return res.status(409).json({ success: false, message: 'Only drafts and rejected programs can be edited.' });
  }
  const program = await catalogAdmin.updateProgram(existing.slug, req.body, { status: 'draft' });
  res.json({ success: true, program });
}));

router.post('/programs/:slug/submit', handle(async (req, res) => {
  const { count } = await prisma.program.updateMany({ where: { ...mine(req), status: { in: EDITABLE } }, data: { status: 'pending', reviewNote: null } });
  if (!count) return res.status(409).json({ success: false, message: 'Only drafts and rejected programs can be submitted.' });
  res.json({ success: true });
}));

router.delete('/programs/:slug', handle(async (req, res) => {
  const existing = await prisma.program.findFirst({ where: mine(req), include: { _count: { select: { enrollments: true } } } });
  if (!existing) return res.status(404).json({ success: false, message: 'Program not found.' });
  if (existing.status === 'published' || existing._count.enrollments) {
    return res.status(409).json({ success: false, message: 'Published programs can’t be deleted. Ask an admin to unpublish it.' });
  }
  await prisma.program.delete({ where: { id: existing.id } });
  res.json({ success: true });
}));

// ─── Articles ─────────────────────────────────────────────────────────────────

const coverUpload = imageUpload('articles', 'cover');

// POST /api/creator/articles/cover (multipart, field "cover") — a cover picture
// for an article; returns its URL to put in coverImageUrl. Admins use it too.
router.post('/articles/cover', coverUpload.single('cover'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Choose a picture to upload.' });
  res.status(201).json({ success: true, url: req.file.publicUrl });
});

const videoFile = videoUpload('articles', 'video');

// POST /api/creator/articles/video (multipart, field "video") — a video for a
// section of an article; returns its URL to put in the section's video.url.
router.post('/articles/video', videoFile.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Choose a video to upload.' });
  res.status(201).json({ success: true, url: req.file.publicUrl });
});

router.get('/articles', handle(async (req, res) => {
  res.json({ success: true, articles: await articles.listMine(req.user.id) });
}));

router.post('/articles', handle(async (req, res) => {
  res.status(201).json({ success: true, article: await articles.create(req.body, { authorId: req.user.id }) });
}));

// Edit a draft (or an article sent back for changes, which goes back to draft).
router.put('/articles/:slug', handle(async (req, res) => {
  res.json({ success: true, article: await articles.updateMine(req.user.id, req.params.slug, req.body) });
}));

// Ask for the article to be published on the home page.
router.post('/articles/:slug/submit', handle(async (req, res) => {
  await articles.submitMine(req.user.id, req.params.slug);
  res.json({ success: true });
}));

router.delete('/articles/:slug', handle(async (req, res) => {
  await articles.deleteMine(req.user.id, req.params.slug);
  res.json({ success: true });
}));

router.use(uploadErrorHandler);

module.exports = router;
