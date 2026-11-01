'use client';

import { BACK, FRONT, outline } from '../dashboard/components/BodyMap';
import { REGIONS, type Region } from '../dashboard/muscles';

/** Lighter for one workout, full colour from three. */
const strength = (n: number) => (n <= 0 ? 0 : n >= 3 ? 1 : 0.35 + 0.3 * (n - 1));

function Figure({ label, paths, counts }: { label: string; paths: [Region, string][]; counts: Record<string, number> }) {
  return (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 200 320" className="w-28 h-44" aria-hidden="true">
        <circle cx="100" cy="30" r="16" style={outline} />
        <path d="M92,46 L108,46 L106,58 L94,58 Z" style={outline} />
        {paths.map(([region, d]) => {
          const s = strength(counts[region] || 0);
          return s > 0
            ? <path key={d} d={d} fill="#00C4B4" fillOpacity={s} stroke="#0A0C10" strokeWidth={1.5} />
            : <path key={d} d={d} fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />;
        })}
      </svg>
      <figcaption className="text-[11px] text-white-70">{label}</figcaption>
    </figure>
  );
}

/** Which body regions the last 7 days' workouts worked, and which they didn't (the app's _MusclesThisWeek). */
export function MusclesThisWeek({ counts }: { counts: Record<string, number> }) {
  const trained = REGIONS.filter((r) => (counts[r] || 0) > 0);
  const missed = REGIONS.filter((r) => !(counts[r] || 0));
  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-4">
        <Figure label="Front" paths={FRONT} counts={counts} />
        <Figure label="Back" paths={BACK} counts={counts} />
      </div>
      {trained.length === 0 ? (
        <p className="text-sm text-white-70">Nothing logged in the last 7 days yet.</p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-2">
            {trained.map((r) => (
              <li key={r} className="px-3 py-1 rounded-full bg-lime-light/15 text-lime-light text-xs font-bold">
                {r} · {counts[r]} workout{counts[r] === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
          {missed.length > 0 && <p className="text-xs text-white-70">Not trained this week: {missed.join(', ')}.</p>}
        </>
      )}
    </div>
  );
}
