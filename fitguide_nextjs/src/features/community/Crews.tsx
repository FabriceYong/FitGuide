'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2, Plus, Shield } from 'lucide-react';
import { createCrew, fetchCrews, joinCrew, type CrewSummary } from '../../services/crewService';

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5';
const field = 'w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white';

/** A goal bar: this week's workouts against the crew's goal. */
export function GoalBar({ done, goal, label }: { done: number; goal: number; label: string }) {
  const pct = Math.min(100, Math.round((done / Math.max(1, goal)) * 100));
  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={goal} aria-label={label}>
      <div className={`h-full rounded-full ${done >= goal ? 'bg-emerald-400' : 'bg-lime-light'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Crews on /community: the member's crews with this week's progress, and
 * making or joining one (the app's crews.dart).
 */
export function Crews() {
  const router = useRouter();
  const [crews, setCrews] = useState<CrewSummary[] | null>(null);
  const [limits, setLimits] = useState({ members: 8, crews: 5 });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(6);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCrews().then((d) => {
      setCrews(d.crews);
      setLimits(d.limits);
    }).catch((err: Error) => setError(err.message));
  }, []);

  const go = async (task: () => Promise<{ id: string }>) => {
    setBusy(true);
    setError(null);
    try {
      const crew = await task();
      router.push(`/community/crews/${crew.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const create = (e: FormEvent) => {
    e.preventDefault();
    go(() => createCrew(name.trim(), goal));
  };
  const join = (e: FormEvent) => {
    e.preventDefault();
    go(() => joinCrew(code.trim()));
  };

  return (
    <section className={`${card} space-y-4`} aria-labelledby="crews-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="crews-heading" className="text-xl font-extrabold flex items-center gap-2"><Shield className="w-5 h-5 text-lime-light" aria-hidden="true" /> Crews</h2>
        <button type="button" onClick={() => setCreating((c) => !c)} aria-expanded={creating} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-lime-light text-noir-eclipse"><Plus className="w-3.5 h-3.5" aria-hidden="true" /> New crew</button>
      </div>
      <p className="text-sm text-white-70">A small group of up to {limits.members} who train towards a weekly goal together, see each other&apos;s workouts and chat.</p>

      {creating && (
        <form onSubmit={create} className="bg-noir-eclipse/60 rounded-xl p-4 grid sm:grid-cols-[1fr_9rem_auto] gap-3 items-end">
          <label className="text-xs font-bold text-white-70">Crew name
            <input required minLength={2} maxLength={50} value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1`} />
          </label>
          <label className="text-xs font-bold text-white-70">Workouts a week
            <input type="number" required min={1} max={100} value={goal} onChange={(e) => setGoal(Number(e.target.value))} className={`${field} mt-1`} />
          </label>
          <button type="submit" disabled={busy} className="h-10 px-4 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-60">Create</button>
        </form>
      )}

      {crews === null && !error && <p className="flex items-center gap-2 text-sm text-white-70"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading…</p>}
      {crews && crews.length > 0 && (
        <ul className="space-y-2">
          {crews.map((c) => (
            <li key={c.id}>
              <Link href={`/community/crews/${c.id}`} className="block bg-noir-eclipse/60 rounded-xl p-4 hover:ring-1 hover:ring-lime-light/50 space-y-2">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-bold">{c.name}</span>
                  <span className="flex items-center gap-1 text-xs text-white-70">{c.thisWeek} of {c.weeklyGoal} this week <ChevronRight className="w-4 h-4" aria-hidden="true" /></span>
                </span>
                <GoalBar done={c.thisWeek} goal={c.weeklyGoal} label={`${c.name}: ${c.thisWeek} of ${c.weeklyGoal} workouts this week`} />
                <span className="block text-[11px] text-white-70">{c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={join} className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Invite code" aria-label="Crew invite code" maxLength={20} className={field} />
        <button type="submit" disabled={busy || code.trim().length < 4} className="shrink-0 px-4 rounded-xl bg-white/10 hover:bg-white/15 font-bold text-sm disabled:opacity-50">Join crew</button>
      </form>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </section>
  );
}
