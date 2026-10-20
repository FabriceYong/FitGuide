'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Play, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { STATUS_STYLES, formatDate, playHref } from '../programs/ProgramDetail';
import { adaptPlan, fetchPlan, type AdaptResult, type Plan, type PlanDay } from '../../services/planService';
import { PlanGenerator } from './PlanGenerator';
import { CoachChat } from './CoachChat';
import { track } from '../../lib/analytics';

/** /plan: the user's personal plan (or the generator) next to the coach. */
export function PlanView() {
  const { ready, hasAccount } = useAuth();
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string[]>([]);
  const [adapting, setAdapting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPlan(await fetchPlan());
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!ready || !hasAccount) return;
    fetchPlan().then(setPlan).catch((err: Error) => setError(err.message));
  }, [ready, hasAccount]);

  const adapt = async () => {
    setAdapting(true);
    setError(null);
    try {
      const result: AdaptResult = await adaptPlan();
      setPlan(result.plan);
      const changed = result.changes.length;
      setNotice([
        result.reason,
        result.direction === 'keep' ? 'No changes made.' : `${changed} upcoming ${changed === 1 ? 'session was' : 'sessions were'} made ${result.direction}.`,
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdapting(false);
    }
  };

  if (!ready || (hasAccount && plan === undefined && !error)) {
    return <p className="flex items-center gap-2 text-white-70"><Loader2 className="w-4 h-4 animate-spin" /> Loading your plan…</p>;
  }
  if (!hasAccount) {
    return (
      <div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-8 text-center space-y-4">
        <p className="text-white-70">Sign in to get a plan built for you and chat with your coach.</p>
        <Link href="/?next=/plan" className="inline-block px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Sign in</Link>
      </div>
    );
  }

  const weeks = plan ? [...new Set(plan.schedule.map((d) => d.week))] : [];

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
      <div className="space-y-6 min-w-0">
        <h1 className="text-3xl md:text-4xl font-extrabold">Your plan</h1>
        {error && <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertTriangle className="w-4 h-4" /> {error}</p>}

        {(!plan || editing) && (
          <PlanGenerator
            hasPlan={Boolean(plan)}
            onCancel={plan ? () => setEditing(false) : undefined}
            onCreated={(created, warnings) => {
              track('plan_created');
              setPlan(created);
              setEditing(false);
              setNotice(warnings);
            }}
          />
        )}

        {plan && !editing && (
          <>
            <section className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold">{plan.programTitle}</h2>
                  <p className="text-sm text-white-70 mt-1">
                    Week {plan.currentWeek} of {plan.weeks} · started {formatDate(plan.startDate)}
                    {plan.adherencePct != null && <> · {plan.adherencePct}% of scheduled sessions done</>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={adapt} disabled={adapting} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold disabled:opacity-60">
                    {adapting ? <Loader2 className="w-4 h-4 animate-spin" /> : <SlidersHorizontal className="w-4 h-4" />} Adjust to my progress
                  </button>
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold">
                    <RefreshCw className="w-4 h-4" /> New plan
                  </button>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-white-70 mb-1.5">
                  <span>{plan.completedCount} of {plan.totalDays} sessions</span>
                  <span>{plan.percentComplete}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden" role="progressbar" aria-valuenow={plan.percentComplete} aria-valuemin={0} aria-valuemax={100} aria-label="Plan progress">
                  <div className="h-full rounded-full bg-lime-light" style={{ width: `${plan.percentComplete}%` }} />
                </div>
              </div>
              {plan.nextDay && (
                <div className="flex flex-wrap items-center justify-between gap-4 bg-noir-eclipse/60 rounded-xl p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white-70">Next up · {formatDate(plan.nextDay.date)}</p>
                    <p className="font-bold mt-0.5">{plan.nextDay.title}</p>
                  </div>
                  <Link href={playHref(plan, plan.nextDay)} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">
                    <Play className="w-4 h-4" /> Start session
                  </Link>
                </div>
              )}
            </section>

            {notice.length > 0 && (
              <div role="status" className="bg-lime-light/10 border border-lime-light/30 rounded-xl p-4 text-sm space-y-1">
                {notice.map((n) => <p key={n}>{n}</p>)}
              </div>
            )}

            <section className="space-y-6">
              {weeks.map((week) => (
                <div key={week} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white-70">Week {week}</h3>
                  <ul className="space-y-2">
                    {plan.schedule.filter((d) => d.week === week).map((d: PlanDay) => {
                      const status = STATUS_STYLES[d.status];
                      return (
                        <li key={`${d.week}:${d.day}`} className="flex flex-wrap items-center gap-4 bg-obsidian-wave border border-white-30/10 rounded-xl px-4 py-3">
                          <div className="w-28 shrink-0">
                            <p className="text-sm font-bold">Day {d.day}</p>
                            <p className="text-[11px] text-white-70">{formatDate(d.date)}</p>
                          </div>
                          <Link href={`/workouts/${d.workoutSlug}`} className="flex-1 min-w-[180px] font-semibold hover:text-lime-light">{d.title}</Link>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${status.className}`}>{status.label}</span>
                          {d.status !== 'done' && (
                            <Link href={playHref(plan, d)} aria-label={`Start week ${d.week} day ${d.day}`} className="w-9 h-9 rounded-full bg-white/10 hover:bg-lime-light hover:text-noir-eclipse flex items-center justify-center">
                              <Play className="w-4 h-4" />
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          </>
        )}
      </div>

      <div className="lg:sticky lg:top-24">
        <CoachChat onPlanChanged={load} />
      </div>
    </div>
  );
}
