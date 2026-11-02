'use client';

import type { WeekStreak as Streak } from '../../services/trainingService';
import { formatDay } from './format';

/**
 * The forgiving weekly streak on Progress: the last 8 weeks and this one,
 * met, let off with the month's pass, or short (the app's _WeekStreak).
 */
export function WeekStreak({ streak }: { streak: Streak }) {
  const { goal, thisWeek } = streak;
  const weeks = [...streak.history, { weekStart: thisWeek.weekStart, activeDays: thisWeek.activeDays, met: thisWeek.met, saved: false, current: true }];
  const label = (w: (typeof weeks)[number]) => `Week of ${formatDay(w.weekStart, { day: 'numeric', month: 'short' })}: ${w.activeDays} of ${goal} days, ${w.met ? 'met' : w.saved ? 'let off with a pass' : 'current' in w ? 'in progress' : 'short'}`;
  return (
    <div className="space-y-4">
      <p className="text-sm">
        <strong className="text-2xl">{streak.weeks}</strong> {streak.weeks === 1 ? 'week' : 'weeks'} in a row training at least {goal} {goal === 1 ? 'day' : 'days'} a week
        <span className="text-white-70"> · best {streak.best}</span>
      </p>
      <ol className="flex gap-1.5" aria-label="Recent weeks">
        {weeks.map((w) => (
          <li
            key={w.weekStart}
            aria-label={label(w)}
            title={label(w)}
            className={`flex-1 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold ${
              w.met ? 'bg-lime-light text-noir-eclipse' : w.saved ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' : 'current' in w ? 'border border-dashed border-white-30/40 text-white-70' : 'bg-white/5 text-white-70'
            }`}
          >
            {w.activeDays}
          </li>
        ))}
      </ol>
      <p className="text-xs text-white-70">
        {thisWeek.met ? 'This week is done. ' : `${thisWeek.activeDays} of ${goal} days this week, ${thisWeek.daysLeft} ${thisWeek.daysLeft === 1 ? 'day' : 'days'} left. `}
        Rest days never break it, and one short week a month is let off{streak.passAvailable ? ' (this month’s is still there)' : ' (this month’s is used)'}.
        {streak.lastWeekSaved && ' Last week was let off.'}
      </p>
    </div>
  );
}
