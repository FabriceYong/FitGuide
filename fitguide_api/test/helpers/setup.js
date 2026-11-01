/**
 * Test environment. Must be required before any app module, because some of
 * them read process.env when loaded (the uploads dir).
 *
 * Tests never read fitguide_api/.env (which may point at a real database):
 * dotenv is only loaded by server.js, and DATABASE_URL is set here to a
 * throwaway embedded Postgres.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fitguide-test-'));

Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret-that-is-long-enough-for-validation-0123456789',
  // Unroutable until useDatabase() points it at the test server.
  DATABASE_URL: 'postgresql://nobody:none@127.0.0.1:1/never-used',
  UPLOADS_DIR: path.join(tmpRoot, 'uploads'),
  CORS_ORIGINS: 'http://localhost:3000',
  LOGIN_RATE_LIMIT_MAX: '10000',
  REGISTER_RATE_LIMIT_MAX: '10000',
  RESET_RATE_LIMIT_MAX: '10000',
  API_RATE_LIMIT_MAX: '100000',
  RSS2JSON_API_KEY: 'test-rss-key',
  ENABLE_DEV_ROUTES: 'false',
});
for (const key of ['WORKOUTX_API_KEY', 'TRUST_PROXY', 'STORAGE_DRIVER', 'S3_BUCKET', 'ANTHROPIC_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SMTP_URL', 'WEB_APP_URL']) {
  delete process.env[key];
}

const { createApp } = require('../../app');

/**
 * Start a private Postgres for this test process, migrate it and load the
 * catalog.
 * @returns {Promise<() => Promise<void>>} teardown
 */
async function useDatabase() {
  const { freePort, startEmbeddedPostgres, migrateDeploy } = require('../../db/embedded');
  const db = await startEmbeddedPostgres({
    dir: path.join(tmpRoot, 'pg'),
    port: await freePort(),
    database: 'fitguide_test',
    persistent: false,
  });
  const { hostname } = new URL(db.url);
  if (hostname !== '127.0.0.1') throw new Error(`Refusing to run tests against a non-local database: ${hostname}`);
  // On Windows every Postgres connection is a new process, so connecting can
  // be slow while other test files run; allow more than Prisma's 5 s default.
  process.env.DATABASE_URL = `${db.url}&connection_limit=5&connect_timeout=30&pool_timeout=30`;
  const { prisma } = require('../../db/prisma');
  try {
    migrateDeploy(db.url);
    await require('../../seed/catalog').seedCatalog();
  } catch (err) {
    await db.stop();
    throw err;
  }

  return async () => {
    await prisma.$disconnect();
    await db.stop();
    // Postgres may still be releasing its files for a moment after stop().
    fs.rmSync(tmpRoot, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  };
}

/** Create an app with some env overrides applied only while it is built. */
function createAppWith(overrides = {}) {
  const saved = Object.fromEntries(Object.keys(overrides).map((k) => [k, process.env[k]]));
  Object.assign(process.env, overrides);
  try {
    return createApp();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

module.exports = { createApp, createAppWith, useDatabase, tmpRoot };
