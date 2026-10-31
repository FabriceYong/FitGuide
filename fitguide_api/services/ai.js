/**
 * What FitGuide's small AI helpers share (reading meals, swapping an
 * exercise, workout feedback, the weekly check-in, writing help): the
 * Anthropic client, a daily allowance per feature counted in ai_requests
 * (kind and time only), and one call that returns a forced tool's input.
 * The AI coach chat has its own conversation and limits (services/coach.js).
 */
const Anthropic = require('@anthropic-ai/sdk');
const { prisma } = require('../db/prisma');
const { intFromEnv } = require('../utils/config');

const MODEL = () => process.env.AI_MODEL || 'claude-sonnet-5-5';

/** Uses per rolling 24 hours, by feature and plan. */
const LIMITS = {
  meal_photo: { label: 'meal photos', free: () => intFromEnv('MEAL_PHOTOS_PER_DAY', 3), plus: () => intFromEnv('MEAL_PHOTOS_PER_DAY_PLUS', 30) },
  meal_text: { label: 'meal descriptions', free: () => intFromEnv('MEAL_TEXTS_PER_DAY', 10), plus: () => intFromEnv('MEAL_TEXTS_PER_DAY_PLUS', 100) },
  swap: { label: 'exercise swaps', free: () => intFromEnv('SWAPS_PER_DAY', 10), plus: () => intFromEnv('SWAPS_PER_DAY_PLUS', 100) },
  feedback: { label: 'workout feedback notes', free: () => intFromEnv('FEEDBACK_PER_DAY', 5), plus: () => intFromEnv('FEEDBACK_PER_DAY_PLUS', 30) },
  checkin: { label: 'weekly check-ins', free: () => intFromEnv('CHECKINS_PER_DAY', 2), plus: () => intFromEnv('CHECKINS_PER_DAY_PLUS', 10) },
  writing: { label: 'writing suggestions', free: () => intFromEnv('WRITING_PER_DAY', 20), plus: () => intFromEnv('WRITING_PER_DAY_PLUS', 20) },
};

class AiError extends Error {
  constructor(message, status = 400, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let client = null;
const isConfigured = () => Boolean(client || process.env.ANTHROPIC_API_KEY);

function getClient(what = 'This feature') {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new AiError(`${what} is not set up on this server.`, 503);
    client = new Anthropic({ maxRetries: 2 });
  }
  return client;
}

/** Replace the Anthropic client (tests). Pass null to reset. */
function setClient(fake) {
  client = fake;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many of `kind` the user has used in the last 24 hours, and may use. */
async function usage(user, kind) {
  const max = LIMITS[kind][user.plan === 'plus' ? 'plus' : 'free']();
  const used = await prisma.aiRequest.count({ where: { userId: user.id, kind, createdAt: { gte: new Date(Date.now() - DAY_MS) } } });
  return { used, max, left: Math.max(0, max - used) };
}

/** Check the allowance and count one use (before the call, so failures still count). */
async function spend(user, kind) {
  const u = await usage(user, kind);
  if (!u.left) {
    const { label } = LIMITS[kind];
    throw new AiError(
      user.plan === 'plus' ? `You've used today's ${u.max} ${label}. Try again tomorrow.` : `Free accounts get ${u.max} ${label} a day. Try again tomorrow.`,
      429,
      user.plan === 'plus' ? undefined : 'LIMIT_REACHED',
    );
  }
  await prisma.aiRequest.create({ data: { userId: user.id, kind } });
}

/**
 * Ask Claude to answer by calling `tool`, and return the tool's input.
 * Throws AiError(422, `unreadable`) when it refuses or doesn't call the tool.
 */
async function callTool({ what, system, tool, content, maxTokens = 2000, unreadable }) {
  const api = getClient(what);
  const response = await api.beta.messages.create({
    model: MODEL(),
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [{ role: 'user', content }],
  });
  const call = response.stop_reason === 'refusal' ? null : response.content.find((b) => b.type === 'tool_use' && b.name === tool.name);
  if (!call) throw new AiError(unreadable, 422);
  return call.input;
}

/** Send an AiError as JSON; Anthropic failures as a short 502; anything else on. */
function sendError(res, next, err, unavailable) {
  if (err instanceof AiError) return res.status(err.status).json({ success: false, message: err.message, ...(err.code && { code: err.code }) });
  if (err instanceof Anthropic.APIError) {
    console.error('[ai] API error', err.status, err.message);
    return res.status(502).json({ success: false, message: unavailable });
  }
  return next(err);
}

module.exports = { LIMITS, AiError, isConfigured, getClient, setClient, usage, spend, callTool, sendError };
