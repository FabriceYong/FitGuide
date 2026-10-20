/**
 * API for the web app's end-to-end tests: a throwaway embedded Postgres,
 * migrated and loaded with the catalog, then the API on E2E_API_PORT.
 * Never reads .env; everything it needs is set here.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { freePort, startEmbeddedPostgres, migrateDeploy } = require('../db/embedded');

const API_PORT = Number(process.env.E2E_API_PORT) || 5055;
const WEB_ORIGIN = process.env.E2E_WEB_ORIGIN || 'http://localhost:3055';

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fitguide-e2e-'));
  const db = await startEmbeddedPostgres({ dir: path.join(dir, 'pg'), port: await freePort(), database: 'fitguide_e2e', persistent: false });
  migrateDeploy(db.url);

  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: String(API_PORT),
    DATABASE_URL: db.url,
    JWT_SECRET: 'e2e-secret-that-is-long-enough-for-validation-0123456789',
    CORS_ORIGINS: WEB_ORIGIN,
    WEB_APP_URL: WEB_ORIGIN,
    UPLOADS_DIR: path.join(dir, 'uploads'),
    LOGIN_RATE_LIMIT_MAX: '1000',
    REGISTER_RATE_LIMIT_MAX: '1000',
    API_RATE_LIMIT_MAX: '100000',
  });
  for (const key of ['STRIPE_SECRET_KEY', 'ANTHROPIC_API_KEY', 'STRAVA_CLIENT_ID', 'FITBIT_CLIENT_ID']) delete process.env[key];

  await require('../seed/catalog').seedCatalog();

  const stop = async () => {
    await db.stop().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  // server.js connects with Prisma (seeding is skipped: the catalog is loaded) and listens.
  require('../server');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
