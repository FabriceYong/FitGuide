/**
 * Personal plans: generate one from the user's answers, follow it as an
 * enrollment, and adjust it (rules-based, or one day at a time by the user or
 * the coach). A personal plan is a Program owned by the user.
 */
const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { PROFILE } = require('@fitguide/shared');
const { enrollmentStore, sessionStore } = require('../stores/records');
const { describeOne } = require('./enrollments');
const { generatePlan, adaptDirection, swapFor, equipmentOptions, allowedDifficulties, requiredEquipment } = require('./planGenerator');
const { addDays } = require('../utils/dates');

const LIMITS = { daysPerWeek: [1, 7], minutesPerSession: [10, 120], weeks: [1, 12] };

class PlanError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const catalog = () => prisma.workout.findMany({ where: { isPublished: true }, orderBy: { createdAt: 'asc' } });

async function options() {
  return {
    goals: PROFILE.GOALS,
    levels: PROFILE.FITNESS_LEVELS,
    equipment: equipmentOptions(await catalog()),
    limits: LIMITS,
  };
}

/** The user's active enrollment if it follows one of their personal plans. */
async function activePersonal(userId) {
  const [active] = await enrollmentStore.list(userId, { where: { status: 'active' } });
  if (!active) return null;
  const program = await prisma.program.findFirst({ where: { slug: active.programSlug, ownerId: String(userId) } });
  return program ? { enrollment: active, program } : null;
}

async function current(userId, todayYmd) {
  const found = await activePersonal(userId);
  return found ? describeOne(userId, found.enrollment.id, todayYmd) : null;
}

/**
 * Generate a plan and start it, ending any program the user is following.
 * @param {object} input  { goal, level, daysPerWeek, minutesPerSession, equipment, weeks, startDate? }
 */
async function create(userId, input, todayYmd) {
  const { days, warnings } = generatePlan(input, await catalog());
  if (!days.length) throw new PlanError(warnings[0] || 'Could not build a plan from those answers.', 422);

  const startDate = input.startDate || todayYmd;
  const generatedFrom = {
    goal: input.goal,
    level: input.level,
    daysPerWeek: input.daysPerWeek,
    minutesPerSession: input.minutesPerSession,
    equipment: input.equipment,
  };
  const program = await prisma.program.create({
    data: {
      slug: `plan-${crypto.randomBytes(6).toString('hex')}`,
      title: `Your ${input.goal.toLowerCase()} plan`,
      description: `${input.weeks} weeks, ${input.daysPerWeek} days a week, up to about ${input.minutesPerSession} minutes a session, built for your ${input.level.toLowerCase()} level and equipment.`,
      level: input.level,
      goal: input.goal,
      weeks: input.weeks,
      daysPerWeek: input.daysPerWeek,
      isPublished: false,
      ownerId: String(userId),
      generatedFrom,
      days: { create: days },
    },
  });

  const [active] = await enrollmentStore.list(userId, { where: { status: 'active' } });
  if (active) {
    await enrollmentStore.update(userId, active.id, (e) => {
      e.status = 'abandoned';
      e.endedAt = new Date();
    });
  }
  const enrollment = await enrollmentStore.create(userId, { programSlug: program.slug, startDate, status: 'active', completedDays: [] });
  return { plan: await describeOne(userId, enrollment.id, todayYmd), warnings };
}

/** Workouts that suit the plan's level and equipment. */
async function candidatesFor(program) {
  const from = program.generatedFrom || {};
  const have = new Set(from.equipment || []);
  const difficulties = allowedDifficulties(from.level || program.level);
  return (await catalog()).filter((w) => difficulties.has(w.difficulty) && requiredEquipment(w).every((e) => have.has(e)));
}

/** Days of the plan that haven't been done and aren't in the past. */
function openDays(described, todayYmd) {
  return described.schedule.filter((d) => d.status !== 'done' && d.date >= todayYmd);
}

/**
 * How the rest of a personal plan would get easier or harder from recent
 * effort and adherence, without changing anything. Each change has the day's
 * date and the workout before and after.
 */
async function proposeAdaptation(found, described, todayYmd, tzOffset) {
  const since = new Date(`${addDays(todayYmd, -14)}T00:00:00Z`).getTime() + tzOffset * 60 * 1000;
  const recent = (await sessionStore.list(found.enrollment.userId, { sortField: 'completedAt', limit: 50 }))
    .filter((s) => new Date(s.completedAt).getTime() >= since);
  const { direction, reason } = adaptDirection(recent, described.adherencePct);
  if (direction === 'keep') return { direction, reason, changes: [] };

  const candidates = await candidatesFor(found.program);
  const bySlug = new Map((await catalog()).map((w) => [w.slug, w]));
  const changes = [];
  for (const day of openDays(described, todayYmd)) {
    const currentWorkout = bySlug.get(day.workoutSlug);
    const replacement = currentWorkout && swapFor(currentWorkout, direction, candidates);
    if (!replacement) continue;
    changes.push({
      week: day.week,
      day: day.day,
      date: day.date,
      from: currentWorkout.slug,
      to: replacement.slug,
      title: day.title,
      newTitle: day.title.replace(/:.*$/, `: ${replacement.title}`),
    });
  }
  return { direction, reason, changes };
}

/** Put the proposed workouts on the plan's days. */
async function applySwaps(programId, changes) {
  for (const c of changes) {
    await prisma.programDay.update({
      where: { programId_week_day: { programId, week: c.week, day: c.day } },
      data: { workoutSlug: c.to, title: c.newTitle },
    });
  }
}

/**
 * Make the rest of the plan easier or harder from recent effort and
 * adherence. Returns what changed and why.
 */
async function adapt(userId, todayYmd, tzOffset) {
  const found = await activePersonal(userId);
  if (!found) throw new PlanError('You are not following a personal plan.', 404);
  const described = await describeOne(userId, found.enrollment.id, todayYmd);
  const { direction, reason, changes } = await proposeAdaptation(found, described, todayYmd, tzOffset);
  if (direction === 'keep') return { direction, reason, changes: [], plan: described };
  await applySwaps(found.program.id, changes);
  return {
    direction,
    reason,
    changes: changes.map(({ week, day, from, to }) => ({ week, day, from, to })),
    plan: await describeOne(userId, found.enrollment.id, todayYmd),
  };
}

/** Put a different workout on one open day of the user's plan. */
async function swapDay(userId, { week, day, workoutSlug }, todayYmd) {
  const found = await activePersonal(userId);
  if (!found) throw new PlanError('You are not following a personal plan.', 404);
  const described = await describeOne(userId, found.enrollment.id, todayYmd);
  const target = described.schedule.find((d) => d.week === week && d.day === day);
  if (!target) throw new PlanError('That day is not part of your plan.', 404);
  if (target.status === 'done') throw new PlanError('That day is already done.', 409);
  const workout = await prisma.workout.findFirst({ where: { slug: String(workoutSlug), isPublished: true } });
  if (!workout) throw new PlanError('Workout not found.', 404);
  await prisma.programDay.update({
    where: { programId_week_day: { programId: found.program.id, week, day } },
    data: { workoutSlug: workout.slug, title: target.title.replace(/:.*$/, `: ${workout.title}`) },
  });
  return describeOne(userId, found.enrollment.id, todayYmd);
}

module.exports = { LIMITS, PlanError, options, current, create, activePersonal, proposeAdaptation, applySwaps, adapt, swapDay };
