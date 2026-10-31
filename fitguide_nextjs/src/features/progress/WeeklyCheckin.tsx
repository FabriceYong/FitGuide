'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Sparkles, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAiStatus, fetchCheckin, type Allowance, type Checkin } from '../../services/aiService';
import { adaptPlan } from '../../services/planService';

const PLAN_CHANGE = { easier: 'Your plan might be a bit much right now.', harder: "You're ready for more.", keep: 'Your plan is pitched about right.' } as const;

/**
 * The weekly check-in on the Progress page: on request, a short read of the
 * last 7 days against the 7 before (workouts, steps, sleep, food), what went
 * well and one focus for the coming week. When it suggests a plan change,
 * "Adjust my plan" runs the plan's own rules (POST /api/plan/adapt).
 */
export function WeeklyCheckin() {
  const { hasAccount } = useAuth();
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [busy, setBusy] = useState<'checkin' | 'adapt' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adapted, setAdapted] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAccount) return;
    fetchAiStatus().then((s) => setAllowance(s.available ? s.allowance.checkin : null)).catch(() => setAllowance(null));
  }, [hasAccount]);

  if (!allowance) return null;

  const get = async () => {
    setBusy('checkin');
    setError(null);
    try {
      const res = await fetchCheckin();
      setCheckin(res.checkin);
      setAllowance(res.allowance);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const adapt = async () => {
    setBusy('adapt');
    setError(null);
    try {
      const result = await adaptPlan();
      setAdapted(result.direction === 'keep' ? `${result.reason} No changes made.` : `${result.reason} The rest of your plan is now ${result.direction}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="checkin-heading" className="rounded-2xl p-6 space-y-4 border border-royal-nebula/40 bg-gradient-to-br from-royal-nebula/20 to-obsidian-wave">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="checkin-heading" className="text-xl font-extrabold flex items-center gap-2"><Sparkles className="w-5 h-5 text-lime-light" aria-hidden="true" /> Weekly check-in</h2>
          <p className="text-sm text-white-70 mt-1">How your last 7 days went, what went well and one thing to focus on next.</p>
        </div>
        {!checkin && (
          <button type="button" onClick={get} disabled={busy !== null || allowance.left === 0} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-50">
            {busy === 'checkin' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />}
            {busy === 'checkin' ? 'Looking at your week…' : 'Get my check-in'}
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {!checkin && allowance.left === 0 && <p className="text-xs text-white-70">You&apos;ve had today&apos;s check-ins. Come back tomorrow.</p>}

      {checkin && (
        <div className="space-y-4" aria-live="polite">
          <ul className="flex flex-wrap gap-2 text-xs">
            <li className="px-3 py-1.5 rounded-full bg-white/10">{checkin.week.workouts} workout{checkin.week.workouts === 1 ? '' : 's'}</li>
            <li className="px-3 py-1.5 rounded-full bg-white/10">{checkin.week.minutes} active min</li>
            {checkin.week.averageSteps != null && <li className="px-3 py-1.5 rounded-full bg-white/10">{checkin.week.averageSteps.toLocaleString()} steps a day</li>}
            <li className="px-3 py-1.5 rounded-full bg-white/10">Food logged {checkin.week.daysFoodLogged} of 7 days</li>
          </ul>
          <p className="text-white/90 leading-relaxed">{checkin.summary}</p>
          {checkin.wins.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-lime-light mb-1.5">What went well</h3>
              <ul className="space-y-1">
                {checkin.wins.map((w) => <li key={w} className="flex gap-2 text-sm"><Check className="w-4 h-4 shrink-0 mt-0.5 text-lime-light" aria-hidden="true" /> {w}</li>)}
              </ul>
            </div>
          )}
          <p className="flex gap-2 text-sm bg-noir-eclipse/50 rounded-xl p-3"><Target className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" aria-hidden="true" /> <span><span className="font-bold">This week: </span>{checkin.focus}</span></p>
          {checkin.planChange && checkin.planChange !== 'keep' && !adapted && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white-30/10 pt-4">
              <p className="text-sm text-white-70">{PLAN_CHANGE[checkin.planChange]}</p>
              <button type="button" onClick={adapt} disabled={busy !== null} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 font-bold text-sm">
                {busy === 'adapt' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Adjust my plan
              </button>
            </div>
          )}
          {adapted && <p role="status" className="text-sm text-lime-light">{adapted}</p>}
          <p className="text-[11px] text-white-70">Written by AI from your own numbers. General guidance, not medical advice.</p>
        </div>
      )}
    </section>
  );
}
