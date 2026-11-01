/**
 * Progress photos: private pictures by date, to compare side by side. They
 * are kept in private storage and sent only to their owner, through here.
 */
const express = require('express');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { privateImageUpload, uploadErrorHandler } = require('../utils/uploads');
const { getStorage } = require('../utils/storage');
const { tzOffsetFrom, today, isValidYmd } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

const MAX_PHOTOS = 200;
const upload = privateImageUpload('progress-photos', 'photo');
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

/** A photo as clients see it: its image is at `url` (under /api, with the session). */
const present = (p) => ({ id: p.id, date: p.date, note: p.note, url: `/progress-photos/${p.id}/image`, createdAt: p.createdAt });

// ─── GET /api/progress-photos ─────────────────────────────────────────────────
// Oldest first, so the first and last are "before" and "now".
router.get('/', async (req, res, next) => {
  try {
    const photos = await prisma.progressPhoto.findMany({ where: { userId: req.user.id }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] });
    res.json({ success: true, photos: photos.map(present) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/progress-photos?tzOffset= ──────────────────────────────────────
// Multipart: photo (an image up to 5 MB), date? (YYYY-MM-DD, default today), note?
router.post('/', async (req, res, next) => {
  try {
    if (await prisma.progressPhoto.count({ where: { userId: req.user.id } }) >= MAX_PHOTOS) {
      return res.status(409).json({ success: false, message: `You can keep up to ${MAX_PHOTOS} photos. Delete one to add another.` });
    }
    next();
  } catch (err) {
    next(err);
  }
}, upload.single('photo'), async (req, res, next) => {
  const remove = () => req.file?.privateKey && getStorage().removePrivate(req.file.privateKey).catch(() => {});
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Choose a photo.' });
    const todayYmd = today(tzOffsetFrom(req));
    const date = req.body.date || todayYmd;
    if (!isValidYmd(date) || date > todayYmd) {
      await remove();
      return res.status(400).json({ success: false, message: 'Pick a date up to today.' });
    }
    const photo = await prisma.progressPhoto.create({
      data: { userId: req.user.id, date, fileKey: req.file.privateKey, note: String(req.body.note || '').trim().slice(0, 200) },
    });
    res.status(201).json({ success: true, photo: present(photo) });
  } catch (err) {
    await remove();
    next(err);
  }
});

// ─── GET /api/progress-photos/:id/image ───────────────────────────────────────
router.get('/:id/image', async (req, res, next) => {
  try {
    const photo = await prisma.progressPhoto.findFirst({ where: { id: String(req.params.id), userId: req.user.id } });
    const bytes = photo && await getStorage().readPrivate(photo.fileKey);
    if (!bytes) return res.status(404).json({ success: false, message: 'Photo not found.' });
    const ext = photo.fileKey.slice(photo.fileKey.lastIndexOf('.')).toLowerCase();
    res.set({ 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600' });
    res.send(bytes);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/progress-photos/:id ──────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const photo = await prisma.progressPhoto.findFirst({ where: { id: String(req.params.id), userId: req.user.id } });
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found.' });
    await prisma.progressPhoto.delete({ where: { id: photo.id } });
    await getStorage().removePrivate(photo.fileKey).catch((err) => console.error('[progress-photos] could not remove a file:', err.message));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.use(uploadErrorHandler);

module.exports = router;
