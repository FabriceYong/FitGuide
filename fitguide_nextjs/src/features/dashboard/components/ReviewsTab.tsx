'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertCircle, BadgeCheck, Loader2, MessageSquare, Sparkles, Star, ThumbsUp, Upload, X } from 'lucide-react';
import { assetUrl } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useWorkouts } from '../../../context/WorkoutContext';
import { fetchReviews, likeReview, postReview } from '../../../services/contentService';
import type { Review } from '../../../types/catalog';
import { useStartSignUp } from '../../auth/AuthWrapper';
import { EmptyState } from '../../../components/EmptyState';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function Stars({ rating, size = 'w-4 h-4' }: { rating: number; size?: string }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`${size} ${i < rating ? 'text-amber-300 fill-current' : 'text-white-70'}`} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Member reviews of workouts, newest first. Reviews from people who finished the workout in FitGuide are marked verified. */
export function ReviewsTab() {
  const { hasAccount } = useAuth();
  const startSignUp = useStartSignUp();
  const { workouts } = useWorkouts();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchReviews().then(setReviews).catch((err: Error) => setError(err.message));
  }, []);

  const titles = useMemo(() => new Map(workouts.map((w) => [w.slug, w.title])), [workouts]);
  const shown = (reviews || []).filter((r) => !filter || r.workoutId === filter);
  const average = shown.length ? (shown.reduce((sum, r) => sum + r.rating, 0) / shown.length).toFixed(1) : '–';
  const verified = shown.filter((r) => r.verified).length;
  // Only workouts that have reviews are worth filtering by.
  const reviewed = useMemo(
    () => [...new Set((reviews || []).map((r) => r.workoutId).filter((id): id is string => Boolean(id && titles.has(id))))],
    [reviews, titles],
  );

  const like = async (id: string) => {
    try {
      const likes = await likeReview(id);
      setReviews((prev) => prev && prev.map((r) => (r.id === id ? { ...r, likes } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not like the review.');
    }
  };

  return (
    <div className="space-y-8 pb-10 text-left">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Reviews</h1>
          <p className="text-sm text-white-70 mt-1">What members say about FitGuide workouts.</p>
        </div>
        {hasAccount ? (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            aria-expanded={showForm}
            className="bg-lime-light text-noir-eclipse font-bold px-6 py-3 rounded-full uppercase tracking-wider text-xs flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" /> {showForm ? 'Cancel' : 'Write a review'}
          </button>
        ) : (
          <button type="button" onClick={startSignUp} className="bg-white/10 text-white font-bold px-6 py-3 rounded-full text-xs">
            Create an account to write a review
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Summary icon={<Star className="w-6 h-6 fill-current" />} color="#FCD34D" value={`${average} / 5`} label="Average rating" />
        <Summary icon={<MessageSquare className="w-6 h-6" />} color="#C084FC" value={String(shown.length)} label={shown.length === 1 ? 'Review' : 'Reviews'} />
        <Summary icon={<BadgeCheck className="w-6 h-6" />} color="#34D399" value={String(verified)} label="From members who did the workout" />
      </div>

      {showForm && (
        <ReviewForm
          workouts={workouts.map((w) => ({ slug: w.slug, title: w.title }))}
          onCancel={() => setShowForm(false)}
          onPosted={(review) => {
            setReviews((prev) => [review, ...(prev || [])]);
            setShowForm(false);
          }}
        />
      )}

      {reviewed.length > 0 && (
        <label className="flex items-center gap-3 text-sm font-bold text-white-70">
          Show reviews for
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-obsidian-wave border border-white-30/30 rounded-xl px-3 py-2 text-sm text-white">
            <option value="">All workouts</option>
            {reviewed.map((slug) => <option key={slug} value={slug}>{titles.get(slug)}</option>)}
          </select>
        </label>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-sm text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}

      {!reviews && !error ? (
        <p className="flex items-center gap-2 text-white-70 py-10" role="status"><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Loading reviews…</p>
      ) : shown.length === 0 ? (
        <EmptyState icon={MessageSquare} color="#8B7CF6" title="No reviews yet" text="Finish a workout and tell others how it went. Reviews from people who did the workout are marked verified." />

      ) : (
        <ul className="space-y-6">
          {shown.map((r) => (
            <li key={r.id} className="bg-obsidian-wave p-6 rounded-[24px] border border-white-30/10 flex flex-col gap-4">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-white-30 bg-noir-eclipse flex items-center justify-center overflow-hidden shrink-0">
                    {r.userAvatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={assetUrl(r.userAvatar) || ''} alt="" className="w-full h-full object-cover" />
                      : <span className="font-extrabold text-sm text-lime-light" aria-hidden="true">{r.name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div>
                    <p className="font-bold text-white leading-tight">
                      {r.name}
                      {r.verified && (
                        <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300" title="Completed this workout in FitGuide">
                          Verified
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-white-70">
                      {new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <Stars rating={r.rating} />
              </div>

              {r.workoutId && titles.has(r.workoutId) ? (
                <Link href={`/workouts/${r.workoutId}`} className="self-start px-3 py-1 bg-royal-nebula/20 border border-royal-nebula/40 text-purple-200 rounded-full text-xs font-bold hover:border-purple-300">
                  {titles.get(r.workoutId)}
                </Link>
              ) : r.workoutRegiment ? (
                <span className="self-start px-3 py-1 bg-white/5 text-white-70 rounded-full text-xs font-bold">{r.workoutRegiment}</span>
              ) : null}

              <p className="text-white-70 text-sm leading-relaxed whitespace-pre-line">{r.comment}</p>

              {(r.beforeImage || r.afterImage) && (
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  {([['Before', r.beforeImage], ['After', r.afterImage]] as const).map(([label, src]) => src && (
                    <figure key={label} className="relative rounded-2xl overflow-hidden border border-white-30/10 aspect-[4/3] bg-noir-eclipse">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={assetUrl(src) || ''} alt={`${label}, shared by ${r.name}`} className="w-full h-full object-cover" />
                      <figcaption className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-bold rounded uppercase">{label}</figcaption>
                    </figure>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-white-30/10">
                <button
                  type="button"
                  onClick={() => like(r.id)}
                  disabled={!hasAccount}
                  title={hasAccount ? undefined : 'Sign in to like reviews'}
                  className="flex items-center gap-2 text-white-70 hover:text-lime-light disabled:hover:text-white-70 text-xs font-bold"
                >
                  <ThumbsUp className="w-4 h-4" aria-hidden="true" /> Helpful · {r.likes}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Summary({ icon, color, value, label }: { icon: ReactNode; color: string; value: string; label: string }) {
  return (
    <div className="bg-obsidian-wave p-5 rounded-[20px] border border-white-30/10 flex items-center gap-4">
      <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}1A`, color }} aria-hidden="true">{icon}</div>
      <div>
        <div className="text-2xl font-black text-white">{value}</div>
        <div className="text-xs text-white-70">{label}</div>
      </div>
    </div>
  );
}

function ReviewForm({ workouts, onCancel, onPosted }: {
  workouts: { slug: string; title: string }[];
  onCancel: () => void;
  onPosted: (review: Review) => void;
}) {
  const { user } = useAuth();
  const [workoutSlug, setWorkoutSlug] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<{ before: File | null; after: File | null }>({ before: null, after: null });
  const [previews, setPreviews] = useState<{ before: string | null; after: string | null }>({ before: null, after: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = { before: useRef<HTMLInputElement>(null), after: useRef<HTMLInputElement>(null) };

  const pick = (which: 'before' | 'after', file: File | undefined) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setError('Photos must be JPEG, PNG, WebP or GIF.');
    if (file.size > MAX_IMAGE_BYTES) return setError('Photos must be under 5 MB.');
    setError(null);
    setPhotos((p) => ({ ...p, [which]: file }));
    setPreviews((p) => {
      if (p[which]) URL.revokeObjectURL(p[which]!);
      return { ...p, [which]: URL.createObjectURL(file) };
    });
  };
  const remove = (which: 'before' | 'after') => {
    setPhotos((p) => ({ ...p, [which]: null }));
    setPreviews((p) => {
      if (p[which]) URL.revokeObjectURL(p[which]!);
      return { ...p, [which]: null };
    });
    if (inputs[which].current) inputs[which].current.value = '';
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const review = await postReview({
        rating,
        comment: comment.trim(),
        workoutSlug,
        workoutTitle: workouts.find((w) => w.slug === workoutSlug)?.title,
        beforeImage: photos.before,
        afterImage: photos.after,
      });
      onPosted(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post the review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-obsidian-wave border border-white-30/20 p-6 rounded-[24px] space-y-6" aria-labelledby="review-form-title">
      <div className="flex justify-between items-center border-b border-white-30/15 pb-4">
        <h2 id="review-form-title" className="text-lg font-bold text-white">Review a workout</h2>
        <button type="button" onClick={onCancel} aria-label="Close the review form" className="text-white-70 hover:text-white">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-sm text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <p className="text-sm text-white-70">Posting as <strong className="text-white">{user?.name}</strong></p>
          <div className="space-y-2">
            <label htmlFor="review-workout" className="block text-xs font-bold text-white-70 uppercase tracking-widest">Workout</label>
            <select
              id="review-workout"
              aria-describedby="review-workout-help"
              value={workoutSlug}
              onChange={(e) => setWorkoutSlug(e.target.value)}
              className="bg-noir-eclipse text-white w-full border border-white-30/40 rounded-2xl px-4 py-3 focus:border-lime-light text-sm"
            >
              <option value="">FitGuide in general</option>
              {workouts.map((w) => <option key={w.slug} value={w.slug}>{w.title}</option>)}
            </select>
            <p id="review-workout-help" className="text-xs text-white-70">Reviews of a workout you finished in FitGuide are marked verified.</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-white-70 uppercase tracking-widest mb-2">Rating</legend>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="p-1 cursor-pointer">
                  <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only peer" />
                  <Star className={`w-8 h-8 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-lime-light rounded ${n <= rating ? 'text-amber-300 fill-current' : 'text-white-70'}`} aria-hidden="true" />
                  <span className="sr-only">{n} star{n > 1 ? 's' : ''}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="review-comment" className="block text-xs font-bold text-white-70 uppercase tracking-widest">Your review</label>
            <textarea
              id="review-comment"
              aria-describedby="review-comment-count"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              required
              placeholder="How did the workout go? What would you tell someone about to try it?"
              className="bg-noir-eclipse text-white w-full border border-white-30/40 rounded-2xl px-4 py-3 focus:border-lime-light text-sm resize-none placeholder:text-white-70"
            />
            <p id="review-comment-count" className="text-xs text-white-70 text-right">{comment.length} / 1000 characters</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-white-70 uppercase tracking-widest">Progress photos (optional)</p>
          <div className="grid grid-cols-2 gap-4">
            {(['before', 'after'] as const).map((which) => (
              <div key={which} className="space-y-2">
                <p className="text-xs font-bold text-white-70 uppercase tracking-widest text-center">{which}</p>
                <input
                  ref={inputs[which]}
                  id={`review-${which}`}
                  type="file"
                  accept={IMAGE_TYPES.join(',')}
                  onChange={(e) => pick(which, e.target.files?.[0])}
                  className="sr-only"
                />
                {previews[which] ? (
                  <div className="relative h-40 rounded-2xl overflow-hidden border border-white-30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previews[which]!} alt={`Selected ${which} upload`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => remove(which)} aria-label={`Remove the ${which} photo`} className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full">
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor={`review-${which}`}
                    className="w-full h-40 border-2 border-dashed border-white-30 hover:border-lime-light rounded-2xl flex flex-col items-center justify-center gap-2 text-white-70 hover:text-white cursor-pointer"
                  >
                    <Upload className="w-6 h-6" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-wider">Add {which} photo</span>
                  </label>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-white-70">Photos are public on your review.</p>
        </div>
      </div>

      <div className="pt-4 border-t border-white-30/15 flex justify-end">
        <button type="submit" disabled={submitting || !comment.trim()} className="bg-lime-light text-noir-eclipse font-bold px-8 py-3.5 rounded-full uppercase tracking-wider text-xs disabled:opacity-60 flex items-center gap-2">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Post review
        </button>
      </div>
    </form>
  );
}
