/**
 * Nutrition calculations: daily energy and macro targets from the profile,
 * totals for a day's log, and a sample day of meals from the food catalog.
 * Pure functions, no I/O.
 *
 * These are general estimates for healthy adults, not medical advice.
 */
const { NUTRITION } = require('@fitguide/shared');

// Mifflin-St Jeor offsets. For "Non-binary" / "Prefer not to say" use the midpoint.
const SEX_OFFSET = { Male: 5, Female: -161 };
const MIDPOINT_OFFSET = -78;
const ASSUMED_AGE = 30;

// Total daily energy = BMR x activity factor.
const ACTIVITY_FACTOR = {
  Inactive: 1.2,
  'Moderately Active': 1.465,
  Active: 1.55,
  'Very Active': 1.725,
};

// Calorie adjustment by goal.
const GOAL_ADJUSTMENT = { Weight: -0.2, Muscle: 0.1, Vitality: 0, Flexibility: 0 };

// Share of calories from [protein, carbs, fat] by diet.
const DIET_SPLIT = {
  'Keto Diet': [0.25, 0.05, 0.7],
  'Mediterranean Diet': [0.2, 0.45, 0.35],
  'Paleo Diet': [0.3, 0.3, 0.4],
  'Intermittent Fasting': [0.25, 0.45, 0.3],
  'Flexible Balanced Plan': [0.25, 0.45, 0.3],
};

// Minimum protein in g per kg of body weight, by goal.
const PROTEIN_FLOOR = { Muscle: 1.6, Weight: 1.6, Vitality: 1.0, Flexibility: 1.0 };

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };
const round = (n, step = 1) => Math.round(n / step) * step;

/**
 * Daily targets for a profile.
 * @param {object} profile  { gender, height, weight, birthYear, activityStatus, goal, diet }
 * @param {number} [year]   current year (for age)
 */
function targets(profile, year = new Date().getFullYear()) {
  const age = profile.birthYear ? year - profile.birthYear : ASSUMED_AGE;
  const offset = SEX_OFFSET[profile.gender] ?? MIDPOINT_OFFSET;
  const bmr = 10 * profile.weight + 6.25 * profile.height - 5 * age + offset;
  const tdee = bmr * (ACTIVITY_FACTOR[profile.activityStatus] || 1.465);
  // A deficit never goes below BMR, and never below 1200 kcal.
  const calories = round(Math.max(tdee * (1 + (GOAL_ADJUSTMENT[profile.goal] || 0)), Math.min(bmr, tdee), 1200), 10);

  const [pShare, cShare, fShare] = DIET_SPLIT[profile.diet] || DIET_SPLIT['Flexible Balanced Plan'];
  const protein = Math.max((calories * pShare) / KCAL_PER_G.protein, (PROTEIN_FLOOR[profile.goal] || 1) * profile.weight);
  // Whatever protein doesn't use is split between carbs and fat in the diet's ratio.
  const rest = Math.max(0, calories - protein * KCAL_PER_G.protein);
  const carbs = (rest * (cShare / (cShare + fShare))) / KCAL_PER_G.carbs;
  const fat = (rest * (fShare / (cShare + fShare))) / KCAL_PER_G.fat;

  return {
    calories,
    protein: round(protein),
    carbs: round(carbs),
    fat: round(fat),
    bmr: round(bmr),
    tdee: round(tdee),
    age,
    ageIsEstimate: !profile.birthYear,
    diet: profile.diet,
    goal: profile.goal,
    notes: [
      ...(profile.diet === 'Intermittent Fasting' ? ['Eat these within your eating window (for example 12:00–20:00).'] : []),
      ...(!profile.birthYear ? ['Add your birth year in your profile for a more accurate estimate.'] : []),
    ],
  };
}

/** Totals of logged entries (or any objects with calories/protein/carbs/fat). */
function totals(entries) {
  const sum = (key) => Math.round(entries.reduce((t, e) => t + (e[key] || 0), 0) * 10) / 10;
  return { calories: Math.round(sum('calories')), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat') };
}

/** Nutrition for `servings` of a food. */
function scaled(food, servings) {
  const r = (n) => Math.round(n * servings * 10) / 10;
  return { calories: Math.round(food.calories * servings), protein: r(food.protein), carbs: r(food.carbs), fat: r(food.fat) };
}

// Calorie share and building blocks of each meal.
const MEAL_SHAPES = {
  breakfast: { share: 0.25, parts: [['protein', 'dairy'], ['grain', 'fruit'], ['fruit', 'fat']] },
  lunch: { share: 0.35, parts: [['protein', 'legume'], ['grain', 'legume'], ['vegetable'], ['fat']] },
  dinner: { share: 0.3, parts: [['protein'], ['grain', 'vegetable'], ['vegetable'], ['fat']] },
  snack: { share: 0.1, parts: [['fruit', 'dairy', 'snack', 'fat']] },
};

/** Small deterministic PRNG so a given day's plan is stable but days differ. */
function seededRandom(seedText) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * A sample day of meals that fits the diet and lands near the calorie target.
 * @param {object} target  from targets()
 * @param {object[]} foods catalog foods
 * @param {string} seed    e.g. "<userId>:<date>"
 */
function mealPlan(target, foods, seed) {
  const tag = NUTRITION.DIET_TAGS[target.diet] || 'flexible';
  const fits = foods.filter((f) => (f.diets || []).includes(tag));
  const random = seededRandom(seed);
  const pick = (categories, used) => {
    let options = fits.filter((f) => categories.includes(f.category) && !used.has(f.slug));
    // Keto has few grains or fruit: fall back to vegetables.
    if (!options.length) options = fits.filter((f) => f.category === 'vegetable' && !used.has(f.slug));
    return options.length ? options[Math.floor(random() * options.length)] : null;
  };

  const used = new Set();
  const meals = NUTRITION.MEALS.map((meal) => {
    const shape = MEAL_SHAPES[meal];
    const items = shape.parts.map((part) => pick(part, used)).filter(Boolean);
    items.forEach((f) => used.add(f.slug));
    const base = items.reduce((t, f) => t + f.calories, 0) || 1;
    // Scale every item together to hit the meal's share, in quarter servings.
    const factor = (target.calories * shape.share) / base;
    const servings = Math.min(4, Math.max(0.5, Math.round(factor * 4) / 4));
    const entries = items.map((f) => ({
      foodSlug: f.slug,
      name: f.name,
      servingLabel: f.servingLabel,
      servings,
      ...scaled(f, servings),
    }));
    return { meal, items: entries, totals: totals(entries) };
  });
  return { meals, totals: totals(meals.flatMap((m) => m.items)) };
}

module.exports = { ACTIVITY_FACTOR, DIET_SPLIT, targets, totals, scaled, mealPlan };
