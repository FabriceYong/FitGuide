/**
 * Test environment. Must be required before any app module, because some of
 * them read process.env when loaded (mockDb's file path, the uploads dir).
 *
 * Tests never read fitguide_api/.env (which points at a real database): dotenv
 * is only loaded by server.js, and MONGODB_URI is overwritten here.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fitguide-test-'));

Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret-that-is-long-enough-for-validation-0123456789',
  // Unroutable; only the in-memory server's URI is ever connected to.
  MONGODB_URI: 'mongodb://127.0.0.1:1/never-used',
  MOCK_DB_PATH: path.join(tmpRoot, 'mock_db_data.json'),
  UPLOADS_DIR: path.join(tmpRoot, 'uploads'),
  CORS_ORIGINS: 'http://localhost:3000',
  LOGIN_RATE_LIMIT_MAX: '10000',
  REGISTER_RATE_LIMIT_MAX: '10000',
  API_RATE_LIMIT_MAX: '100000',
  RSS2JSON_API_KEY: 'test-rss-key',
  ENABLE_DEV_ROUTES: 'false',
});
delete process.env.WORKOUTX_API_KEY;
delete process.env.TRUST_PROXY;

const mongoose = require('mongoose');
const { createApp } = require('../../app');

/**
 * Put the stores in the requested database mode.
 * @param {'mock' | 'mongo'} mode
 * @returns {Promise<() => Promise<void>>} teardown
 */
async function useDatabase(mode) {
  if (mode === 'mock') {
    process.env.MOCK_DB = 'true';
    return async () => {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    };
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');
  const Workout = require('../../models/Workout');
  const User = require('../../models/User');
  const seedWorkouts = require('../../seed/workoutSeeder');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const { hostname } = new URL(uri);
  if (!['127.0.0.1', 'localhost'].includes(hostname)) {
    throw new Error(`Refusing to run tests against a non-local database: ${hostname}`);
  }
  await mongoose.connect(uri);
  process.env.MOCK_DB = 'false';
  // Seed the collection so workouts are served by the Mongo code path rather
  // than the seed-data fallback.
  await Workout.insertMany(seedWorkouts);
  await User.init(); // build the unique email index

  return async () => {
    await mongoose.disconnect();
    await mongod.stop();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
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
