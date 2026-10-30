'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Users } from 'lucide-react';
import { PROFILE } from '@fitguide/shared';
import { fetchCoachDashboard, type CoachDashboard } from '../../services/adminService';
import { STATUS_TEXT } from './StudioWorkouts';

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5';
const LEVEL_COLORS: Record<string, string> = { Beginner: '#34D399', Intermediate: '#FBBF24', Advanced: '#F87171' };

/** Horizontal bars: how many people are at each level (or week). */
function Bars({ rows, label }: { rows: { key: string; value: number; color: string }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <dl aria-label={label} className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-xs">
          <dt className="text-white-70 truncate">{r.key}</dt>
          <dd className="h-2.5 bg-white/10 rounded-full overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
          </dd>
          <dd className="font-bold text-right">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const levelRows = (levels: Record<string, number>) => PROFILE.FITNESS_LEVELS.map((l) => ({ key: l, value: levels[l] || 0, color: LEVEL_COLORS[l] }));

/** The coach's dashboard: who follows each program, and at what level. */
export function StudioDashboard() {
  const [data, setData] = useState<CoachDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCoachDashboard().then(setData).catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p role="alert" className="text-sm text-red-300">{error}</p>;
  if (!data) return <Loader2 className="w-5 h-5 animate-spin" />;
  const { totals, programs } = data;
  const tiles: [string, number][] = [
    ['Programs', totals.programs], ['Published', totals.published], ['Ever enrolled', totals.enrolled], ['Following now', totals.active], ['Finished', totals.completed],
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {tiles.map(([label, value]) => (
          <div key={label} className={card}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white-70">{label}</p>
            <p className="text-3xl font-extrabold mt-1">{value}</p>
          </div>
        ))}
      </div>
      {totals.active > 0 && (
        <section className={`${card} space-y-3 max-w-xl`}>
          <h2 className="font-bold">Level of everyone following your programs</h2>
          <Bars rows={levelRows(totals.levels)} label="Members by fitness level" />
        </section>
      )}
      {programs.length === 0 ? <p className="text-sm text-white-70">Write a program and publish it to see who follows it here.</p> : (
        <ul className="grid lg:grid-cols-2 gap-4">
          {programs.map((p) => (
            <li key={p.slug} className={`${card} space-y-4`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{p.status === 'published' ? <Link href={`/programs/${p.slug}`} className="hover:underline">{p.title}</Link> : p.title}</p>
                  <p className="text-xs text-white-70">{STATUS_TEXT[p.status]} · {p.level} · {p.weeks} weeks{p.inPerson && ' · in person'}</p>
                </div>
                <p className="flex items-center gap-1.5 text-sm font-bold"><Users className="w-4 h-4 text-lime-light" aria-hidden="true" /> {p.enrolled.active} following now</p>
              </div>
              <p className="text-xs text-white-70">
                {p.enrolled.total} enrolled in total · {p.enrolled.completed} finished · {p.enrolled.left} left
                {p.averageProgressPct != null && <> · on average {p.averageProgressPct}% done</>}
              </p>
              {p.enrolled.active > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white-70">Fitness level</h3>
                    <Bars rows={levelRows(p.levels)} label={`${p.title}: members by fitness level`} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white-70">Current week</h3>
                    <Bars rows={p.weekCounts.map((w) => ({ key: `Week ${w.week}`, value: w.people, color: '#00C4B4' }))} label={`${p.title}: members by program week`} />
                  </div>
                </div>
              ) : <p className="text-sm text-white-70">Nobody is following this program right now.</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
