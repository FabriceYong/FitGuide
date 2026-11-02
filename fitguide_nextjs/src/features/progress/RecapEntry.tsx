'use client';

import { useEffect, useState } from 'react';
import { Film, Sparkles } from 'lucide-react';
import { fetchRecapOffers, type RecapOffer } from '../../services/recapService';
import { localToday } from '../../services/trainingService';
import { RecapStory } from './RecapStory';

type Which = { month?: string; year?: number };

/** On the home page: "Your October recap is ready" at the start of a month (and of a year). */
export function RecapOffers() {
  const [offers, setOffers] = useState<RecapOffer[]>([]);
  const [open, setOpen] = useState<Which | null>(null);

  useEffect(() => {
    fetchRecapOffers().then(setOffers).catch(() => setOffers([]));
  }, []);

  if (!offers.length) return null;
  return (
    <>
      <div className="space-y-3">
        {offers.map((o) => (
          <section key={o.key} aria-label={`${o.label} recap`} className="bg-gradient-to-r from-lime-light/15 to-obsidian-wave border border-lime-light/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-lime-light/20 text-lime-light flex items-center justify-center"><Sparkles className="w-5 h-5" aria-hidden="true" /></span>
              <div>
                <h2 className="font-extrabold">Your {o.kind === 'month' ? o.label.split(' ')[0] : o.label} recap is ready</h2>
                <p className="text-sm text-white-70">{o.workouts} {o.workouts === 1 ? 'workout' : 'workouts'}, in a few slides.</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(o.kind === 'month' ? { month: o.key } : { year: Number(o.key) })} className="px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Watch</button>
          </section>
        ))}
      </div>
      {open && <RecapStory which={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** The last 12 months, newest first, as YYYY-MM. */
function pastMonths(todayYmd: string) {
  const [y, m] = todayYmd.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

/** On Progress: watch any of the last 12 months' recaps, or the year so far. */
export function RecapPicker() {
  const [todayYmd] = useState(localToday);
  const months = pastMonths(todayYmd);
  const [month, setMonth] = useState(months[1]);
  const [open, setOpen] = useState<Which | null>(null);
  const label = (key: string) => new Date(`${key}-15T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs font-bold text-white-70">Month
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="mt-1 block bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white">
          {months.map((k, i) => <option key={k} value={k}>{label(k)}{i === 0 ? ' (so far)' : ''}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => setOpen({ month })} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm"><Film className="w-4 h-4" aria-hidden="true" /> Watch the recap</button>
      <button type="button" onClick={() => setOpen({ year: Number(todayYmd.slice(0, 4)) })} className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 font-bold text-sm">{todayYmd.slice(0, 4)} so far</button>
      {open && <RecapStory which={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
