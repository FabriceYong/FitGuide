/**
 * Multi-week programs built from the workout catalog. Each program is a
 * weekly schedule (day of week → workout) that may change from one week to
 * the next as the program progresses.
 */
const workoutsData = require('./workoutSeeder');

const workoutTitles = new Map(workoutsData.map((w) => [w.slug, w.title]));

/**
 * @param {number} weeks
 * @param {(week: number) => Array<[number, string, string?]>} schedule
 *        For a week, the [dayOfWeek, workoutSlug, notes?] sessions.
 */
function buildDays(weeks, schedule) {
  const days = [];
  for (let week = 1; week <= weeks; week += 1) {
    for (const [day, workoutSlug, notes] of schedule(week)) {
      const title = workoutTitles.get(workoutSlug);
      if (!title) throw new Error(`programSeeder: unknown workout "${workoutSlug}"`);
      days.push({ week, day, title, workoutSlug, ...(notes && { notes }) });
    }
  }
  return days;
}

const programsData = [
  {
    slug: 'foundations-starter',
    title: 'Foundations: 4-Week Starter',
    description: 'A gentle on-ramp for new or returning exercisers. Three short sessions a week build a base of strength, cardio fitness and mobility, with an extra round added in the second half.',
    level: 'Beginner',
    goal: 'General fitness',
    weeks: 4,
    daysPerWeek: 3,
    days: buildDays(4, (week) => [
      [1, 'ace-functional-muscular-prep', week >= 3 ? 'Add a third round if you feel good.' : undefined],
      [3, 'ace-cardio-fitness-builder'],
      [5, week % 2 ? 'morning-yoga-flow' : 'dynamic-mobility-flow'],
    ]),
  },
  {
    slug: 'strength-builder',
    title: 'Strength Builder: 6 Weeks',
    description: 'Four sessions a week of full-body and upper-body lifting with core work. Log your weights each session and aim to add a little load every week; weeks 5–6 swap in a heavier leg day.',
    level: 'Intermediate',
    goal: 'Build muscle',
    weeks: 6,
    daysPerWeek: 4,
    days: buildDays(6, (week) => [
      [1, 'full-body-strength-builder', week > 1 ? 'Add 2.5–5 kg to your main lifts if last week felt solid.' : 'Find working weights you can lift for every rep with good form.'],
      [2, 'core-power-blast'],
      [4, 'upper-body-power-session'],
      [6, week >= 5 ? 'leg-day-destroyer' : 'kettlebell-total-body'],
    ]),
  },
  {
    slug: 'hiit-fat-burn',
    title: 'HIIT Fat Burn: 4 Weeks',
    description: 'High-intensity intervals, cardio and combat conditioning four days a week to raise your fitness and burn calories. The last two weeks open with a Tabata session.',
    level: 'Intermediate',
    goal: 'Lose fat',
    weeks: 4,
    daysPerWeek: 4,
    days: buildDays(4, (week) => [
      [1, week >= 3 ? 'highintensity-tabata-burn' : 'bodyweight-hiit-challenge'],
      [2, '30minute-cardio-blast'],
      [4, 'kickboxing-hiit-fusion'],
      [6, 'boxing-cardio-workout'],
    ]),
  },
  {
    slug: 'mobility-reset',
    title: 'Mobility Reset: 3 Weeks',
    description: 'Three low-intensity sessions a week to loosen tight hips, hamstrings and shoulders. Good on its own or alongside another program on rest days.',
    level: 'All Levels',
    goal: 'Flexibility',
    weeks: 3,
    daysPerWeek: 3,
    days: buildDays(3, (week) => [
      [1, 'dynamic-mobility-flow'],
      [3, 'deep-stretch-flexibility'],
      [6, week === 3 ? 'yin-yoga-deep-stretch' : 'restorative-evening-yoga'],
    ]),
  },
];

module.exports = programsData;
