'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Crown, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/api';

interface GatedWorkout {
  slug: string;
  title: string;
  description: string;
  duration: number;
  category: string;
  locked?: boolean;
  [key: string]: unknown;
}

/**
 * PLUS workouts arrive locked (no steps) from server rendering. PLUS members
 * get the full workout fetched with their session; everyone else sees an
 * upgrade card.
 */
export function PlusGate({ workout, children }: { workout: GatedWorkout; children: (workout: GatedWorkout) => ReactNode }) {
  const { ready, user } = useAuth();
  const [unlocked, setUnlocked] = useState<GatedWorkout | null>(null);
  const isPlus = user?.plan === 'plus' || user?.role === 'admin';

  useEffect(() => {
    if (!workout.locked || !ready || !isPlus) return;
    apiRequest(`/workouts/${encodeURIComponent(workout.slug)}`, { auth: true })
      .then((data) => setUnlocked(data.workout))
      .catch(() => setUnlocked(null));
  }, [workout.locked, workout.slug, ready, isPlus]);

  if (!workout.locked) return <>{children(workout)}</>;
  if (unlocked && !unlocked.locked) return <>{children(unlocked)}</>;
  if (!ready || isPlus) {
    return <div className="min-h-screen bg-noir-eclipse flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white-70" /></div>;
  }

  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-obsidian-wave border border-white-30/10 rounded-3xl p-8 space-y-5 text-center">
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-400/15 text-amber-300">
          <Crown className="w-3.5 h-3.5" /> FitGuide PLUS
        </span>
        <h1 className="text-3xl font-extrabold">{workout.title}</h1>
        <p className="text-white-70">{workout.description}</p>
        <p className="text-sm text-white-70">{workout.duration} min · {workout.category}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/plus" className="px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">See PLUS</Link>
          <Link href="/workouts" className="px-6 py-3 rounded-xl bg-white/10 font-bold text-sm">Browse free workouts</Link>
        </div>
      </div>
    </div>
  );
}
