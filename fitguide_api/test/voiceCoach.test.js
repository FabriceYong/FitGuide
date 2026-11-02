const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spokenWeight, stepCoaching, setPraise } = require('@fitguide/shared/voiceCoach');

describe('voice coach', () => {
  it('speaks weights in the member’s units', () => {
    assert.equal(spokenWeight(22.5), '22.5 kilos');
    assert.equal(spokenWeight(20), '20 kilos');
    assert.equal(spokenWeight(1), '1 kilo');
    assert.equal(spokenWeight(20, 'imperial'), '44.1 pounds');
  });

  it('says last time and today’s suggestion as a step starts', () => {
    assert.equal(stepCoaching({ index: 0, total: 6, last: { reps: 8, weightKg: 20 }, suggestion: { reps: 8, weightKg: 22.5 } }), 'Last time, 20 kilos for 8. Today, try 22.5 kilos for 8.');
    assert.equal(stepCoaching({ index: 0, total: 6, last: { reps: 12 }, suggestion: { reps: 12 } }), 'Last time, 12 reps.');
    assert.equal(stepCoaching({ index: 1, total: 6 }), '');
  });

  it('says halfway and the last exercise', () => {
    assert.equal(stepCoaching({ index: 3, total: 6 }), 'Halfway there.');
    assert.equal(stepCoaching({ index: 5, total: 6 }), 'Last one. Finish strong!');
    assert.equal(stepCoaching({ index: 1, total: 2 }), '');
  });

  it('praises a set that beats last time', () => {
    assert.equal(setPraise({ logged: { reps: 8, weightKg: 22.5 }, last: { reps: 8, weightKg: 20 } }), "That's 2.5 kilos more than last time. Nice work!");
    assert.equal(setPraise({ logged: { reps: 10, weightKg: 20 }, last: { reps: 8, weightKg: 20 } }), '2 more reps than last time. Strong!');
    assert.equal(setPraise({ logged: { reps: 13 }, last: { reps: 12 } }), '1 more rep than last time. Strong!');
    assert.equal(setPraise({ logged: { reps: 6, weightKg: 20 }, last: { reps: 8, weightKg: 20 } }), null);
    assert.equal(setPraise({ logged: { reps: 8, weightKg: 20 }, last: null }), null);
  });
});
