/**
 * npm run db:dev — run a local Postgres for development without Docker.
 * Data lives in fitguide_api/.devdb (git-ignored). Applies migrations, loads
 * the catalog on first run, prints the DATABASE_URL to put in .env, and keeps
 * running until Ctrl+C.
 */
const path = require('path');
const { startEmbeddedPostgres, migrateDeploy } = require('../db/embedded');

const PORT = Number(process.env.DEV_DB_PORT) || 5433;

async function main() {
  const db = await startEmbeddedPostgres({ dir: path.join(__dirname, '..', '.devdb'), port: PORT });
  migrateDeploy(db.url);
  process.env.DATABASE_URL = db.url;
  const { seedCatalogIfEmpty } = require('../seed/catalog');
  const { prisma } = require('../db/prisma');
  const seeded = await seedCatalogIfEmpty();
  if (seeded) console.log(`Loaded ${seeded.workouts} workouts, ${seeded.exercises} exercises, ${seeded.programs} programs, ${seeded.foods} foods.`);
  await prisma.$disconnect();

  console.log('Postgres is running. In fitguide_api/.env set:');
  console.log(`  DATABASE_URL=${db.url}`);
  console.log('Press Ctrl+C to stop.');

  const stop = async () => {
    await db.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  // Keep the process alive while Postgres runs.
  setInterval(() => {}, 60 * 60 * 1000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
