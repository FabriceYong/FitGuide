'use client';

/** The workout catalog, loaded once and shared by the dashboard's tabs. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchWorkouts, type CatalogResult } from '../services/workoutService';
import type { Workout } from '../types/catalog';

interface WorkoutContextValue {
  workouts: Workout[];
  /** True until the first load settles. */
  loading: boolean;
  /** Why the catalog couldn't be loaded (only when there's no saved copy either). */
  error: string | null;
  /** Set when the server was unreachable and the saved copy is shown. */
  savedAt: string | null;
  /** Categories that have workouts, A–Z. */
  categories: string[];
  reload: () => void;
}

const WorkoutContext = createContext<WorkoutContextValue | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const apply = useCallback((result: CatalogResult) => {
    setWorkouts(result.workouts);
    setSavedAt(result.savedAt || null);
    setError(null);
    setLoading(false);
  }, []);
  const fail = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : 'Could not load workouts.');
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkouts().then(apply, fail);
  }, [apply, fail]);

  const reload = useCallback(() => {
    setError(null);
    fetchWorkouts().then(apply, fail);
  }, [apply, fail]);

  const categories = useMemo(() => [...new Set(workouts.map((w) => w.category))].sort(), [workouts]);
  const value = useMemo(
    () => ({ workouts, loading, error, savedAt, categories, reload }),
    [workouts, loading, error, savedAt, categories, reload],
  );
  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkouts() {
  const context = useContext(WorkoutContext);
  if (!context) throw new Error('useWorkouts must be used within a WorkoutProvider');
  return context;
}
