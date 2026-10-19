// Unit tests for nutrition targets and meal plans (no database).
require('./helpers/setup');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const foods = require('../seed/foodSeeder');
const { targets, totals, scaled, mealPlan } = require('../services/nutrition');

const profile = { gender: 'Male', height: 178, weight: 75, birthYear: 1996, activityStatus: 'Active', goal: 'Vitality', diet: 'Flexible Balanced Plan' };

describe('nutrition targets', () => {
  it('uses Mifflin-St Jeor with the activity factor', () => {
    const t = targets(profile, 2026);
    // BMR = 10*75 + 6.25*178 - 5*30 + 5 = 1717.5; x 1.55 = 2662
    assert.equal(t.bmr, 1718);
    assert.equal(t.calories, 2660);
    assert.equal(t.age, 30);
    assert.equal(t.ageIsEstimate, false);
  });

  it('adds up: macros match the calories', () => {
    for (const diet of ['Keto Diet', 'Mediterranean Diet', 'Paleo Diet', 'Flexible Balanced Plan']) {
      const t = targets({ ...profile, diet }, 2026);
      const kcal = t.protein * 4 + t.carbs * 4 + t.fat * 9;
      assert.ok(Math.abs(kcal - t.calories) < 30, `${diet}: ${kcal} vs ${t.calories}`);
    }
    assert.ok(targets({ ...profile, diet: 'Keto Diet' }, 2026).carbs < 50);
  });

  it('creates a deficit for weight loss, never below BMR or 1200', () => {
    const lose = targets({ ...profile, goal: 'Weight' }, 2026);
    assert.equal(lose.calories, 2130);
    const small = targets({ gender: 'Female', height: 150, weight: 45, birthYear: 1950, activityStatus: 'Inactive', goal: 'Weight', diet: 'Flexible Balanced Plan' }, 2026);
    assert.ok(small.calories >= 1200);
    assert.ok(small.calories >= small.bmr - 10);
  });

  it('keeps protein high enough for muscle and weight goals', () => {
    const t = targets({ ...profile, goal: 'Muscle', diet: 'Mediterranean Diet' }, 2026);
    assert.ok(t.protein >= 1.6 * 75);
  });

  it('estimates age when the birth year is missing', () => {
    const t = targets({ ...profile, birthYear: null }, 2026);
    assert.equal(t.ageIsEstimate, true);
    assert.ok(t.notes.some((n) => /birth year/.test(n)));
  });
});

describe('meal plans', () => {
  const TAGS = { 'Keto Diet': 'keto', 'Paleo Diet': 'paleo', 'Mediterranean Diet': 'mediterranean', 'Flexible Balanced Plan': 'flexible' };

  it('fits the diet and lands near the calorie target', () => {
    const bySlug = new Map(foods.map((f) => [f.slug, f]));
    for (const [diet, tag] of Object.entries(TAGS)) {
      const t = targets({ ...profile, diet }, 2026);
      const plan = mealPlan(t, foods, `u1:2026-03-01:${diet}`);
      for (const item of plan.meals.flatMap((m) => m.items)) {
        assert.ok(bySlug.get(item.foodSlug).diets.includes(tag), `${diet}: ${item.foodSlug}`);
      }
      assert.ok(Math.abs(plan.totals.calories - t.calories) / t.calories < 0.25, `${diet}: ${plan.totals.calories} vs ${t.calories}`);
    }
  });

  it('is stable for a day and varies across days', () => {
    const t = targets(profile, 2026);
    const a = mealPlan(t, foods, 'u1:2026-03-01');
    assert.deepEqual(mealPlan(t, foods, 'u1:2026-03-01'), a);
    const slugs = (p) => p.meals.flatMap((m) => m.items.map((i) => i.foodSlug)).join();
    assert.notEqual(slugs(mealPlan(t, foods, 'u1:2026-03-02')), slugs(a));
  });

  it('scales and totals servings', () => {
    assert.deepEqual(scaled({ calories: 100, protein: 10, carbs: 5, fat: 2 }, 1.5), { calories: 150, protein: 15, carbs: 7.5, fat: 3 });
    assert.deepEqual(totals([{ calories: 100, protein: 1 }, { calories: 50.4, protein: 2.25 }]), { calories: 150, protein: 3.3, carbs: 0, fat: 0 });
  });
});
