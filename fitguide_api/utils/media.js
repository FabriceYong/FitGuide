/**
 * Exercise GIFs come from ExerciseDB/AscendAPI, licensed for non-commercial
 * use only. Once paid subscriptions are on, they are switched off unless
 * EXERCISE_GIFS_LICENSED=true says a commercial licence (or self-produced
 * media) is in place. Without them the player falls back to photos.
 */
const billing = require('../services/billing');

const gifsAllowed = () => !billing.isEnabled() || process.env.EXERCISE_GIFS_LICENSED === 'true';

/** Remove third-party GIFs from workout steps when they aren't allowed. */
function withoutGifs(steps) {
  if (gifsAllowed() || !Array.isArray(steps)) return steps;
  return steps.map(({ gifUrl: _gif, exerciseDbId: _id, ...step }) => step);
}

module.exports = { gifsAllowed, withoutGifs };
