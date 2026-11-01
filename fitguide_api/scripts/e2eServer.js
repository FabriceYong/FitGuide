/**
 * API for the web app's end-to-end tests: a throwaway embedded Postgres,
 * migrated and loaded with the catalog, then the API on E2E_API_PORT.
 * Never reads .env; everything it needs is set here. Emails aren't sent:
 * GET http://127.0.0.1:<E2E_MAIL_PORT>/?to=<address> returns the latest one.
 * Browser reminders get a throwaway key pair and are never actually pushed.
 * Barcode lookups go to a stand-in for Open Food Facts on the same port,
 * which knows one product (OFF_PRODUCT).
 * An approved coach (E2E_COACH) has one published program, COACH_PROGRAM.
 */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { freePort, startEmbeddedPostgres, migrateDeploy } = require('../db/embedded');

const API_PORT = Number(process.env.E2E_API_PORT) || 5055;
const WEB_ORIGIN = process.env.E2E_WEB_ORIGIN || 'http://localhost:3055';
const MAIL_PORT = Number(process.env.E2E_MAIL_PORT) || 5056;

const OFF_PRODUCT = {
  code: '3017620422003',
  product_name: 'Hazelnut spread',
  brands: 'Nutella',
  serving_size: '15 g',
  nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9, 'energy-kcal_serving': 81, proteins_serving: 0.9, carbohydrates_serving: 8.6, fat_serving: 4.6 },
};

// Test-only account; e2e/helpers.ts signs in with it.
const E2E_COACH = { name: 'Casey Coach', email: 'coach@e2e.test', password: 'e2e-coach-password-123' };
const COACH_PROGRAM = 'e2e-coach-club';

/** The coach and their program, for the coach tools tests. */
async function seedCoach() {
  const bcrypt = require('bcryptjs');
  const { prisma } = require('../db/prisma');
  const coach = await prisma.user.create({
    data: {
      name: E2E_COACH.name,
      email: E2E_COACH.email,
      passwordHash: await bcrypt.hash(E2E_COACH.password, 4),
      emailVerifiedAt: new Date(),
      role: 'creator',
      coachProfile: { create: { status: 'approved', bio: 'Coach for the end-to-end tests.', contactEmail: E2E_COACH.email } },
    },
  });
  const workout = await prisma.workout.findFirst({ where: { isPublished: true }, orderBy: { createdAt: 'asc' } });
  await prisma.program.create({
    data: {
      slug: COACH_PROGRAM,
      title: 'Coach Club',
      description: 'Two sessions a week with Casey.',
      level: 'Beginner',
      goal: 'Get moving',
      weeks: 2,
      daysPerWeek: 2,
      creatorId: coach.id,
      days: { create: [1, 2].flatMap((week) => [1, 4].map((day) => ({ week, day, title: workout.title, workoutSlug: workout.slug }))) },
    },
  });
}

/** Keep emails in memory and serve the latest one per recipient; and the Open Food Facts stand-in. */
function startMailbox() {
  const sent = [];
  require('../services/mailer').setTransport({ sendMail: async (message) => { sent.push(message); } });
  http.createServer((req, res) => {
    const product = /^\/off\/api\/v2\/product\/(\d+)\.json/.exec(req.url);
    if (product) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(product[1] === OFF_PRODUCT.code ? { status: 1, product: OFF_PRODUCT } : { status: 0 }));
      return;
    }
    const to = new URL(req.url, 'http://mailbox').searchParams.get('to');
    const mail = sent.filter((m) => m.to === to).at(-1);
    res.writeHead(mail ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mail || null));
  }).listen(MAIL_PORT, '127.0.0.1');
}

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
    OFF_API_BASE: `http://127.0.0.1:${MAIL_PORT}/off`,
  });
  const vapid = require('web-push').generateVAPIDKeys();
  Object.assign(process.env, { VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey });
  require('../services/reminders').setSender(async () => {});
  for (const key of ['STRIPE_SECRET_KEY', 'ANTHROPIC_API_KEY', 'STRAVA_CLIENT_ID', 'FITBIT_CLIENT_ID']) delete process.env[key];

  await require('../seed/catalog').seedCatalog();
  await seedCoach();
  startMailbox();

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
