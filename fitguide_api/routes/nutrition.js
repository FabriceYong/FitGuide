const express = require('express');
const crypto = require('crypto');
const { body, query } = require('express-validator');
const { NUTRITION } = require('@fitguide/shared');
const { prisma } = require('../db/prisma');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const nutrition = require('../services/nutrition');
const mealRecognition = require('../services/mealRecognition');
const barcode = require('../services/barcode');
const { hasImageSignature } = require('../utils/uploads');
const { intFromEnv } = require('../utils/config');
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

// ─── GET /api/nutrition/barcode/:code ─────────────────────────────────────────
// A packaged food by its barcode, from Open Food Facts: { product: { code,
// name, brand, serving, per100g, perServing } }, or 404 if it isn't known.
// Log it as a one-off entry (POST /log with its name and numbers).
router.get('/barcode/:code', async (req, res, next) => {
  const { code } = req.params;
  if (!barcode.isBarcode(code)) return res.status(400).json({ success: false, message: 'A barcode is 8, 12, 13 or 14 digits.' });
  try {
    const product = await barcode.lookup(code);
    if (!product) return res.status(404).json({ success: false, message: 'We couldn’t find that product. Enter it yourself instead.' });
    res.json({ success: true, product, source: 'Open Food Facts' });
  } catch (err) {
    console.warn('[barcode]', err.message);
    res.status(503).json({ success: false, message: 'Product lookup isn’t available right now. Enter it yourself instead.' });
  }
});

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
    const [logged, water] = await Promise.all([
      prisma.foodLog.findMany({ where: { userId: req.user.id, date }, orderBy: { createdAt: 'asc' } }),
      prisma.waterIntake.findUnique({ where: { userId_date: { userId: req.user.id, date } } }),
    ]);
    const entries = logged.map(publicEntry);
    const meals = Object.fromEntries(NUTRITION.MEALS.map((m) => [m, entries.filter((e) => e.meal === m)]));
    res.json({ success: true, date, meals, totals: nutrition.totals(entries), targets: nutrition.targets(req.user), water: { ml: water?.ml ?? 0 } });
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

// ─── POST /api/nutrition/water?tzOffset= ──────────────────────────────────────
// Body: { date?, ml } — add (or, negative, take away) water drunk that day.
// Never below 0. Returns the day's total.
router.post(
  '/water',
  [
    body('date').optional().custom(isValidYmd).withMessage('date must be a date (YYYY-MM-DD)'),
    body('ml').isInt({ min: -5000, max: 5000 }).withMessage('ml must be a whole number of millilitres').toInt(),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const todayYmd = today(tzOffsetFrom(req));
      const date = req.body.date || todayYmd;
      if (date > todayYmd) return res.status(400).json({ success: false, message: 'Date cannot be in the future.' });
      const where = { userId_date: { userId: req.user.id, date } };
      // One statement, so taps from two devices add up.
      const row = await prisma.waterIntake.upsert({
        where,
        create: { userId: req.user.id, date, ml: Math.max(0, req.body.ml) },
        update: { ml: { increment: req.body.ml } },
      });
      const water = row.ml < 0 ? await prisma.waterIntake.update({ where, data: { ml: 0 } }) : row;
      res.json({ success: true, date, water: { ml: water.ml } });
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

// ─── Reading a meal from a photo or a description ────────────────────────────

// Photos are read in memory and never stored.
const MEAL_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const mealPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, MEAL_PHOTO_TYPES.includes(file.mimetype)),
});

// A ceiling per account on top of the daily allowance.
const mealReads = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: () => intFromEnv('MEAL_READS_PER_HOUR', 20),
  keyGenerator: (req) => `meal:${req.user.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: "You've read a lot of meals this hour. Please try again a bit later." },
});

async function readMeal(req, res, next, input) {
  try {
    res.json({ success: true, ...(await mealRecognition.recognize(req.user, input)) });
  } catch (err) {
    if (err instanceof mealRecognition.MealError) return res.status(err.status).json({ success: false, message: err.message, ...(err.code && { code: err.code }) });
    if (err instanceof Anthropic.APIError) {
      console.error('[meals] API error', err.status, err.message);
      return res.status(502).json({ success: false, message: "Meals can't be read right now. Please try again shortly, or log foods by hand." });
    }
    return next(err);
  }
}

// ─── GET /api/nutrition/recognize ─────────────────────────────────────────────
// Whether meals can be read on this server, and how many uses are left today.
router.get('/recognize', async (req, res, next) => {
  try {
    res.json({ success: true, available: mealRecognition.isConfigured(), allowance: await mealRecognition.allowance(req.user) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/nutrition/recognize/photo (multipart, field "photo") ───────────
router.post('/recognize/photo', mealReads, (req, res, next) => {
  mealPhoto.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'That photo is too large. The limit is 8 MB.' : err.message });
    }
    if (err) return next(err);
    const file = req.file;
    if (!file || !hasImageSignature(file.buffer, file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Choose a photo of your meal (JPEG, PNG, WebP or GIF).' });
    }
    return readMeal(req, res, next, { image: { data: file.buffer, mediaType: file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype } });
  });
});

// ─── POST /api/nutrition/recognize/text { text } ──────────────────────────────
router.post(
  '/recognize/text',
  mealReads,
  [body('text').isString().trim().isLength({ min: 2, max: 500 }).withMessage('Describe what you ate (up to 500 characters).')],
  rejectInvalid,
  (req, res, next) => readMeal(req, res, next, { text: req.body.text }),
);

module.exports = router;
