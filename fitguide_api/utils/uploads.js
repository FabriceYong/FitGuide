const crypto = require('crypto');
const multer = require('multer');
const { UPLOADS_ROOT, getStorage } = require('./storage');

// The stored extension comes from the validated MIME type, never from the
// client's filename, so an upload can't be saved as .html/.svg and served back
// as an active document.
const IMAGE_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const VIDEO_EXTENSIONS = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

const starts = (buffer, ...bytes) => bytes.every((b, i) => buffer[i] === b);
const ascii = (buffer, offset, text) => buffer.subarray(offset, offset + text.length).toString('latin1') === text;

/** Does the file start with the signature of the image type it claims to be? */
function hasImageSignature(buffer, mimetype) {
  switch (mimetype) {
    case 'image/jpeg':
    case 'image/jpg':
      return starts(buffer, 0xff, 0xd8, 0xff);
    case 'image/png':
      return starts(buffer, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'image/gif':
      return ascii(buffer, 0, 'GIF87a') || ascii(buffer, 0, 'GIF89a');
    case 'image/webp':
      return ascii(buffer, 0, 'RIFF') && ascii(buffer, 8, 'WEBP');
    default:
      return false;
  }
}

/** Does the file start like the video type it claims to be? MP4 and MOV open with an "ftyp" box, WebM with an EBML header. */
function hasVideoSignature(buffer, mimetype) {
  switch (mimetype) {
    case 'video/mp4':
    case 'video/quicktime':
      return ascii(buffer, 4, 'ftyp');
    case 'video/webm':
      return starts(buffer, 0x1a, 0x45, 0xdf, 0xa3);
    default:
      return false;
  }
}

const KINDS = {
  image: {
    extensions: IMAGE_EXTENSIONS,
    hasSignature: hasImageSignature,
    maxBytes: 5 * 1024 * 1024,
    maxText: '5 MB per image',
    wrongType: 'Only image files are allowed (JPEG, PNG, WebP, GIF).',
    invalid: 'That file is not a valid image.',
  },
  video: {
    extensions: VIDEO_EXTENSIONS,
    hasSignature: hasVideoSignature,
    maxBytes: 100 * 1024 * 1024,
    maxText: '100 MB per video',
    wrongType: 'Only video files are allowed (MP4, WebM, MOV).',
    invalid: 'That file is not a valid video.',
  },
};

class UploadError extends Error {}

/**
 * Uploads stored under <subdir>/ in the configured storage (local disk or an
 * S3-compatible bucket). After the middleware runs, each file has
 * `publicUrl` set to where it can be loaded from; with `private`, it has
 * `privateKey` instead, and only the API can read it.
 */
function fileUpload(kind, subdir, prefix, { private: isPrivate = false } = {}) {
  const rules = KINDS[kind];
  const parser = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
      if (rules.extensions[file.mimetype]) return cb(null, true);
      cb(new UploadError(rules.wrongType), false);
    },
    limits: { fileSize: rules.maxBytes, files: 4 },
  });

  // Lets uploadErrorHandler name the right size limit.
  const note = (req, _res, next) => {
    req.uploadMaxText = rules.maxText;
    next();
  };

  async function store(req, _res, next) {
    try {
      const files = [req.file, ...Object.values(req.files || {}).flat()].filter(Boolean);
      for (const file of files) {
        if (!rules.hasSignature(file.buffer, file.mimetype)) {
          throw new UploadError(rules.invalid);
        }
      }
      for (const file of files) {
        file.filename = `${prefix}-${file.fieldname}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${rules.extensions[file.mimetype]}`;
        if (isPrivate) {
          file.privateKey = `${subdir}/${file.filename}`;
          await getStorage().putPrivate(file.privateKey, file.buffer, file.mimetype);
        } else {
          file.publicUrl = await getStorage().put(`${subdir}/${file.filename}`, file.buffer, file.mimetype);
        }
        file.buffer = null;
      }
      next();
    } catch (err) {
      next(err);
    }
  }

  return {
    single: (field) => [note, parser.single(field), store],
    fields: (spec) => [note, parser.fields(spec), store],
  };
}

/**
 * Image uploads.
 * @param {string} subdir  e.g. 'avatars' or 'reviews'
 * @param {string} prefix  filename prefix
 */
const imageUpload = (subdir, prefix) => fileUpload('image', subdir, prefix);

/** Image uploads only the API can read back (progress photos). */
const privateImageUpload = (subdir, prefix) => fileUpload('image', subdir, prefix, { private: true });

/** Video uploads (MP4, WebM, MOV), up to 100 MB. */
const videoUpload = (subdir, prefix) => fileUpload('video', subdir, prefix);

/** Router-level error handler that turns upload errors into 400 responses. */
function uploadErrorHandler(err, req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: `File is too large. Maximum size is ${req.uploadMaxText || KINDS.image.maxText}.` });
  }
  if (err instanceof multer.MulterError || err instanceof UploadError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return next(err);
}

module.exports = { UPLOADS_ROOT, imageUpload, privateImageUpload, videoUpload, uploadErrorHandler, hasImageSignature, hasVideoSignature };
