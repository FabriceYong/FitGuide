const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const mockDb = require('../models/mockDb');
const { authMiddleware } = require('../middleware/authMiddleware');
const { UPLOADS_ROOT, imageUpload, uploadErrorHandler } = require('../utils/uploads');

const router = express.Router();
const isMock = () => process.env.MOCK_DB === 'true';
const upload = imageUpload('reviews', 'progress');

// Placeholder progress pictures referenced by the seeded mock reviews.
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
for (const name of ['before-example.jpg', 'after-example.jpg']) {
  const file = path.join(UPLOADS_ROOT, 'reviews', name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, tinyPng);
}

// Strip internal fields (like the list of users who liked a review) from mock reviews.
const publicMockReview = ({ likedBy, ...review }) => review;

// GET /api/reviews?workoutId=<slug>
router.get('/', async (req, res, next) => {
  try {
    const workoutId = req.query.workoutId ? String(req.query.workoutId) : null;

    if (isMock()) {
      const reviews = mockDb.getReviews()
        .filter((r) => !workoutId || r.workoutId === workoutId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(publicMockReview);
      return res.status(200).json({ success: true, count: reviews.length, reviews });
    }

    const reviews = await Review.find(workoutId ? { workoutId } : {}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: reviews.length, reviews: reviews.map((r) => r.toPublicObject()) });
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
      const workoutId = req.body.workoutId ? String(req.body.workoutId) : null;

      if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment || comment.length > 1000) {
        return res.status(400).json({ success: false, message: 'A rating from 1 to 5 and a comment (max 1000 characters) are required.' });
      }

      // One review per user per workout.
      if (workoutId) {
        const duplicate = isMock()
          ? mockDb.getReviews().some((r) => r.userId === req.user.id && r.workoutId === workoutId)
          : await Review.exists({ userId: req.user.id, workoutId });
        if (duplicate) {
          return res.status(409).json({ success: false, message: 'You have already reviewed this workout.' });
        }
      }

      const fileUrl = (field) => (req.files?.[field]?.[0] ? `/uploads/reviews/${req.files[field][0].filename}` : null);
      const fields = {
        userId: req.user.id,
        name: req.user.name,
        userAvatar: req.user.avatarUrl || null,
        rating,
        comment,
        workoutRegiment: req.body.workoutRegiment ? String(req.body.workoutRegiment).slice(0, 200) : null,
        workoutId,
        beforeImage: fileUrl('beforeImage'),
        afterImage: fileUrl('afterImage'),
        likes: 0,
      };

      if (isMock()) {
        const review = { ...fields, id: `mock-review-${Date.now()}`, likedBy: [], createdAt: new Date().toISOString() };
        mockDb.addReview(review);
        return res.status(201).json({ success: true, message: 'Review submitted successfully!', review: publicMockReview(review) });
      }

      const review = await Review.create(fields);
      return res.status(201).json({ success: true, message: 'Review submitted successfully!', review: review.toPublicObject() });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/reviews/:id/like — signed-in users only; each user counts once.
router.post('/:id/like', authMiddleware, async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    if (isMock()) {
      const review = mockDb.updateReview(id, (r) => {
        r.likedBy = r.likedBy || [];
        if (!r.likedBy.includes(userId)) {
          r.likedBy.push(userId);
          r.likes = (r.likes || 0) + 1;
        }
      });
      if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
      return res.status(200).json({ success: true, likes: review.likes });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }
    const review = await Review.findOneAndUpdate(
      { _id: id, likedBy: { $ne: userId } },
      { $addToSet: { likedBy: userId }, $inc: { likes: 1 } },
      { new: true }
    ) || await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    return res.status(200).json({ success: true, likes: review.likes });
  } catch (err) {
    next(err);
  }
});

router.use(uploadErrorHandler);

module.exports = router;
