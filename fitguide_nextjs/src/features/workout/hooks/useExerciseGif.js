'use client';

/**
 * useExerciseGif.js
 * Multi-Source Exercise Media Provider with Persistent LocalStorage Caching
 */
import { useState, useEffect, useRef } from 'react';
import { getUnsplashWorkoutImage } from '../../../services/unsplashService';

const LOCAL_STORAGE_PREFIX = 'fitguide_media_cache_v1_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const gifCache = new Map();
const inflight = new Map();
import { apiRequest } from '../../../lib/api';

const CURATED_DEMO_LIBRARY = {
  warmup: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=80',
  cooldown: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80',
  stretching: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
  tabata: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
  hiit: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800&auto=format&fit=crop&q=80',
  squat: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
  pushup: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&auto=format&fit=crop&q=80',
  lunge: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800&auto=format&fit=crop&q=80',
  plank: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=800&auto=format&fit=crop&q=80',
  burpee: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=800&auto=format&fit=crop&q=80',
  yoga: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
  cardio: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&auto=format&fit=crop&q=80',
  strength: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
  abs: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=80',
  core: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=80'
};

function getLocalStorageMedia(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(LOCAL_STORAGE_PREFIX + key);
      return null;
    }
    return parsed.url;
  } catch (_) {
    return null;
  }
}

function setLocalStorageMedia(key, url) {
  if (typeof window === 'undefined' || !url) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify({
      url, timestamp: Date.now()
    }));
  } catch (_) {}
}

function extractSearchTerm(instruction) {
  let cleaned = instruction
    .replace(/^(begin in|start in|inhale and|exhale and|return to|lower down|hold|come into|move into|transition to|step or jump|look forward and|cool down:|warm-up:|main workout:)\s*/i, '')
    .trim();

  const colonIdx = cleaned.indexOf(':');
  if (colonIdx > 3 && colonIdx < 60) {
    cleaned = cleaned.substring(0, colonIdx).trim();
  }

  const parenMatch = cleaned.match(/^(.+?)\s*\([^)]+\)/);
  if (parenMatch) {
    cleaned = parenMatch[1].trim();
  }

  const fragment = cleaned.split(/[,./]/)[0].trim();
  if (fragment.length > 3 && fragment.length < 60) {
    cleaned = fragment;
  }
  return cleaned.substring(0, 60).toLowerCase();
}

function getCuratedFallback(instruction) {
  const text = (instruction || '').toLowerCase();
  for (const [key, url] of Object.entries(CURATED_DEMO_LIBRARY)) {
    if (key !== 'default' && text.includes(key)) {
      return url;
    }
  }
  return CURATED_DEMO_LIBRARY.default;
}

async function fetchExerciseMedia(searchTerm, rawInstruction) {
  const lsCached = getLocalStorageMedia(searchTerm);
  if (lsCached) return lsCached;

  try {
    const data = await apiRequest('/exercise-media/gif', { query: { name: searchTerm } });
    if (data?.gifUrl) {
      setLocalStorageMedia(searchTerm, data.gifUrl);
      return data.gifUrl;
    }
  } catch (_) {}

  try {
    const unsplash = await getUnsplashWorkoutImage(`step_${searchTerm}`, 'Fitness', searchTerm, 'medium');
    if (unsplash && unsplash.imageUrl) {
      setLocalStorageMedia(searchTerm, unsplash.imageUrl);
      return unsplash.imageUrl;
    }
  } catch (_) {}

  const fallback = getCuratedFallback(rawInstruction || searchTerm);
  setLocalStorageMedia(searchTerm, fallback);
  return fallback;
}

export function useExerciseGif(preassignedGifUrl, instruction) {
  const [gifUrl, setGifUrl] = useState(preassignedGifUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (preassignedGifUrl) {
      setGifUrl(preassignedGifUrl);
      setLoading(false);
      setError(false);
      return;
    }

    const text = instruction || '';
    const searchTerm = extractSearchTerm(text) || 'exercise';

    if (gifCache.has(searchTerm)) {
      setGifUrl(gifCache.get(searchTerm) || getCuratedFallback(text));
      setLoading(false);
      return;
    }

    const lsUrl = getLocalStorageMedia(searchTerm);
    if (lsUrl) {
      gifCache.set(searchTerm, lsUrl);
      setGifUrl(lsUrl);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    if (!inflight.has(searchTerm)) {
      inflight.set(searchTerm, fetchExerciseMedia(searchTerm, text).then(url => {
        const finalUrl = url || getCuratedFallback(text);
        gifCache.set(searchTerm, finalUrl);
        inflight.delete(searchTerm);
        return finalUrl;
      }));
    }

    inflight.get(searchTerm).then(url => {
      if (mountedRef.current) {
        setGifUrl(url || getCuratedFallback(text));
        setLoading(false);
      }
    }).catch(() => {
      if (mountedRef.current) {
        setGifUrl(getCuratedFallback(text));
        setLoading(false);
      }
    });
  }, [preassignedGifUrl, instruction]);

  return { gifUrl, loading, error };
}
