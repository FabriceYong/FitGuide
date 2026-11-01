/**
 * Members' own workouts, made in the workout builder. A member lists
 * exercises, each with sets of reps or of a time, and can pair an exercise
 * with the next one as a superset (no rest between them). The builder's
 * answers become an ordinary workout that only its owner sees, with one
 * step per set, so the player, "last time" and set logging work as for any
 * other workout.
 */
const crypto = require('crypto');
const { z } = require('zod');
const { CATALOG } = require('@fitguide/shared');
const { prisma } = require('../db/prisma');
const { validate } = require('../schemas/records');
const { exerciseStore } = require('../stores/records');
const workoutStore = require('../stores/workoutStore');

const MAX_WORKOUTS = 100;
// Rough time per rep, for the workout's length.
const SECONDS_PER_REP = 4;

class MyWorkoutError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const exercise = z.object({
  name: z.string().trim().min(1).max(100),
  sets: z.number().int().min(1).max(10),
  // "10" or a range "8-10"
  reps: z.string().trim().regex(/^\d{1,3}(\s*[–-]\s*\d{1,3})?$/, 'reps must be a number or a range like 8-10').nullish(),
  seconds: z.number().int().min(5).max(600).nullish(),
  weighted: z.boolean().default(false),
  // Go straight on to the next exercise (a superset), resting after both.
  supersetNext: z.boolean().default(false),
}).refine((e) => Boolean(e.reps) !== Boolean(e.seconds), { message: 'give either reps or seconds' });

const input = z.object({
  title: z.string().trim().min(3).max(100),
  category: z.enum(CATALOG.WORKOUT_CATEGORIES).default('Strength'),
  restSec: z.number().int().min(15).max(300).default(90),
  exercises: z.array(exercise).min(1).max(30),
});

const repsText = (reps) => reps.replace(/\s*[–-]\s*/, '–');
const topReps = (reps) => Number(reps.split(/[–-]/).pop());

/** Exercises linked by supersetNext, in order: [[a], [b, c], …]. */
function groupsOf(exercises) {
  const groups = [];
  let current = [];
  exercises.forEach((e, i) => {
    current.push(e);
    if (!e.supersetNext || i === exercises.length - 1) {
      groups.push(current);
      current = [];
    }
  });
  return groups;
}

/**
 * One step per set. A superset goes round its exercises set by set (A1, B1,
 * A2, B2…), resting only after each round.
 */
function buildSteps(exercises) {
  const steps = [];
  for (const group of groupsOf(exercises)) {
    const rounds = Math.max(...group.map((e) => e.sets));
    for (let round = 1; round <= rounds; round += 1) {
      const inRound = group.filter((e) => e.sets >= round);
      inRound.forEach((e, i) => {
        const target = e.reps ? `${repsText(e.reps)} reps` : `${e.seconds} seconds`;
        const setText = e.sets > 1 ? ` — Set ${round} of ${e.sets}` : '';
        steps.push({
          stepNumber: steps.length + 1,
          instruction: `${e.name}${setText} (${target})`,
          exerciseName: e.name,
          ...(e.seconds && { duration: e.seconds }),
          ...(i < inRound.length - 1 && { restAfter: false }),
        });
      });
    }
  }
  return steps;
}

/** Minutes, counting a few seconds a rep and the rests. */
function estimateMinutes(steps, restSec) {
  let seconds = 0;
  steps.forEach((step, i) => {
    const reps = /\((\d+)(?:–(\d+))? reps\)$/.exec(step.instruction);
    seconds += step.duration || (reps ? topReps(reps[2] || reps[1]) * SECONDS_PER_REP : 30);
    if (i < steps.length - 1 && step.restAfter !== false) seconds += restSec;
  });
  return Math.max(1, Math.round(seconds / 60));
}

/** The workout's fields from the builder's answers. */
async function fieldsFrom(answers) {
  const library = await exerciseStore.all();
  const matches = answers.exercises.map((e) => exerciseStore.matchExercise(e.name, library));
  const weighted = answers.exercises.map((e, i) => (e.weighted ? matches[i] : null)).filter(Boolean);
  // Equipment makes the player ask for a weight on each set.
  const equipment = answers.exercises.some((e) => e.weighted)
    ? [...new Set(weighted.flatMap((m) => m.equipment).filter((e) => !/^(none|body ?weight)$/i.test(e)))]
    : [];
  const steps = buildSteps(answers.exercises);
  const minutes = estimateMinutes(steps, answers.restSec);
  const names = answers.exercises.map((e) => e.name);
  const more = names.length > 3 ? ` and ${names.length - 3} more` : '';
  return {
    title: answers.title,
    description: `Your own workout: ${names.slice(0, 3).join(', ')}${more}. About ${minutes} minutes.`,
    shortDescription: `${names.length} exercise${names.length === 1 ? '' : 's'} · about ${minutes} min`,
    category: answers.category,
    difficulty: 'All Levels',
    duration: minutes,
    equipment: equipment.length || !answers.exercises.some((e) => e.weighted) ? equipment : ['Weights'],
    targetMuscles: [...new Set(matches.filter(Boolean).flatMap((m) => m.primaryMuscles))].slice(0, 10),
    steps,
    restPeriod: answers.restSec,
    builtFrom: answers,
  };
}

const slugFor = (title) => `my-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'workout'}-${crypto.randomBytes(3).toString('hex')}`;

/** A member's workout as clients see it, with what the builder needs to edit it. */
async function present(workout) {
  const [shown] = await workoutStore.toPublic([workout]);
  return { ...shown, builtFrom: workout.builtFrom, updatedAt: workout.updatedAt };
}

async function list(userId) {
  const workouts = await prisma.workout.findMany({ where: { ownerId: String(userId) }, orderBy: { updatedAt: 'desc' } });
  return Promise.all(workouts.map(present));
}

async function get(userId, slug) {
  const workout = await prisma.workout.findFirst({ where: { slug: String(slug), ownerId: String(userId) } });
  return workout ? present(workout) : null;
}

async function create(userId, body) {
  const answers = validate(input, body);
  if (await prisma.workout.count({ where: { ownerId: String(userId) } }) >= MAX_WORKOUTS) {
    throw new MyWorkoutError(`You can keep up to ${MAX_WORKOUTS} workouts. Delete one to make another.`, 409);
  }
  const workout = await prisma.workout.create({
    data: { ...await fieldsFrom(answers), slug: slugFor(answers.title), ownerId: String(userId), status: 'private', isPublished: false, isPremium: false },
  });
  return present(workout);
}

async function update(userId, slug, body) {
  const answers = validate(input, body);
  const { count } = await prisma.workout.updateMany({ where: { slug: String(slug), ownerId: String(userId) }, data: await fieldsFrom(answers) });
  return count ? get(userId, slug) : null;
}

/** Past sessions keep the workout's title; only the workout goes. */
async function remove(userId, slug) {
  const { count } = await prisma.workout.deleteMany({ where: { slug: String(slug), ownerId: String(userId) } });
  return count > 0;
}

module.exports = { MyWorkoutError, buildSteps, estimateMinutes, list, get, create, update, remove };
