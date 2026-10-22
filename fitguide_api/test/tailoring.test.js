// Tailoring rules in @fitguide/shared, checked against the seed catalog.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  PROFILE, EQUIPMENT_KITS, calorieFactor, personalCalories, suggestedFocusAreas, rankWorkouts, workoutFit, requiredEquipment, limitationConflicts,
} = require('@fitguide/shared');
const { targets } = require('../services/nutrition');
const catalog = require('../seed/workoutSeeder');

const bySlug = (slug) => catalog.find((w) => w.slug === slug);

describe('calorie estimates', () => {
  const base = { height: 170, weight: 70, birthYear: 1996 };

  it('scales by resting energy, so sex, size and age all count', () => {
    const year = 2026;
    const male = calorieFactor({ ...base, gender: 'Male' }, year);
    const female = calorieFactor({ ...base, gender: 'Female' }, year);
    const unsaid = calorieFactor({ ...base, gender: 'Prefer not to say' }, year);
    assert.ok(male > unsaid && unsaid > female);
    assert.ok(calorieFactor({ ...base, gender: 'Male', weight: 95 }, year) > male);
    assert.ok(calorieFactor({ ...base, gender: 'Male', birthYear: 1956 }, year) < male);
    // 70 kg, 170 cm, 30-year-old man: 1617.5 / 1680
    assert.equal(personalCalories(300, { ...base, gender: 'Male' }, year), 289);
  });

  it('matches the BMR used for nutrition targets', () => {
    const profile = { ...base, gender: 'Female', activityStatus: 'Active', goal: 'Vitality', diet: 'Mediterranean Diet' };
    assert.equal(Math.round(calorieFactor(profile, 2026) * 1680), targets(profile, 2026).bmr);
  });

  it('leaves estimates alone without body measurements', () => {
    assert.equal(calorieFactor(null), 1);
    assert.equal(calorieFactor({ gender: 'Male' }), 1);
    assert.equal(personalCalories(null, { ...base, gender: 'Male' }), null);
  });
});

describe('sign-up suggestions', () => {
  it('start from the goal and add a few common picks by gender', () => {
    assert.deepEqual(suggestedFocusAreas({ goal: 'Weight', gender: 'Prefer not to say' }), ['Full Body', 'Core', 'Legs']);
    assert.ok(suggestedFocusAreas({ goal: 'Weight', gender: 'Female' }).includes('Glutes'));
    assert.ok(suggestedFocusAreas({ goal: 'Weight', gender: 'Male' }).includes('Arms'));
    assert.deepEqual(suggestedFocusAreas({ goal: 'Muscle', gender: 'Male' }), ['Full Body', 'Chest', 'Back', 'Legs', 'Arms']);
    for (const area of suggestedFocusAreas({ goal: 'Flexibility', gender: 'Female' })) assert.ok(PROFILE.FOCUS_AREAS.includes(area));
  });
});

describe('equipment kits', () => {
  it('cover every piece of equipment the catalog needs', () => {
    const covered = new Set(Object.values(EQUIPMENT_KITS).flatMap((k) => k.items));
    for (const w of catalog) {
      for (const item of requiredEquipment(w)) assert.ok(covered.has(item), `${w.slug} needs ${item}, which no kit offers`);
    }
  });
});

describe('limitations', () => {
  it('flag workouts that load the area', () => {
    assert.deepEqual(limitationConflicts(bySlug('kickboxing-hiit-fusion'), ['knees', 'low-impact', 'wrists']), ['knees', 'low-impact', 'wrists']);
    assert.ok(limitationConflicts(bySlug('leg-day-destroyer'), ['lower-back']).length);
    assert.ok(limitationConflicts(bySlug('upper-body-power-session'), ['shoulders']).length);
    assert.deepEqual(limitationConflicts(bySlug('restorative-evening-yoga'), PROFILE.LIMITATIONS), []);
    // Workouts tagged low-impact are never "high impact".
    assert.deepEqual(limitationConflicts(bySlug('aqua-aerobics'), ['low-impact']), []);
  });
});

describe('ranking', () => {
  const picks = (profile, limit = 3) => rankWorkouts(catalog, profile, { limit });

  it('only recommends what the user has the equipment for', () => {
    for (const kit of ['none', 'pool']) {
      for (const p of picks({ equipment: [kit], fitnessLevel: 'Intermediate' }, 8)) assert.deepEqual(p.missingEquipment, [], `${kit}: ${p.workout.slug}`);
    }
    const gym = picks({ equipment: ['gym'], goal: 'Muscle', fitnessLevel: 'Advanced' });
    assert.ok(gym.some((p) => requiredEquipment(p.workout).includes('Barbell')));
  });

  it("steers away from the user's limitations", () => {
    const top = picks({ goal: 'Weight', fitnessLevel: 'Intermediate', limitations: ['knees', 'low-impact'] }, 5);
    for (const p of top) assert.deepEqual(p.conflicts, [], p.workout.slug);
  });

  it('puts the chosen focus areas first and says why', () => {
    const [first] = picks({ focusAreas: ['Glutes'], fitnessLevel: 'Intermediate', equipment: ['none'] });
    assert.ok(first.workout.targetMuscles.some((m) => ['Glutes', 'Hips', 'Posterior Chain'].includes(m)), first.workout.slug);
    assert.match(first.reasons[0], /^Works your glutes/);
  });

  it('keeps to the time the user has', () => {
    for (const p of picks({ workoutMinutes: 20, fitnessLevel: 'Beginner' })) {
      assert.ok(p.workout.duration <= 25, p.workout.slug);
      assert.ok(p.reasons.includes('Fits your 20 minutes'));
    }
  });

  it("doesn't push beginners into advanced workouts", () => {
    for (const p of picks({ fitnessLevel: 'Beginner', goal: 'Muscle' }, 5)) assert.notEqual(p.workout.difficulty, 'Advanced', p.workout.slug);
  });

  it('gives the same picks to the same people whatever their gender', () => {
    const answers = { goal: 'Muscle', fitnessLevel: 'Intermediate', focusAreas: ['Legs'], equipment: ['weights'], workoutMinutes: 45 };
    const slugs = (gender) => picks({ ...answers, gender, height: 170, weight: 70 }, 6).map((p) => p.workout.slug);
    assert.deepEqual(slugs('Female'), slugs('Male'));
  });

  it('works without a profile and rotates ties by day', () => {
    assert.equal(rankWorkouts(catalog, null).length, catalog.length);
    const day0 = rankWorkouts(catalog, {}, { day: 0, limit: 3 }).map((p) => p.workout.slug);
    const day1 = rankWorkouts(catalog, {}, { day: 1, limit: 3 }).map((p) => p.workout.slug);
    assert.notDeepEqual(day0, day1);
  });

  it('skips workouts done this week', () => {
    const profile = { fitnessLevel: 'Intermediate', goal: 'Weight' };
    const [first] = picks(profile, 1);
    const [next] = rankWorkouts(catalog, profile, { recentSlugs: [first.workout.slug], limit: 1 });
    assert.notEqual(next.workout.slug, first.workout.slug);
    assert.ok(workoutFit(first.workout, profile).score > workoutFit(first.workout, profile, { recentSlugs: [first.workout.slug] }).score);
  });
});
