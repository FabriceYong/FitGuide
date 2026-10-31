'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, ArrowLeft, Check, ChevronDown, Clock, Dumbbell, Flame, Heart, Package, Play, Target, Timer, TrendingUp,
} from 'lucide-react';
import { WorkoutReviews } from '../reviews/components/WorkoutReviews';
import { fetchWorkoutBySlug } from '../../services/workoutService';
import { addToFavorites, removeFromFavorites, checkIsFavorite } from '../../services/favoriteService';
import { useAuth } from '../../contexts/AuthContext';
import { SiteNav } from '../../components/SiteNav';
import { getWorkoutSpecificImage } from '../../utils/unsplashImages';
import { requiredEquipment, stripOptional } from './catalogFilter';
import { StepDemo } from './StepDemo';
import { repTarget, stepClock, stepName, stepsFor } from './workoutSteps';

const SHOWN_STEPS = 8;

/** An icon for a piece of equipment, by name. */
const equipmentIcon = (name) => {
  const n = name.toLowerCase();
  if (/dumbbell|barbell|kettlebell|weight|plate/.test(n)) return Dumbbell;
  if (/timer|watch|clock/.test(n)) return Timer;
  return Package;
};

/** One step in "What you'll do": its drawn demo, name and target. */
function StepRow({ step, index, color }) {
  const reps = repTarget(step);
  const target = reps ? `${reps.sets ? `${reps.sets} × ` : ''}${reps.reps} reps` : step.duration ? stepClock(step.duration) : null;
  return (
    <li className="flex items-center gap-3 sm:gap-4 p-3 rounded-2xl bg-obsidian-wave border border-white-30/10">
      <span className="w-16 h-16 shrink-0"><StepDemo step={step} color={color} size="thumb" animate={false} /></span>
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="text-[11px] font-bold text-white-70 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
          <span className="font-bold text-white leading-snug line-clamp-2">{stepName(step)}</span>
        </span>
        <span className="block text-xs text-white-70 mt-0.5 line-clamp-2">{step.instruction}</span>
      </span>
      {target && <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums" style={{ color, backgroundColor: `${color}18` }}>{target}</span>}
    </li>
  );
}

const Section = ({ title, children }) => (
  <section className="space-y-4">
    <h2 className="text-lg font-extrabold text-white">{title}</h2>
    {children}
  </section>
);

/**
 * A workout's page: what it is, every step with its demonstration, what you
 * need, and reviews, with "Start workout" always in reach (pinned to the
 * bottom on a phone, in the side card on a wide screen).
 * @param {object} [props.initialWorkout] Workout already fetched (e.g. by the
 *        server-rendered /workouts/[slug] page); skips the client fetch.
 */
export const WorkoutDetails = ({ workoutSlug, initialWorkout = null, tintColor, onBack, onBegin }) => {
  const [workout, setWorkout] = useState(initialWorkout);
  const [loading, setLoading] = useState(!initialWorkout);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [allSteps, setAllSteps] = useState(false);
  const { hasAccount } = useAuth();

  useEffect(() => {
    if (initialWorkout) {
      checkIsFavorite(initialWorkout.slug).then(setIsFavorite).catch(() => {});
      return;
    }
    let active = true;
    fetchWorkoutBySlug(workoutSlug)
      .then(async (response) => {
        if (!active) return;
        if (!response.success) { setError('Workout not found'); return; }
        setWorkout(response.workout);
        setIsFavorite(await checkIsFavorite(response.workout.slug).catch(() => false));
      })
      .catch(() => active && setError('Failed to load workout'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [workoutSlug, initialWorkout]);

  const toggleFavorite = async () => {
    if (!workout?.slug || favoriteLoading || !hasAccount) return;
    setFavoriteLoading(true);
    try {
      if (isFavorite) await removeFromFavorites(workout.slug);
      else await addToFavorites(workout.slug);
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-noir-eclipse flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-lime-light border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading workout" />
      </div>
    );
  }
  if (error || !workout) {
    return (
      <div className="min-h-screen bg-noir-eclipse flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-white-70 mb-4">{error || 'Workout not found'}</p>
          <button type="button" onClick={onBack} className="px-6 py-3 bg-lime-light text-noir-eclipse rounded-xl font-bold">Go back</button>
        </div>
      </div>
    );
  }

  const color = tintColor;
  const steps = stepsFor(workout);
  const shown = allSteps ? steps : steps.slice(0, SHOWN_STEPS);
  const gear = requiredEquipment(workout).map(stripOptional);
  const image = getWorkoutSpecificImage(workout.title, workout.category, 'large', workout.thumbnailUrl);
  const facts = [
    { icon: Clock, label: `${workout.duration} min` },
    { icon: TrendingUp, label: workout.difficulty },
    ...(workout.calories ? [{ icon: Flame, label: `~${workout.calories} kcal` }] : []),
    { icon: gear.length ? Dumbbell : Check, label: gear.length ? `${gear.length} piece${gear.length > 1 ? 's' : ''} of equipment` : 'No equipment' },
  ];
  const startButton = (extra = '') => (
    <button
      type="button"
      onClick={() => onBegin(workout)}
      className={`flex items-center justify-center gap-2 bg-lime-light text-noir-eclipse font-extrabold rounded-2xl uppercase tracking-wider text-sm hover:bg-lime-light/90 active:scale-[0.99] transition-all ${extra}`}
    >
      <Play className="w-4 h-4 fill-current" aria-hidden="true" /> Start workout
    </button>
  );

  return (
    <div className="min-h-screen bg-noir-eclipse text-white text-left pb-24 lg:pb-12">
      <SiteNav active="/workouts" bottomBar={false} />

      {/* Hero */}
      <div className="relative h-[340px] md:h-[420px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-noir-eclipse via-noir-eclipse/70 to-noir-eclipse/20" aria-hidden="true" />
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 20% 80%, ${color}40 0%, transparent 60%)` }} aria-hidden="true" />
        <div className="relative h-full max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col justify-between py-5">
          <div className="flex items-center justify-between">
            <button type="button" onClick={onBack} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-sm text-sm font-bold hover:bg-black/60">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
            </button>
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={favoriteLoading || !hasAccount}
              title={hasAccount ? undefined : 'Create an account to save favorites'}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${isFavorite ? 'bg-red-500/90' : 'bg-black/40 hover:bg-black/60'} disabled:opacity-60`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-white' : ''}`} aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider" style={{ backgroundColor: `${color}E6`, color: '#0A0C10' }}>{workout.category}</span>
              {workout.intensity && <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/15 backdrop-blur-sm">{workout.intensity} intensity</span>}
              {workout.isPremium && <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-400 text-noir-eclipse">PLUS</span>}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight drop-shadow">{workout.title}</h1>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/90">
              {facts.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-1.5"><Icon className="w-4 h-4" style={{ color }} aria-hidden="true" /> {label}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <main id="main" className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 grid lg:grid-cols-[1fr_360px] gap-10 items-start">
        <div className="space-y-10 min-w-0">
          <Section title="About this workout">
            <p className="text-white-70 leading-relaxed">{workout.description}</p>
          </Section>

          <Section title={`What you'll do · ${steps.length} steps`}>
            <ol className="space-y-2">
              {shown.map((step, i) => <StepRow key={`${i}-${step.instruction}`} step={step} index={i} color={color} />)}
            </ol>
            {steps.length > SHOWN_STEPS && (
              <button type="button" onClick={() => setAllSteps(!allSteps)} aria-expanded={allSteps} className="flex items-center gap-1.5 text-sm font-bold text-lime-light">
                <ChevronDown className={`w-4 h-4 transition-transform ${allSteps ? 'rotate-180' : ''}`} aria-hidden="true" />
                {allSteps ? 'Show fewer steps' : `Show all ${steps.length} steps`}
              </button>
            )}
          </Section>

          <div className="pt-8 border-t border-white-30/10">
            <WorkoutReviews workoutId={workout.slug} workoutTitle={workout.title} />
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="hidden lg:block bg-obsidian-wave border border-white-30/10 rounded-3xl p-5 space-y-4">
            {startButton('w-full py-4')}
            <p className="text-xs text-white-70 text-center">{steps.length} steps · about {workout.duration} minutes</p>
          </div>

          <div className="bg-obsidian-wave border border-white-30/10 rounded-3xl p-5 space-y-5">
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white-70">You&apos;ll need</h2>
              <ul className="flex flex-wrap gap-2">
                {gear.length ? gear.map((item) => {
                  const Icon = equipmentIcon(item);
                  return <li key={item} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white-30/15 text-xs"><Icon className="w-3.5 h-3.5" style={{ color }} aria-hidden="true" /> {item}</li>;
                }) : <li className="flex items-center gap-1.5 text-sm text-white-70"><Check className="w-4 h-4 text-lime-light" aria-hidden="true" /> Nothing but some floor space</li>}
              </ul>
            </div>
            {workout.targetMuscles?.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white-70">Works</h2>
                <ul className="flex flex-wrap gap-2">
                  {workout.targetMuscles.map((m) => <li key={m} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white-30/15 text-xs"><Target className="w-3.5 h-3.5" style={{ color }} aria-hidden="true" /> {m}</li>)}
                </ul>
              </div>
            )}
            {workout.benefits?.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white-70">Benefits</h2>
                <ul className="space-y-1.5">
                  {workout.benefits.map((b) => <li key={b} className="flex items-start gap-2 text-sm text-white/85"><Check className="w-4 h-4 shrink-0 mt-0.5 text-lime-light" aria-hidden="true" /> {b}</li>)}
                </ul>
              </div>
            )}
          </div>

          {workout.cautions?.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-5 space-y-2">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-300"><AlertTriangle className="w-4 h-4" aria-hidden="true" /> Before you start</h2>
              <ul className="space-y-1.5">
                {workout.cautions.map((c) => <li key={c} className="text-sm text-orange-100">{c}</li>)}
              </ul>
            </div>
          )}
        </aside>
      </main>

      {/* Always in reach on a phone or tablet. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 p-3 bg-noir-eclipse/95 backdrop-blur-md border-t border-white-30/10">
        {startButton('w-full py-4')}
      </div>
    </div>
  );
};
