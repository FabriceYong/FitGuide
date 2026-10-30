/**
 * Writing catalog programs and coach workouts, shared by the admin CMS and
 * the creator studio.
 */
const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { schemas } = require('../schemas/catalog');
const { validate } = require('../schemas/records');
const { matchDemo, publicDemo } = require('../utils/exerciseDemos');

class CatalogError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const slugify = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'program';

/**
 * Validate a program and check every day points at a published workout, or
 * at one of the coach's own workouts (which must be published before the
 * program can be).
 */
async function checkProgram(input, { creatorId = null } = {}) {
  const program = validate(schemas.program, input);
  const slugs = [...new Set(program.days.map((d) => d.workoutSlug))];
  const usable = creatorId ? { OR: [{ isPublished: true }, { creatorId }] } : { isPublished: true };
  const found = await prisma.workout.findMany({ where: { slug: { in: slugs }, ...usable }, select: { slug: true } });
  const missing = slugs.filter((s) => !found.some((w) => w.slug === s));
  if (missing.length) throw new CatalogError(`Unknown workouts: ${missing.join(', ')}`);
  return program;
}

/** Slugs of a program's workouts that aren't in the catalog yet. */
async function unpublishedWorkouts(programId) {
  const days = await prisma.programDay.findMany({ where: { programId }, select: { workoutSlug: true } });
  const slugs = [...new Set(days.map((d) => d.workoutSlug))];
  const published = await prisma.workout.findMany({ where: { slug: { in: slugs }, isPublished: true }, select: { slug: true } });
  return slugs.filter((s) => !published.some((w) => w.slug === s));
}

const include = { days: { orderBy: [{ week: 'asc' }, { day: 'asc' }] }, creator: { select: { id: true, name: true } } };

function toPublic({ id: _id, ownerId: _o, generatedFrom: _g, days, creator, ...p }) {
  return {
    ...p,
    creator: creator ? { id: creator.id, name: creator.name } : null,
    days: days.map(({ id: _d, programId: _p, ...d }) => d),
  };
}

async function createProgram(input, { creatorId = null, status }) {
  const { days, ...fields } = await checkProgram(input, { creatorId });
  const created = await prisma.program.create({
    data: {
      ...fields,
      slug: `${slugify(fields.title)}-${crypto.randomBytes(3).toString('hex')}`,
      creatorId,
      status,
      isPublished: status === 'published',
      days: { create: days },
    },
    include,
  });
  return toPublic(created);
}

/** Replace a program's details and schedule. */
async function updateProgram(slug, input, extra = {}) {
  const program = await prisma.program.findUnique({ where: { slug } });
  if (!program) throw new CatalogError('Program not found.', 404);
  const { days, ...fields } = await checkProgram(input, { creatorId: program.creatorId });
  const updated = await prisma.$transaction(async (tx) => {
    await tx.programDay.deleteMany({ where: { programId: program.id } });
    return tx.program.update({
      where: { id: program.id },
      data: { ...fields, ...extra, days: { create: days } },
      include,
    });
  });
  return toPublic(updated);
}

// ─── Coach workouts ──────────────────────────────────────────────────────────

/**
 * Steps without a picture of their own get a demonstration automatically:
 * the same freely licensed pictures (and, in the app, drawings) the catalog
 * uses, matched from the step's exercise name or instruction. Naming the
 * matched movement on the step keeps every client on the same match.
 */
function withDemoNames(steps) {
  return steps.map((step) => {
    if (step.gifUrl || step.imageUrl || step.exerciseName) return step;
    const demo = matchDemo('', step.instruction);
    return demo ? { ...step, exerciseName: demo.name } : step;
  });
}

/** Each step's demonstration as clients will show it (null when none fits). */
const stepDemos = (steps, apiBase) => steps.map((step) => (step.gifUrl || step.imageUrl
  ? { name: step.exerciseName || null, media: { source: 'own', frames: [step.gifUrl || step.imageUrl] } }
  : publicDemo(matchDemo(step.exerciseName, step.instruction), apiBase)));

/** A coach workout for the studio, with each step's demonstration. */
function workoutForStudio({ id: _id, creatorId: _c, ...w }, apiBase) {
  return { ...w, demos: stepDemos(w.steps || [], apiBase) };
}

/** Validate a coach's workout. Coaches don't set catalog flags; review does. */
function checkWorkout(input, slug) {
  const { isPublished: _p, isPremium: _m, ...fields } = validate(schemas.workout, { ...input, slug });
  return { ...fields, steps: withDemoNames(fields.steps) };
}

async function createWorkout(input, { creatorId }) {
  const slug = `${slugify(String(input?.title || 'workout'))}-${crypto.randomBytes(3).toString('hex')}`;
  return prisma.workout.create({
    data: { ...checkWorkout(input, slug), creatorId, status: 'draft', isPublished: false, isPremium: false },
  });
}

async function updateWorkout(slug, input) {
  const { slug: _s, ...data } = checkWorkout(input, slug);
  return prisma.workout.update({ where: { slug }, data: { ...data, status: 'draft' } });
}

module.exports = {
  CatalogError, checkProgram, unpublishedWorkouts, createProgram, updateProgram, toPublic, include,
  withDemoNames, workoutForStudio, createWorkout, updateWorkout,
};
