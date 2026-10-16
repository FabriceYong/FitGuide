/**
 * Workout catalog access for every database mode.
 *  - MongoDB with seeded workouts: served from the collection.
 *  - MongoDB with an empty collection, or mock mode: served from
 *    seed/workoutSeeder.js, with view/like counters kept in the mock DB.
 * Workouts are identified by slug everywhere (favorites, reviews, likes).
 */
const Workout = require('../models/Workout');
const mockDb = require('../models/mockDb');
const seedWorkouts = require('../seed/workoutSeeder');

const isMock = () => process.env.MOCK_DB === 'true';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function fromSeed(w) {
  const { viewCount, likeCount } = mockDb.getWorkoutStats(w.slug);
  return {
    ...w,
    id: w.slug,
    viewCount,
    likeCount,
    averageRating: 0,
    totalReviews: 0,
    isPublished: true,
  };
}

function matchesFilters(w, f) {
  if (f.category && w.category !== f.category) return false;
  if (f.difficulty && w.difficulty !== f.difficulty) return false;
  if (f.intensity && w.intensity !== f.intensity) return false;
  if (f.minDuration && w.duration < Number(f.minDuration)) return false;
  if (f.maxDuration && w.duration > Number(f.maxDuration)) return false;
  if (f.equipment && !(w.equipment || []).includes(f.equipment)) return false;
  if (f.search) {
    const q = String(f.search).toLowerCase();
    return w.title.toLowerCase().includes(q)
      || w.description.toLowerCase().includes(q)
      || (w.tags || []).some((tag) => tag.includes(q));
  }
  return true;
}

function buildMongoQuery(f) {
  const query = { isPublished: true };
  if (f.category) query.category = String(f.category);
  if (f.difficulty) query.difficulty = String(f.difficulty);
  if (f.intensity) query.intensity = String(f.intensity);
  if (f.minDuration || f.maxDuration) {
    query.duration = {};
    if (f.minDuration) query.duration.$gte = Number(f.minDuration);
    if (f.maxDuration) query.duration.$lte = Number(f.maxDuration);
  }
  if (f.equipment) query.equipment = String(f.equipment);
  if (f.search) {
    // Escape user input so it is matched literally (prevents regex injection / ReDoS).
    const re = new RegExp(escapeRegex(String(f.search).slice(0, 100)), 'i');
    query.$or = [{ title: re }, { description: re }, { tags: re }];
  }
  return query;
}

async function useSeedData() {
  if (isMock()) return true;
  return (await Workout.estimatedDocumentCount()) === 0;
}

async function list(filters = {}) {
  if (await useSeedData()) {
    return seedWorkouts.filter((w) => matchesFilters(w, filters)).map(fromSeed);
  }
  const docs = await Workout.find(buildMongoQuery(filters)).sort({ createdAt: -1 });
  return docs.map((w) => w.toPublicObject());
}

/** Fetch one workout by slug and count the view. Returns null if missing. */
async function getBySlug(slug) {
  if (await useSeedData()) {
    const w = seedWorkouts.find((s) => s.slug === slug);
    if (!w) return null;
    mockDb.updateWorkoutStats(slug, (stats) => { stats.viewCount += 1; });
    return fromSeed(w);
  }
  const doc = await Workout.findOneAndUpdate(
    { slug, isPublished: true },
    { $inc: { viewCount: 1 } },
    { new: true }
  );
  return doc ? doc.toPublicObject() : null;
}

async function exists(slug) {
  if (await useSeedData()) return seedWorkouts.some((w) => w.slug === slug);
  return Boolean(await Workout.exists({ slug, isPublished: true }));
}

/** Resolve a list of slugs to workouts, preserving order and skipping unknown slugs. */
async function getManyBySlugs(slugs) {
  if (!slugs.length) return [];
  let found;
  if (await useSeedData()) {
    found = seedWorkouts.filter((w) => slugs.includes(w.slug)).map(fromSeed);
  } else {
    found = (await Workout.find({ slug: { $in: slugs }, isPublished: true })).map((w) => w.toPublicObject());
  }
  const bySlug = new Map(found.map((w) => [w.slug, w]));
  return slugs.map((s) => bySlug.get(s)).filter(Boolean);
}

/** Record a like from a user; liking twice is a no-op. Returns the like count, or null if missing. */
async function like(slug, userId) {
  if (await useSeedData()) {
    if (!seedWorkouts.some((w) => w.slug === slug)) return null;
    const stats = mockDb.updateWorkoutStats(slug, (s) => {
      if (!s.likedBy.includes(userId)) {
        s.likedBy.push(userId);
        s.likeCount += 1;
      }
    });
    return stats.likeCount;
  }
  const doc = await Workout.findOneAndUpdate(
    { slug, likedBy: { $ne: userId } },
    { $addToSet: { likedBy: userId }, $inc: { likeCount: 1 } },
    { new: true }
  ) || await Workout.findOne({ slug });
  return doc ? doc.likeCount : null;
}

module.exports = { list, getBySlug, exists, getManyBySlugs, like };
