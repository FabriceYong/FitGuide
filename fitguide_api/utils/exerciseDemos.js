/**
 * Demonstrations for workout steps: which movement a step describes, and a
 * freely licensed picture of it (Free Exercise DB or wger, chosen by hand so
 * the picture shows that movement). The list in data/exerciseDemos.json is
 * shared with the Flutter app's drawn demos (lib/src/features/workout/
 * exercise_demos.dart): same names, same patterns, so both pick the same
 * movement for a step.
 */
const DEMOS = require('../data/exerciseDemos.json').map((demo) => ({
  ...demo,
  regexps: demo.patterns.map((p) => new RegExp(p, 'i')),
}));

/**
 * The demo for a step, or null when none fits (better nothing than a wrong
 * one). Looks at the exercise name, then the instruction's title ("Mountain
 * Climbers: Start in plank...") and then the rest of it. Within a text the
 * earliest mention wins, then the longest ("side plank" over "plank").
 */
function matchDemo(name, instruction) {
  const text = String(instruction || '').trim();
  const colon = text.indexOf(':');
  const hasTitle = colon > 0 && colon < 70;
  const texts = [
    ...(name && String(name).trim() ? [String(name)] : []),
    ...(hasTitle ? [text.slice(0, colon)] : []),
    hasTitle ? text.slice(colon + 1) : text,
  ];
  for (const weak of [false, true]) {
    for (const t of texts) {
      let best = null;
      let at = Infinity;
      let length = 0;
      for (const demo of DEMOS) {
        if (Boolean(demo.weak) !== weak) continue;
        for (const re of demo.regexps) {
          const m = re.exec(t);
          if (!m) continue;
          if (m.index < at || (m.index === at && m[0].length > length)) {
            best = demo;
            at = m.index;
            length = m[0].length;
          }
        }
      }
      if (best) return best;
    }
  }
  return null;
}

// wger's images can't be loaded cross-origin (no CORS headers), which the
// app's web build needs, so they are served through the API
// (GET /api/exercise-media/picture/:slug/:frame), cached, which also spares
// wger's server. Free Exercise DB images come from jsDelivr, which allows it.
const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const proxied = (media) => media?.source === 'wger';

/** The upstream URL behind a proxied picture, or null. */
function pictureSource(slug, frame) {
  const demo = DEMOS.find((d) => slugOf(d.name) === slug);
  return proxied(demo?.media) ? demo.media.frames[Number(frame)] || null : null;
}

/** A demo's media with its frames pointing where clients should load them. */
function clientMedia(demo, apiBase) {
  if (!demo.media) return null;
  if (!proxied(demo.media)) return demo.media;
  const frames = demo.media.frames.map((_, i) => `${apiBase}/api/exercise-media/picture/${slugOf(demo.name)}/${i}`);
  return { ...demo.media, frames };
}

/** What clients get: the movement's name and its picture (null when it has none). */
const publicDemo = (demo, apiBase) => (demo ? { name: demo.name, media: clientMedia(demo, apiBase) } : null);

const allDemos = (apiBase) => DEMOS.map(({ regexps: _r, ...demo }) => ({ ...demo, media: clientMedia(demo, apiBase) }));

module.exports = { matchDemo, publicDemo, allDemos, pictureSource };
