/**
 * Writing help in the article editor for coaches and admins: a first draft
 * of an article's structure from its title and the writer's notes, or a
 * tidied-up version of one section's text. The writer edits everything,
 * and coaches' articles still go through admin review.
 */
const ai = require('./ai');

const GUIDE = `You help a fitness coach write a short article for FitGuide, a fitness app. Readers are everyday members, not experts.
Style: plain, friendly, practical; short paragraphs; British or American spelling as the writer uses; no hype, no emojis, no invented statistics or study citations.
Health claims stay general and cautious ("many people find…"); no medical, medication or supplement dosing advice.`;

const OUTLINE_TOOL = {
  name: 'article_draft',
  description: 'A first draft of the article.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'One or two sentence summary (under 300 characters)' },
      takeaways: { type: 'array', items: { type: 'string' }, description: '3 key points, one sentence each' },
      sections: {
        type: 'array',
        description: '2 to 4 sections',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            paragraphs: { type: 'array', items: { type: 'string' }, description: '1 to 3 short paragraphs' },
            tip: { type: ['string', 'null'], description: 'An optional practical tip' },
          },
          required: ['heading', 'paragraphs', 'tip'],
          additionalProperties: false,
        },
      },
    },
    required: ['description', 'takeaways', 'sections'],
    additionalProperties: false,
  },
};

const POLISH_TOOL = {
  name: 'polished_text',
  description: 'The section text, tidied up.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: { text: { type: 'string', description: 'The improved text; a blank line between paragraphs' } },
    required: ['text'],
    additionalProperties: false,
  },
};

const clip = (v, max) => String(v || '').trim().slice(0, max);

async function outline(user, { title, notes, category }) {
  ai.getClient('Writing help');
  await ai.spend(user, 'writing');
  const answer = await ai.callTool({
    what: 'Writing help',
    system: `${GUIDE}\nDraft the article from the title and the writer's notes, keeping to what the notes say where they say something. Call article_draft once.`,
    tool: OUTLINE_TOOL,
    content: [{ type: 'text', text: `Title: ${clip(title, 160)}\nCategory: ${clip(category, 20)}\nWriter's notes: ${clip(notes, 2000) || '(none)'}` }],
    maxTokens: 3000,
    unreadable: "A draft couldn't be written for this title. Try adding a few notes.",
  });
  return {
    draft: {
      description: clip(answer.description, 300),
      takeaways: (answer.takeaways || []).map((t) => clip(t, 200)).filter(Boolean).slice(0, 6),
      sections: (answer.sections || []).slice(0, 6).map((s) => ({
        heading: clip(s.heading, 120),
        paragraphs: (s.paragraphs || []).map((p) => clip(p, 3000)).filter(Boolean).slice(0, 6),
        ...(s.tip && { tip: clip(s.tip, 500) }),
      })).filter((s) => s.heading && s.paragraphs.length),
    },
    allowance: await ai.usage(user, 'writing'),
  };
}

async function polish(user, { text, heading }) {
  ai.getClient('Writing help');
  await ai.spend(user, 'writing');
  const answer = await ai.callTool({
    what: 'Writing help',
    system: `${GUIDE}\nTidy up the writer's section: fix grammar and spelling, make it clearer and easier to read, keep their meaning, facts and voice, and keep roughly the same length. Call polished_text once.`,
    tool: POLISH_TOOL,
    content: [{ type: 'text', text: `Section heading: ${clip(heading, 120)}\n\n${clip(text, 6000)}` }],
    maxTokens: 3000,
    unreadable: "This text couldn't be tidied up.",
  });
  return { text: clip(answer.text, 6000), allowance: await ai.usage(user, 'writing') };
}

module.exports = { outline, polish };
