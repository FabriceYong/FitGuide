const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { score } = require('../services/readiness');

const base = { energy: 3, soreness: 1, sleepMinutes: null, restingHrDiff: null, hardYesterday: false, daysInARow: 0 };

describe('readiness score', () => {
  it('is neutral with an ordinary check-in and nothing else known', () => {
    const r = score(base);
    assert.deepEqual([r.score, r.band, r.headline], [70, 'steady', 'Good to train']);
    assert.deepEqual(r.reasons, []);
  });

  it('is high after a long sleep, feeling great and fresh', () => {
    const r = score({ ...base, energy: 5, sleepMinutes: 500, restingHrDiff: -4 });
    assert.deepEqual([r.score, r.band], [98, 'push']);
    assert.deepEqual(r.reasons.map((x) => x.text), ['Feeling great', 'Slept 8 h 20 min', 'Resting heart rate below your usual']);
  });

  it('is low after short sleep, soreness, a raised heart rate and hard days', () => {
    const r = score({ energy: 2, soreness: 4, sleepMinutes: 290, restingHrDiff: 8, hardYesterday: true, daysInARow: 3 });
    assert.deepEqual([r.score, r.band, r.headline], [0, 'easy', 'Take it easy']);
    assert.ok(r.reasons.every((x) => x.effect === 'down'));
    assert.ok(r.reasons.some((x) => x.text === 'Resting heart rate 8 above your usual'));
  });

  it('marks the band edges', () => {
    assert.equal(score({ ...base, energy: 4, soreness: 2 }).score, 72);
    assert.equal(score({ ...base, energy: 4 }).band, 'push'); // 78
    assert.equal(score({ ...base, soreness: 4 }).band, 'steady'); // 52
    assert.equal(score({ ...base, soreness: 5 }).band, 'easy'); // 46
  });
});
