'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Workout } from '../../types/catalog';
import { WorkoutCard } from '../dashboard/components/WorkoutCard';
import { useFavorites } from '../dashboard/useFavorites';
import { categoryCounts, DURATIONS, LEVELS, matchesFilter } from './catalogFilter';

const chip = (on: boolean) =>
  `shrink-0 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
    on ? 'bg-lime-light text-noir-eclipse border-lime-light' : 'bg-obsidian-wave text-white-70 border-white-30/15 hover:text-white hover:border-white-30/40'
  }`;

// Filters live in the address (?q=&category=&level=&max=&gear=none) so a search can be shared.
const readParams = () => {
  const p = new URLSearchParams(window.location.search);
  return { query: p.get('q') || '', category: p.get('category') || '', level: p.get('level') || '', maxMinutes: Number(p.get('max')) || 0, noGear: p.get('gear') === 'none' };
};

/**
 * The /workouts catalog: a search box and filter chips over picture cards,
 * grouped by category until a filter is on. Server-rendered with every
 * workout, so search engines see the whole catalog.
 */
export function WorkoutCatalog({ workouts }: { workouts: Workout[] }) {
  const { isFavorite, toggle, canSave } = useFavorites();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [maxMinutes, setMaxMinutes] = useState(0);
  const [noGear, setNoGear] = useState(false);

  useEffect(() => {
    const p = readParams();
    // A shared link opens with its filters (read after the server render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(p.query); setCategory(p.category); setLevel(p.level); setMaxMinutes(p.maxMinutes); setNoGear(p.noGear);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (query.trim()) p.set('q', query.trim());
    if (category) p.set('category', category);
    if (level) p.set('level', level);
    if (maxMinutes) p.set('max', String(maxMinutes));
    if (noGear) p.set('gear', 'none');
    const next = p.toString() ? `/workouts?${p}` : '/workouts';
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', next);
  }, [query, category, level, maxMinutes, noGear]);

  const categories = useMemo(() => categoryCounts(workouts), [workouts]);
  const filter = { query, category, level, maxMinutes, equipment: noGear ? 'none' : '' };
  const results = workouts.filter((w) => matchesFilter(w, filter));
  const filtering = Boolean(query.trim() || category || level || maxMinutes || noGear);
  const clear = () => { setQuery(''); setCategory(''); setLevel(''); setMaxMinutes(0); setNoGear(false); };

  const card = (w: Workout) => (
    <li key={w.slug}>
      <WorkoutCard workout={w} favorite={isFavorite(w.slug)} onToggleFavorite={canSave ? toggle : undefined} />
    </li>
  );
  const grid = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <label className="relative block">
          <span className="sr-only">Search workouts</span>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white-70" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, muscle or goal"
            className="w-full bg-obsidian-wave border border-white-30/15 focus:border-lime-light rounded-2xl pl-12 pr-4 py-3.5 text-base text-white placeholder:text-white-70 outline-none"
          />
        </label>

        <div role="group" aria-label="Category" className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
          <button type="button" aria-pressed={!category} onClick={() => setCategory('')} className={chip(!category)}>All · {workouts.length}</button>
          {categories.map(([name, count]) => (
            <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(category === name ? '' : name)} className={chip(category === name)}>
              {name} · {count}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Length" className="flex flex-wrap gap-2">
            {DURATIONS.slice(1).map((d) => (
              <button key={d.max} type="button" aria-pressed={maxMinutes === d.max} onClick={() => setMaxMinutes(maxMinutes === d.max ? 0 : d.max)} className={chip(maxMinutes === d.max)}>
                {d.label}
              </button>
            ))}
          </div>
          <button type="button" aria-pressed={noGear} onClick={() => setNoGear(!noGear)} className={chip(noGear)}>No equipment</button>
          <label className="sr-only" htmlFor="catalog-level">Level</label>
          <select
            id="catalog-level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className={`${chip(Boolean(level))} appearance-none pr-8 bg-no-repeat`}
            style={{ backgroundImage: 'linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)', backgroundPosition: 'calc(100% - 16px) 50%, calc(100% - 11px) 50%', backgroundSize: '5px 5px' }}
          >
            <option value="">Any level</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          {filtering && (
            <button type="button" onClick={clear} className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-lime-light">
              <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
            </button>
          )}
        </div>
      </div>

      {filtering ? (
        <section aria-live="polite" className="space-y-4">
          <h2 className="text-sm font-bold text-white-70">{results.length === 1 ? '1 workout' : `${results.length} workouts`}</h2>
          {results.length ? <ul className={grid}>{results.map(card)}</ul> : (
            <div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-8 text-center">
              <p className="font-bold">No workouts match</p>
              <p className="text-sm text-white-70 mt-1">Try fewer filters or another word.</p>
              <button type="button" onClick={clear} className="mt-4 text-sm font-bold text-lime-light">Clear filters</button>
            </div>
          )}
        </section>
      ) : (
        categories.map(([name]) => (
          <section key={name} id={name.toLowerCase().replace(/\s+/g, '-')} className="space-y-4 scroll-mt-24">
            <h2 className="text-xl font-extrabold">{name}</h2>
            <ul className={grid}>{workouts.filter((w) => w.category === name).map(card)}</ul>
          </section>
        ))
      )}
    </div>
  );
}
