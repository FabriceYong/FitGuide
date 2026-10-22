/**
 * AI coach: a chat with Claude that knows the user's profile, plan and recent
 * training, and can look up workouts and change days of their personal plan.
 *
 * The conversation is stored append-only (CoachMessage rows hold the exact
 * Messages API content, thinking and tool blocks included) and replayed
 * unchanged, which keeps prompt caching and thinking-block replay valid.
 * Fresh training context is added each turn as a mid-conversation system
 * message instead of editing the top-level system prompt.
 */
const Anthropic = require('@anthropic-ai/sdk');
const { prisma } = require('../db/prisma');
const { CATALOG } = require('@fitguide/shared');
const plans = require('./plans');
const { sessionStore } = require('../stores/records');
const { localDate } = require('../utils/dates');
const nutrition = require('./nutrition');

const MODEL = () => process.env.COACH_MODEL || 'claude-opus-5-5';
const EFFORT = () => process.env.COACH_EFFORT || 'low';
const MAX_TOOL_ROUNDS = 6;
// Long conversations get expensive; the user starts a new chat after this many messages.
const MAX_USER_TURNS = 40;
// Free accounts get a few messages a day; PLUS members only have the hourly limit.
const FREE_MESSAGES_PER_DAY = () => Number(process.env.COACH_FREE_MESSAGES_PER_DAY) || 10;

const SYSTEM_PROMPT = `You are FitGuide Coach, a friendly, practical fitness coach inside the FitGuide app.

How you work:
- Each user turn is followed by a system message with the user's current profile, plan and recent training. Ground your advice in it; don't ask for facts it already gives you.
- Keep replies short and concrete: a few sentences or a brief list. Use plain language.
- You can look at the user's plan, search the workout catalog and change workouts on open days of their personal plan. Only change the plan when the user asks for it or agrees to a change you proposed, and say exactly what you changed.
- Recommend workouts from the FitGuide catalog by name when relevant.
- Explain exercise form and substitutions clearly. Suggest easier or harder variations when asked.

Safety:
- You are not a doctor. For pain, injury, dizziness, chest pain, shortness of breath, pregnancy, eating disorders or medical conditions, advise stopping the activity if relevant and seeing a qualified professional, then keep any guidance conservative.
- Don't give medication or supplement dosing advice, and don't recommend extreme diets or very rapid weight loss.`;

const TOOLS = [
  {
    name: 'get_plan',
    description: "Get the user's current personal plan: every scheduled day with its week, day, date, workout slug, title and status (done, missed, today, upcoming). Returns null if they aren't following a personal plan.",
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    name: 'find_workouts',
    description: 'Search the FitGuide workout catalog. All filters are optional (use null to skip one). Returns up to 15 workouts with slug, title, category, difficulty, duration in minutes and equipment.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        category: { type: ['string', 'null'], enum: [...CATALOG.WORKOUT_CATEGORIES, null], description: 'Workout category' },
        difficulty: { type: ['string', 'null'], enum: [...CATALOG.DIFFICULTIES, null] },
        maxMinutes: { type: ['integer', 'null'], description: 'Longest acceptable duration in minutes' },
        search: { type: ['string', 'null'], description: 'Words to find in the title or description' },
      },
      required: ['category', 'difficulty', 'maxMinutes', 'search'],
      additionalProperties: false,
    },
  },
  {
    name: 'swap_plan_day',
    description: "Replace the workout on one day of the user's personal plan. Only for days that are not done yet. Only call this when the user asked for the change or agreed to it.",
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        week: { type: 'integer', description: 'Plan week (1-based)' },
        day: { type: 'integer', description: 'Day within the week (1-7)' },
        workoutSlug: { type: 'string', description: 'Slug of the catalog workout to schedule' },
      },
      required: ['week', 'day', 'workoutSlug'],
      additionalProperties: false,
    },
  },
];

class CoachError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

let client = null;

const isConfigured = () => Boolean(client || process.env.ANTHROPIC_API_KEY);

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new CoachError('The coach is not set up on this server.', 503);
    client = new Anthropic({ maxRetries: 2 });
  }
  return client;
}

/** Replace the Anthropic client (tests). Pass null to reset. */
function setClient(fake) {
  client = fake;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const compactPlan = (plan) => plan && {
  title: plan.programTitle,
  startDate: plan.startDate,
  currentWeek: plan.currentWeek,
  weeks: plan.weeks,
  completed: `${plan.completedCount}/${plan.totalDays}`,
  adherencePct: plan.adherencePct,
  schedule: plan.schedule.map((d) => ({ week: d.week, day: d.day, date: d.date, title: d.title, workoutSlug: d.workoutSlug, status: d.status })),
};

/** What the coach should know this turn, as a system message. */
async function snapshot(user, todayYmd, tzOffset) {
  const [plan, sessions, foodToday] = await Promise.all([
    plans.current(user.id, todayYmd),
    sessionStore.list(user.id, { sortField: 'completedAt', limit: 8 }),
    prisma.foodLog.findMany({ where: { userId: user.id, date: todayYmd } }),
  ]);
  const target = nutrition.targets(user);
  const context = {
    today: todayYmd,
    profile: {
      name: user.name,
      goal: user.goal,
      fitnessLevel: user.fitnessLevel,
      activityStatus: user.activityStatus,
      heightCm: user.height,
      weightKg: user.weight,
      targetWeightKg: user.targetWeight,
      diet: user.diet,
      birthYear: user.birthYear,
      // Training preferences; empty means not answered. Respect limitations.
      focusAreas: user.focusAreas,
      equipment: user.equipment,
      limitations: user.limitations,
      workoutMinutes: user.workoutMinutes,
      daysPerWeek: user.daysPerWeek,
    },
    plan: plan ? { title: plan.programTitle, currentWeek: plan.currentWeek, weeks: plan.weeks, adherencePct: plan.adherencePct, nextDays: plan.schedule.filter((d) => d.status !== 'done').slice(0, 5).map((d) => ({ week: d.week, day: d.day, date: d.date, title: d.title, status: d.status })) } : null,
    nutritionToday: {
      target: { calories: target.calories, protein: target.protein, carbs: target.carbs, fat: target.fat },
      logged: nutrition.totals(foodToday),
    },
    recentSessions: sessions.map((s) => ({
      date: localDate(s.completedAt, tzOffset),
      workout: s.workoutTitle,
      minutes: Math.round(s.durationSec / 60),
      effort: s.perceivedEffort,
      status: s.status,
    })),
  };
  return `Current user context (JSON, refreshed every turn):\n${JSON.stringify(context)}`;
}

// ─── Tools ───────────────────────────────────────────────────────────────────

async function runTool(name, input, { user, todayYmd }) {
  if (name === 'get_plan') {
    return compactPlan(await plans.current(user.id, todayYmd));
  }
  if (name === 'find_workouts') {
    const where = { isPublished: true };
    if (input.category) where.category = input.category;
    if (input.difficulty) where.difficulty = input.difficulty;
    if (Number.isInteger(input.maxMinutes)) where.duration = { lte: input.maxMinutes };
    if (input.search) {
      const term = String(input.search).slice(0, 100);
      where.OR = [{ title: { contains: term, mode: 'insensitive' } }, { description: { contains: term, mode: 'insensitive' } }];
    }
    const workouts = await prisma.workout.findMany({ where, take: 15, orderBy: { createdAt: 'asc' } });
    return workouts.map((w) => ({ slug: w.slug, title: w.title, category: w.category, difficulty: w.difficulty, minutes: w.duration, equipment: w.equipment }));
  }
  if (name === 'swap_plan_day') {
    const plan = await plans.swapDay(user.id, { week: input.week, day: input.day, workoutSlug: input.workoutSlug }, todayYmd);
    const changed = plan.schedule.find((d) => d.week === input.week && d.day === input.day);
    return { ok: true, changed };
  }
  throw new Error(`Unknown tool ${name}`);
}

/** Validate tool input ourselves too: strict mode guarantees shape, not meaning. */
function checkToolInput(name, input) {
  if (typeof input !== 'object' || input === null) return 'Input must be an object.';
  if (name === 'swap_plan_day') {
    if (!Number.isInteger(input.week) || input.week < 1 || input.week > 52) return 'week must be 1-52.';
    if (!Number.isInteger(input.day) || input.day < 1 || input.day > 7) return 'day must be 1-7.';
    if (typeof input.workoutSlug !== 'string' || !input.workoutSlug) return 'workoutSlug is required.';
  }
  return null;
}

// ─── Conversation ────────────────────────────────────────────────────────────

const toPublic = (row) => ({ id: row.id, role: row.role, text: row.display, createdAt: row.createdAt });

/** Messages the user sees (their own and the coach's replies). */
async function history(userId) {
  const rows = await prisma.coachMessage.findMany({
    where: { userId, display: { not: null } },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toPublic);
}

async function reset(userId) {
  await prisma.coachMessage.deleteMany({ where: { userId } });
}

// Rows are ordered by createdAt; give each new row its own millisecond.
let lastStamp = 0;
const stamp = () => {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return new Date(lastStamp);
};

async function append(userId, role, content, display = null) {
  return prisma.coachMessage.create({ data: { userId, role, content, display, createdAt: stamp() } });
}

// One turn at a time per user, so two tabs can't interleave a conversation.
const busy = new Set();

const textOf = (content) => content.filter((b) => b.type === 'text').map((b) => b.text).join('\n\n').trim();

/**
 * Send the user's message and run the conversation until the coach replies.
 * @returns {Promise<{ reply: object, changedPlan: boolean }>}
 */
async function chat(user, text, { todayYmd, tzOffset }) {
  const api = getClient();
  const userTurns = await prisma.coachMessage.count({ where: { userId: user.id, role: 'user', display: { not: null } } });
  if (userTurns >= MAX_USER_TURNS) {
    throw new CoachError('This conversation is full. Start a new chat to keep going.', 409);
  }

  if (busy.has(user.id)) throw new CoachError('The coach is still answering your last message.', 409);
  if (user.plan !== 'plus') {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sent = await prisma.coachMessage.count({ where: { userId: user.id, role: 'user', display: { not: null }, createdAt: { gte: since } } });
    if (sent >= FREE_MESSAGES_PER_DAY()) {
      const err = new CoachError(`Free accounts can send ${FREE_MESSAGES_PER_DAY()} coach messages a day. FitGuide PLUS removes the daily limit.`, 429);
      err.code = 'PLUS_REQUIRED';
      throw err;
    }
  }
  busy.add(user.id);
  const turnStart = stamp();
  try {
    return await runTurn(api, user, text, { todayYmd, tzOffset });
  } catch (err) {
    // Drop this turn's rows so the stored history stays a valid conversation
    // (a dangling user + system pair would break the next request).
    await prisma.coachMessage.deleteMany({ where: { userId: user.id, createdAt: { gte: turnStart } } });
    throw err;
  } finally {
    busy.delete(user.id);
  }
}

async function runTurn(api, user, text, { todayYmd, tzOffset }) {
  await append(user.id, 'user', [{ type: 'text', text }], text);
  await append(user.id, 'system', await snapshot(user, todayYmd, tzOffset));

  let changedPlan = false;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const rows = await prisma.coachMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
    const response = await api.beta.messages.create({
      model: MODEL(),
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: EFFORT() },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      tool_choice: { type: 'auto' },
      cache_control: { type: 'ephemeral' },
      messages: rows.map((r) => ({ role: r.role, content: r.content })),
    });

    if (response.stop_reason === 'refusal') {
      const reply = "I can't help with that one. If it's about pain, an injury or a medical condition, please check with a doctor or physiotherapist.";
      if (response.content.length) await append(user.id, 'assistant', response.content);
      const row = await append(user.id, 'assistant', [{ type: 'text', text: reply }], reply);
      return { reply: toPublic(row), changedPlan };
    }

    const toolUses = response.content.filter((b) => b.type === 'tool_use');
    if (response.stop_reason !== 'tool_use' || !toolUses.length) {
      const reply = textOf(response.content) || "Sorry, I didn't catch that. Could you rephrase?";
      const row = await append(user.id, 'assistant', response.content, reply);
      return { reply: toPublic(row), changedPlan };
    }

    await append(user.id, 'assistant', response.content);
    const results = [];
    for (const call of toolUses) {
      const problem = checkToolInput(call.name, call.input);
      try {
        if (problem) throw new Error(problem);
        const output = await runTool(call.name, call.input, { user, todayYmd });
        if (call.name === 'swap_plan_day') changedPlan = true;
        results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(output) });
      } catch (err) {
        results.push({ type: 'tool_result', tool_use_id: call.id, content: err.message, is_error: true });
      }
    }
    // All results for one assistant turn go back in a single user message.
    await append(user.id, 'user', results);
  }

  const reply = "I'm having trouble finishing that. Please try asking in a different way.";
  const row = await append(user.id, 'assistant', [{ type: 'text', text: reply }], reply);
  return { reply: toPublic(row), changedPlan };
}

module.exports = { isConfigured, setClient, chat, history, reset, CoachError, TOOLS, SYSTEM_PROMPT, MAX_USER_TURNS };
