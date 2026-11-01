'use client';

import { useState, type CSSProperties } from 'react';
import { RotateCcw, Target } from 'lucide-react';
import { REGIONS, type Region } from '../muscles';

export const FRONT: [Region, string][] = [
  ['Shoulders', 'M74,58 C66,62 60,70 60,78 L72,82 L76,64 Z'],
  ['Shoulders', 'M126,58 C134,62 140,70 140,78 L128,82 L124,64 Z'],
  ['Chest', 'M78,64 L122,64 C122,64 124,84 120,94 L80,94 C76,84 78,64 78,64 Z'],
  ['Core', 'M80,97 L120,97 L114,136 L86,136 Z'],
  ['Arms', 'M58,82 L52,115 L44,115 L50,82 Z'],
  ['Arms', 'M43,117 L38,145 L32,143 L37,117 Z'],
  ['Arms', 'M142,82 L148,115 L156,115 L150,82 Z'],
  ['Arms', 'M157,117 L162,145 L168,143 L163,117 Z'],
  ['Legs', 'M85,142 L99,142 L97,215 L78,215 Z'],
  ['Legs', 'M79,222 L95,222 L91,285 C91,285 80,287 77,290 Z'],
  ['Legs', 'M115,142 L101,142 L103,215 L122,215 Z'],
  ['Legs', 'M121,222 L105,222 L109,285 C109,285 120,287 123,290 Z'],
];
export const BACK: [Region, string][] = [
  ['Shoulders', 'M74,58 C66,62 60,70 60,78 L72,82 L76,64 Z'],
  ['Shoulders', 'M126,58 C134,62 140,70 140,78 L128,82 L124,64 Z'],
  ['Back', 'M78,64 L122,64 C122,64 126,88 116,108 L84,108 C74,88 78,64 78,64 Z'],
  ['Back', 'M84,111 L116,111 L114,136 L86,136 Z'],
  ['Legs', 'M85,138 L115,138 L120,165 L80,165 Z'],
  ['Arms', 'M58,82 L52,115 L44,115 L50,82 Z'],
  ['Arms', 'M43,117 L38,145 L32,143 L37,117 Z'],
  ['Arms', 'M142,82 L148,115 L156,115 L150,82 Z'],
  ['Arms', 'M157,117 L162,145 L168,143 L163,117 Z'],
  ['Legs', 'M85,168 L99,168 L97,222 L78,222 Z'],
  ['Legs', 'M79,228 L95,228 L91,285 C91,285 80,287 77,290 Z'],
  ['Legs', 'M115,168 L101,168 L103,222 L122,222 Z'],
  ['Legs', 'M121,228 L105,228 L109,285 C109,285 120,287 123,290 Z'],
];

export const outline: CSSProperties = { fill: 'rgba(255,255,255,0.08)', stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1 };
const regionStyle = (on: boolean): CSSProperties => ({
  fill: on ? '#00C4B4' : 'rgba(255,255,255,0.12)',
  stroke: on ? '#0A0C10' : 'rgba(255,255,255,0.25)',
  strokeWidth: on ? 1.5 : 1,
  transition: 'fill 0.2s ease',
});

/** Muscle-region filter: toggle buttons, with a body figure that lights up the picks. */
export function BodyMap({ selected, onToggle, onClear }: { selected: Region[]; onToggle: (r: Region) => void; onClear: () => void }) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const paths = view === 'front' ? FRONT : BACK;
  return (
    <div className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center">
      <div className="flex-1 space-y-4 w-full text-left">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <Target className="w-5 h-5 text-lime-light" aria-hidden="true" /> Target muscles
        </h3>
        <p className="text-xs text-white-70">Pick one or more areas. Full-body workouts count for every area.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Muscle areas">
          {REGIONS.map((r) => {
            const on = selected.includes(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => onToggle(r)}
                aria-pressed={on}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${on ? 'bg-lime-light text-noir-eclipse border-lime-light' : 'bg-white/5 border-white-30/20 text-white-70 hover:text-white'}`}
              >
                {r}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-noir-eclipse/60 rounded-xl p-1" role="group" aria-label="Figure view">
            {(['front', 'back'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${view === v ? 'bg-white/15 text-white' : 'text-white-70'}`}
              >
                {v}
              </button>
            ))}
          </div>
          {selected.length > 0 && (
            <button type="button" onClick={onClear} className="flex items-center gap-1 text-xs font-semibold text-red-300 hover:underline">
              <RotateCcw className="w-3 h-3" aria-hidden="true" /> Clear
            </button>
          )}
        </div>
      </div>
      <div className="w-48 h-72 bg-noir-eclipse/40 rounded-2xl border border-white-30/10 p-3 shrink-0" aria-hidden="true">
        <svg viewBox="0 0 200 320" className="w-full h-full">
          <circle cx="100" cy="30" r="16" style={outline} />
          <path d="M92,46 L108,46 L106,58 L94,58 Z" style={outline} />
          {paths.map(([region, d]) => <path key={d + view} d={d} style={regionStyle(selected.includes(region))} />)}
        </svg>
      </div>
    </div>
  );
}
