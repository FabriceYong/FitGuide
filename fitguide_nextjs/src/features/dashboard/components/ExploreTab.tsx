'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, BookOpen, Layers, Search, SlidersHorizontal, X } from 'lucide-react';
import { useWorkouts } from '../../../context/WorkoutContext';
import { categoryCounts, DURATIONS, equipmentNames, LEVELS, matchesFilter } from '../../workout/catalogFilter';
import { useFavorites } from '../useFavorites';
import { worksRegions, type Region } from '../muscles';
import { BodyMap } from './BodyMap';
import { ExerciseLibrary } from './ExerciseLibrary';
import { WorkoutCard } from './WorkoutCard';

const PAGE = 9;

/** Browse and filter the workout catalog, or the exercise library. */
export function ExploreTab() {
  const { workouts, loading } = useWorkouts();
  const { isFavorite, toggle, canSave, error: favoriteError } = useFavorites();
  const [view, setView] = useState<'workouts' | 'exercises'>('workouts');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [equipment, setEquipment] = useState('');
  const [maxMinutes, setMaxMinutes] = useState(0);
  const [regions, setRegions] = useState<Region[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const categories = useMemo(() => categoryCounts(workouts), [workouts]);
  const equipmentOptions = useMemo(() => equipmentNames(workouts), [workouts]);

  const results = useMemo(
    () => workouts.filter((w) => matchesFilter(w, { query, category, level, equipment, maxMinutes }) && worksRegions(w.targetMuscles, regions)),
    [workouts, query, category, level, equipment, maxMinutes, regions],
  );

  const advancedCount = [level, equipment, maxMinutes, regions.length].filter(Boolean).length;
  const anyFilter = Boolean(query || category || advancedCount);
  const clearAll = () => {
    setQuery(''); setCategory(''); setLevel(''); setEquipment(''); setMaxMinutes(0); setRegions([]); setShowAll(false);
  };
  const shown = showAll ? results : results.slice(0, PAGE);
  const views = [['workouts', 'Workouts', Layers], ['exercises', 'Exercise library', BookOpen]] as const;

  return (
    <div className="space-y-6 pb-10 text-left">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-3xl font-extrabold text-white">Explore</h1>
        <Link href="/workouts" className="text-sm font-semibold text-lime-light hover:underline">Full catalog page →</Link>
      </div>

      <div className="flex bg-obsidian-wave p-1 rounded-2xl border border-white-30/20 gap-1" role="group" aria-label="What to browse">
        {views.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-pressed={view === id}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold ${view === id ? 'bg-lime-light text-noir-eclipse' : 'text-white-70 hover:text-white'}`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {view === 'exercises' ? <ExerciseLibrary /> : (
        <div className="space-y-6">
          <div className="flex gap-2">
            <label className="flex-1 flex items-center bg-obsidian-wave border border-white-30/40 rounded-2xl px-4 py-3 focus-within:border-lime-light">
              <Search className="w-5 h-5 text-white-70 mr-3 shrink-0" aria-hidden="true" />
              <span className="sr-only">Search workouts</span>
              <input
                type="search"
                placeholder="Search workouts"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowAll(false); }}
                className="bg-transparent text-white w-full focus:outline-none placeholder:text-white-70 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              aria-controls="explore-filters"
              aria-label={advancedCount ? `Filters (${advancedCount})` : 'Filters'}
              className={`px-4 rounded-2xl border flex items-center gap-2 ${showFilters || advancedCount ? 'bg-lime-light/15 border-lime-light text-lime-light' : 'bg-obsidian-wave border-white-30/40 text-white'}`}
            >
              <SlidersHorizontal className="w-5 h-5" aria-hidden="true" />
              <span className="text-xs font-bold hidden sm:inline" aria-hidden="true">Filters{advancedCount ? ` (${advancedCount})` : ''}</span>
            </button>
          </div>

          {showFilters && (
            <div id="explore-filters" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select label="Level" value={level} onChange={setLevel} options={[['', 'Any level'], ...LEVELS.map((l): [string, string] => [l, l])]} />
                <Select
                  label="Equipment"
                  value={equipment}
                  onChange={setEquipment}
                  options={[['', 'Any equipment'], ['none', 'No equipment needed'], ...equipmentOptions.map((e): [string, string] => [e, e])]}
                />
                <Select label="Length" value={String(maxMinutes)} onChange={(v) => setMaxMinutes(Number(v))} options={DURATIONS.map((d): [string, string] => [String(d.max), d.label])} />
              </div>
              <BodyMap
                selected={regions}
                onToggle={(r) => setRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))}
                onClear={() => setRegions([])}
              />
            </div>
          )}

          <div className="flex overflow-x-auto no-scrollbar gap-2 py-1" role="group" aria-label="Category">
            {([['', workouts.length], ...categories] as [string, number][]).map(([c, count]) => (
              <button
                key={c || 'all'}
                type="button"
                onClick={() => { setCategory(c); setShowAll(false); }}
                aria-pressed={category === c}
                className={`shrink-0 px-4 py-2.5 rounded-full text-xs font-bold border ${category === c ? 'bg-lime-light text-noir-eclipse border-lime-light' : 'bg-obsidian-wave text-white border-white-30/30 hover:border-white-30'}`}
              >
                {c || 'All'} <span className="opacity-70">{count}</span>
              </button>
            ))}
          </div>

          {favoriteError && <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertCircle className="w-4 h-4" aria-hidden="true" /> {favoriteError}</p>}

          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold tracking-widest text-white uppercase" aria-live="polite">
              {loading ? 'Loading…' : `${results.length} workout${results.length === 1 ? '' : 's'}`}
            </h2>
            {anyFilter && (
              <button type="button" onClick={clearAll} className="flex items-center gap-1.5 text-xs font-bold text-red-300 hover:underline">
                <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-44 bg-obsidian-wave rounded-[24px] animate-pulse" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 bg-obsidian-wave/50 rounded-2xl border border-white-30/10">
              <p className="text-white-70">No workouts match these filters.</p>
              {anyFilter && <button type="button" onClick={clearAll} className="mt-3 text-sm font-bold text-lime-light">Clear filters</button>}
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shown.map((w) => (
                  <li key={w.slug}>
                    <WorkoutCard workout={w} favorite={isFavorite(w.slug)} onToggleFavorite={canSave ? toggle : undefined} />
                  </li>
                ))}
              </ul>
              {results.length > PAGE && (
                <div className="text-center">
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold text-white">
                    {showAll ? 'Show fewer' : `Show all ${results.length}`}
                  </button>
                </div>
              )}
            </>
          )}
          {!canSave && !loading && <p className="text-xs text-white-70">Create an account to save favorites.</p>}
        </div>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block bg-obsidian-wave border border-white-30/20 rounded-2xl p-3">
      <span className="block text-xs font-bold text-white-70 uppercase tracking-wider mb-2">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-3 py-2 text-sm text-white focus:border-lime-light">
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  );
}
