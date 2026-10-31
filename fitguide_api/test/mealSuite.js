/**
 * Reading a meal from a photo or a description: food matching, one-off
 * estimates, the daily allowance and what's sent to the model. Runs inside
 * defineApiSuite against the test Postgres, with a fake Anthropic client.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { prisma } = require('../db/prisma');
const meals = require('../services/mealRecognition');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

/** A fake client that answers each request with `record_meal` input, and keeps the requests. */
function fakeClient(answers) {
  const requests = [];
  return {
    requests,
    beta: {
      messages: {
        async create(params) {
          requests.push(params);
          const next = answers.shift();
          if (next instanceof Error) throw next;
          return next || { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'record_meal', input: { items: [], note: null } }] };
        },
      },
    },
  };
}

const meal = (items, note = null) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'record_meal', input: { items, note } }] });
const item = (o) => ({ name: 'Food', foodSlug: null, grams: 100, portion: '1 serving', calories: 100, protein: 5, carbs: 10, fat: 3, confidence: 'medium', ...o });

function defineMealSuite(ctx) {
  let app;
  let eater;
  before(async () => {
    ({ app } = ctx());
    eater = await ctx().signUp('Plate Reader');
  });
  after(() => meals.setClient(null));

  it('needs an account, and says when it is not set up', async () => {
    meals.setClient(null);
    await request(app).get('/api/nutrition/recognize').expect(401);
    const status = await eater.agent.get('/api/nutrition/recognize').expect(200);
    assert.equal(status.body.available, false);
    assert.deepEqual(status.body.allowance.photos, { used: 0, max: 3, left: 3 });
    const res = await eater.agent.post('/api/nutrition/recognize/text').send({ text: 'two eggs' }).expect(503);
    assert.match(res.body.message, /not set up/);
  });

  it('reads a photo: list foods get servings from grams, the rest keep the estimate', async () => {
    const fake = fakeClient([meal([
      item({ name: 'Grilled chicken breast', foodSlug: 'chicken-breast', grams: 150, portion: '1 breast', confidence: 'high' }),
      item({ name: 'Eggs', foodSlug: 'egg', grams: 100, portion: '2 eggs' }),
      item({ name: 'Peri-peri sauce', foodSlug: null, grams: 30, portion: '2 tbsp', calories: 45, protein: 0.4, carbs: 3.2, fat: 3.6, confidence: 'low' }),
      item({ name: 'Mystery', foodSlug: 'not-a-food', grams: 50, calories: 80 }),
    ], 'Oil not visible')]);
    meals.setClient(fake);

    const res = await eater.agent.post('/api/nutrition/recognize/photo').attach('photo', PNG, { filename: 'plate.png', contentType: 'image/png' }).expect(200);
    const [chicken, eggs, sauce, mystery] = res.body.items;
    // 150 g of a 100 g serving: 1.5 servings at the list's 165 kcal / 31 g protein.
    assert.deepEqual([chicken.foodSlug, chicken.servings, chicken.calories, chicken.protein], ['chicken-breast', 1.5, 248, 46.5]);
    assert.deepEqual([eggs.foodSlug, eggs.servings], ['egg', 2]);
    assert.deepEqual([sauce.foodSlug, sauce.servings, sauce.calories, sauce.fat, sauce.confidence], [null, 1, 45, 3.6, 'low']);
    assert.equal(mystery.foodSlug, null, 'an unknown slug falls back to the estimate');
    assert.equal(res.body.note, 'Oil not visible');
    assert.deepEqual(res.body.allowance.photos, { used: 1, max: 3, left: 2 });

    // The photo went to the model with the food list, and was not stored.
    const sent = fake.requests[0];
    assert.equal(sent.messages[0].content[0].type, 'image');
    assert.equal(sent.messages[0].content[0].source.media_type, 'image/png');
    assert.match(sent.system[1].text, /chicken-breast: Chicken breast, cooked/);
    assert.deepEqual(sent.tool_choice, { type: 'tool', name: 'record_meal' });
    const logged = await prisma.foodLog.count({ where: { userId: eater.user.id } });
    assert.equal(logged, 0, 'nothing is logged until the member confirms');
  });

  it('reads a description, and the items log through the food log', async () => {
    meals.setClient(fakeClient([meal([item({ name: 'Salmon', foodSlug: 'salmon', grams: 125 })])]));
    const res = await eater.agent.post('/api/nutrition/recognize/text').send({ text: 'a salmon fillet' }).expect(200);
    const [salmon] = res.body.items;
    assert.equal(salmon.servings, 1.25);
    await eater.agent.post('/api/nutrition/log').send({ meal: 'dinner', foodSlug: salmon.foodSlug, servings: salmon.servings }).expect(201);
    const day = await eater.agent.get('/api/nutrition/log').expect(200);
    assert.equal(day.body.meals.dinner[0].calories, salmon.calories);
    await eater.agent.post('/api/nutrition/recognize/text').send({ text: 'x' }).expect(400);
  });

  it('stops at the daily allowance for free accounts, not for PLUS within theirs', async () => {
    const reader = await ctx().signUp('Snap Happy');
    meals.setClient(fakeClient([]));
    for (let i = 0; i < 3; i += 1) {
      await reader.agent.post('/api/nutrition/recognize/photo').attach('photo', PNG, { filename: 'p.png', contentType: 'image/png' }).expect(200);
    }
    const blocked = await reader.agent.post('/api/nutrition/recognize/photo').attach('photo', PNG, { filename: 'p.png', contentType: 'image/png' }).expect(429);
    assert.equal(blocked.body.code, 'LIMIT_REACHED');
    assert.match(blocked.body.message, /3 meal photos a day/);
    // Descriptions have their own allowance.
    await reader.agent.post('/api/nutrition/recognize/text').send({ text: 'a banana' }).expect(200);

    await prisma.user.update({ where: { id: reader.user.id }, data: { plan: 'plus' } });
    await reader.agent.post('/api/nutrition/recognize/photo').attach('photo', PNG, { filename: 'p.png', contentType: 'image/png' }).expect(200);
    const status = await reader.agent.get('/api/nutrition/recognize').expect(200);
    assert.deepEqual(status.body.allowance.photos, { used: 4, max: 30, left: 26 });
  });

  it('turns away files that are not photos, and model failures', async () => {
    meals.setClient(fakeClient([{ stop_reason: 'refusal', content: [] }, Object.assign(new Error('overloaded'), { status: 529 })]));
    await eater.agent.post('/api/nutrition/recognize/photo').attach('photo', Buffer.from('not an image'), { filename: 'p.png', contentType: 'image/png' }).expect(400);
    await eater.agent.post('/api/nutrition/recognize/photo').attach('photo', Buffer.from('%PDF-1.4'), { filename: 'p.pdf', contentType: 'application/pdf' }).expect(400);
    const refused = await eater.agent.post('/api/nutrition/recognize/photo').attach('photo', PNG, { filename: 'p.png', contentType: 'image/png' }).expect(422);
    assert.match(refused.body.message, /couldn't be read as a meal/);
  });

  describe('turning an answer into items', () => {
    it('keeps portions in quarter servings within limits', () => {
      const food = { slug: 'rice', name: 'Rice', servingSize: 100, calories: 130, protein: 2.7, carbs: 28, fat: 0.3 };
      const bySlug = new Map([['rice', food]]);
      assert.equal(meals.toItem(item({ foodSlug: 'rice', grams: 180 }), bySlug).servings, 1.75);
      assert.equal(meals.toItem(item({ foodSlug: 'rice', grams: 5 }), bySlug).servings, 0.25);
      assert.equal(meals.toItem(item({ foodSlug: 'rice', grams: 99999 }), bySlug).servings, 20);
      assert.equal(meals.toItem(item({ calories: -40 }), bySlug).calories, 0);
    });
  });
}

module.exports = { defineMealSuite };
