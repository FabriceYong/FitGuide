/**
 * Rules-based personal plan generator. Pure functions over the workout
 * catalog: goal, level, days per week, time per session and equipment go in,
 * a multi-week schedule comes out. No I/O, so it is easy to test.
 */

// Equipment everyone is assumed to have (or that the workout lists as optional).
const BASIC_EQUIPMENT = new Set(['None', 'Timer', 'Mat', 'Yoga Mat', 'Running Shoes']);
const isOptional = (item) => /^optional:/i.test(item);

// Share of training days per category group, by goal. Categories in a group
// are interchangeable for the schedule.
const GOAL_MIX = {
  Muscle: [
    { label: 'Strength', categories: ['Strength'], share: 0.6 },
    { label: 'Conditioning', categories: ['HIIT', 'CrossFit'], share: 0.2 },
    { label: 'Mobility', categories: ['Yoga', 'Flexibility', 'Pilates'], share: 0.2 },
  ],
  Weight: [
    { label: 'Conditioning', categories: ['HIIT', 'Cardio', 'Martial Arts', 'Dance', 'CrossFit', 'Swimming'], share: 0.5 },
    { label: 'Strength', categories: ['Strength'], share: 0.3 },
    { label: 'Mobility', categories: ['Yoga', 'Flexibility', 'Pilates'], share: 0.2 },
  ],
  Flexibility: [
    { label: 'Mobility', categories: ['Yoga', 'Flexibility', 'Pilates'], share: 0.7 },
    { label: 'Strength', categories: ['Strength'], share: 0.3 },
  ],
  Vitality: [
    { label: 'Cardio', categories: ['Cardio', 'Dance', 'Swimming', 'Martial Arts', 'HIIT'], share: 0.35 },
    { label: 'Strength', categories: ['Strength', 'Pilates'], share: 0.35 },
    { label: 'Mobility', categories: ['Yoga', 'Flexibility'], share: 0.3 },
  ],
};

const LEVEL_ORDER = ['Beginner', 'Intermediate', 'Advanced'];

/** Training days spread across the week (1 = first day of the plan week). */
const DAY_LAYOUT = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

/** Difficulties a user at `level` can be given. */
function allowedDifficulties(level) {
  const rank = Math.max(0, LEVEL_ORDER.indexOf(level));
  return new Set(['All Levels', ...LEVEL_ORDER.slice(0, rank + 1)]);
}

/** Equipment a plan can't assume, i.e. what the user must say they have. */
function requiredEquipment(workout) {
  return (workout.equipment || []).filter((item) => !BASIC_EQUIPMENT.has(item) && !isOptional(item));
}

/** Every piece of equipment some workout needs, for the generator form. */
function equipmentOptions(workouts) {
  return [...new Set(workouts.flatMap(requiredEquipment))].sort();
}

/**
 * Category for each training slot of a week: the goal's mix, largest share
 * first, spread so the same group doesn't run on consecutive slots if avoidable.
 */
function weeklyGroups(goal, daysPerWeek) {
  const mix = GOAL_MIX[goal] || GOAL_MIX.Vitality;
  const counts = mix.map((g) => ({ group: g, n: Math.floor(g.share * daysPerWeek), rem: (g.share * daysPerWeek) % 1 }));
  let assigned = counts.reduce((sum, c) => sum + c.n, 0);
  for (const c of [...counts].sort((a, b) => b.rem - a.rem)) {
    if (assigned >= daysPerWeek) break;
    c.n += 1;
    assigned += 1;
  }
  // Interleave: take from the group with most remaining that isn't the last one used.
  const slots = [];
  while (slots.length < daysPerWeek) {
    const last = slots[slots.length - 1];
    const next = counts
      .filter((c) => c.n > 0)
      .sort((a, b) => (b.n - a.n) || (a.group === last ? 1 : 0) - (b.group === last ? 1 : 0))
      .find((c) => c.group !== last) || counts.find((c) => c.n > 0);
    slots.push(next.group);
    next.n -= 1;
  }
  return slots;
}

/**
 * @param {object} input
 * @param {'Vitality'|'Muscle'|'Weight'|'Flexibility'} input.goal
 * @param {'Beginner'|'Intermediate'|'Advanced'} input.level
 * @param {number} input.daysPerWeek          1-7
 * @param {number} input.minutesPerSession    10-120
 * @param {string[]} input.equipment          What the user has, beyond the basics
 * @param {number} input.weeks                1-12
 * @param {object[]} workouts                 Published catalog workouts
 * @returns {{ days: { week: number, day: number, title: string, workoutSlug: string, notes?: string }[], warnings: string[] }}
 */
function generatePlan(input, workouts) {
  const { goal, level, daysPerWeek, minutesPerSession, weeks } = input;
  const have = new Set(input.equipment || []);
  const difficulties = allowedDifficulties(level);
  const warnings = [];

  const fitsEquipment = (w) => requiredEquipment(w).every((item) => have.has(item));
  const eligible = workouts.filter((w) => fitsEquipment(w) && difficulties.has(w.difficulty));
  if (!eligible.length) {
    return { days: [], warnings: ['No workouts match your level and equipment yet.'] };
  }
  const withinTime = eligible.filter((w) => w.duration <= minutesPerSession + 5);
  const pool = withinTime.length ? withinTime : eligible;
  if (!withinTime.length) warnings.push(`No workout fits in ${minutesPerSession} minutes, so sessions run longer.`);

  const groups = weeklyGroups(goal, daysPerWeek);
  const layout = DAY_LAYOUT[daysPerWeek];
  const usedCount = new Map();
  const days = [];
  const shortGroups = new Set();

  for (let week = 1; week <= weeks; week += 1) {
    const usedThisWeek = new Set();
    groups.forEach((group, slot) => {
      let candidates = pool.filter((w) => group.categories.includes(w.category));
      if (!candidates.length) {
        shortGroups.add(group.label);
        candidates = pool;
      }
      // Least used so far, not repeated this week; later weeks lean longer.
      const ranked = [...candidates].sort((a, b) => {
        const fresh = (usedThisWeek.has(a.slug) ? 1 : 0) - (usedThisWeek.has(b.slug) ? 1 : 0);
        if (fresh) return fresh;
        const used = (usedCount.get(a.slug) || 0) - (usedCount.get(b.slug) || 0);
        if (used) return used;
        const progression = week > weeks / 2 ? b.duration - a.duration : a.duration - b.duration;
        return progression || a.slug.localeCompare(b.slug);
      });
      const pick = ranked[0];
      usedThisWeek.add(pick.slug);
      usedCount.set(pick.slug, (usedCount.get(pick.slug) || 0) + 1);
      days.push({ week, day: layout[slot], title: `${group.label}: ${pick.title}`, workoutSlug: pick.slug });
    });
  }

  for (const label of shortGroups) {
    warnings.push(`Not enough ${label.toLowerCase()} workouts for your equipment and level; other workouts fill those days.`);
  }
  return { days, warnings };
}

/**
 * Rules-based adjustment from recent training: how hard sessions felt (RPE)
 * and how many scheduled days were done. Returns the direction and why.
 * @param {{ perceivedEffort?: number|null }[]} recentSessions  last ~2 weeks
 * @param {number|null} adherencePct
 * @returns {{ direction: 'easier' | 'harder' | 'keep', reason: string }}
 */
function adaptDirection(recentSessions, adherencePct) {
  const rated = recentSessions.map((s) => s.perceivedEffort).filter((v) => Number.isFinite(v));
  const avgEffort = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null;
  if (avgEffort !== null && avgEffort >= 8.5) {
    return { direction: 'easier', reason: `Recent sessions felt very hard (average effort ${avgEffort.toFixed(1)}/10).` };
  }
  if (adherencePct !== null && adherencePct < 50) {
    return { direction: 'easier', reason: `You completed ${adherencePct}% of scheduled days; shorter sessions may be easier to fit in.` };
  }
  if (avgEffort !== null && avgEffort <= 5 && rated.length >= 3 && (adherencePct === null || adherencePct >= 80)) {
    return { direction: 'harder', reason: `Sessions felt comfortable (average effort ${avgEffort.toFixed(1)}/10) and you're keeping up.` };
  }
  return { direction: 'keep', reason: 'Your plan looks right for now.' };
}

/**
 * Replacement for one scheduled workout in the given direction: same category
 * group if possible, shorter/easier or longer/harder, within level+equipment.
 */
function swapFor(current, direction, candidates) {
  const rank = (w) => LEVEL_ORDER.indexOf(w.difficulty === 'All Levels' ? 'Beginner' : w.difficulty) * 100 + w.duration;
  const sameCategory = candidates.filter((w) => w.slug !== current.slug && w.category === current.category);
  const others = candidates.filter((w) => w.slug !== current.slug);
  for (const list of [sameCategory, others]) {
    const better = list
      .filter((w) => (direction === 'easier' ? rank(w) < rank(current) : rank(w) > rank(current)))
      .sort((a, b) => (direction === 'easier' ? rank(b) - rank(a) : rank(a) - rank(b)));
    if (better.length) return better[0];
  }
  return null;
}

module.exports = {
  GOAL_MIX,
  allowedDifficulties,
  requiredEquipment,
  equipmentOptions,
  weeklyGroups,
  generatePlan,
  adaptDirection,
  swapFor,
};
