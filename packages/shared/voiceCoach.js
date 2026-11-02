/**
 * What the workout player says, beyond the step's name and target: last
 * time's numbers and today's suggestion as a step starts, praise when a
 * logged set beats last time, and halfway and last-exercise lines. The
 * website and the app say the same (lib/src/core/voice_coach.dart).
 * Weights are given in kg and spoken in the member's units.
 */

const LB_PER_KG = 2.20462;

/** "22.5 kilos" or "50 pounds". */
function spokenWeight(kg, units = 'metric') {
  const imperial = units === 'imperial';
  const value = Math.round((imperial ? kg * LB_PER_KG : kg) * 10) / 10;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text} ${imperial ? (value === 1 ? 'pound' : 'pounds') : value === 1 ? 'kilo' : 'kilos'}`;
}

/** "20 kilos for 8", "12 reps" or null. */
function spokenSet(set, units) {
  if (!set) return null;
  if (set.weightKg > 0 && set.reps > 0) return `${spokenWeight(set.weightKg, units)} for ${set.reps}`;
  if (set.weightKg > 0) return spokenWeight(set.weightKg, units);
  if (set.reps > 0) return `${set.reps} reps`;
  return null;
}

/**
 * What to add after the step's name and target as it starts.
 * @param {object} p
 * @param {number} p.index   the step's position (0-based)
 * @param {number} p.total   steps in the workout
 * @param {{reps?:number, weightKg?:number}} [p.last]        last time's set
 * @param {{reps?:number, weightKg?:number}} [p.suggestion]  today's suggested set
 */
function stepCoaching({ index, total, last, suggestion, units = 'metric' }) {
  const lines = [];
  const lastText = spokenSet(last, units);
  const todayText = spokenSet(suggestion, units);
  if (lastText) lines.push(`Last time, ${lastText}.`);
  if (todayText && todayText !== lastText) lines.push(`Today, try ${todayText}.`);
  if (total >= 4 && index === Math.floor(total / 2)) lines.push('Halfway there.');
  if (total >= 3 && index === total - 1) lines.push('Last one. Finish strong!');
  return lines.join(' ');
}

/** Praise when a logged set beats last time's, or null. */
function setPraise({ logged, last, units = 'metric' }) {
  if (!logged || !last) return null;
  const weight = logged.weightKg || 0;
  const lastWeight = last.weightKg || 0;
  if (weight > 0 && lastWeight > 0 && weight > lastWeight + 0.01) {
    return `That's ${spokenWeight(weight - lastWeight, units)} more than last time. Nice work!`;
  }
  const reps = logged.reps || 0;
  const lastReps = last.reps || 0;
  if (reps > lastReps && lastReps > 0 && Math.abs(weight - lastWeight) < 0.01) {
    const more = reps - lastReps;
    return `${more} more ${more === 1 ? 'rep' : 'reps'} than last time. Strong!`;
  }
  return null;
}

module.exports = { spokenWeight, spokenSet, stepCoaching, setPraise };
