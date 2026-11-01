/**
 * npm run db:seed            Load workouts, exercises and programs.
 * npm run db:seed -- --demo  Also create demo@fitguide.com / demo123
 *                            (never on a production database).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { prisma } = require('../db/prisma');
const { seedCatalog } = require('./catalog');

async function seedDemoUser() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to create the demo account in production.');
  const email = 'demo@fitguide.com';
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Demo User',
      passwordHash: await bcrypt.hash('demo123', 12),
      emailVerifiedAt: new Date(),
      gender: 'Male',
      height: 178,
      weight: 75,
      targetWeight: 72,
      fitnessLevel: 'Intermediate',
      goal: 'Vitality',
    },
  });
  console.log(`Demo account ready: ${email} / demo123`);
}

async function main() {
  const counts = await seedCatalog();
  console.log(`Catalog loaded: ${counts.workouts} workouts, ${counts.exercises} exercises, ${counts.programs} programs.`);
  if (process.argv.includes('--demo')) await seedDemoUser();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
