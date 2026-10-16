const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Review = require('../models/Review');
const mockDb = require('../models/mockDb');

const router = express.Router();

// Ensure reviews uploads directory exists
const reviewsUploadsDir = path.join(__dirname, '..', 'uploads', 'reviews');
if (!fs.existsSync(reviewsUploadsDir)) {
  fs.mkdirSync(reviewsUploadsDir, { recursive: true });
}

// Write mock progress pictures if they do not exist, so they are loaded properly
const beforeExamplePath = path.join(reviewsUploadsDir, 'before-example.jpg');
const afterExamplePath = path.join(reviewsUploadsDir, 'after-example.jpg');
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

if (!fs.existsSync(beforeExamplePath)) {
  fs.writeFileSync(beforeExamplePath, Buffer.from(tinyPngBase64, 'base64'));
}
if (!fs.existsSync(afterExamplePath)) {
  fs.writeFileSync(afterExamplePath, Buffer.from(tinyPngBase64, 'base64'));
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, reviewsUploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `progress-${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, WebP, GIF).'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max per file
  },
});

// GET /api/reviews
router.get('/', async (req, res) => {
  try {
    const { workoutId } = req.query;

    if (process.env.MOCK_DB === 'true') {
      let reviews = mockDb.getReviews();

      // Filter by workout if workoutId is provided
      if (workoutId) {
        reviews = reviews.filter(review => review.workoutId === workoutId);
      }

      const sortedReviews = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.status(200).json({ success: true, count: sortedReviews.length, reviews: sortedReviews });
    }

    let query = {};
    if (workoutId) {
      query.workoutId = workoutId;
    }

    const reviews = await Review.find(query).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews: reviews.map(r => r.toPublicObject()),
    });
  } catch (err) {
    console.error('[Get Reviews Error]', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving reviews.' });
  }
});

// POST /api/reviews
router.post(
  '/',
  upload.fields([
    { name: 'beforeImage', maxCount: 1 },
    { name: 'afterImage', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { name, rating, comment, workoutRegiment, userAvatar, workoutId } = req.body;

      if (!name || !rating || !comment) {
        return res.status(400).json({
          success: false,
          message: 'Name, rating, and comment are required.',
        });
      }

      // Extract uploaded files if any
      let beforeImageUrl = null;
      let afterImageUrl = null;

      if (req.files) {
        if (req.files.beforeImage && req.files.beforeImage[0]) {
          beforeImageUrl = `/uploads/reviews/${req.files.beforeImage[0].filename}`;
        }
        if (req.files.afterImage && req.files.afterImage[0]) {
          afterImageUrl = `/uploads/reviews/${req.files.afterImage[0].filename}`;
        }
      }

      if (process.env.MOCK_DB === 'true') {
        const newReview = {
          id: `mock-review-${Date.now()}`,
          name,
          userAvatar: userAvatar || null,
          rating: Number(rating),
          comment,
          workoutRegiment: workoutRegiment || null,
          workoutId: workoutId || null,
          beforeImage: beforeImageUrl,
          afterImage: afterImageUrl,
          likes: 0,
          createdAt: new Date().toISOString(),
        };

        mockDb.addReview(newReview);

        return res.status(201).json({
          success: true,
          message: 'Review submitted successfully (Mock DB)!',
          review: newReview,
        });
      }

      const review = new Review({
        name,
        userAvatar: userAvatar || null,
        rating: Number(rating),
        comment,
        workoutRegiment: workoutRegiment || null,
        workoutId: workoutId || null,
        beforeImage: beforeImageUrl,
        afterImage: afterImageUrl,
        likes: 0,
      });

      await review.save();

      return res.status(201).json({
        success: true,
        message: 'Review submitted successfully!',
        review: review.toPublicObject(),
      });
    } catch (err) {
      console.error('[Submit Review Error]', err);
      return res.status(500).json({
        success: false,
        message: 'Server error. Review submission failed.',
      });
    }
  }
);

// POST /api/reviews/:id/like
router.post('/:id/like', async (req, res) => {
  const { id } = req.params;

  try {
    if (process.env.MOCK_DB === 'true') {
      const updatedReview = mockDb.updateReview(id, (review) => {
        review.likes = (review.likes || 0) + 1;
      });

      if (!updatedReview) {
        return res.status(404).json({ success: false, message: 'Review not found.' });
      }

      return res.status(200).json({ success: true, likes: updatedReview.likes });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    review.likes += 1;
    await review.save();

    return res.status(200).json({ success: true, likes: review.likes });
  } catch (err) {
    console.error('[Like Review Error]', err);
    return res.status(500).json({ success: false, message: 'Server error liking review.' });
  }
});

// Error handling middleware for multer errors
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File is too large. Maximum size is 5 MB per image.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed.',
    });
  }

  next();
});

module.exports = router;
