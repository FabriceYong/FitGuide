/**
 * Workout catalog. Workouts are identified by slug everywhere (favorites,
 * reviews, likes, sessions, programs); `id` in API responses is the slug.
 */
const { Prisma } = require('@prisma/client');
const { prisma } = require('../db/prisma');

/** Escape LIKE wildcards so user input is matched literally. */
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Average rating and review count per workout slug. */
async function ratingsFor(slugs) {
  if (!slugs.length) return new Map();
  const rows = await prisma.review.groupBy({
    by: ['workoutSlug'],
    where: { workoutSlug: { in: slugs } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.workoutSlug, {
    averageRating: Math.round((r._avg.rating || 0) * 10) / 10,
    totalReviews: r._count._all,
  }]));
}

async function toPublic(workouts) {
  const ratings = await ratingsFor(workouts.map((w) => w.slug));
  return workouts.map(({ id: _uuid, isPublished: _p, ...w }) => ({
    id: w.slug,
    ...w,
    averageRating: 0,
    totalReviews: 0,
    ...ratings.get(w.slug),
  }));
}

/** Slugs whose title, description or a tag contains the term (case-insensitive). */
async function searchSlugs(term) {
  const pattern = `%${escapeLike(String(term).slice(0, 100))}%`;
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT slug FROM workouts
    WHERE "isPublished"
      AND (title ILIKE ${pattern} OR description ILIKE ${pattern}
           OR EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE tag ILIKE ${pattern}))`);
  return rows.map((r) => r.slug);
}

async function buildWhere(f) {
  const where = { isPublished: true };
  if (f.category) where.category = String(f.category);
  if (f.difficulty) where.difficulty = String(f.difficulty);
  if (f.intensity) where.intensity = String(f.intensity);
  const min = Number(f.minDuration);
  const max = Number(f.maxDuration);
  if (f.minDuration && Number.isFinite(min)) where.duration = { ...where.duration, gte: min };
  if (f.maxDuration && Number.isFinite(max)) where.duration = { ...where.duration, lte: max };
  if (f.equipment) where.equipment = { has: String(f.equipment) };
  if (f.search) where.slug = { in: await searchSlugs(f.search) };
  return where;
}

async function list(filters = {}) {
  const workouts = await prisma.workout.findMany({
    where: await buildWhere(filters),
    orderBy: { createdAt: 'asc' },
  });
  return toPublic(workouts);
}

/** Fetch one workout by slug and count the view. Returns null if missing. */
async function getBySlug(slug) {
  const where = { slug: String(slug), isPublished: true };
  const { count } = await prisma.workout.updateMany({ where, data: { viewCount: { increment: 1 } } });
  if (!count) return null;
  const [workout] = await toPublic([await prisma.workout.findUnique({ where: { slug: String(slug) } })]);
  return workout;
}

async function exists(slug) {
  return (await prisma.workout.count({ where: { slug: String(slug), isPublished: true } })) > 0;
}

/** Resolve a list of slugs to workouts, preserving order and skipping unknown slugs. */
async function getManyBySlugs(slugs) {
  if (!slugs.length) return [];
  const found = await toPublic(await prisma.workout.findMany({ where: { slug: { in: slugs }, isPublished: true } }));
  const bySlug = new Map(found.map((w) => [w.slug, w]));
  return slugs.map((s) => bySlug.get(s)).filter(Boolean);
}

/** Record a like from a user; liking twice is a no-op. Returns the like count, or null if missing. */
async function like(slug, userId) {
  if (!(await exists(slug))) return null;
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.workoutLike.createMany({ data: [{ userId, workoutSlug: slug }], skipDuplicates: true });
    const workout = count
      ? await tx.workout.update({ where: { slug }, data: { likeCount: { increment: 1 } } })
      : await tx.workout.findUnique({ where: { slug } });
    return workout.likeCount;
  });
}

module.exports = { list, getBySlug, exists, getManyBySlugs, like, escapeLike };
