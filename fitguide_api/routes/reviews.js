const express = require('express');
const { prisma, isUniqueViolation } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { imageUpload, uploadErrorHandler } = require('../utils/uploads');

const router = express.Router();
const upload = imageUpload('reviews', 'progress');

// Reviews are keyed by workout slug; the API calls that field workoutId.
const toPublic = ({ workoutSlug, ...review }) => ({ ...review, workoutId: workoutSlug });

// GET /api/reviews?workoutId=<slug>
router.get('/', async (req, res, next) => {
  try {
    const workoutSlug = req.query.workoutId ? String(req.query.workoutId) : null;
    const reviews = await prisma.review.findMany({
      where: workoutSlug ? { workoutSlug } : {},
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ success: true, count: reviews.length, reviews: reviews.map(toPublic) });
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews — signed-in users only. The author name and avatar come
// from the account, not from the form, so nobody can post as someone else.
router.post(
  '/',
  authMiddleware,
  upload.fields([
    { name: 'beforeImage', maxCount: 1 },
    { name: 'afterImage', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const rating = Number(req.body.rating);
      const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
      const workoutSlug = req.body.workoutId ? String(req.body.workoutId) : null;

      if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment || comment.length > 1000) {
        return res.status(400).json({ success: false, message: 'A rating from 1 to 5 and a comment (max 1000 characters) are required.' });
      }

      // One review per user per workout. (The unique index also enforces it
      // if two requests race.)
      if (workoutSlug && await prisma.review.count({ where: { userId: req.user.id, workoutSlug } })) {
        return res.status(409).json({ success: false, message: 'You have already reviewed this workout.' });
      }

      const fileUrl = (field) => (req.files?.[field]?.[0] ? req.files[field][0].publicUrl : null);
      let review;
      try {
        review = await prisma.review.create({
          data: {
            userId: req.user.id,
            name: req.user.name,
            userAvatar: req.user.avatarUrl || null,
            rating,
            comment,
            workoutRegiment: req.body.workoutRegiment ? String(req.body.workoutRegiment).slice(0, 200) : null,
            workoutSlug,
            beforeImage: fileUrl('beforeImage'),
            afterImage: fileUrl('afterImage'),
          },
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          return res.status(409).json({ success: false, message: 'You have already reviewed this workout.' });
        }
        throw err;
      }
      return res.status(201).json({ success: true, message: 'Review submitted successfully!', review: toPublic(review) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/reviews/:id/like — signed-in users only; each user counts once.
router.post('/:id/like', authMiddleware, async (req, res, next) => {
  try {
    const reviewId = String(req.params.id);
    if (!(await prisma.review.count({ where: { id: reviewId } }))) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }
    const likes = await prisma.$transaction(async (tx) => {
      const { count } = await tx.reviewLike.createMany({ data: [{ reviewId, userId: req.user.id }], skipDuplicates: true });
      const review = count
        ? await tx.review.update({ where: { id: reviewId }, data: { likes: { increment: 1 } } })
        : await tx.review.findUnique({ where: { id: reviewId } });
      return review.likes;
    });
    return res.status(200).json({ success: true, likes });
  } catch (err) {
    next(err);
  }
});

router.use(uploadErrorHandler);

module.exports = router;
