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

const PORT = process.env.PORT || 5001;

async function start() {
  try {
    await prisma.$connect();
    const seeded = await seedCatalogIfEmpty();
    if (seeded) console.log(`🌱 Empty catalog: loaded ${seeded.workouts} workouts, ${seeded.exercises} exercises, ${seeded.programs} programs.`);
  } catch (err) {
    console.error('❌ Could not use the database:', err.message);
    console.error('   Start one with `npm run db:dev` (or Docker), then `npm run db:deploy`.');
    process.exit(1);
  }

  const server = createApp().listen(PORT, () => {
    console.log(`🚀 FitGuide API running on http://localhost:${PORT}`);
  });

  const shutdown = () => server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
