'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { flushQueuedSessions } from '../services/trainingService';
import { useT } from '../i18n/client';

/**
 * Registers the service worker (production builds only), sends workouts that
 * were finished offline once the connection is back, and shows an offline
 * banner.
 */
export function OfflineSupport() {
  const { ready, hasAccount, user } = useAuth();
  const userId = hasAccount ? user?.id : undefined;
  const [offline, setOffline] = useState(false);
  const [synced, setSynced] = useState(0);
  const [dropped, setDropped] = useState(0);
  const t = useT();

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
    if (!ready || !userId || offline) return;
    flushQueuedSessions(userId).then((result) => {
      if (result.sent) setSynced(result.sent);
      if (result.dropped) setDropped(result.dropped);
    }).catch(() => {});
  }, [ready, userId, offline]);

  if (!offline && !synced && !dropped) return null;
  const dismiss = () => {
    setSynced(0);
    setDropped(0);
  };
  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-obsidian-wave border border-white-30/20 text-sm text-white shadow-lg">
      {offline ? (
        <><WifiOff className="w-4 h-4 text-amber-300" aria-hidden="true" /> {t('offline.banner')}</>
      ) : (
        <button onClick={dismiss}>
          {synced > 0 && (synced === 1 ? t('offline.synced.one') : t('offline.synced.other', { count: synced }))}
          {synced > 0 && dropped > 0 && ' '}
          {dropped > 0 && (dropped === 1 ? t('offline.dropped.one') : t('offline.dropped.other', { count: dropped }))}
          {' ✕'}
        </button>
      )}
    </div>
  );
}
