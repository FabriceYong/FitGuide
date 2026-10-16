const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

// The stored extension comes from the validated MIME type, never from the
// client's filename, so an upload can't be saved as .html/.svg and served back
// as an active document from /uploads.
const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * Build a multer instance that stores images under uploads/<subdir>.
 * @param {string} subdir  e.g. 'avatars' or 'reviews'
 * @param {string} prefix  filename prefix
 */
function imageUpload(subdir, prefix) {
  const dir = path.join(UPLOADS_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dir),
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        cb(null, `${prefix}-${file.fieldname}-${unique}${EXTENSIONS[file.mimetype]}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (EXTENSIONS[file.mimetype]) return cb(null, true);
      cb(new Error('Only image files are allowed (JPEG, PNG, WebP, GIF).'), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  });
}

/** Router-level error handler that turns multer errors into 400 responses. */
function uploadErrorHandler(err, _req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 5 MB per image.' });
  }
  if (err instanceof multer.MulterError || /Only image files/.test(err.message)) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return next(err);
}

module.exports = { UPLOADS_ROOT, imageUpload, uploadErrorHandler };
