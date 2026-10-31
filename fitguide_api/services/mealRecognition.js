/**
 * Reading a meal from a photo of the plate or a description ("2 eggs and a
 * slice of toast"): Claude names each food and estimates its portion, picking
 * a food from FitGuide's list where one fits. Matched foods use the list's
 * own nutrition for the estimated grams; anything else keeps Claude's
 * estimate as a one-off entry. Nothing is logged here: the member checks the
 * items and logs them through POST /api/nutrition/log.
 *
 * The photo and text are sent to Anthropic and never stored. Each use is
 * counted (AiRequest) for the daily allowance.
 */
const Anthropic = require('@anthropic-ai/sdk');
const { prisma } = require('../db/prisma');
const { NUTRITION } = require('@fitguide/shared');
const nutrition = require('./nutrition');
const { intFromEnv } = require('../utils/config');

const MODEL = () => process.env.MEAL_MODEL || 'claude-sonnet-5-5';

/** Uses per rolling 24 hours, by kind and plan. */
const LIMITS = {
  meal_photo: { free: () => intFromEnv('MEAL_PHOTOS_PER_DAY', 3), plus: () => intFromEnv('MEAL_PHOTOS_PER_DAY_PLUS', 30) },
  meal_text: { free: () => intFromEnv('MEAL_TEXTS_PER_DAY', 10), plus: () => intFromEnv('MEAL_TEXTS_PER_DAY_PLUS', 100) },
};

class MealError extends Error {
  constructor(message, status = 400, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let client = null;
const isConfigured = () => Boolean(client || process.env.ANTHROPIC_API_KEY);

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new MealError('Reading meals is not set up on this server.', 503);
    client = new Anthropic({ maxRetries: 2 });
  }
  return client;
}

/** Replace the Anthropic client (tests). Pass null to reset. */
function setClient(fake) {
  client = fake;
}

// ─── Allowance ───────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many of `kind` the user has used in the last 24 hours, and may use. */
async function usage(user, kind) {
  const max = LIMITS[kind][user.plan === 'plus' ? 'plus' : 'free']();
  const used = await prisma.aiRequest.count({ where: { userId: user.id, kind, createdAt: { gte: new Date(Date.now() - DAY_MS) } } });
  return { used, max, left: Math.max(0, max - used) };
}

async function allowance(user) {
  return { photos: await usage(user, 'meal_photo'), texts: await usage(user, 'meal_text') };
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You read meals for FitGuide, a fitness app, so members can log what they ate.

Given a photo of a meal or a description of one, list each food separately with a realistic portion:
- Estimate the cooked weight in grams (millilitres for drinks) from what you can see or what's described. Use typical servings when the size isn't clear.
- Pick the closest food from the FitGuide list by its slug when one is a fair match (same food; cooking method may differ). Use null when nothing on the list fits.
- Always give your own estimate of calories, protein, carbs and fat for the portion, used when no food on the list fits.
- Include visible sauces, dressings, oil and drinks as their own items. Don't invent foods you can't see or that weren't mentioned.
- If the photo doesn't show food, or the text isn't about food, return no items and say why in the note.
- Keep names short and plain ("Grilled chicken breast", "White rice").

Call record_meal once with the result.`;

const TOOL = {
  name: 'record_meal',
  description: 'Record the foods in the meal with estimated portions and nutrition.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Each food in the meal, separately.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Short, plain name of the food' },
            foodSlug: { type: ['string', 'null'], description: 'Slug of the matching FitGuide food, or null' },
            grams: { type: 'number', description: 'Estimated portion in grams (millilitres for drinks)' },
            portion: { type: 'string', description: 'The portion in everyday words, e.g. "1 cup" or "2 slices"' },
            calories: { type: 'number' },
            protein: { type: 'number', description: 'grams' },
            carbs: { type: 'number', description: 'grams' },
            fat: { type: 'number', description: 'grams' },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['name', 'foodSlug', 'grams', 'portion', 'calories', 'protein', 'carbs', 'fat', 'confidence'],
          additionalProperties: false,
        },
      },
      note: { type: ['string', 'null'], description: 'Anything the member should know, e.g. "Sauce not visible, check the portion"' },
    },
    required: ['items', 'note'],
    additionalProperties: false,
  },
};

const foodList = (foods) => foods.map((f) => `${f.slug}: ${f.name} (${f.servingSize} ${f.servingUnit} per serving)`).join('\n');

// ─── Reading ─────────────────────────────────────────────────────────────────

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : 0));
const round1 = (n) => Math.round(n * 10) / 10;
// Portions are logged in quarter servings.
const quarter = (n) => Math.round(n * 4) / 4;

/** Turn one of Claude's items into a reviewable entry: a list food with servings, or a one-off. */
function toItem(raw, foodsBySlug) {
  const grams = clamp(raw.grams, 1, 3000);
  const food = raw.foodSlug ? foodsBySlug.get(raw.foodSlug) : null;
  const base = { name: String(raw.name || 'Food').slice(0, 120), portion: String(raw.portion || '').slice(0, 60), grams: Math.round(grams), confidence: ['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : 'medium' };
  if (food && food.servingSize > 0) {
    const servings = clamp(quarter(grams / food.servingSize), 0.25, NUTRITION.MAX_SERVINGS);
    return { ...base, foodSlug: food.slug, foodName: food.name, servings, ...nutrition.scaled(food, servings) };
  }
  // A one-off entry: one serving with Claude's estimate.
  return {
    ...base,
    foodSlug: null,
    foodName: null,
    servings: 1,
    calories: Math.round(clamp(raw.calories, 0, 5000)),
    protein: round1(clamp(raw.protein, 0, 500)),
    carbs: round1(clamp(raw.carbs, 0, 1000)),
    fat: round1(clamp(raw.fat, 0, 500)),
  };
}

/**
 * Read a meal. `input` is { image: { data: Buffer, mediaType } } or { text }.
 * @returns {Promise<{ items: object[], note: string|null, allowance: object }>}
 */
async function recognize(user, input) {
  const kind = input.image ? 'meal_photo' : 'meal_text';
  const api = getClient();
  const before = await usage(user, kind);
  if (!before.left) {
    const what = kind === 'meal_photo' ? `${before.max} meal photos` : `${before.max} meal descriptions`;
    throw new MealError(
      user.plan === 'plus' ? `You've used today's ${what}. Try again tomorrow.` : `Free accounts can read ${what} a day. Try again tomorrow, or log foods by hand.`,
      429,
      user.plan === 'plus' ? undefined : 'LIMIT_REACHED',
    );
  }

  const foods = await prisma.food.findMany({ where: { OR: [{ ownerId: null }, { ownerId: user.id }] }, orderBy: { name: 'asc' } });
  const content = input.image
    ? [
        { type: 'image', source: { type: 'base64', media_type: input.image.mediaType, data: input.image.data.toString('base64') } },
        { type: 'text', text: 'Read the meal in this photo.' },
      ]
    : [{ type: 'text', text: `Read this meal: ${input.text}` }];

  // Count the use before the call, so failed or repeated requests still count.
  await prisma.aiRequest.create({ data: { userId: user.id, kind } });

  const response = await api.beta.messages.create({
    model: MODEL(),
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [
      { type: 'text', text: SYSTEM_PROMPT },
      // The food list changes rarely: cached across requests.
      { type: 'text', text: `FitGuide foods (slug: name):\n${foodList(foods)}`, cache_control: { type: 'ephemeral' } },
    ],
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content }],
  });

  if (response.stop_reason === 'refusal') throw new MealError("That couldn't be read as a meal. Try another photo or describe it in words.", 422);
  const call = response.content.find((b) => b.type === 'tool_use' && b.name === TOOL.name);
  if (!call) throw new MealError("That couldn't be read as a meal. Try another photo or describe it in words.", 422);

  const bySlug = new Map(foods.map((f) => [f.slug, f]));
  const items = (Array.isArray(call.input.items) ? call.input.items : []).slice(0, 20).map((raw) => toItem(raw, bySlug));
  const note = typeof call.input.note === 'string' && call.input.note.trim() ? call.input.note.trim().slice(0, 300) : null;
  return { items, note, allowance: await allowance(user) };
}

module.exports = { recognize, allowance, isConfigured, setClient, MealError, toItem, LIMITS };
