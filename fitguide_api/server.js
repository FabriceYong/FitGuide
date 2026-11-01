require('dotenv').config();
const { getSecret } = require('./utils/jwt');

// Fail fast on missing configuration instead of running with insecure defaults.
try {
  getSecret();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be set (see .env.example).');
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}

const { createApp } = require('./app');
const { prisma } = require('./db/prisma');
const { seedCatalogIfEmpty } = require('./seed/catalog');
const { promoteConfiguredAdmins } = require('./services/admins');
const reminders = require('./services/reminders');

const PORT = process.env.PORT || 5001;

async function start() {
  try {
    await prisma.$connect();
    const seeded = await seedCatalogIfEmpty();
    if (seeded) console.log(`🌱 Catalog loaded: ${seeded.workouts} workouts, ${seeded.exercises} exercises, ${seeded.programs} programs, ${seeded.foods} foods.`);
    const admins = await promoteConfiguredAdmins();
    if (admins.promoted.length) console.log(`🔑 Now admin (ADMIN_EMAILS): ${admins.promoted.join(', ')}`);
    if (admins.missing.length) console.log(`⚠️  ADMIN_EMAILS: no account yet for ${admins.missing.join(', ')}. Sign up, then restart the API.`);
  } catch (err) {
    console.error('❌ Could not use the database:', err.message);
    console.error('   Start one with `npm run db:dev` (or Docker), then `npm run db:deploy`.');
    process.exit(1);
  }

  const server = createApp().listen(PORT, () => {
    console.log(`🚀 FitGuide API running on http://localhost:${PORT}`);
  });
  // Browser reminders need VAPID keys; the app schedules its own either way.
  if (reminders.isConfigured()) reminders.start();
  else console.log('🔕 Browser reminders are off: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (npm run vapid-keys).');

  const shutdown = () => server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
