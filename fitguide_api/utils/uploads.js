const crypto = require('crypto');
const multer = require('multer');
const { UPLOADS_ROOT, getStorage } = require('./storage');

// The stored extension comes from the validated MIME type, never from the
// client's filename, so an upload can't be saved as .html/.svg and served back
// as an active document.
const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_BYTES = 5 * 1024 * 1024;

/** Does the file start with the signature of the image type it claims to be? */
function hasImageSignature(buffer, mimetype) {
  const starts = (...bytes) => bytes.every((b, i) => buffer[i] === b);
  const ascii = (offset, text) => buffer.subarray(offset, offset + text.length).toString('latin1') === text;
  switch (mimetype) {
    case 'image/jpeg':
    case 'image/jpg':
      return starts(0xff, 0xd8, 0xff);
    case 'image/png':
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'image/gif':
      return ascii(0, 'GIF87a') || ascii(0, 'GIF89a');
    case 'image/webp':
      return ascii(0, 'RIFF') && ascii(8, 'WEBP');
    default:
      return false;
  }
}

class UploadError extends Error {}

/**
 * Image uploads stored under <subdir>/ in the configured storage (local disk
 * or an S3-compatible bucket). After the middleware runs, each file has
 * `publicUrl` set to where it can be loaded from.
 * @param {string} subdir  e.g. 'avatars' or 'reviews'
 * @param {string} prefix  filename prefix
 */
function imageUpload(subdir, prefix) {
  const parser = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
      if (EXTENSIONS[file.mimetype]) return cb(null, true);
      cb(new UploadError('Only image files are allowed (JPEG, PNG, WebP, GIF).'), false);
    },
    limits: { fileSize: MAX_BYTES, files: 4 },
  });

  async function store(req, _res, next) {
    try {
      const files = [req.file, ...Object.values(req.files || {}).flat()].filter(Boolean);
      for (const file of files) {
        if (!hasImageSignature(file.buffer, file.mimetype)) {
          throw new UploadError('That file is not a valid image.');
        }
      }
      for (const file of files) {
        file.filename = `${prefix}-${file.fieldname}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXTENSIONS[file.mimetype]}`;
        file.publicUrl = await getStorage().put(`${subdir}/${file.filename}`, file.buffer, file.mimetype);
        file.buffer = null;
      }
      next();
    } catch (err) {
      next(err);
    }
  }

  return {
    single: (field) => [parser.single(field), store],
    fields: (spec) => [parser.fields(spec), store],
  };
}

/** Router-level error handler that turns upload errors into 400 responses. */
function uploadErrorHandler(err, _req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 5 MB per image.' });
  }
  if (err instanceof multer.MulterError || err instanceof UploadError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return next(err);
}

module.exports = { UPLOADS_ROOT, imageUpload, uploadErrorHandler, hasImageSignature };
