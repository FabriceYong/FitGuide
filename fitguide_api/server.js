require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const reviewsRoutes = require('./routes/reviews');
const workoutsRoutes = require('./routes/workouts');
const exerciseMediaRoutes = require('./routes/exerciseMedia');
const favoritesRoutes = require('./routes/favorites');
const customImagesRoutes = require('./routes/customImages');

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitguide';

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
const reviewsDir = path.join(uploadsDir, 'reviews');
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
if (!fs.existsSync(reviewsDir)) fs.mkdirSync(reviewsDir, { recursive: true });

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/exercise-media', exerciseMediaRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/custom-images', customImagesRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', databaseMode: process.env.MOCK_DB === 'true' ? 'mock' : 'mongodb', timestamp: new Date().toISOString() });
});

// ─── MongoDB Connection & Server Start ───────────────────────────────────────
mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000, // Allow 15s for Atlas connections
  })
  .then(() => {
    console.log('✅ Connected to MongoDB');
    process.env.MOCK_DB = 'false';
    app.listen(PORT, () => {
      console.log(`🚀 FitGuide API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.warn('⚠️ MongoDB connection failed:', err.message);
    console.warn('⚠️ Starting server in Mock Database Mode for local development.');
    console.warn('💡 (Any users, uploads, and reviews will be stored in memory and persisted to mock_db_data.json)');
    process.env.MOCK_DB = 'true';
    app.listen(PORT, () => {
      console.log(`🚀 FitGuide API (MOCK DB MODE) running on http://localhost:${PORT}`);
    });
  });
