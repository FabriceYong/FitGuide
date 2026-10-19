// Unit tests for the rules-based plan generator (no database).
require('./helpers/setup');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const workouts = require('../seed/workoutSeeder');
const { generatePlan, weeklyGroups, adaptDirection, swapFor, equipmentOptions, requiredEquipment } = require('../services/planGenerator');

const base = { goal: 'Muscle', level: 'Intermediate', daysPerWeek: 4, minutesPerSession: 45, equipment: ['Dumbbells', 'Barbell', 'Bench'], weeks: 4 };

describe('plan generator', () => {
  it('lays out the requested days and weeks', () => {
    const { days } = generatePlan(base, workouts);
    assert.equal(days.length, 16);
    assert.deepEqual([...new Set(days.filter((d) => d.week === 1).map((d) => d.day))], [1, 2, 4, 5]);
  });

  it('respects level, equipment and time', () => {
    const beginner = { ...base, level: 'Beginner', equipment: [], minutesPerSession: 30 };
    const { days } = generatePlan(beginner, workouts);
    const bySlug = new Map(workouts.map((w) => [w.slug, w]));
    for (const d of days) {
      const w = bySlug.get(d.workoutSlug);
      assert.ok(['Beginner', 'All Levels'].includes(w.difficulty), `${w.slug} is ${w.difficulty}`);
      assert.deepEqual(requiredEquipment(w), [], `${w.slug} needs equipment`);
      assert.ok(w.duration <= 35, `${w.slug} is ${w.duration} min`);
    }
  });

  it('weights the week toward the goal', () => {
    const groups = weeklyGroups('Muscle', 5).map((g) => g.label);
    assert.equal(groups.filter((g) => g === 'Strength').length, 3);
    assert.equal(weeklyGroups('Flexibility', 3).filter((g) => g.label === 'Mobility').length, 2);
  });

  it("doesn't repeat a workout within a week when it can avoid it", () => {
    const { days } = generatePlan({ ...base, goal: 'Vitality', level: 'Advanced', daysPerWeek: 5, equipment: equipmentOptions(workouts) }, workouts);
    for (let week = 1; week <= 4; week += 1) {
      const slugs = days.filter((d) => d.week === week).map((d) => d.workoutSlug);
      assert.equal(new Set(slugs).size, slugs.length);
    }
  });

  it('warns and returns nothing when no workout fits', () => {
    const { days, warnings } = generatePlan({ ...base, level: 'Beginner' }, workouts.filter((w) => w.difficulty === 'Advanced'));
    assert.equal(days.length, 0);
    assert.match(warnings[0], /No workouts match/);
  });
});

describe('plan adaptation', () => {
  it('eases off when sessions feel very hard or are skipped', () => {
    assert.equal(adaptDirection([{ perceivedEffort: 9 }, { perceivedEffort: 9 }], 90).direction, 'easier');
    assert.equal(adaptDirection([{ perceivedEffort: 6 }], 30).direction, 'easier');
  });

  it('steps up when sessions feel easy and adherence is good', () => {
    const easy = [{ perceivedEffort: 4 }, { perceivedEffort: 5 }, { perceivedEffort: 4 }];
    assert.equal(adaptDirection(easy, 90).direction, 'harder');
    assert.equal(adaptDirection(easy.slice(0, 2), 90).direction, 'keep');
    assert.equal(adaptDirection([], null).direction, 'keep');
  });

  it('swaps for a shorter or longer workout in the same category', () => {
    const current = workouts.find((w) => w.slug === 'full-body-strength-builder');
    const easier = swapFor(current, 'easier', workouts);
    const harder = swapFor(current, 'harder', workouts);
    assert.equal(easier.category, 'Strength');
    assert.ok(easier.duration < current.duration || easier.difficulty === 'Beginner');
    assert.equal(harder.category, 'Strength');
  });
});
