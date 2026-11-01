'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { fetchMyWorkout } from '../../../../services/myWorkoutService';
import { PlayWorkout } from './PlayWorkout';

const BACK = '/?tab=explore&view=mine';

/** The player for one of your own workouts, loaded with your session. */
export function PlayOwnWorkout({ slug }) {
  const { ready, hasAccount } = useAuth();
  const [workout, setWorkout] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!hasAccount) {
      queueMicrotask(() => setMissing(true));
      return;
    }
    fetchMyWorkout(slug).then(setWorkout).catch(() => setMissing(true));
  }, [ready, hasAccount, slug]);

  if (workout) return <PlayWorkout workout={workout} program={null} returnTo={BACK} />;
  return (
    <main className="min-h-screen bg-noir-eclipse flex flex-col items-center justify-center gap-4 p-6 text-center">
      {missing ? (
        <>
          <h1 className="text-xl font-extrabold text-white">Workout not found</h1>
          <p className="text-white-70 text-sm">It may have been deleted, or it belongs to another account.</p>
          <Link href={BACK} className="px-4 py-2 rounded-xl bg-lime-light text-noir-eclipse text-sm font-bold">Your workouts</Link>
        </>
      ) : <Loader2 className="w-6 h-6 animate-spin text-white-70" aria-label="Loading" />}
    </main>
  );
}
