const express = require('express');
const { body } = require('express-validator');
const { enrollmentStore, programStore } = require('../stores/records');
const { describeAll, describeOne } = require('../services/enrollments');
const { authMiddleware } = require('../middleware/authMiddleware');
const coachClients = require('../services/coachClients');
const { prisma } = require('../db/prisma');
const { isPlus } = require('../services/billing');
const { rejectInvalid } = require('../utils/validate');
const { tzOffsetFrom, today, isValidYmd, daysBetween } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/enrollments?tzOffset= ───────────────────────────────────────────
// The user's program enrollments with their schedules, active first.
router.get('/', async (req, res, next) => {
  try {
    const enrollments = await describeAll(req.user.id, today(tzOffsetFrom(req)));
    res.json({ success: true, enrollments, active: enrollments.find((e) => e.status === 'active') || null });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/enrollments/notes ───────────────────────────────────────────────
// Unread notes from the coaches of programs the user shares their progress with.
router.get('/notes', async (req, res, next) => {
  try {
    res.json({ success: true, notes: await coachClients.unread(req.user.id) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/enrollments/notes/:id/read ─────────────────────────────────────
router.post('/notes/:id/read', async (req, res, next) => {
  try {
    if (!(await coachClients.markRead(req.user.id, req.params.id))) return res.status(404).json({ success: false, message: 'Note not found.' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/enrollments/:id?tzOffset= ───────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const enrollment = await describeOne(req.user.id, req.params.id, today(tzOffsetFrom(req)));
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    res.json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/enrollments?tzOffset= ──────────────────────────────────────────
// Body: { programSlug, startDate? (YYYY-MM-DD, default today), replace? }
// One program is active at a time. Starting another needs replace: true,
// which ends the current one as abandoned.
router.post(
  '/',
  [
    body('programSlug').isString().trim().notEmpty().withMessage('programSlug is required'),
    body('startDate').optional().custom(isValidYmd).withMessage('startDate must be a date (YYYY-MM-DD)'),
    body('replace').optional().isBoolean(),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const todayYmd = today(tzOffsetFrom(req));
      const startDate = req.body.startDate || todayYmd;
      if (Math.abs(daysBetween(todayYmd, startDate)) > 90) {
        return res.status(400).json({ success: false, message: 'Start date must be within 90 days of today.' });
      }

      const program = await programStore.getBySlug(req.body.programSlug, { userId: req.user.id });
      if (!program) return res.status(404).json({ success: false, message: 'Program not found.' });
      if (program.isPremium && !isPlus(req.user)) {
        return res.status(402).json({ success: false, code: 'PLUS_REQUIRED', message: 'This program is part of FitGuide PLUS.' });
      }

      const [active] = await enrollmentStore.list(req.user.id, { where: { status: 'active' } });
      if (active) {
        if (active.programSlug === program.slug) {
          return res.status(409).json({ success: false, code: 'ALREADY_ENROLLED', message: 'You are already following this program.' });
        }
        if (req.body.replace !== true) {
          const current = await programStore.getBySlug(active.programSlug, { userId: req.user.id });
          return res.status(409).json({
            success: false,
            code: 'ACTIVE_ENROLLMENT',
            message: `You are following ${current?.title || 'another program'}. Starting this one will end it.`,
            activeEnrollmentId: active.id,
          });
        }
        await enrollmentStore.update(req.user.id, active.id, (e) => {
          e.status = 'abandoned';
          e.endedAt = new Date();
        });
      }

      const created = await enrollmentStore.create(req.user.id, { programSlug: program.slug, startDate, status: 'active', completedDays: [] });
      res.status(201).json({ success: true, enrollment: await describeOne(req.user.id, created.id, todayYmd) });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /api/enrollments/:id?tzOffset= ─────────────────────────────────────
// Body: { status: 'abandoned' } — leave an active program; or
// { shareWithCoach: boolean } — let the program's coach see how you're doing
// and send you notes.
router.patch(
  '/:id',
  [
    body('status').optional().equals('abandoned').withMessage('Only status "abandoned" can be set'),
    body('shareWithCoach').optional().isBoolean().withMessage('shareWithCoach must be true or false').toBoolean(),
    body().custom((b) => b.status !== undefined || b.shareWithCoach !== undefined).withMessage('Nothing to change'),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const existing = await enrollmentStore.findOwned(req.user.id, req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Enrollment not found.' });
      if (req.body.shareWithCoach !== undefined) {
        const program = await prisma.program.findUnique({ where: { slug: existing.programSlug }, select: { creatorId: true } });
        if (!program?.creatorId) return res.status(400).json({ success: false, message: 'This program has no coach to share with.' });
        await prisma.enrollment.update({ where: { id: existing.id }, data: { shareWithCoach: req.body.shareWithCoach } });
        if (req.body.status === undefined) {
          return res.json({ success: true, enrollment: await describeOne(req.user.id, existing.id, today(tzOffsetFrom(req))) });
        }
      }
      if (existing.status !== 'active') {
        return res.status(409).json({ success: false, message: 'Only an active program can be ended.' });
      }
      await enrollmentStore.update(req.user.id, existing.id, (e) => {
        e.status = 'abandoned';
        e.endedAt = new Date();
      });
      res.json({ success: true, enrollment: await describeOne(req.user.id, existing.id, today(tzOffsetFrom(req))) });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
