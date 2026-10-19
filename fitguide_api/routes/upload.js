const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { imageUpload, uploadErrorHandler } = require('../utils/uploads');

const router = express.Router();
const upload = imageUpload('avatars', 'avatar');

// ─── POST /api/upload/avatar ─────────────────────────────────────────────────
// Signed-in users only. Returns the relative URL; the client saves it on the
// profile with PUT /api/auth/profile.
router.post('/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded. Please select an image.' });
  }
  return res.status(200).json({
    success: true,
    message: 'Avatar uploaded successfully!',
    avatarUrl: req.file.publicUrl,
  });
});

router.use(uploadErrorHandler);

module.exports = router;
