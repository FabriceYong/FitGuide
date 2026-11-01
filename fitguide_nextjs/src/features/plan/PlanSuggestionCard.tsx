'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CalendarClock, Check, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { ApiError } from '../../lib/api';
import {
  acceptPlanSuggestion, dismissPlanSuggestion, fetchPlanSuggestion, type Plan, type PlanSuggestion, type SuggestedChange,
} from '../../services/planService';
import { formatDay } from '../progress/format';
import { localToday } from '../../services/trainingService';

const HEADINGS: Record<PlanSuggestion['kind'], string> = {
  catch_up: 'Catch up on your plan',
  easier: 'Make the next sessions easier?',
  harder: 'Ready for harder sessions?',
};
const ICONS = { catch_up: CalendarClock, easier: TrendingDown, harder: TrendingUp };
const SHOWN = 3;

function ChangeLine({ change, kind }: { change: SuggestedChange; kind: PlanSuggestion['kind'] }) {
  const today = change.newDate === localToday();
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      <span className="text-white-70 text-xs">Week {change.week}, day {change.day}</span>
      {kind === 'catch_up' ? (
        <span className="flex items-center gap-1.5">
          {change.title.replace(/:.*$/, '')}: {formatDay(change.date)} <ArrowRight className="w-3.5 h-3.5 text-lime-light" aria-hidden="true" /><span className="sr-only">to</span> <strong>{today ? 'today' : formatDay(change.newDate!)}</strong>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          {formatDay(change.date)}: {change.title.replace(/^.*?: /, '')} <ArrowRight className="w-3.5 h-3.5 text-lime-light" aria-hidden="true" /><span className="sr-only">becomes</span> <strong>{change.newTitle!.replace(/^.*?: /, '')}</strong>
        </span>
      )}
    </li>
  );
}

/**
 * A change the member's plan or program proposes (catch up after missed
 * sessions, or easier/harder workouts), with what it would change. Nothing
 * changes until they say yes; "Not now" hides it for a week.
 * The app's plan_suggestion.dart is the same card.
 */
export function PlanSuggestionCard({ enrollmentId, onApplied }: { enrollmentId?: string; onApplied?: (plan: Plan) => void }) {
  const [suggestion, setSuggestion] = useState<PlanSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    fetchPlanSuggestion().then(setSuggestion).catch(() => setSuggestion(null));
  }, []);

  if (done) {
    return <p role="status" className="flex items-center gap-2 bg-lime-light/10 border border-lime-light/30 rounded-xl p-4 text-sm"><Check className="w-4 h-4 text-lime-light" aria-hidden="true" /> {done}</p>;
  }
  if (!suggestion || (enrollmentId && suggestion.enrollmentId !== enrollmentId)) return null;

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const { enrollment } = await acceptPlanSuggestion(suggestion.id);
      setDone(suggestion.kind === 'catch_up'
        ? `Moved. Your plan now ends ${formatDay(enrollment.endDate)}.`
        : `Changed ${suggestion.changes.length} upcoming ${suggestion.changes.length === 1 ? 'session' : 'sessions'}.`);
      onApplied?.(enrollment);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setSuggestion(err.data?.suggestion ?? null);
      setError(err instanceof Error ? err.message : 'Could not change your plan.');
    } finally {
      setBusy(false);
    }
  };

  const notNow = async () => {
    setSuggestion(null);
    await dismissPlanSuggestion(suggestion.kind).catch(() => {});
  };

  const Icon = ICONS[suggestion.kind];
  const more = suggestion.changes.length - SHOWN;
  return (
    <section aria-labelledby="plan-suggestion" className="bg-obsidian-wave border border-lime-light/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-lime-light/15 text-lime-light flex items-center justify-center shrink-0"><Icon className="w-5 h-5" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 id="plan-suggestion" className="font-extrabold">{HEADINGS[suggestion.kind]}</h2>
          <p className="text-xs text-white-70 mt-0.5">{suggestion.programTitle}</p>
          <p className="text-sm mt-2">{suggestion.reason}</p>
        </div>
      </div>
      <ul className="space-y-1.5 bg-noir-eclipse/60 rounded-xl p-3" aria-label="What would change">
        {suggestion.changes.slice(0, SHOWN).map((c) => <ChangeLine key={`${c.week}:${c.day}`} change={c} kind={suggestion.kind} />)}
        {more > 0 && <li className="text-xs text-white-70">and {more} more {more === 1 ? 'session' : 'sessions'}</li>}
        {suggestion.endDate && <li className="text-xs text-white-70">The plan would end {formatDay(suggestion.endDate)}.</li>}
      </ul>
      {error && <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertCircle className="w-4 h-4" aria-hidden="true" /> {error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={accept} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Make this change
        </button>
        <button type="button" onClick={notNow} disabled={busy} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 font-bold text-sm">Not now</button>
      </div>
    </section>
  );
}
