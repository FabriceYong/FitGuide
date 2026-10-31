/**
 * "Swap this exercise" in the workout player: given the step and why the
 * member wants a change (a sore knee, no room to jump, no equipment, too hard,
 * too easy), Claude suggests one alternative that trains the same thing, with
 * how to do it. Pain gets a stop-and-check-with-a-professional note and a
 * gentle option. The member decides whether to use it; nothing is saved.
 */
const ai = require('./ai');

const REASONS = {
  pain: 'It hurts or a joint is sore (knee, back, shoulder or wrist)',
  space: 'Not enough room, or needs to be quiet (no jumping)',
  equipment: "Doesn't have the equipment",
  harder: 'Too hard right now',
  easier: 'Too easy, wants more challenge',
  other: 'Something else',
};

const SYSTEM_PROMPT = `You are a careful personal trainer inside FitGuide, a fitness app. A member in the middle of a workout wants to swap one exercise.

Suggest ONE alternative that:
- trains the same muscles or purpose and fits the same time or rep target;
- respects the reason given and the equipment they have (assume none unless the workout lists it);
- is a common, well-known exercise with a plain name (e.g. "Glute bridge", "Incline push-up", "Step-back lunge");
- comes with 2 to 4 short form cues.

Safety: if the reason is pain, choose a gentle, low-impact option and set safetyNote to advise stopping anything that hurts and checking with a doctor or physiotherapist if pain continues. Never diagnose. Otherwise safetyNote is null.

Call suggest_swap once.`;

const TOOL = {
  name: 'suggest_swap',
  description: 'Suggest one replacement exercise for the step.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Plain name of the replacement exercise' },
      instruction: { type: 'string', description: 'The step as the player shows it, keeping the original target, e.g. "Glute bridge × 15 reps" or "Low-impact jacks — 40 seconds"' },
      why: { type: 'string', description: 'One sentence: why this suits the member and what it trains' },
      formCues: { type: 'array', items: { type: 'string' }, description: '2 to 4 short cues' },
      safetyNote: { type: ['string', 'null'] },
    },
    required: ['name', 'instruction', 'why', 'formCues', 'safetyNote'],
    additionalProperties: false,
  },
};

const text = (v, max) => String(v || '').trim().slice(0, max);

/**
 * @param {object} input { step: { instruction, exerciseName? }, reason, details?, workout: { title, category, difficulty, equipment[] } }
 */
async function suggestSwap(user, { step, reason, details, workout }) {
  ai.getClient('Swapping exercises');
  await ai.spend(user, 'swap');
  const prompt = [
    `Workout: ${text(workout?.title, 120)} (${text(workout?.category, 40)}, ${text(workout?.difficulty, 30)}).`,
    `Equipment the workout lists: ${(workout?.equipment || []).map((e) => text(e, 40)).filter(Boolean).join(', ') || 'none'}.`,
    `Step to replace: ${text(step?.instruction, 300)}${step?.exerciseName ? ` (${text(step.exerciseName, 80)})` : ''}.`,
    `Reason: ${REASONS[reason] || REASONS.other}${details ? `. In their words: "${text(details, 200)}"` : ''}.`,
    user.limitations?.length ? `Limitations from their profile: ${user.limitations.map((l) => text(l, 60)).join(', ')}.` : '',
  ].filter(Boolean).join('\n');

  const answer = await ai.callTool({
    what: 'Swapping exercises',
    system: SYSTEM_PROMPT,
    tool: TOOL,
    content: [{ type: 'text', text: prompt }],
    unreadable: "A swap couldn't be suggested for this step. Try another reason, or skip the step.",
  });
  return {
    swap: {
      name: text(answer.name, 80) || 'Alternative exercise',
      instruction: text(answer.instruction, 300) || text(answer.name, 80),
      why: text(answer.why, 300),
      formCues: (Array.isArray(answer.formCues) ? answer.formCues : []).map((c) => text(c, 160)).filter(Boolean).slice(0, 4),
      safetyNote: answer.safetyNote ? text(answer.safetyNote, 300) : null,
    },
    allowance: await ai.usage(user, 'swap'),
  };
}

module.exports = { suggestSwap, REASONS };
