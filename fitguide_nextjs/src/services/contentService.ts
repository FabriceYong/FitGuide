'use client';

/** Reviews, the exercise library and the article feeds. */
import { apiRequest } from '../lib/api';
import type { Exercise, FeedArticle, Review } from '../types/catalog';

// ── Reviews ───────────────────────────────────────────────────────────────────
/** Newest first; pass a workout slug to get only that workout's reviews. */
export const fetchReviews = async (workoutSlug?: string): Promise<Review[]> =>
  (await apiRequest('/reviews', { query: { workoutId: workoutSlug } })).reviews;

/** Like a review (once per account). Returns the new like count. */
export const likeReview = async (id: string): Promise<number> =>
  (await apiRequest(`/reviews/${encodeURIComponent(id)}/like`, { method: 'POST', auth: true })).likes;

export interface NewReview {
  rating: number;
  comment: string;
  /** Slug of the reviewed workout; empty for a general review. */
  workoutSlug?: string;
  workoutTitle?: string;
  beforeImage?: File | null;
  afterImage?: File | null;
}

export async function postReview(review: NewReview): Promise<Review> {
  const formData = new FormData();
  formData.append('rating', String(review.rating));
  formData.append('comment', review.comment);
  if (review.workoutSlug) {
    formData.append('workoutId', review.workoutSlug);
    if (review.workoutTitle) formData.append('workoutRegiment', review.workoutTitle);
  }
  if (review.beforeImage) formData.append('beforeImage', review.beforeImage);
  if (review.afterImage) formData.append('afterImage', review.afterImage);
  return (await apiRequest('/reviews', { method: 'POST', formData, auth: true })).review;
}

// ── Exercise library ──────────────────────────────────────────────────────────
export const fetchExercises = async (): Promise<Exercise[]> => (await apiRequest('/exercises')).exercises;

// ── Articles (RSS feeds proxied by the API) ───────────────────────────────────
export type FeedId = 'healthline' | 'mnt';

export const fetchFeedArticles = async (feed: FeedId, count = 3): Promise<FeedArticle[]> =>
  (await apiRequest('/articles', { query: { feed, count } })).articles;
