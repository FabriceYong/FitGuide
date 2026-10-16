require('dotenv').config();
const mongoose = require('mongoose');
const { getSecret } = require('./utils/jwt');

// Fail fast on missing configuration instead of running with insecure defaults.
try {
  getSecret();
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}

const { createApp } = require('./app');

const app = createApp();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitguide';

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
