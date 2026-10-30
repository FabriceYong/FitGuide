/**
 * Deleting an account. Most per-user rows go with the user through
 * onDelete: Cascade in prisma/schema.prisma; this handles the rest:
 *  - reviews (kept on SetNull otherwise) and the like counters the user
 *    added to workouts and other people's reviews,
 *  - enrollments, removed before the user's personal plans (programs refuse
 *    to be deleted while enrolled in),
 *  - unpublished creator programs and challenges nobody else joined
 *    (published programs and shared challenges stay for the people using them),
 *  - live Stripe subscriptions, cancelled first,
 *  - uploaded files no one else references.
 */
const { prisma } = require('../db/prisma');
const billing = require('./billing');
const { removeUrls } = require('../utils/storage');

class AccountError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Every image URL the user's rows point at. */
async function imageUrlsOf(userId) {
  const [user, customImages, reviews] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } }),
    prisma.customWorkoutImage.findMany({ where: { userId }, select: { customImageUrl: true } }),
    prisma.review.findMany({ where: { userId }, select: { userAvatar: true, beforeImage: true, afterImage: true } }),
  ]);
  return [
    user?.avatarUrl,
    ...customImages.map((c) => c.customImageUrl),
    ...reviews.flatMap((r) => [r.userAvatar, r.beforeImage, r.afterImage]),
  ].filter(Boolean);
}

/** URLs in the list that some remaining row still uses (profile URLs are free text, so two accounts can share one). */
async function stillUsed(urls) {
  if (!urls.length) return new Set();
  const [users, customImages, reviews] = await Promise.all([
    prisma.user.findMany({ where: { avatarUrl: { in: urls } }, select: { avatarUrl: true } }),
    prisma.customWorkoutImage.findMany({ where: { customImageUrl: { in: urls } }, select: { customImageUrl: true } }),
    prisma.review.findMany({
      where: { OR: [{ userAvatar: { in: urls } }, { beforeImage: { in: urls } }, { afterImage: { in: urls } }] },
      select: { userAvatar: true, beforeImage: true, afterImage: true },
    }),
  ]);
  return new Set([
    ...users.map((u) => u.avatarUrl),
    ...customImages.map((c) => c.customImageUrl),
    ...reviews.flatMap((r) => [r.userAvatar, r.beforeImage, r.afterImage]),
  ]);
}

async function deleteData(tx, userId) {
  const workoutLikes = await tx.workoutLike.findMany({ where: { userId }, select: { workoutSlug: true } });
  if (workoutLikes.length) {
    await tx.workout.updateMany({ where: { slug: { in: workoutLikes.map((l) => l.workoutSlug) }, likeCount: { gt: 0 } }, data: { likeCount: { decrement: 1 } } });
  }
  const reviewLikes = await tx.reviewLike.findMany({ where: { userId, review: { userId: { not: userId } } }, select: { reviewId: true } });
  if (reviewLikes.length) {
    await tx.review.updateMany({ where: { id: { in: reviewLikes.map((l) => l.reviewId) }, likes: { gt: 0 } }, data: { likes: { decrement: 1 } } });
  }

  await tx.review.deleteMany({ where: { userId } });
  await tx.enrollment.deleteMany({ where: { userId } });
  await tx.program.deleteMany({ where: { ownerId: userId } });
  await tx.program.deleteMany({ where: { creatorId: userId, status: { not: 'published' }, enrollments: { none: {} } } });
  // Unpublished coach workouts go too, unless a remaining program uses one.
  const drafts = await tx.workout.findMany({ where: { creatorId: userId, isPublished: false }, select: { slug: true } });
  const used = await tx.programDay.findMany({ where: { workoutSlug: { in: drafts.map((w) => w.slug) } }, select: { workoutSlug: true } });
  await tx.workout.deleteMany({ where: { slug: { in: drafts.map((w) => w.slug).filter((slug) => !used.some((d) => d.workoutSlug === slug)) } } });
  await tx.challenge.deleteMany({ where: { creatorId: userId, members: { every: { userId } } } });
  await tx.user.delete({ where: { id: userId } });
}

/**
 * Delete a user and their data. Throws an AccountError (and deletes nothing)
 * if a subscription could not be cancelled.
 */
async function deleteAccount(userId) {
  try {
    await billing.cancelSubscriptions(userId);
  } catch (err) {
    console.error('[account] could not cancel the subscription:', err.message);
    throw new AccountError('We could not cancel your subscription, so your account was not deleted. Please try again later.', 502);
  }
  const urls = await imageUrlsOf(userId);
  await prisma.$transaction((tx) => deleteData(tx, userId));
  const shared = await stillUsed(urls);
  await removeUrls(urls.filter((url) => !shared.has(url)));
}

module.exports = { AccountError, deleteAccount };
