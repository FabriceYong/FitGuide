const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const { UPLOADS_ROOT } = require('./utils/uploads');
const { corsOptions, intFromEnv } = require('./utils/config');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const reviewsRoutes = require('./routes/reviews');
const workoutsRoutes = require('./routes/workouts');
const exerciseMediaRoutes = require('./routes/exerciseMedia');
const exerciseLibraryRoutes = require('./routes/exerciseLibrary');
const articlesRoutes = require('./routes/articles');
const favoritesRoutes = require('./routes/favorites');
const customImagesRoutes = require('./routes/customImages');
const exercisesRoutes = require('./routes/exercises');
const programsRoutes = require('./routes/programs');
const enrollmentsRoutes = require('./routes/enrollments');
const sessionsRoutes = require('./routes/sessions');
const bodyMetricsRoutes = require('./routes/bodyMetrics');
const progressRoutes = require('./routes/progress');
const planRoutes = require('./routes/plan');
const coachRoutes = require('./routes/coach');
const aiRoutes = require('./routes/ai');
const nutritionRoutes = require('./routes/nutrition');
const integrationsRoutes = require('./routes/integrations');
const healthDataRoutes = require('./routes/healthData');
const socialRoutes = require('./routes/social');
const adminRoutes = require('./routes/admin');
const creatorRoutes = require('./routes/creator');
const coachesRoutes = require('./routes/coaches');
const billingRoutes = require('./routes/billing');
const eventsRoutes = require('./routes/events');
const gymsRoutes = require('./routes/gyms');

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const limiter = (windowMs, limit, message, extra = {}) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message },
  ...extra,
});

/**
 * Build the Express app. Database connection and listen() live in server.js,
 * so tests can create a fresh app (with fresh rate-limit counters) per suite.
 */
function createApp() {
  const app = express();

  // Behind a reverse proxy (nginx, Render, etc.) set TRUST_PROXY=1 so rate
  // limits apply to the client IP rather than the proxy's.
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
  }

  // ─── Middleware ─────────────────────────────────────────────────────────────
  app.use(helmet({
    // The web app runs on another origin and loads avatars/progress photos
    // from /uploads, so those responses must be embeddable cross-origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors(corsOptions));
  // Stripe signs the raw body, so its webhook is read before JSON parsing.
  app.post('/api/billing/webhook', billingRoutes.webhook);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Serve uploaded files statically (helmet already sets nosniff, so browsers
  // won't guess a different content type for user-uploaded files).
  app.use('/uploads', express.static(UPLOADS_ROOT));

  // ─── Rate limits ────────────────────────────────────────────────────────────
  // Strict limits on credential endpoints (brute force / account spam), and a
  // looser one for the API as a whole.
  app.use('/api/auth/login', limiter(
    FIFTEEN_MINUTES,
    intFromEnv('LOGIN_RATE_LIMIT_MAX', 10),
    'Too many failed sign-in attempts. Please wait 15 minutes and try again.',
    { skipSuccessfulRequests: true },
  ));
  // Endpoints that check the current password get the sign-in limit too, so
  // a stolen session can't be used to guess it.
  app.use(['/api/auth/password', '/api/auth/account'], limiter(
    FIFTEEN_MINUTES,
    intFromEnv('LOGIN_RATE_LIMIT_MAX', 10),
    'Too many wrong passwords. Please wait 15 minutes and try again.',
    { skipSuccessfulRequests: true },
  ));
  app.use('/api/auth/register', limiter(
    60 * 60 * 1000,
    intFromEnv('REGISTER_RATE_LIMIT_MAX', 10),
    'Too many accounts created from this network. Please try again later.',
  ));
  // The gym map calls a shared free service (OpenStreetMap data via Photon).
  app.use('/api/gyms', limiter(
    FIFTEEN_MINUTES,
    intFromEnv('GYMS_RATE_LIMIT_MAX', 100),
    'Too many gym searches. Please wait a few minutes and try again.',
  ));
  app.use('/api', limiter(
    FIFTEEN_MINUTES,
    intFromEnv('API_RATE_LIMIT_MAX', 1000),
    'Too many requests. Please slow down and try again shortly.',
  ));

  // ─── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/reviews', reviewsRoutes);
  app.use('/api/workouts', workoutsRoutes);
  app.use('/api/exercise-media', exerciseMediaRoutes);
  app.use('/api/exercise-library', exerciseLibraryRoutes);
  app.use('/api/articles', articlesRoutes);
  app.use('/api/favorites', favoritesRoutes);
  app.use('/api/custom-images', customImagesRoutes);
  app.use('/api/exercises', exercisesRoutes);
  app.use('/api/programs', programsRoutes);
  app.use('/api/enrollments', enrollmentsRoutes);
  app.use('/api/sessions', sessionsRoutes);
  app.use('/api/body-metrics', bodyMetricsRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/plan', planRoutes);
  app.use('/api/coach', coachRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/nutrition', nutritionRoutes);
  app.use('/api/integrations', integrationsRoutes);
  app.use('/api/health-data', healthDataRoutes);
  app.use('/api/social', socialRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/creator', creatorRoutes);
  app.use('/api/coaches', coachesRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/gyms', gymsRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: 'postgres', timestamp: new Date().toISOString() });
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

  return app;
}

module.exports = { createApp };
