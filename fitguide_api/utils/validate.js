const { validationResult } = require('express-validator');

/** Respond 400 with express-validator's errors, if there are any. */
const rejectInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
};

/** Copy only the listed keys that are present (not undefined) in source. */
const pick = (source, keys) => Object.fromEntries(keys.filter((k) => source[k] !== undefined).map((k) => [k, source[k]]));

module.exports = { rejectInvalid, pick };
