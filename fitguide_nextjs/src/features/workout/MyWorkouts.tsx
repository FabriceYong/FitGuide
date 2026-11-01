'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, Dumbbell, Edit3, Loader2, Play, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStartSignUp } from '../auth/AuthWrapper';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { deleteMyWorkout, fetchMyWorkouts, type MyWorkout } from '../../services/myWorkoutService';
import { WorkoutBuilder } from './WorkoutBuilder';

/** Your own workouts (Explore → My workouts): start, change or delete them, or build a new one. */
export function MyWorkouts() {
  const { hasAccount } = useAuth();
  const startSignUp = useStartSignUp();
  const [workouts, setWorkouts] = useState<MyWorkout[] | null>(null);
  const [editing, setEditing] = useState<MyWorkout | 'new' | null>(null);
  const [deleting, setDeleting] = useState<MyWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAccount) return;
    fetchMyWorkouts().then(setWorkouts).catch((err: Error) => setError(err.message));
  }, [hasAccount]);

  if (!hasAccount) {
    return (
      <div className="text-center py-12 bg-obsidian-wave/50 rounded-2xl border border-white-30/10 space-y-3">
        <Dumbbell className="w-8 h-8 mx-auto text-lime-light" aria-hidden="true" />
        <p className="text-white-70">Create an account to build your own workouts.</p>
        <button type="button" onClick={startSignUp} className="px-4 py-2 rounded-xl bg-lime-light text-noir-eclipse text-sm font-bold">Create an account</button>
      </div>
    );
  }

  if (editing) {
    return (
      <section aria-labelledby="builder-title" className="space-y-4">
        <h2 id="builder-title" className="text-xl font-extrabold text-white">{editing === 'new' ? 'Build a workout' : `Edit ${editing.title}`}</h2>
        <WorkoutBuilder
          workout={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSaved={(saved) => {
            setWorkouts((list) => [saved, ...(list || []).filter((w) => w.slug !== saved.slug)]);
            setEditing(null);
          }}
        />
      </section>
    );
  }

  const remove = async (workout: MyWorkout) => {
    setDeleting(null);
    setError(null);
    try {
      await deleteMyWorkout(workout.slug);
      setWorkouts((list) => (list || []).filter((w) => w.slug !== workout.slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the workout.');
    }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setEditing('new')} className="w-full h-12 rounded-2xl bg-lime-light text-noir-eclipse text-sm font-bold flex items-center justify-center gap-2 hover:bg-lime-light/90">
        <Plus className="w-4 h-4" aria-hidden="true" /> Build a workout
      </button>
      {error && <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertCircle className="w-4 h-4" aria-hidden="true" /> {error}</p>}
      {!workouts ? (
        !error && <p className="flex items-center gap-2 text-sm text-white-70"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading…</p>
      ) : workouts.length === 0 ? (
        <p className="text-center py-10 bg-obsidian-wave/50 rounded-2xl border border-white-30/10 text-white-70 text-sm px-4">
          No workouts of your own yet. Pick your exercises, sets and reps, and they play like any other workout, with your last numbers alongside.
        </p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {workouts.map((w) => (
            <li key={w.slug} className="bg-obsidian-wave rounded-2xl p-4 space-y-3">
              <div>
                <h3 className="font-extrabold text-white">{w.title}</h3>
                <p className="text-sm text-white-70">{w.category} · {w.shortDescription}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/workouts/${w.slug}/play`} className="flex-1 h-10 rounded-lg bg-lime-light text-noir-eclipse text-sm font-bold flex items-center justify-center gap-1.5">
                  <Play className="w-4 h-4" aria-hidden="true" /> Start
                </Link>
                <button type="button" onClick={() => setEditing(w)} aria-label={`Edit ${w.title}`} className="h-10 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 text-sm font-semibold">
                  <Edit3 className="w-4 h-4" aria-hidden="true" /> Edit
                </button>
                <button type="button" onClick={() => setDeleting(w)} aria-label={`Delete ${w.title}`} className="h-10 px-3 rounded-lg bg-white/10 hover:bg-red-500/20 text-red-300 flex items-center">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.title}?`}
          message="The workout goes; the sessions you've done with it stay in your history."
          confirmText="Delete"
          danger
          icon={<AlertTriangle className="w-8 h-8 text-red-300" />}
          onConfirm={() => remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
