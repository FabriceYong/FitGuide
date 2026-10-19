/**
 * Load the catalog (workouts, exercises, programs) from the seed files into
 * the database. Safe to re-run: rows are upserted by slug, so user data that
 * points at a slug (favorites, sessions, enrollments) keeps working, and view
 * and like counts are left alone.
 */
const { prisma } = require('../db/prisma');
const workoutsData = require('./workoutSeeder');
const exercisesData = require('./exerciseSeeder');
const programsData = require('./programSeeder');

const WORKOUT_FIELDS = [
  'title', 'description', 'shortDescription', 'category', 'difficulty', 'duration', 'calories', 'intensity',
  'equipment', 'targetMuscles', 'benefits', 'steps', 'thumbnailUrl', 'videoUrl', 'imageGallery', 'tags',
  'prerequisites', 'cautions', 'modifications', 'restPeriod', 'sets', 'reps',
];
const EXERCISE_FIELDS = [
  'name', 'aliases', 'category', 'trackingType', 'primaryMuscles', 'equipment', 'instructions', 'formCues', 'commonMistakes',
];
const PROGRAM_FIELDS = ['title', 'description', 'level', 'goal', 'weeks', 'daysPerWeek'];

const pick = (source, keys) => Object.fromEntries(keys.filter((k) => source[k] !== undefined).map((k) => [k, source[k]]));

// Seed order is display order: give each new row a createdAt one ms apart.
const BASE_TIME = Date.UTC(2026, 0, 1);
const createdAt = (index) => new Date(BASE_TIME + index);

async function seedCatalog() {
  for (const [i, w] of workoutsData.entries()) {
    const data = pick(w, WORKOUT_FIELDS);
    await prisma.workout.upsert({
      where: { slug: w.slug },
      create: { ...data, slug: w.slug, createdAt: createdAt(i) },
      update: data,
    });
  }

  for (const [i, e] of exercisesData.entries()) {
    const data = pick(e, EXERCISE_FIELDS);
    await prisma.exercise.upsert({
      where: { slug: e.slug },
      create: { ...data, slug: e.slug, createdAt: createdAt(i) },
      update: data,
    });
  }

  for (const [i, p] of programsData.entries()) {
    const data = pick(p, PROGRAM_FIELDS);
    const days = p.days.map((d) => pick(d, ['week', 'day', 'title', 'workoutSlug', 'notes']));
    await prisma.$transaction(async (tx) => {
      const program = await tx.program.upsert({
        where: { slug: p.slug },
        create: { ...data, slug: p.slug, createdAt: createdAt(i) },
        update: data,
      });
      await tx.programDay.deleteMany({ where: { programId: program.id } });
      await tx.programDay.createMany({ data: days.map((d) => ({ ...d, programId: program.id })) });
    });
  }

  return { workouts: workoutsData.length, exercises: exercisesData.length, programs: programsData.length };
}

/** Seed only when the catalog is empty (first start against a new database). */
async function seedCatalogIfEmpty() {
  if (await prisma.workout.count()) return null;
  return seedCatalog();
}

module.exports = { seedCatalog, seedCatalogIfEmpty };
