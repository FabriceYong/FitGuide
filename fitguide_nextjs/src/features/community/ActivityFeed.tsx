'use client';

import { useEffect, useState } from 'react';
import { Activity, Clock, Dumbbell, Flame, Hand, Loader2, Trophy } from 'lucide-react';
import { cheerWorkout, fetchFeed, setShareActivity, type FeedItem } from '../../services/socialService';
import { formatRecord, formatSeconds } from '../progress/format';
import { useUnits, weightIn, weightUnit } from '../../lib/units';

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5';

/** "5 min ago", "3 h ago", "2 days ago", from a time measured when the page loaded. */
function ago(iso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

const cheeredText = (item: FeedItem) => {
  if (!item.cheers) return null;
  const names = item.cheeredBy;
  const others = item.cheers - names.length;
  const list = others > 0 ? `${names.join(', ')} and ${others} more` : names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `${list} cheered`;
};

function FeedCard({ item, now, onCheer }: { item: FeedItem; now: number; onCheer: (item: FeedItem) => void }) {
  const units = useUnits();
  const who = item.isYou ? 'You' : item.person.name;
  return (
    <li className="bg-noir-eclipse/60 rounded-xl p-4 space-y-3" aria-label={`${who}: ${item.workoutTitle}`}>
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-lime-light/15 text-lime-light font-extrabold flex items-center justify-center shrink-0" aria-hidden="true">{who[0]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm"><strong>{who}</strong> finished <strong>{item.workoutTitle}</strong></p>
          <p className="text-xs text-white-70">{ago(item.completedAt, now)}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white-70">
        <li className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden="true" /> {formatSeconds(item.durationSec)}</li>
        {item.setCount > 0 && <li className="flex items-center gap-1"><Dumbbell className="w-3.5 h-3.5" aria-hidden="true" /> {item.setCount} {item.setCount === 1 ? 'set' : 'sets'}</li>}
        {item.volumeKg > 0 && <li>{Math.round(weightIn(item.volumeKg, units)).toLocaleString()} {weightUnit(units)} lifted</li>}
        {item.calories > 0 && <li className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" aria-hidden="true" /> {item.calories} kcal</li>}
      </ul>
      {item.records.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="New personal records">
          {item.records.slice(0, 3).map((r) => (
            <li key={r.exerciseName} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30">
              <Trophy className="w-3 h-3" aria-hidden="true" /> {r.exerciseName}: {formatRecord(r, units)}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-white-70">{cheeredText(item)}</p>
        {!item.isYou && (
          <button
            type="button"
            onClick={() => onCheer(item)}
            aria-pressed={item.cheeredByYou}
            aria-label={item.cheeredByYou ? `Take back your cheer for ${who}` : `Cheer ${who}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${item.cheeredByYou ? 'bg-lime-light text-noir-eclipse' : 'bg-white/10 hover:bg-white/15'}`}
          >
            <Hand className="w-3.5 h-3.5" aria-hidden="true" /> {item.cheeredByYou ? 'Cheered' : 'Cheer'}
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Friends' activity on /community: your and your friends' workouts from the
 * last 30 days with records set, and cheers (the app's activity_feed.dart).
 */
export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [sharing, setSharing] = useState(true);
  const [now, setNow] = useState(0);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeed().then((page) => {
      setNow(Date.now());
      setItems(page.items);
      setNextBefore(page.nextBefore);
      setSharing(page.shareActivity);
    }).catch((err: Error) => setError(err.message));
  }, []);

  const loadMore = async () => {
    if (!nextBefore) return;
    setMore(true);
    try {
      const page = await fetchFeed(nextBefore);
      setItems((list) => [...(list || []), ...page.items]);
      setNextBefore(page.nextBefore);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMore(false);
    }
  };

  // Shown at once; put back if the API says no.
  const toggleCheer = (item: FeedItem) => {
    const on = !item.cheeredByYou;
    const update = (cheered: boolean) => setItems((list) => (list || []).map((i) => (i.id !== item.id ? i : {
      ...i,
      cheeredByYou: cheered,
      cheers: i.cheers + (cheered ? 1 : -1),
      cheeredBy: cheered ? ['You', ...i.cheeredBy].slice(0, 3) : i.cheeredBy.filter((n) => n !== 'You'),
    })));
    update(on);
    cheerWorkout(item.id, on).catch((err: Error) => {
      update(!on);
      setError(err.message);
    });
  };

  const share = async (on: boolean) => {
    setSharing(on);
    try {
      await setShareActivity(on);
    } catch (err) {
      setSharing(!on);
      setError((err as Error).message);
    }
  };

  return (
    <section className={`${card} space-y-4`} aria-labelledby="feed-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="feed-heading" className="text-xl font-extrabold flex items-center gap-2"><Activity className="w-5 h-5 text-lime-light" aria-hidden="true" /> Friends&apos; activity</h2>
        <label className="flex items-center gap-2 text-xs text-white-70">
          <input type="checkbox" checked={sharing} onChange={(e) => share(e.target.checked)} className="accent-lime-light" /> Show my workouts to friends
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {!items && !error && <p className="flex items-center gap-2 text-sm text-white-70"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading…</p>}
      {items?.length === 0 && <p className="text-sm text-white-70">Nothing here yet. Finish a workout or add friends with your friend code, and workouts show up here.</p>}
      {items && items.length > 0 && (
        <ul className="space-y-3" aria-label="Recent workouts">
          {items.map((item) => <FeedCard key={item.id} item={item} now={now} onCheer={toggleCheer} />)}
        </ul>
      )}
      {nextBefore && (
        <button type="button" onClick={loadMore} disabled={more} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold">
          {more && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Show older
        </button>
      )}
    </section>
  );
}
