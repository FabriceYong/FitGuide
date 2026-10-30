'use client';

/**
 * The demonstration for a workout step: the movement it describes and a
 * freely licensed picture of it (Free Exercise DB or wger), matched by the
 * API (GET /api/exercise-media/demo). The app matches the same way, so both
 * show the same movement for a step. No demo is better than a wrong one, so
 * nothing is guessed when the API finds no match.
 */
import { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';

const cache = new Map();

function fetchDemo(name, instruction) {
  const key = `${name}\n${instruction}`;
  if (!cache.has(key)) {
    const request = apiRequest('/exercise-media/demo', { query: { name, instruction } })
      .then((data) => data?.demo || null)
      .catch(() => {
        cache.delete(key); // try again next time
        return null;
      });
    cache.set(key, request);
  }
  return cache.get(key);
}

export function useExerciseDemo(step) {
  const name = step?.exerciseName || '';
  const instruction = step?.instruction || '';
  const [state, setState] = useState({ key: null, demo: null });
  const key = `${name}\n${instruction}`;

  useEffect(() => {
    if (!name && !instruction) return undefined;
    let active = true;
    fetchDemo(name, instruction).then((demo) => {
      if (active) setState({ key, demo });
    });
    return () => { active = false; };
  }, [key, name, instruction]);

  const ready = state.key === key;
  return { demo: ready ? state.demo : null, loading: Boolean(name || instruction) && !ready };
}
