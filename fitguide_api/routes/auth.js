const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const userStore = require('../stores/userStore');
const { signToken } = require('../utils/jwt');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const enumValues = (field) => User.schema.path(field).enumValues;

// Optional profile fields share the same rules on register and profile update,
// so mock mode enforces the same constraints as the Mongoose schema.
const profileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('gender').optional().isIn(enumValues('gender')).withMessage('Invalid gender'),
  body('height').optional().isFloat({ min: 50, max: 250 }).withMessage('Height must be between 50 and 250 cm'),
  body('weight').optional().isFloat({ min: 30, max: 250 }).withMessage('Weight must be between 30 and 250 kg'),
  body('targetWeight').optional().isFloat({ min: 30, max: 250 }).withMessage('Target weight must be between 30 and 250 kg'),
  body('fitnessLevel').optional().isIn(enumValues('fitnessLevel')).withMessage('Invalid fitness level'),
  body('activityStatus').optional().isIn(enumValues('activityStatus')).withMessage('Invalid activity status'),
  body('goal').optional().isIn(enumValues('goal')).withMessage('Invalid goal'),
  body('diet').optional().isIn(enumValues('diet')).withMessage('Invalid diet'),
  body('avatarUrl').optional({ values: 'null' }).isString().isLength({ max: 500 }),
];

const rejectInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ...profileRules,
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      if (await userStore.emailExists(req.body.email)) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }
      const user = await userStore.create(req.body);
      return res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        user,
        token: signToken(user.id),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const record = await userStore.findByEmailWithPassword(req.body.email);
      const isMatch = record && await bcrypt.compare(req.body.password, record.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }
      return res.status(200).json({
        success: true,
        message: 'Login successful!',
        user: record.user,
        token: signToken(record.user.id),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Validates the token and returns the current user's profile.
router.get('/me', authMiddleware, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
// Updates the signed-in user's own profile. The target user always comes from
// the token, never from the request body.
router.put('/profile', authMiddleware, profileRules, rejectInvalid, async (req, res, next) => {
  try {
    const user = await userStore.updateProfile(req.user.id, req.body);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, message: 'Profile updated successfully!', user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
