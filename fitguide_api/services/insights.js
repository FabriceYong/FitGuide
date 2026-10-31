/**
 * Short, personal notes from Claude about the member's own numbers:
 * - feedback after a saved workout (how it compares with last time, and one
 *   thing to try next time);
 * - a weekly check-in (workouts, steps, sleep and food over the last 7 days
 *   against the 7 before, what went well and one focus for the coming week,
 *   with an optional nudge to make the plan easier or harder).
 * Both are read-only: nothing is changed or stored.
 */
const { prisma } = require('../db/prisma');
const ai = require('./ai');
const plans = require('./plans');
const nutrition = require('./nutrition');
const healthData = require('./healthData');
const { addDays, localDate } = require('../utils/dates');

const TONE = `Write like an encouraging, honest coach: specific to the numbers, plain words, no hype, no emojis.
Never give medical advice; if something looks concerning (very high effort with pain, big sudden weight changes, very little sleep), suggest checking with a professional.`;

// ─── After a workout ─────────────────────────────────────────────────────────

const FEEDBACK_TOOL = {
  name: 'workout_feedback',
  description: 'Short feedback on the workout just finished.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string', description: 'Up to 8 words, e.g. "Faster than last time"' },
      notes: { type: 'array', items: { type: 'string' }, description: '1 or 2 sentences about this session compared with earlier ones' },
      nextTime: { type: 'string', description: 'One concrete thing to try next time' },
    },
    required: ['headline', 'notes', 'nextTime'],
    additionalProperties: false,
  },
};

const sessionFacts = (s, tzOffset) => ({
  date: localDate(s.completedAt, tzOffset),
  minutes: Math.round(s.durationSec / 60),
  calories: s.calories,
  stepsDone: `${s.stepsCompleted}/${s.totalSteps}`,
  effort: s.perceivedEffort,
  avgHr: s.avgHr,
  status: s.status,
  sets: s.sets?.filter((x) => x.reps != null || x.weightKg != null).slice(0, 15).map((x) => ({ exercise: x.exerciseName, reps: x.reps, kg: x.weightKg })),
});

async function workoutFeedback(user, sessionId, { tzOffset = 0 } = {}) {
  ai.getClient('Workout feedback');
  const session = await prisma.workoutSession.findFirst({ where: { id: String(sessionId), userId: user.id }, include: { sets: { orderBy: { position: 'asc' } } } });
  if (!session) throw new ai.AiError('Workout not found.', 404);
  await ai.spend(user, 'feedback');

  const [earlier, weekCount] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: user.id, workoutSlug: session.workoutSlug, id: { not: session.id }, completedAt: { lt: session.completedAt } },
      include: { sets: { orderBy: { position: 'asc' } } },
      orderBy: { completedAt: 'desc' },
      take: 3,
    }),
    prisma.workoutSession.count({ where: { userId: user.id, completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
  ]);
  const facts = {
    workout: session.workoutTitle,
    category: session.category,
    member: { goal: user.goal, level: user.fitnessLevel },
    thisSession: sessionFacts(session, tzOffset),
    earlierTimesThisWorkout: earlier.map((s) => sessionFacts(s, tzOffset)),
    workoutsInLast7Days: weekCount,
  };
  const answer = await ai.callTool({
    what: 'Workout feedback',
    system: `You give short feedback in FitGuide, a fitness app, right after a member saves a workout. Compare with their earlier sessions of the same workout when there are any; otherwise comment on this one. ${TONE}\nCall workout_feedback once.`,
    tool: FEEDBACK_TOOL,
    content: [{ type: 'text', text: JSON.stringify(facts) }],
    maxTokens: 1000,
    unreadable: "Feedback couldn't be written for this workout.",
  });
  return {
    feedback: {
      headline: String(answer.headline || '').slice(0, 80),
      notes: (Array.isArray(answer.notes) ? answer.notes : []).map((n) => String(n).slice(0, 300)).filter(Boolean).slice(0, 2),
      nextTime: String(answer.nextTime || '').slice(0, 300),
    },
    allowance: await ai.usage(user, 'feedback'),
  };
}

// ─── Weekly check-in ─────────────────────────────────────────────────────────

const CHECKIN_TOOL = {
  name: 'weekly_checkin',
  description: "The member's weekly check-in.",
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: '2 or 3 sentences on how the week went, using the numbers' },
      wins: { type: 'array', items: { type: 'string' }, description: '1 to 3 short things that went well' },
      focus: { type: 'string', description: 'One concrete focus for the coming week' },
      planChange: { type: ['string', 'null'], enum: ['easier', 'harder', 'keep', null], description: 'Only when they follow a plan: whether to make the rest of it easier, harder or keep it' },
    },
    required: ['summary', 'wins', 'focus', 'planChange'],
    additionalProperties: false,
  },
};

const avg = (values) => {
  const v = values.filter((n) => Number.isFinite(n));
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};

/** The numbers behind a check-in: this week and the one before. */
async function weekFacts(user, todayYmd, tzOffset) {
  const from = addDays(todayYmd, -13);
  const split = addDays(todayYmd, -6);
  const since = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const [sessions, plan, foodRows, health] = await Promise.all([
    prisma.workoutSession.findMany({ where: { userId: user.id, completedAt: { gte: since } }, orderBy: { completedAt: 'asc' } }),
    plans.current(user.id, todayYmd),
    prisma.foodLog.findMany({ where: { userId: user.id, date: { gte: from, lte: todayYmd } } }),
    healthData.summary(user.id, todayYmd, 14).catch(() => null),
  ]);
  const week = (inThisWeek) => {
    const s = sessions.filter((x) => { const d = localDate(x.completedAt, tzOffset); return d >= from && (inThisWeek ? d >= split : d < split); });
    const foodDays = new Map();
    for (const f of foodRows) if (inThisWeek ? f.date >= split : f.date < split) foodDays.set(f.date, (foodDays.get(f.date) || 0) + f.calories);
    const days = (health?.days || []).filter((d) => (inThisWeek ? d.date >= split : d.date < split && d.date >= from));
    return {
      workouts: s.length,
      minutes: Math.round(s.reduce((n, x) => n + x.durationSec, 0) / 60),
      averageEffort: avg(s.map((x) => x.perceivedEffort)),
      workoutNames: [...new Set(s.map((x) => x.workoutTitle))].slice(0, 6),
      daysFoodLogged: foodDays.size,
      averageCaloriesOnLoggedDays: avg([...foodDays.values()]),
      averageSteps: avg(days.map((d) => d.steps)),
      averageSleepMinutes: avg(days.map((d) => d.sleepMinutes)),
    };
  };
  const target = nutrition.targets(user);
  return {
    member: { goal: user.goal, level: user.fitnessLevel, daysPerWeekWanted: user.daysPerWeek, calorieTarget: target.calories },
    plan: plan ? { title: plan.programTitle, week: plan.currentWeek, of: plan.weeks, adherencePct: plan.adherencePct } : null,
    thisWeek: week(true),
    weekBefore: week(false),
  };
}

async function weeklyCheckin(user, { todayYmd, tzOffset = 0 }) {
  ai.getClient('The weekly check-in');
  await ai.spend(user, 'checkin');
  const facts = await weekFacts(user, todayYmd, tzOffset);
  const answer = await ai.callTool({
    what: 'The weekly check-in',
    system: `You write a member's weekly check-in in FitGuide, a fitness app, from their last 7 days compared with the 7 before (null means no data, not zero). Mention steps, sleep or food only when there's data. Suggest a plan change only when they follow a plan: easier if they're missing sessions or effort is very high, harder if they complete everything at low effort, otherwise keep. ${TONE}\nCall weekly_checkin once.`,
    tool: CHECKIN_TOOL,
    content: [{ type: 'text', text: JSON.stringify(facts) }],
    maxTokens: 1200,
    unreadable: "Your check-in couldn't be written right now.",
  });
  return {
    checkin: {
      summary: String(answer.summary || '').slice(0, 600),
      wins: (Array.isArray(answer.wins) ? answer.wins : []).map((w) => String(w).slice(0, 200)).filter(Boolean).slice(0, 3),
      focus: String(answer.focus || '').slice(0, 300),
      planChange: facts.plan && ['easier', 'harder', 'keep'].includes(answer.planChange) ? answer.planChange : null,
      week: { workouts: facts.thisWeek.workouts, minutes: facts.thisWeek.minutes, averageSteps: facts.thisWeek.averageSteps, daysFoodLogged: facts.thisWeek.daysFoodLogged },
    },
    allowance: await ai.usage(user, 'checkin'),
  };
}

module.exports = { workoutFeedback, weeklyCheckin, weekFacts };
