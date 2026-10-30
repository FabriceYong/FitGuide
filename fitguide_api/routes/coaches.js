/**
 * Coaches: members apply to coach (an admin approves the application, see
 * routes/admin.js), and everyone can see an approved coach's profile and
 * programs. Contact details are shown to signed-in members only, so members
 * of in-person programs can ask the coach for a spot.
 */
const express = require('express');
const { prisma } = require('../db/prisma');
const { schemas } = require('../schemas/catalog');
const { validate } = require('../schemas/records');
const { programStore } = require('../stores/records');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const { displayName } = require('../utils/names');

const router = express.Router();

const application = (p) => p && {
  status: p.status,
  bio: p.bio,
  specialties: p.specialties,
  contactEmail: p.contactEmail,
  phone: p.phone,
  location: p.location,
  reviewNote: p.reviewNote,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
};

// ─── GET /api/coaches/application ─────────────────────────────────────────────
// The signed-in member's coach application (null if they haven't applied).
router.get('/application', authMiddleware, async (req, res, next) => {
  try {
    const profile = await prisma.coachProfile.findUnique({ where: { userId: req.user.id } });
    res.json({ success: true, application: application(profile) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/coaches/application ────────────────────────────────────────────
// Body: { bio, specialties, contactEmail, phone, location }. Applying again
// after a decline (or while still waiting) replaces the application.
router.post('/application', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(409).json({ success: false, message: 'You can already coach. Edit your coach profile in the studio.' });
    }
    const data = validate(schemas.coachProfile, req.body);
    const profile = await prisma.coachProfile.upsert({
      where: { userId: req.user.id },
      create: { ...data, userId: req.user.id, status: 'pending' },
      update: { ...data, status: 'pending', reviewNote: null },
    });
    res.status(201).json({ success: true, application: application(profile) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/coaches/:id ─────────────────────────────────────────────────────
// An approved coach's profile and published programs. Signed-in members also
// get the full name and contact details.
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const profile = await prisma.coachProfile.findFirst({
      where: { userId: String(req.params.id), status: 'approved', user: { role: { in: ['creator', 'admin'] } } },
      include: { user: { select: { name: true, avatarUrl: true } } },
    });
    if (!profile) return res.status(404).json({ success: false, message: 'Coach not found.' });
    const signedIn = Boolean(req.user);
    const programs = (await programStore.all()).filter((p) => p.coachId === profile.userId);
    res.json({
      success: true,
      coach: {
        id: profile.userId,
        name: signedIn ? profile.user.name : displayName(profile.user.name),
        avatarUrl: profile.user.avatarUrl,
        bio: profile.bio,
        specialties: profile.specialties,
        // null for visitors; signed-in members see what the coach filled in.
        contact: signedIn ? { email: profile.contactEmail, phone: profile.phone, location: profile.location } : null,
      },
      programs: programs.map(({ days, ...p }) => ({ ...p, totalDays: days.length })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
