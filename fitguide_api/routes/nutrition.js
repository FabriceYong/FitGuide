const express = require('express');
const crypto = require('crypto');
const { body, query } = require('express-validator');
const { NUTRITION } = require('@fitguide/shared');
const { prisma } = require('../db/prisma');
const nutrition = require('../services/nutrition');
const { authMiddleware } = require('../middleware/authMiddleware');
const { rejectInvalid } = require('../utils/validate');
const { tzOffsetFrom, today, isValidYmd, addDays } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

const publicFood = ({ id: _id, ownerId, createdAt: _c, ...food }) => ({ ...food, isCustom: Boolean(ownerId) });
const publicEntry = ({ userId: _u, ...entry }) => entry;

/** Catalog foods plus the user's own. */
const visibleFoods = (userId) => ({ OR: [{ ownerId: null }, { ownerId: userId }] });

/** ?date= or today in the user's time zone. */
const dateFrom = (req) => (isValidYmd(req.query.date) ? req.query.date : today(tzOffsetFrom(req)));

// ─── GET /api/nutrition/targets ───────────────────────────────────────────────
router.get('/targets', (req, res) => {
  res.json({ success: true, targets: nutrition.targets(req.user) });
});

// ─── GET /api/nutrition/foods?search=&category=&diet= ─────────────────────────
router.get(
  '/foods',
  [query('search').optional().isString().isLength({ max: 100 }), query('category').optional().isIn(NUTRITION.FOOD_CATEGORIES)],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const where = { AND: [visibleFoods(req.user.id)] };
      if (req.query.search) where.AND.push({ name: { contains: String(req.query.search), mode: 'insensitive' } });
      if (req.query.category) where.AND.push({ category: req.query.category });
      if (req.query.diet) where.AND.push({ diets: { has: String(req.query.diet) } });
      const foods = await prisma.food.findMany({ where, orderBy: [{ ownerId: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }], take: 100 });
      res.json({ success: true, count: foods.length, foods: foods.map(publicFood) });
    } catch (err) {
      next(err);
    }
  },
);

const nutrientRules = (prefix = '') => ['calories', 'protein', 'carbs', 'fat'].map((f) => body(`${prefix}${f}`)
  .isFloat({ min: 0, max: f === 'calories' ? 5000 : 500 }).withMessage(`${f} must be a number`).toFloat());

// ─── POST /api/nutrition/foods ────────────────────────────────────────────────
// Body: { name, servingLabel, calories, protein, carbs, fat } — a food only this user sees.
router.post(
  '/foods',
  [
    body('name').isString().trim().isLength({ min: 1, max: 120 }).withMessage('Name is required'),
    body('servingLabel').optional().isString().trim().isLength({ max: 60 }),
    ...nutrientRules(),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const food = await prisma.food.create({
        data: {
          slug: `custom-${crypto.randomBytes(6).toString('hex')}`,
          name: req.body.name,
          category: 'custom',
          servingLabel: req.body.servingLabel || '1 serving',
          servingSize: 1,
          servingUnit: 'serving',
          calories: req.body.calories,
          protein: req.body.protein,
          carbs: req.body.carbs,
          fat: req.body.fat,
          diets: [],
          ownerId: req.user.id,
        },
      });
      res.status(201).json({ success: true, food: publicFood(food) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/nutrition/log?date= ─────────────────────────────────────────────
// The day's entries by meal, totals and targets.
router.get('/log', async (req, res, next) => {
  try {
    const date = dateFrom(req);
    const entries = (await prisma.foodLog.findMany({ where: { userId: req.user.id, date }, orderBy: { createdAt: 'asc' } })).map(publicEntry);
    const meals = Object.fromEntries(NUTRITION.MEALS.map((m) => [m, entries.filter((e) => e.meal === m)]));
    res.json({ success: true, date, meals, totals: nutrition.totals(entries), targets: nutrition.targets(req.user) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/nutrition/log?tzOffset= ────────────────────────────────────────
// Body: { date?, meal, servings, foodSlug } or { date?, meal, servings, name, calories, protein, carbs, fat }
router.post(
  '/log',
  [
    body('date').optional().custom(isValidYmd).withMessage('date must be a date (YYYY-MM-DD)'),
    body('meal').isIn(NUTRITION.MEALS).withMessage(`meal must be one of ${NUTRITION.MEALS.join(', ')}`),
    body('servings').isFloat({ gt: 0, max: NUTRITION.MAX_SERVINGS }).withMessage(`servings must be between 0 and ${NUTRITION.MAX_SERVINGS}`).toFloat(),
    body('foodSlug').optional().isString().isLength({ max: 100 }),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const todayYmd = today(tzOffsetFrom(req));
      const date = req.body.date || todayYmd;
      if (date > todayYmd) return res.status(400).json({ success: false, message: 'Date cannot be in the future.' });

      let item;
      if (req.body.foodSlug) {
        const food = await prisma.food.findFirst({ where: { AND: [visibleFoods(req.user.id), { slug: req.body.foodSlug }] } });
        if (!food) return res.status(404).json({ success: false, message: 'Food not found.' });
        item = { foodSlug: food.slug, name: food.name, ...nutrition.scaled(food, req.body.servings) };
      } else {
        // A one-off entry with its own totals per serving.
        const name = typeof req.body.name === 'string' ? req.body.name.trim().slice(0, 120) : '';
        const per = ['calories', 'protein', 'carbs', 'fat'].map((k) => Number(req.body[k]));
        if (!name || per.some((v) => !Number.isFinite(v) || v < 0 || v > 5000)) {
          return res.status(400).json({ success: false, message: 'Choose a food, or enter a name and its calories, protein, carbs and fat.' });
        }
        const [calories, protein, carbs, fat] = per;
        item = { foodSlug: null, name, ...nutrition.scaled({ calories, protein, carbs, fat }, req.body.servings) };
      }

      const entry = await prisma.foodLog.create({
        data: { userId: req.user.id, date, meal: req.body.meal, servings: req.body.servings, ...item },
      });
      res.status(201).json({ success: true, entry: publicEntry(entry) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /api/nutrition/log/:id ────────────────────────────────────────────
router.delete('/log/:id', async (req, res, next) => {
  try {
    const { count } = await prisma.foodLog.deleteMany({ where: { id: String(req.params.id), userId: req.user.id } });
    if (!count) return res.status(404).json({ success: false, message: 'Entry not found.' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/nutrition/meal-plan?date= ───────────────────────────────────────
// A sample day of meals for the user's diet and calorie target.
router.get('/meal-plan', async (req, res, next) => {
  try {
    const date = dateFrom(req);
    const target = nutrition.targets(req.user);
    const foods = await prisma.food.findMany({ where: { ownerId: null }, orderBy: { createdAt: 'asc' } });
    res.json({ success: true, date, target, ...nutrition.mealPlan(target, foods, `${req.user.id}:${date}`) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/nutrition/history?days=14 ───────────────────────────────────────
// Daily totals for the last N days (oldest first), with the calorie target.
router.get('/history', [query('days').optional().isInt({ min: 1, max: 90 }).toInt()], rejectInvalid, async (req, res, next) => {
  try {
    const days = req.query.days || 14;
    const end = today(tzOffsetFrom(req));
    const start = addDays(end, -(days - 1));
    const entries = await prisma.foodLog.findMany({ where: { userId: req.user.id, date: { gte: start, lte: end } } });
    const series = [];
    for (let i = 0; i < days; i += 1) {
      const date = addDays(start, i);
      series.push({ date, ...nutrition.totals(entries.filter((e) => e.date === date)) });
    }
    res.json({ success: true, days: series, targets: nutrition.targets(req.user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
