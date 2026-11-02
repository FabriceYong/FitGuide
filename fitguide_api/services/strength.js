/**
 * Strength levels: for the big four lifts, the member's estimated one-rep
 * max against their body weight, placed on the usual strength standards
 * (Beginner → Elite, a general guide that differs by sex), with how many kg
 * to the next level. One-rep maxes are estimated from logged sets of up to
 * 12 reps (Epley).
 */

const LEVELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];

// One-rep max as a multiple of body weight for each level.
const LIFTS = [
  { slug: 'back-squat', name: 'Squat', male: [0.75, 1.25, 1.5, 2.25, 2.75], female: [0.5, 0.75, 1.25, 1.5, 2] },
  { slug: 'bench-press', name: 'Bench press', male: [0.5, 0.75, 1.25, 1.75, 2], female: [0.25, 0.5, 0.75, 1, 1.5] },
  { slug: 'deadlift', name: 'Deadlift', male: [1, 1.5, 2, 2.5, 3], female: [0.5, 1, 1.25, 1.75, 2.5] },
  { slug: 'overhead-press', name: 'Overhead press', male: [0.35, 0.55, 0.8, 1.1, 1.4], female: [0.2, 0.35, 0.5, 0.75, 1] },
];

const MAX_REPS = 12;
const half = (kg) => Math.ceil(kg * 2) / 2;

/** Epley estimate of a one-rep max from one set. */
const oneRepMax = (weightKg, reps) => (reps === 1 ? weightKg : weightKg * (1 + reps / 30));

/** The standards for a member: by sex, or halfway between when not given. */
function standardsFor(lift, gender) {
  if (gender === 'Male') return lift.male;
  if (gender === 'Female') return lift.female;
  return lift.male.map((m, i) => Math.round(((m + lift.female[i]) / 2) * 100) / 100);
}

/**
 * Where one lift stands. `level` is null below Beginner ("Starting out").
 * `progress` is how far (0–1) from this level's mark to the next one.
 */
function place(lift, e1rmKg, bodyweightKg, gender) {
  const marks = standardsFor(lift, gender);
  const ratio = e1rmKg / bodyweightKg;
  const index = marks.reduce((found, mark, i) => (ratio >= mark ? i : found), -1);
  const next = index + 1 < marks.length ? marks[index + 1] : null;
  const floor = index >= 0 ? marks[index] : 0;
  return {
    lift: lift.name,
    exerciseSlug: lift.slug,
    oneRepMaxKg: Math.round(e1rmKg * 10) / 10,
    ratio: Math.round(ratio * 100) / 100,
    level: index >= 0 ? LEVELS[index] : null,
    nextLevel: next != null ? LEVELS[index + 1] : null,
    nextKg: next != null ? half(next * bodyweightKg) : null,
    toNextKg: next != null ? Math.max(0.5, half(next * bodyweightKg - e1rmKg)) : null,
    progress: next != null ? Math.max(0, Math.min(1, (ratio - floor) / (next - floor))) : 1,
  };
}

/**
 * The member's levels for the lifts they've logged with a weight.
 * @param {object[]} sessions  with sets ({ exerciseSlug, reps, weightKg })
 */
function strengthLevels(sessions, bodyweightKg, gender) {
  if (!(bodyweightKg > 0)) return [];
  const best = new Map();
  for (const s of sessions) {
    for (const set of s.sets || []) {
      if (!(set.weightKg > 0) || !(set.reps >= 1) || set.reps > MAX_REPS) continue;
      const e1rm = oneRepMax(set.weightKg, set.reps);
      if (e1rm > (best.get(set.exerciseSlug) || 0)) best.set(set.exerciseSlug, e1rm);
    }
  }
  return LIFTS.filter((l) => best.has(l.slug)).map((l) => place(l, best.get(l.slug), bodyweightKg, gender));
}

module.exports = { LEVELS, LIFTS, oneRepMax, standardsFor, place, strengthLevels };
