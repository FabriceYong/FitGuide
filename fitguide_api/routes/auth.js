const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mockDb = require('../models/mockDb');

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '7d' }
  );
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters'),

    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),

    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    // 1. Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      name,
      email,
      password,
      gender,
      height,
      weight,
      targetWeight,
      fitnessLevel,
      activityStatus,
      goal,
      diet,
      avatarUrl,
    } = req.body;

    try {
      if (process.env.MOCK_DB === 'true') {
        const users = mockDb.getUsers();
        const existingUser = users.find((u) => u.email === email.toLowerCase());
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'An account with this email already exists.',
          });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
          id: `mock-user-${Date.now()}`,
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          gender: gender || 'Prefer not to say',
          height: height || 170,
          weight: weight || 70,
          targetWeight: targetWeight || 70,
          fitnessLevel: fitnessLevel || 'Beginner',
          activityStatus: activityStatus || 'Active',
          goal: goal || 'Vitality',
          diet: diet || 'Mediterranean Diet',
          avatarUrl: avatarUrl || null,
          createdAt: new Date().toISOString(),
        };

        mockDb.addUser(newUser);

        const { password: _, ...publicUser } = newUser;
        const token = generateToken(newUser.id);

        return res.status(201).json({
          success: true,
          message: 'Account created successfully (Mock DB)!',
          user: publicUser,
          token,
        });
      }

      // MongoDB Mode
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }

      const user = new User({
        name,
        email,
        password,
        gender: gender || 'Prefer not to say',
        height: height || 170,
        weight: weight || 70,
        targetWeight: targetWeight || 70,
        fitnessLevel: fitnessLevel || 'Beginner',
        activityStatus: activityStatus || 'Active',
        goal: goal || 'Vitality',
        diet: diet || 'Mediterranean Diet',
        avatarUrl: avatarUrl || null,
      });

      await user.save();

      const token = generateToken(user._id.toString());

      return res.status(201).json({
        success: true,
        message: 'Account created successfully in MongoDB!',
        user: user.toPublicProfile(),
        token,
      });
    } catch (err) {
      console.error('[Register Error]', err);
      return res.status(500).json({
        success: false,
        message: 'Server error. Please try again later.',
      });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),

    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    try {
      if (process.env.MOCK_DB === 'true') {
        const users = mockDb.getUsers();
        const user = users.find((u) => u.email === email.toLowerCase());
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password.',
          });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password.',
          });
        }

        const { password: _, ...publicUser } = user;
        const token = generateToken(user.id);

        return res.status(200).json({
          success: true,
          message: 'Login successful!',
          user: publicUser,
          token,
        });
      }

      // MongoDB Mode
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      const token = generateToken(user._id.toString());

      return res.status(200).json({
        success: true,
        message: 'Login successful!',
        user: user.toPublicProfile(),
        token,
      });
    } catch (err) {
      console.error('[Login Error]', err);
      return res.status(500).json({
        success: false,
        message: 'Server error. Please try again later.',
      });
    }
  }
);

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
// Update user profile parameters in MongoDB / Mock DB
router.put('/profile', async (req, res) => {
  const {
    id,
    email,
    name,
    gender,
    height,
    weight,
    targetWeight,
    fitnessLevel,
    activityStatus,
    goal,
    diet,
    avatarUrl,
  } = req.body;

  try {
    if (process.env.MOCK_DB === 'true') {
      const users = mockDb.getUsers();
      const targetUser = users.find((u) => u.id === id || u.email === email);
      if (!targetUser) {
        return res.status(44).json({ success: false, message: 'User not found' });
      }

      const updatedFields = {
        name: name || targetUser.name,
        gender: gender || targetUser.gender,
        height: height ? Number(height) : targetUser.height,
        weight: weight ? Number(weight) : targetUser.weight,
        targetWeight: targetWeight ? Number(targetWeight) : targetUser.targetWeight,
        fitnessLevel: fitnessLevel || targetUser.fitnessLevel,
        activityStatus: activityStatus || targetUser.activityStatus,
        goal: goal || targetUser.goal,
        diet: diet || targetUser.diet,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : targetUser.avatarUrl,
      };

      const updated = mockDb.updateUser(targetUser.id, updatedFields);
      const { password: _, ...publicUser } = updated;

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully!',
        user: publicUser,
      });
    }

    // MongoDB Mode
    const query = id ? { _id: id } : { email };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in MongoDB' });
    }

    if (name) user.name = name;
    if (gender) user.gender = gender;
    if (height) user.height = Number(height);
    if (weight) user.weight = Number(weight);
    if (targetWeight) user.targetWeight = Number(targetWeight);
    if (fitnessLevel) user.fitnessLevel = fitnessLevel;
    if (activityStatus) user.activityStatus = activityStatus;
    if (goal) user.goal = goal;
    if (diet) user.diet = diet;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully in MongoDB!',
      user: user.toPublicProfile(),
    });
  } catch (err) {
    console.error('[Profile Update Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Server error updating profile.',
    });
  }
});

// ─── GET /api/auth/users ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  router.get('/users', async (_req, res) => {
    try {
      if (process.env.MOCK_DB === 'true') {
        const users = mockDb.getUsers();
        return res.status(200).json({ success: true, count: users.length, users });
      }
      const users = await User.find({}).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, count: users.length, users });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Server error.' });
    }
  });
}

module.exports = router;
