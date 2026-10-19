/**
 * Creator studio: creators write programs, submit them for review, and an
 * admin publishes or rejects them (see routes/admin.js).
 */
const express = require('express');
const { prisma } = require('../db/prisma');
const catalogAdmin = require('../services/catalogAdmin');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
router.use(authMiddleware, requireRole('creator', 'admin'));

const EDITABLE = ['draft', 'rejected'];

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof catalogAdmin.CatalogError) return res.status(err.status).json({ success: false, message: err.message });
    return next(err);
  }
};

const mine = (req) => ({ slug: String(req.params.slug), creatorId: req.user.id });

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

module.exports = router;
