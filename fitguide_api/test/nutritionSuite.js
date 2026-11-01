/**
 * Nutrition endpoints. Runs inside defineApiSuite against the test Postgres.
 */
const { it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { today, addDays } = require('../utils/dates');
const barcode = require('../services/barcode');

function defineNutritionSuite(ctx) {
  let app;
  let eater;
  before(async () => {
    ({ app } = ctx());
    eater = await ctx().signUp('Eater');
    await eater.agent.put('/api/auth/profile').send({ birthYear: 1990, diet: 'Mediterranean Diet', goal: 'Weight' }).expect(200);
  });

  it('requires auth', async () => {
    await request(app).get('/api/nutrition/targets').expect(401);
    await request(app).post('/api/nutrition/log').send({}).expect(401);
  });

  it('validates the birth year on the profile', async () => {
    await eater.agent.put('/api/auth/profile').send({ birthYear: new Date().getFullYear() - 5 }).expect(400);
    await eater.agent.put('/api/auth/profile').send({ birthYear: 1800 }).expect(400);
    const me = await eater.agent.get('/api/auth/me').expect(200);
    assert.equal(me.body.user.birthYear, 1990);
  });

  it('computes targets from the profile', async () => {
    const res = await eater.agent.get('/api/nutrition/targets').expect(200);
    const t = res.body.targets;
    assert.equal(t.diet, 'Mediterranean Diet');
    assert.equal(t.ageIsEstimate, false);
    assert.ok(t.calories >= 1200);
  });

  it('searches foods', async () => {
    const res = await eater.agent.get('/api/nutrition/foods').query({ search: 'chick' }).expect(200);
    const slugs = res.body.foods.map((f) => f.slug);
    assert.ok(slugs.includes('chicken-breast'));
    assert.ok(slugs.includes('chickpeas'));
    const keto = await eater.agent.get('/api/nutrition/foods').query({ diet: 'keto' }).expect(200);
    assert.ok(keto.body.foods.length > 0);
    assert.ok(keto.body.foods.every((f) => f.diets.includes('keto')));
  });

  it('logs catalog and one-off foods and totals the day', async () => {
    await eater.agent.post('/api/nutrition/log').send({ meal: 'breakfast', foodSlug: 'egg', servings: 2 }).expect(201);
    await eater.agent.post('/api/nutrition/log').send({ meal: 'lunch', name: 'Homemade soup', servings: 1, calories: 250, protein: 12, carbs: 30, fat: 8 }).expect(201);
    const res = await eater.agent.get('/api/nutrition/log').expect(200);
    assert.equal(res.body.meals.breakfast[0].calories, 144);
    assert.equal(res.body.meals.lunch[0].name, 'Homemade soup');
    assert.equal(res.body.totals.calories, 394);
    assert.ok(res.body.targets.calories > 0);
  });

  it('validates log entries', async () => {
    await eater.agent.post('/api/nutrition/log').send({ meal: 'brunch', foodSlug: 'egg', servings: 1 }).expect(400);
    await eater.agent.post('/api/nutrition/log').send({ meal: 'snack', foodSlug: 'egg', servings: 0 }).expect(400);
    await eater.agent.post('/api/nutrition/log').send({ meal: 'snack', foodSlug: 'no-such-food', servings: 1 }).expect(404);
    await eater.agent.post('/api/nutrition/log').send({ meal: 'snack', name: 'Mystery', servings: 1 }).expect(400);
    await eater.agent.post('/api/nutrition/log').send({ meal: 'snack', foodSlug: 'egg', servings: 1, date: addDays(today(), 2) }).expect(400);
  });

  it('keeps custom foods and logs private', async () => {
    const custom = await eater.agent.post('/api/nutrition/foods').send({ name: 'Grandma pie', calories: 400, protein: 5, carbs: 50, fat: 20 }).expect(201);
    assert.equal(custom.body.food.isCustom, true);
    await eater.agent.post('/api/nutrition/log').send({ meal: 'dinner', foodSlug: custom.body.food.slug, servings: 0.5 }).expect(201);

    const other = await ctx().signUp('Neighbour');
    const search = await other.agent.get('/api/nutrition/foods').query({ search: 'Grandma' }).expect(200);
    assert.equal(search.body.count, 0);
    await other.agent.post('/api/nutrition/log').send({ meal: 'dinner', foodSlug: custom.body.food.slug, servings: 1 }).expect(404);
    const otherLog = await other.agent.get('/api/nutrition/log').expect(200);
    assert.equal(otherLog.body.totals.calories, 0);

    const entry = (await eater.agent.get('/api/nutrition/log').expect(200)).body.meals.dinner[0];
    await other.agent.delete(`/api/nutrition/log/${entry.id}`).expect(404);
    await eater.agent.delete(`/api/nutrition/log/${entry.id}`).expect(200);
  });

  it('counts water drunk, never below none', async () => {
    const drinker = await ctx().signUp('Drinker');
    await drinker.agent.put('/api/auth/profile').send({ weight: 80 }).expect(200);
    await request(app).post('/api/nutrition/water').send({ ml: 250 }).expect(401);
    await drinker.agent.post('/api/nutrition/water').send({ ml: 'lots' }).expect(400);
    await drinker.agent.post('/api/nutrition/water').send({ ml: 250, date: addDays(today(), 2) }).expect(400);

    assert.deepEqual((await drinker.agent.get('/api/nutrition/log').expect(200)).body.water, { ml: 0 });
    await drinker.agent.post('/api/nutrition/water').send({ ml: 250 }).expect(200);
    const added = await drinker.agent.post('/api/nutrition/water').send({ ml: 500 }).expect(200);
    assert.equal(added.body.water.ml, 750);
    const day = (await drinker.agent.get('/api/nutrition/log').expect(200)).body;
    assert.equal(day.water.ml, 750);
    // 80 kg × 35 ml = 2.8 l, in whole glasses.
    assert.equal(day.targets.waterMl, 2750);

    const undone = await drinker.agent.post('/api/nutrition/water').send({ ml: -1000 }).expect(200);
    assert.equal(undone.body.water.ml, 0);
    // Other days and other people are separate.
    const yesterday = await drinker.agent.post('/api/nutrition/water').send({ ml: 250, date: addDays(today(), -1) }).expect(200);
    assert.equal(yesterday.body.water.ml, 250);
    assert.equal((await eater.agent.get('/api/nutrition/log').expect(200)).body.water.ml, 0);
  });

  it('looks up packaged food by barcode', async () => {
    const asked = [];
    barcode.setFetch(async (url, options) => {
      asked.push({ url, agent: options.headers['User-Agent'] });
      if (url.includes('/3017620422003.')) {
        return new Response(JSON.stringify({ status: 1, product: {
          product_name: 'Hazelnut spread', brands: 'Nutella, Ferrero', serving_size: '15 g',
          nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9, 'energy-kcal_serving': 80.9, proteins_serving: 0.9, carbohydrates_serving: 8.6, fat_serving: 4.6 },
        } }), { status: 200 });
      }
      if (url.includes('/5000000000000.')) return new Response('', { status: 500 });
      return new Response(JSON.stringify({ status: 0 }), { status: 200 });
    });
    try {
      await request(app).get('/api/nutrition/barcode/3017620422003').expect(401);
      await eater.agent.get('/api/nutrition/barcode/12ab').expect(400);
      const found = await eater.agent.get('/api/nutrition/barcode/3017620422003').expect(200);
      assert.deepEqual(found.body.product, {
        code: '3017620422003', name: 'Hazelnut spread', brand: 'Nutella', serving: '15 g',
        per100g: { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 },
        perServing: { calories: 80.9, protein: 0.9, carbs: 8.6, fat: 4.6 },
      });
      assert.match(asked[0].agent, /^FitGuide\//);
      // Asked once a day per product.
      await eater.agent.get('/api/nutrition/barcode/3017620422003').expect(200);
      assert.equal(asked.length, 1);
      await eater.agent.get('/api/nutrition/barcode/4000000000000').expect(404);
      await eater.agent.get('/api/nutrition/barcode/5000000000000').expect(503);
    } finally {
      barcode.setFetch(null);
    }
  });

  it('suggests a meal plan near the target', async () => {
    const res = await eater.agent.get('/api/nutrition/meal-plan').expect(200);
    assert.equal(res.body.meals.length, 4);
    assert.ok(Math.abs(res.body.totals.calories - res.body.target.calories) / res.body.target.calories < 0.25);
  });

  it('reports daily history', async () => {
    const res = await eater.agent.get('/api/nutrition/history').query({ days: 7 }).expect(200);
    assert.equal(res.body.days.length, 7);
    assert.equal(res.body.days[6].date, today());
    assert.equal(res.body.days[6].calories, 394);
  });
}

module.exports = { defineNutritionSuite };
