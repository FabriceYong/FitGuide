'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { addToFavorites, getFavorites, removeFromFavorites } from '../../services/favoriteService';
import type { Workout } from '../../types/catalog';

/** The signed-in user's favorite workouts, with a toggle. Guests get none. */
export function useFavorites() {
  const { hasAccount } = useAuth();
  const [favorites, setFavorites] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(hasAccount);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAccount) return;
    getFavorites()
      .then((list) => { setFavorites(list); setError(null); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [hasAccount]);

  const slugs = useMemo(() => new Set(favorites.map((w) => w.slug)), [favorites]);
  const isFavorite = useCallback((slug: string) => slugs.has(slug), [slugs]);

  const toggle = useCallback(async (slug: string) => {
    setError(null);
    try {
      setFavorites(slugs.has(slug) ? await removeFromFavorites(slug) : await addToFavorites(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update favorites.');
    }
  }, [slugs]);

  return { favorites, isFavorite, toggle, loading, error, canSave: hasAccount };
}
