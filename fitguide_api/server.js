require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { getSecret } = require('./utils/jwt');
const { UPLOADS_ROOT } = require('./utils/uploads');

// Fail fast on missing configuration instead of running with insecure defaults.
try {
  getSecret();
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const reviewsRoutes = require('./routes/reviews');
const workoutsRoutes = require('./routes/workouts');
const exerciseMediaRoutes = require('./routes/exerciseMedia');
const exerciseLibraryRoutes = require('./routes/exerciseLibrary');
const favoritesRoutes = require('./routes/favorites');
const customImagesRoutes = require('./routes/customImages');

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitguide';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '100kb' }));

// Serve uploaded files statically. nosniff stops browsers from guessing a
// different content type for user-uploaded files.
app.use('/uploads', express.static(UPLOADS_ROOT, {
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/exercise-media', exerciseMediaRoutes);
app.use('/api/exercise-library', exerciseLibraryRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/custom-images', customImagesRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', databaseMode: process.env.MOCK_DB === 'true' ? 'mock' : 'mongodb', timestamp: new Date().toISOString() });
});

// Unknown API routes
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'Not found.' });
});

// Central error handler: log details server-side, return a generic message.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON body.' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
});

// ─── MongoDB Connection & Server Start ───────────────────────────────────────
const start = (mode) => {
  app.listen(PORT, () => {
    console.log(`🚀 FitGuide API${mode === 'mock' ? ' (MOCK DB MODE)' : ''} running on http://localhost:${PORT}`);
  });
};

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 }) // Allow 15s for Atlas connections
  .then(() => {
    console.log('✅ Connected to MongoDB');
    process.env.MOCK_DB = 'false';
    start('mongodb');
  })
  .catch((err) => {
    console.warn('⚠️ MongoDB connection failed:', err.message);
    console.warn('⚠️ Starting server in Mock Database Mode for local development.');
    console.warn('💡 (Users and reviews are persisted to mock_db_data.json)');
    process.env.MOCK_DB = 'true';
    start('mock');
  });
