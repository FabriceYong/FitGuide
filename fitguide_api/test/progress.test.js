// Unit tests for the pure progress calculations and exercise-name matching.
require('./helpers/setup');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { activityByDate, streaks, personalRecords, describeEnrollment, repRange, suggestNext, previousSets } = require('../services/progress');
const { localDate, addDays, isValidYmd } = require('../utils/dates');
const { exerciseStore } = require('../stores/records');
const exercisesData = require('../seed/exerciseSeeder');
const programsData = require('../seed/programSeeder');
const workoutsData = require('../seed/workoutSeeder');

describe('dates', () => {
  it('converts instants to the local calendar date', () => {
    assert.equal(localDate('2026-03-01T23:30:00Z', 0), '2026-03-01');
    assert.equal(localDate('2026-03-01T23:30:00Z', -60), '2026-03-02'); // UTC+1
    assert.equal(localDate('2026-03-01T03:00:00Z', 300), '2026-02-28'); // UTC-5
  });

  it('validates calendar dates', () => {
    assert.ok(isValidYmd('2028-02-29'));
    assert.ok(!isValidYmd('2026-02-29'));
    assert.ok(!isValidYmd('2026-2-01'));
    assert.ok(!isValidYmd(20260201));
  });
});

describe('activity and streaks', () => {
  it('groups sessions by local day', () => {
    const byDate = activityByDate([
      { completedAt: '2026-03-01T23:30:00Z', durationSec: 1800, calories: 200 },
      { completedAt: '2026-03-02T08:00:00Z', durationSec: 600, calories: 50 },
    ], -60);
    assert.deepEqual(byDate.get('2026-03-02'), { sessions: 2, minutes: 40, calories: 250 });
    assert.equal(byDate.has('2026-03-01'), false);
  });

  it('counts the current and longest streaks', () => {
    const today = '2026-03-10';
    const dates = new Set(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-08', '2026-03-09']);
    assert.deepEqual(streaks(dates, today), { current: 2, longest: 4, trainedToday: false });
    dates.add(today);
    assert.deepEqual(streaks(dates, today), { current: 3, longest: 4, trainedToday: true });
    assert.deepEqual(streaks(new Set(['2026-03-07']), today), { current: 0, longest: 1, trainedToday: false });
  });
});

describe('personal records', () => {
  const exercisesBySlug = new Map(exercisesData.map((e) => [e.slug, e]));
  const at = (day, sets, id = day) => ({ id, completedAt: `2026-03-${day}T10:00:00Z`, workoutTitle: 'W', sets });

  it('uses the measure that fits each exercise', () => {
    const records = personalRecords([
      at('01', [
        { exerciseSlug: 'back-squat', exerciseName: 'Squat', reps: 5, weightKg: 100, durationSec: 300 },
        { exerciseSlug: 'push-up', exerciseName: 'Push-Up', reps: 20, durationSec: 60 },
        { exerciseSlug: 'plank', exerciseName: 'Plank', durationSec: 90, reps: 1 },
        { exerciseSlug: 'running', exerciseName: 'Run', distanceM: 5000, durationSec: 1500 },
      ]),
    ], exercisesBySlug);
    const by = Object.fromEntries(records.map((r) => [r.exerciseSlug, r]));
    assert.deepEqual([by['back-squat'].value, by['back-squat'].unit, by['back-squat'].estimatedOneRepMaxKg], [100, 'kg', 116.7]);
    assert.deepEqual([by['push-up'].value, by['push-up'].unit], [20, 'reps']);
    assert.deepEqual([by.plank.value, by.plank.unit], [90, 'sec']);
    assert.deepEqual([by.running.value, by.running.unit], [5000, 'm']);
  });

  it('keeps the earlier record on a tie and moves on a beat', () => {
    const records = personalRecords([
      at('03', [{ exerciseSlug: 'push-up', exerciseName: 'Push-Up', reps: 30 }], 'c'),
      at('01', [{ exerciseSlug: 'push-up', exerciseName: 'Push-Up', reps: 25 }], 'a'),
      at('02', [{ exerciseSlug: 'push-up', exerciseName: 'Push-Up', reps: 25 }], 'b'),
      at('04', [{ exerciseSlug: 'push-up', exerciseName: 'Push-Up', reps: 30 }], 'd'),
    ], exercisesBySlug);
    assert.equal(records.length, 1);
    assert.equal(records[0].sessionId, 'c');
  });

  it('ignores unmatched sets that were only timed', () => {
    const records = personalRecords([
      at('01', [
        { exerciseSlug: null, exerciseName: 'Warm-up', durationSec: 300 },
        { exerciseSlug: null, exerciseName: 'Sled push', weightKg: 80 },
      ]),
    ], exercisesBySlug);
    assert.deepEqual(records.map((r) => r.exerciseName), ['Sled push']);
  });
});

describe('last time and what to aim for', () => {
  it('reads rep targets', () => {
    assert.deepEqual(repRange('8–10'), { min: 8, max: 10 });
    assert.deepEqual(repRange('12'), { min: 12, max: 12 });
    assert.equal(repRange('10-8'), null);
    assert.equal(repRange(undefined), null);
  });

  it('adds reps up to the top of the range, then weight', () => {
    assert.deepEqual(suggestNext({ reps: 8, weightKg: 60 }, '8–10'), { reps: 9, weightKg: 60, reason: 'more_reps' });
    assert.deepEqual(suggestNext({ reps: 10, weightKg: 60 }, '8–10'), { reps: 8, weightKg: 62.5, reason: 'add_weight' });
    // Light dumbbells go up by 1 kg.
    assert.deepEqual(suggestNext({ reps: 12, weightKg: 8 }, '10–12'), { reps: 10, weightKg: 9, reason: 'add_weight' });
    assert.deepEqual(suggestNext({ reps: 6, weightKg: 60 }, '8–10'), { reps: 8, weightKg: 60, reason: 'reach_range' });
    // Without a range or a weight: one more rep.
    assert.deepEqual(suggestNext({ reps: 5, weightKg: 100 }), { reps: 6, weightKg: 100, reason: 'more_reps' });
    assert.deepEqual(suggestNext({ reps: 15 }, '15'), { reps: 16, reason: 'more_reps' });
    // Nothing to go on.
    assert.equal(suggestNext({ weightKg: 60 }, '8–10'), null);
    assert.equal(suggestNext(null, '8–10'), null);
  });

  it('adds weight in pounds for lifters who use them', () => {
    const lb = (kg) => Math.round(kg * 2.20462 * 10) / 10;
    // 135 lb (61.235 kg) → 140 lb; 30 lb dumbbells → 32.5 lb.
    assert.equal(lb(suggestNext({ reps: 10, weightKg: 61.235 }, '8–10', 'imperial').weightKg), 140);
    assert.equal(lb(suggestNext({ reps: 12, weightKg: 13.608 }, '10–12', 'imperial').weightKg), 32.5);
    // Same weight: unchanged, whatever the units.
    assert.equal(suggestNext({ reps: 8, weightKg: 61.235 }, '8–10', 'imperial').weightKg, 61.235);
  });

  it('pairs each step with the same set in the latest session that had it', () => {
    const keyOf = (name) => (/squat/i.test(name) ? 'slug:back-squat' : `name:${name.toLowerCase()}`);
    const sessions = [ // newest first
      { completedAt: '2026-03-05T10:00:00Z', sets: [
        { exerciseSlug: null, exerciseName: 'Burpees', reps: 10 },
        { exerciseSlug: null, exerciseName: 'Burpees', durationSec: 60 }, // timed only: not a set to compare
      ] },
      { completedAt: '2026-03-03T10:00:00Z', sets: [
        { exerciseSlug: 'back-squat', exerciseName: 'Squats set 1', reps: 10, weightKg: 60 },
        { exerciseSlug: 'back-squat', exerciseName: 'Squats set 2', reps: 8, weightKg: 60 },
      ] },
      { completedAt: '2026-03-01T10:00:00Z', sets: [{ exerciseSlug: 'back-squat', exerciseName: 'Squats', reps: 5, weightKg: 50 }] },
    ];
    const result = previousSets(sessions, [
      { name: 'Barbell Back Squats — Set 1', reps: '8–10' },
      { name: 'Barbell Back Squats — Set 2', reps: '8–10' },
      { name: 'Barbell Back Squats — Set 3', reps: '8–10' },
      { name: 'Burpees', reps: '10' },
      { name: 'Plank' },
    ], keyOf);
    assert.deepEqual(result.map((r) => r.last && [r.last.reps, r.last.weightKg, r.last.completedAt.slice(0, 10)]), [
      [10, 60, '2026-03-03'], [8, 60, '2026-03-03'], [8, 60, '2026-03-03'], [10, null, '2026-03-05'], null,
    ]);
    assert.deepEqual(result.map((r) => r.suggestion?.reason ?? null), ['add_weight', 'more_reps', 'more_reps', 'more_reps', null]);
    assert.equal(result[0].suggestion.weightKg, 62.5);
  });
});

describe('enrollment schedule', () => {
  const program = programsData.find((p) => p.slug === 'foundations-starter');
  const enrollment = {
    id: 'e1',
    programSlug: program.slug,
    startDate: '2026-03-02',
    status: 'active',
    completedDays: [{ week: 1, day: 3, sessionId: 's1', completedAt: '2026-03-04T10:00:00Z' }],
  };

  it('lays program days out on the calendar with their status', () => {
    const e = describeEnrollment(enrollment, program, '2026-03-06');
    assert.deepEqual(e.schedule.slice(0, 4).map((d) => [d.date, d.status]), [
      ['2026-03-02', 'missed'],
      ['2026-03-04', 'done'],
      ['2026-03-06', 'today'],
      ['2026-03-09', 'upcoming'],
    ]);
    // Today's day is not due until done: 1 of the 2 earlier days was done.
    assert.equal(e.dueCount, 2);
    assert.equal(e.adherencePct, 50);
    const doneToday = describeEnrollment({
      ...enrollment,
      completedDays: [...enrollment.completedDays, { week: 1, day: 5, sessionId: 's2', completedAt: '2026-03-06T10:00:00Z' }],
    }, program, '2026-03-06');
    assert.equal(doneToday.dueCount, 3);
    assert.equal(doneToday.adherencePct, 67);
    assert.equal(e.completedCount, 1);
    assert.equal(e.percentComplete, 8);
    assert.deepEqual([e.nextDay.week, e.nextDay.day], [1, 1]);
    assert.equal(e.endDate, addDays('2026-03-02', 3 * 7 + 4));
  });

  it('has no adherence before the first day', () => {
    assert.equal(describeEnrollment(enrollment, program, '2026-03-01').adherencePct, null);
  });
});

describe('seed catalog', () => {
  it('has unique exercise slugs and aliases', () => {
    const seen = new Map();
    for (const e of exercisesData) {
      for (const name of [e.slug, ...e.aliases.map(exerciseStore.normalizeName)]) {
        assert.ok(!seen.has(name), `"${name}" used by ${seen.get(name)} and ${e.slug}`);
        seen.set(name, e.slug);
      }
    }
  });

  it('only schedules real workouts, within the program length', () => {
    const slugs = new Set(workoutsData.map((w) => w.slug));
    for (const p of programsData) {
      assert.equal(p.days.length, p.weeks * p.daysPerWeek, p.slug);
      for (const d of p.days) {
        assert.ok(slugs.has(d.workoutSlug), `${p.slug}: ${d.workoutSlug}`);
        assert.ok(d.week <= p.weeks && d.day >= 1 && d.day <= 7);
      }
    }
  });
});

describe('exercise matching', () => {
  const match = (name) => exerciseStore.matchExercise(name, exercisesData)?.slug ?? null;

  it('matches the names used in workout steps', () => {
    for (const step of workoutsData.flatMap((w) => w.steps || [])) {
      if (step.exerciseName) assert.ok(match(step.exerciseName), `no match for "${step.exerciseName}"`);
    }
  });

  it('matches exact names, aliases and longer descriptions', () => {
    assert.equal(match("Child's Pose"), 'childs-pose');
    assert.equal(match('Push-Ups'), 'push-up');
    assert.equal(match('Barbell Back Squats — Set 2 of 4'), 'back-squat');
    assert.equal(match('Speed Interval 1: High Knees — 40 seconds MAX EFFORT'), 'high-knees');
    assert.equal(match('Side Plank — Left Side 3 × 30 seconds'), 'side-plank');
    assert.equal(match('Fast Feet & Drop Squats'), 'bodyweight-squat');
    assert.equal(match('Opening Centering: Breath Awareness'), null);
    assert.equal(match(''), null);
  });
});
