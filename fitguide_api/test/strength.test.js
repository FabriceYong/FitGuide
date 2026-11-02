const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { oneRepMax, standardsFor, strengthLevels, LIFTS } = require('../services/strength');

const session = (...sets) => ({ sets });

describe('strength levels', () => {
  it('estimates a one-rep max', () => {
    assert.equal(oneRepMax(100, 1), 100);
    assert.equal(Math.round(oneRepMax(60, 10)), 80);
  });

  it('places each logged lift against body weight, with the kg to the next level', () => {
    // 80 kg man: squat 100 kg × 5 → about 116.7 kg, 1.46× body weight (Novice; Intermediate at 120 kg).
    const [squat] = strengthLevels([session({ exerciseSlug: 'back-squat', reps: 5, weightKg: 100 })], 80, 'Male');
    assert.deepEqual([squat.lift, squat.level, squat.nextLevel, squat.nextKg, squat.toNextKg, squat.ratio], ['Squat', 'Novice', 'Intermediate', 120, 3.5, 1.46]);
    assert.ok(squat.progress > 0.8 && squat.progress < 1);
  });

  it('uses the best set, ignores long sets, and lists lifts in a fixed order', () => {
    const levels = strengthLevels([
      session({ exerciseSlug: 'bench-press', reps: 3, weightKg: 60 }, { exerciseSlug: 'bench-press', reps: 20, weightKg: 50 }),
      session({ exerciseSlug: 'back-squat', reps: 1, weightKg: 40 }, { exerciseSlug: 'goblet-squat', reps: 10, weightKg: 24 }),
    ], 60, 'Female');
    assert.deepEqual(levels.map((l) => l.lift), ['Squat', 'Bench press']);
    // Bench 60 × 3 = 66 kg, 1.1× for a 60 kg woman: Advanced.
    assert.equal(levels[1].oneRepMaxKg, 66);
    assert.equal(levels[1].level, 'Advanced');
  });

  it('says starting out below the first level, and has no next level at the top', () => {
    const [low] = strengthLevels([session({ exerciseSlug: 'deadlift', reps: 5, weightKg: 40 })], 90, 'Male');
    assert.deepEqual([low.level, low.nextLevel], [null, 'Beginner']);
    const [top] = strengthLevels([session({ exerciseSlug: 'deadlift', reps: 1, weightKg: 300 })], 90, 'Male');
    assert.deepEqual([top.level, top.nextLevel, top.toNextKg, top.progress], ['Elite', null, null, 1]);
  });

  it('uses standards halfway between when sex is not given', () => {
    assert.deepEqual(standardsFor(LIFTS[0], 'Prefer not to say'), [0.63, 1, 1.38, 1.88, 2.38]);
    assert.deepEqual(strengthLevels([], 0, 'Male'), []);
  });
});
