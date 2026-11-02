'use client';

import type { StrengthLevel } from '../../services/trainingService';
import { useUnits, weightText } from '../../lib/units';

/**
 * Strength levels on Progress: each big lift's estimated one-rep max against
 * body weight on the usual standards, with how far to the next level
 * (the app's _StrengthLevels).
 */
export function StrengthLevels({ levels, bodyweightKg }: { levels: StrengthLevel[]; bodyweightKg: number }) {
  const units = useUnits();
  if (!levels.length) {
    return <p className="text-sm text-white-70">Log squats, bench presses, deadlifts or overhead presses with a weight and your level for each shows here.</p>;
  }
  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {levels.map((l) => (
          <li key={l.lift} className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-bold">{l.lift}</span>
              <span className="text-sm"><strong className="text-lime-light">{l.level ?? 'Starting out'}</strong> <span className="text-white-70">· {l.ratio}× body weight</span></span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(l.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${l.lift}: on the way to ${l.nextLevel ?? 'the top'}`}>
              <div className="h-full rounded-full bg-lime-light" style={{ width: `${Math.round(l.progress * 100)}%` }} />
            </div>
            <p className="text-xs text-white-70">
              Estimated one-rep max {weightText(l.oneRepMaxKg, units)}
              {l.nextLevel && l.toNextKg != null ? ` · ${weightText(l.toNextKg, units)} to ${l.nextLevel}` : ' · the top level'}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-white-70">Against {weightText(bodyweightKg, units)} body weight. Levels are a general guide from common strength standards.</p>
    </div>
  );
}
