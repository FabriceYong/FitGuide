'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { flushQueuedSessions } from '../services/trainingService';

/**
 * Registers the service worker (production builds only), sends workouts that
 * were finished offline once the connection is back, and shows an offline
 * banner.
 */
export function OfflineSupport() {
  const { ready, hasAccount } = useAuth();
  const [offline, setOffline] = useState(false);
  const [synced, setSynced] = useState(0);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker registration failed:', err));
  }, []);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    queueMicrotask(update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (!ready || !hasAccount || offline) return;
    flushQueuedSessions().then((count) => { if (count) setSynced(count); }).catch(() => {});
  }, [ready, hasAccount, offline]);

  if (!offline && !synced) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-obsidian-wave border border-white-30/20 text-sm text-white shadow-lg">
      {offline ? (
        <><WifiOff className="w-4 h-4 text-amber-300" /> You&apos;re offline. Workouts you finish are saved and synced later.</>
      ) : (
        <button onClick={() => setSynced(0)}>{synced} offline {synced === 1 ? 'workout' : 'workouts'} synced. ✕</button>
      )}
    </div>
  );
}
