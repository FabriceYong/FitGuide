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
const { prisma } = require('../db/prisma');
const { NUTRITION } = require('@fitguide/shared');
const nutrition = require('./nutrition');
const ai = require('./ai');

const MealError = ai.AiError;
const allowance = async (user) => ({ photos: await ai.usage(user, 'meal_photo'), texts: await ai.usage(user, 'meal_text') });

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
  ai.getClient('Reading meals');
  await ai.spend(user, kind);

  const foods = await prisma.food.findMany({ where: { OR: [{ ownerId: null }, { ownerId: user.id }] }, orderBy: { name: 'asc' } });
  const content = input.image
    ? [
        { type: 'image', source: { type: 'base64', media_type: input.image.mediaType, data: input.image.data.toString('base64') } },
        { type: 'text', text: 'Read the meal in this photo.' },
      ]
    : [{ type: 'text', text: `Read this meal: ${input.text}` }];

  const answer = await ai.callTool({
    what: 'Reading meals',
    system: [
      { type: 'text', text: SYSTEM_PROMPT },
      // The food list changes rarely: cached across requests.
      { type: 'text', text: `FitGuide foods (slug: name):
${foodList(foods)}`, cache_control: { type: 'ephemeral' } },
    ],
    tool: TOOL,
    content,
    maxTokens: 4000,
    unreadable: "That couldn't be read as a meal. Try another photo or describe it in words.",
  });

  const bySlug = new Map(foods.map((f) => [f.slug, f]));
  const items = (Array.isArray(answer.items) ? answer.items : []).slice(0, 20).map((raw) => toItem(raw, bySlug));
  const note = typeof answer.note === 'string' && answer.note.trim() ? answer.note.trim().slice(0, 300) : null;
  return { items, note, allowance: await allowance(user) };
}

module.exports = { recognize, allowance, isConfigured: ai.isConfigured, setClient: ai.setClient, MealError, toItem };
