/**
 * Tailoring: how a profile picks and explains workouts, and how it
 * personalises calorie estimates. Pure functions with no dependencies, used
 * by the API and by the web app (which also ranks for guests, whose profile
 * only lives in the browser).
 *
 * Gender changes numbers (calorie estimates, through resting energy) and the
 * focus areas suggested at sign-up, which the user can change. Which workouts
 * are picked comes from the user's own answers: goal, level, focus areas,
 * equipment, time and limitations.
 */

// ─── Profile options ─────────────────────────────────────────────────────────

// Focus areas offered to users, and the catalog target muscles each covers.
const FOCUS_AREAS = {
  'Full Body': ['Full Body'],
  Core: ['Core', 'Abs', 'Obliques', 'Lower Back'],
  Glutes: ['Glutes', 'Hips', 'Posterior Chain'],
  Legs: ['Legs', 'Quads', 'Hamstrings', 'Calves'],
  Back: ['Back', 'Lower Back', 'Spine'],
  Chest: ['Chest'],
  Shoulders: ['Shoulders'],
  Arms: ['Arms'],
};

// Equipment anyone can use: the floor, a chair, stairs, a route to run.
const BASIC_EQUIPMENT = new Set(['None', 'Timer', 'Mat', 'Yoga Mat', 'Running Shoes', 'Track or Treadmill', 'Stairs or Step Platform', 'Barre or Chair']);
const isOptional = (item) => /^optional:/i.test(item);

// What users say they have, as kits of catalog equipment. "none" means
// bodyweight only; an empty list means the user hasn't said.
const EQUIPMENT_KITS = {
  none: { label: 'No equipment', items: [] },
  'yoga-props': { label: 'Yoga props (blocks, bolster, strap)', items: ['Blocks', 'Bolster', 'Strap'] },
  weights: { label: 'Dumbbells or kettlebells', items: ['Dumbbells', 'Kettlebell', 'Light Weights', 'Medicine Ball'] },
  bands: { label: 'Bands or suspension straps', items: ['Resistance Band', 'TRX Straps'] },
  gym: {
    label: 'A gym',
    items: ['Barbell', 'Bench', 'Squat Rack', 'Leg Press', 'Pull-up Bar', 'Box', 'Battle Ropes', 'Dumbbells', 'Kettlebell',
      'Light Weights', 'Medicine Ball', 'Resistance Band', 'TRX Straps', 'Blocks', 'Strap'],
  },
  pool: { label: 'A pool', items: ['Pool', 'Goggles'] },
  boxing: { label: 'Boxing gloves and a bag', items: ['Boxing Gloves', 'Heavy Bag'] },
};

const HIGH_INTENSITY = new Set(['High', 'Very High']);
const lower = (list) => (list || []).map((s) => String(s).toLowerCase());
const targets = (w, muscles) => (w.targetMuscles || []).some((m) => muscles.includes(m));

/**
 * Things to go easy on. Each test flags workouts that load that area (from
 * the workout's cautions, tags, muscles, intensity and equipment). Flagged
 * workouts aren't recommended; they aren't hidden from the catalog.
 */
const LIMITATIONS = {
  knees: {
    label: 'Knees',
    flags: (w, text, tags) => /knee|joint/.test(text) || tags.includes('sprints') || tags.includes('squats')
      || (targets(w, ['Quads', 'Legs']) && w.intensity === 'Very High'),
  },
  'lower-back': {
    label: 'Lower back',
    flags: (w, text) => /protect (your |lower )?back|back injur/.test(text)
      || targets(w, ['Lower Back', 'Posterior Chain']) || (w.equipment || []).includes('Barbell'),
  },
  shoulders: {
    label: 'Shoulders',
    flags: (w, text) => /shoulder/.test(text) || (targets(w, ['Shoulders']) && HIGH_INTENSITY.has(w.intensity))
      || (w.equipment || []).includes('Pull-up Bar'),
  },
  wrists: {
    label: 'Wrists',
    flags: (w, text) => /wrist|wrap hands/.test(text) || w.category === 'Martial Arts',
  },
  'low-impact': {
    label: 'No jumping (low impact)',
    flags: (w, text, tags) => !tags.includes('low-impact') && (
      /land softly|jump/.test(text) || ['HIIT', 'CrossFit'].includes(w.category) || w.intensity === 'Very High'
      || ['hiit', 'tabata', 'sprints', 'kickboxing'].some((t) => tags.includes(t))
    ),
  },
};

// ─── Sign-up suggestions ─────────────────────────────────────────────────────

const GOAL_FOCUS = {
  Muscle: ['Full Body', 'Chest', 'Back', 'Legs'],
  Weight: ['Full Body', 'Core', 'Legs'],
  Flexibility: ['Back', 'Core'],
  Vitality: ['Full Body', 'Core'],
};
// Common starting points, added to the goal's. Only a suggestion: the user picks.
const GENDER_FOCUS = { Female: ['Glutes'], Male: ['Chest', 'Arms'] };

/** Focus areas to pre-select at sign-up for this goal and gender. */
function suggestedFocusAreas({ goal, gender } = {}) {
  return [...new Set([...(GOAL_FOCUS[goal] || GOAL_FOCUS.Vitality), ...(GENDER_FOCUS[gender] || [])])];
}

// ─── Calories ────────────────────────────────────────────────────────────────

// Mifflin-St Jeor offsets. For "Non-binary" / "Prefer not to say" use the midpoint.
const SEX_OFFSET = { Male: 5, Female: -161 };
const MIDPOINT_OFFSET = -78;
const ASSUMED_AGE = 30;

/**
 * Resting energy (BMR) in kcal/day, Mifflin-St Jeor.
 * @param {{ gender?: string, weight: number, height: number, birthYear?: number | null }} profile
 */
function restingKcal(profile, year = new Date().getFullYear()) {
  const age = profile.birthYear ? year - profile.birthYear : ASSUMED_AGE;
  const offset = SEX_OFFSET[profile.gender] ?? MIDPOINT_OFFSET;
  return 10 * profile.weight + 6.25 * profile.height - 5 * age + offset;
}

// Catalog calorie numbers are for a reference adult: 70 kg burning 1 kcal per
// kg per hour at rest (1680 kcal/day), the convention MET values assume.
const REFERENCE_RESTING_KCAL = 1680;

/**
 * How much more or less than the reference adult this person burns for the
 * same activity: their resting energy over the reference ("corrected METs").
 * 1 when the profile has no body measurements.
 */
function calorieFactor(profile, year) {
  if (!profile || !(profile.weight > 0) || !(profile.height > 0)) return 1;
  return Math.min(1.8, Math.max(0.5, restingKcal(profile, year) / REFERENCE_RESTING_KCAL));
}

/** A catalog calorie estimate for this person. */
const personalCalories = (kcal, profile, year) => (kcal == null ? kcal : Math.round(kcal * calorieFactor(profile, year)));

// ─── Ranking ─────────────────────────────────────────────────────────────────

// Categories that suit each goal, best first.
const GOAL_CATEGORIES = {
  Muscle: ['Strength', 'CrossFit', 'HIIT'],
  Weight: ['HIIT', 'Cardio', 'Martial Arts', 'Dance', 'Swimming', 'CrossFit'],
  Flexibility: ['Yoga', 'Flexibility', 'Pilates'],
  Vitality: ['Cardio', 'Yoga', 'Pilates', 'Dance', 'Swimming', 'Strength'],
};
const GOAL_PHRASES = { Muscle: 'building muscle', Weight: 'weight loss', Flexibility: 'flexibility', Vitality: 'all-round fitness' };
const LEVEL_ORDER = ['Beginner', 'Intermediate', 'Advanced'];

/** Equipment a workout needs beyond the basics. */
const requiredEquipment = (w) => (w.equipment || []).filter((item) => !BASIC_EQUIPMENT.has(item) && !isOptional(item));

/** Every catalog item the user's kits cover, or null if they haven't said. */
function ownedEquipment(kits) {
  if (!kits || !kits.length) return null;
  return new Set(kits.flatMap((k) => EQUIPMENT_KITS[k]?.items || []));
}

/** The user's focus areas this workout trains. */
const focusMatches = (w, focusAreas) => (focusAreas || []).filter((area) => targets(w, FOCUS_AREAS[area] || []));

/** The user's limitations this workout loads. */
function limitationConflicts(w, limitations) {
  const text = lower([...(w.cautions || []), ...(w.prerequisites || [])]).join(' ; ');
  const tags = lower(w.tags);
  return (limitations || []).filter((id) => LIMITATIONS[id]?.flags(w, text, tags));
}

const listPhrase = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0]);

/**
 * How well one workout fits a profile.
 * @returns {{ score: number, reasons: string[], conflicts: string[], missingEquipment: string[] }}
 */
function workoutFit(w, profile = {}, { recentSlugs = [] } = {}) {
  let score = 0;
  const reasons = [];

  const focus = focusMatches(w, profile.focusAreas);
  score += Math.min(3, focus.length) * 1.25;
  if (focus.length) reasons.push(`Works your ${listPhrase(focus.slice(0, 3).map((a) => a.toLowerCase()))}`);

  if (profile.workoutMinutes > 0) {
    if (w.duration <= profile.workoutMinutes + 5) {
      score += 1.5;
      reasons.push(`Fits your ${profile.workoutMinutes} minutes`);
    } else {
      // Time is a firm limit: a point for every 2.5 minutes over.
      score -= Math.min(8, (w.duration - profile.workoutMinutes) / 2.5);
    }
  }

  const owned = ownedEquipment(profile.equipment);
  const needs = requiredEquipment(w);
  const missingEquipment = owned ? needs.filter((item) => !owned.has(item)) : [];
  if (missingEquipment.length) score -= 10;
  else if (owned) reasons.push(needs.length ? `Uses your ${listPhrase(needs.slice(0, 2).map((n) => n.toLowerCase()))}` : 'No equipment needed');

  const preferred = GOAL_CATEGORIES[profile.goal] || [];
  if (preferred.includes(w.category)) {
    score += 3.5 - preferred.indexOf(w.category) / preferred.length;
    reasons.push(`Good for ${GOAL_PHRASES[profile.goal]}`);
  }

  const userRank = LEVEL_ORDER.indexOf(profile.fitnessLevel);
  const rank = LEVEL_ORDER.indexOf(w.difficulty);
  if (w.difficulty === 'All Levels' || userRank === -1 || rank === userRank) score += 4;
  else if (rank < userRank) score += 2;
  else score -= 3 * (rank - userRank);

  const conflicts = limitationConflicts(w, profile.limitations);
  score -= 8 * conflicts.length;
  if (recentSlugs.includes(w.slug)) score -= 5;
  if (w.isPremium && profile.plan !== 'plus' && profile.role !== 'admin') score -= 2;

  return { score, reasons: reasons.slice(0, 3), conflicts, missingEquipment };
}

/**
 * Workouts best first for this profile. Ties rotate with `day` (e.g. days
 * since 1970) so the top picks change from day to day.
 * @param {object[]} workouts
 * @param {object} profile  goal, fitnessLevel, focusAreas, equipment, workoutMinutes, limitations, plan, role
 * @param {{ recentSlugs?: string[], day?: number, limit?: number }} [options]
 * @returns {{ workout: object, score: number, reasons: string[], conflicts: string[], missingEquipment: string[] }[]}
 */
function rankWorkouts(workouts, profile, { recentSlugs = [], day = 0, limit } = {}) {
  const ranked = workouts
    .map((workout, i) => ({ workout, ...workoutFit(workout, profile || {}, { recentSlugs }), turn: (i + day) % workouts.length }))
    .sort((a, b) => b.score - a.score || a.turn - b.turn)
    .map(({ turn: _turn, ...entry }) => entry);
  return limit ? ranked.slice(0, limit) : ranked;
}

module.exports = {
  FOCUS_AREAS,
  EQUIPMENT_KITS,
  LIMITATIONS,
  suggestedFocusAreas,
  restingKcal,
  calorieFactor,
  personalCalories,
  requiredEquipment,
  limitationConflicts,
  workoutFit,
  rankWorkouts,
};
