'use client';

import Link from 'next/link';
import { AlertCircle, Heart, Loader2, Lock } from 'lucide-react';
import { useFavorites } from '../useFavorites';
import { WorkoutCard } from './WorkoutCard';

/** The signed-in user's saved workouts. */
export function FavoritesTab({ onExplore }: { onExplore: () => void }) {
  const { favorites, toggle, loading, error, canSave } = useFavorites();

  if (!canSave) {
    return (
      <div className="text-center py-20 space-y-4">
        <Lock className="w-10 h-10 text-white-70 mx-auto" aria-hidden="true" />
        <h1 className="text-xl font-bold text-white">Save workouts you like</h1>
        <p className="text-white-70 max-w-xs mx-auto text-sm">Create an account to keep a list of favorite workouts across your devices.</p>
        <Link href="/?signup=1" className="inline-block px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Create an account</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 text-left">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Favorite workouts</h1>
        {!loading && <p className="text-sm text-white-70 mt-1">{favorites.length} saved</p>}
      </div>
      {error && <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertCircle className="w-4 h-4" aria-hidden="true" /> {error}</p>}
      {loading ? (
        <p className="flex items-center gap-2 text-white-70 py-10" role="status"><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Loading favorites…</p>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-12 h-12 text-white-70 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-xl font-bold text-white mb-2">No favorites yet</h2>
          <p className="text-white-70 mb-6">Tap the heart on any workout to save it here.</p>
          <button type="button" onClick={onExplore} className="px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Find workouts</button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((w) => (
            <li key={w.slug}><WorkoutCard workout={w} favorite onToggleFavorite={toggle} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}
