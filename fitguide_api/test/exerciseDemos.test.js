// Exercise demos: matching steps to movements, and the media behind them (no database needed).
require('./helpers/setup');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');
const { matchDemo, allDemos } = require('../utils/exerciseDemos');

describe('matching a step to its movement', () => {
  it('picks the movement the step describes', () => {
    const expected = {
      'Begin in Mountain Pose (Tadasana). Stand tall with feet hip-width apart': 'Mountain pose',
      'Exhale and fold forward from your hips, bringing your hands to the floor (Forward Fold).': 'Forward fold',
      'Inhale into Upward-Facing Dog. Press through your hands': 'Upward-facing dog',
      'Exhale into Downward-Facing Dog. Lift your hips high': 'Downward-facing dog',
      'Rest: Take 30 seconds to recover. Stay active with light stretching or march in place.': 'Rest & recover',
      'Mountain Climbers: Start in plank position. Drive knees toward chest': 'Mountain climbers',
      'Side Plank (Right): Lie on right side, prop up on right forearm.': 'Side plank',
      'Round 2: Repeat all exercises for second set.': 'Rest & recover',
      'Round 1 — Exercise A: Explosive Burpees × 10 reps': 'Burpee',
      'Round 2 — Rest Period: Walk It Out & Breathe': 'Rest & recover',
      'Active Recovery: Slow Walk — 20 seconds': 'Walk',
      'Plank with Shoulder Taps — 2 × 20 taps total': 'Plank shoulder taps',
      'Warrior I — Grounding & Presence': 'Warrior I',
      'Warrior II — Power & Openness': 'Warrior II',
      'Barbell Back Squats — Set 1 of 4 (8–10 reps)': 'Barbell back squat',
      'Round 1 — Exercise B: Jump Squats × 15 reps': 'Jump squat',
      'Tricep Dips or Overhead Extensions — 3 Sets': 'Triceps dip',
      'Standing Lower Body Stretch: Quad, Hip Flexor, Calf': 'Quad stretch',
      'Cool Down: Full Body Static Stretch & Recovery Protocol': 'Standing stretch',
    };
    for (const [instruction, name] of Object.entries(expected)) {
      assert.equal(matchDemo(null, instruction)?.name, name, instruction);
    }
  });

  it('prefers the exercise name, and gives nothing rather than a wrong match', () => {
    assert.equal(matchDemo('Steady jogging', 'Zone 1 Steady State Aerobic Run: Jog at a comfortable pace').name, 'Jog');
    assert.equal(matchDemo(null, 'Visualise your goal and set an intention for today'), null);
  });
});

describe('demo media', () => {
  it('says where every picture comes from and under which licence', () => {
    const withMedia = allDemos('https://api.example.com').filter((d) => d.media);
    assert.ok(withMedia.length >= 40);
    for (const { name, media } of withMedia) {
      assert.ok(media.frames.length >= 1 && media.frames.every((u) => u.startsWith('https://')), name);
      for (const key of ['title', 'source', 'sourceUrl', 'license', 'licenseUrl']) assert.ok(media[key], `${name}: ${key}`);
    }
  });

  it('serves the list and single matches', async () => {
    const app = createApp();
    const list = await request(app).get('/api/exercise-media/demos').expect(200);
    assert.equal(list.body.demos.length, allDemos('').length);
    assert.ok(list.body.demos[0].patterns.length);
    // wger pictures come through the API, which can serve them cross-origin
    const bench = list.body.demos.find((d) => d.name === 'Bench press');
    assert.match(bench.media.frames[0], /^http:\/\/127\.0\.0\.1:\d+\/api\/exercise-media\/picture\/bench-press\/0$/);

    const one = await request(app).get('/api/exercise-media/demo').query({ instruction: 'Round 1 — Exercise B: Jump Squats × 15 reps' }).expect(200);
    assert.equal(one.body.demo.name, 'Jump squat');
    assert.match(one.body.demo.media.frames[0], /Freehand_Jump_Squat/);

    const none = await request(app).get('/api/exercise-media/demo').query({ instruction: 'Visualise your goal' }).expect(200);
    assert.equal(none.body.demo, null);
    await request(app).get('/api/exercise-media/demo').expect(400);
  });

  it('serves wger pictures through the API, fetched once', async () => {
    const app = createApp();
    const realFetch = global.fetch;
    const fetched = [];
    global.fetch = async (url) => {
      fetched.push(url);
      return new Response(Buffer.from('png-bytes'), { headers: { 'content-type': 'image/png' } });
    };
    try {
      for (let i = 0; i < 2; i++) {
        const res = await request(app).get('/api/exercise-media/picture/bench-press/1').expect(200);
        assert.equal(res.headers['content-type'], 'image/png');
        assert.equal(res.body.toString(), 'png-bytes');
      }
      assert.equal(fetched.length, 1);
      assert.match(fetched[0], /^https:\/\/wger\.de\//);
      // Only pictures from the list, and only wger ones
      await request(app).get('/api/exercise-media/picture/bench-press/9').expect(404);
      await request(app).get('/api/exercise-media/picture/squat/0').expect(404);
    } finally {
      global.fetch = realFetch;
    }
  });
});
