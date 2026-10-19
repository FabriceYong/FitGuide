/**
 * Nutrition endpoints. Runs inside defineApiSuite against the test Postgres.
 */
const { it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { today, addDays } = require('../utils/dates');

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
