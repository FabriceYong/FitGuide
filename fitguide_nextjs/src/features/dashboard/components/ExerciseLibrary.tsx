'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, ChevronRight, Loader2, Search, ShieldCheck, X } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { fetchExercises } from '../../../services/contentService';
import type { Exercise } from '../../../types/catalog';
import { BodyMap } from './BodyMap';
import { worksRegions, type Region } from '../muscles';

const CATEGORY_COLORS: Record<Exercise['category'], string> = {
  Strength: '#C084FC',
  Cardio: '#FB923C',
  Mobility: '#14B8A6',
  Core: '#00C4B4',
  Plyometric: '#F59E0B',
};

const TRACKING: Record<Exercise['trackingType'], string> = {
  reps: 'Counted in reps',
  weighted: 'Weight × reps',
  duration: 'Timed',
  distance: 'Distance',
};

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** FitGuide's exercise library (the same exercises the workout player tracks). */
export function ExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Exercise['category'] | ''>('');
  const [equipment, setEquipment] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [open, setOpen] = useState<Exercise | null>(null);

  const load = () => {
    setError(null);
    fetchExercises().then(setExercises).catch((err: Error) => setError(err.message));
  };
  useEffect(() => {
    fetchExercises().then(setExercises).catch((err: Error) => setError(err.message));
  }, []);

  const equipmentOptions = useMemo(
    () => [...new Set((exercises || []).flatMap((e) => e.equipment))].sort(),
    [exercises],
  );
  const categories = useMemo(() => [...new Set((exercises || []).map((e) => e.category))], [exercises]);

  const shown = useMemo(() => {
    const term = normalize(query);
    return (exercises || []).filter((e) => {
      if (category && e.category !== category) return false;
      if (equipment === 'none' ? e.equipment.length > 0 : equipment && !e.equipment.includes(equipment)) return false;
      if (!worksRegions(e.primaryMuscles, regions)) return false;
      return !term || [e.name, ...e.aliases, ...e.primaryMuscles].some((n) => normalize(n).includes(term));
    });
  }, [exercises, query, category, equipment, regions]);

  const filtered = Boolean(query || category || equipment || regions.length);
  const reset = () => { setQuery(''); setCategory(''); setEquipment(''); setRegions([]); };

  if (error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
        <p className="flex items-center gap-2 text-sm text-red-300"><AlertCircle className="w-5 h-5" aria-hidden="true" /> {error}</p>
        <button type="button" onClick={load} className="px-4 py-2 rounded-lg bg-white/10 text-sm font-bold text-white">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-white-70">
        How to do each exercise in FitGuide&apos;s workouts: the muscles it works, the equipment, step-by-step instructions,
        form cues and common mistakes.
      </p>

      <label className="flex items-center bg-obsidian-wave border border-white-30/40 rounded-2xl px-4 py-3 focus-within:border-lime-light">
        <Search className="w-5 h-5 text-white-70 mr-3 shrink-0" aria-hidden="true" />
        <span className="sr-only">Search exercises</span>
        <input
          type="search"
          placeholder="Search exercises by name or muscle"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-transparent text-white w-full focus:outline-none placeholder:text-white-70 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Exercise type">
        {['', ...categories].map((c) => (
          <button
            key={c || 'all'}
            type="button"
            onClick={() => setCategory(c as Exercise['category'] | '')}
            aria-pressed={category === c}
            className={`px-4 py-2 rounded-full text-xs font-bold border ${category === c ? 'bg-lime-light text-noir-eclipse border-lime-light' : 'bg-obsidian-wave text-white border-white-30/30 hover:border-white-30'}`}
          >
            {c || 'All types'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold text-white-70">
          Equipment
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="bg-obsidian-wave border border-white-30/30 rounded-xl px-3 py-2 text-xs text-white focus:border-lime-light"
          >
            <option value="">Any</option>
            <option value="none">None (bodyweight)</option>
            {equipmentOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        {filtered && (
          <button type="button" onClick={reset} className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold text-red-300">
            <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear filters
          </button>
        )}
      </div>

      <BodyMap selected={regions} onToggle={(r) => setRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))} onClear={() => setRegions([])} />

      {!exercises ? (
        <p className="flex items-center gap-2 text-white-70 py-8" role="status"><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Loading exercises…</p>
      ) : shown.length === 0 ? (
        <div className="text-center py-14 bg-obsidian-wave/50 rounded-2xl border border-white-30/10">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-white-70" aria-hidden="true" />
          <p className="text-white font-semibold">No exercises match</p>
          <p className="text-sm text-white-70 mt-1">Try fewer filters or another search.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-white-70" aria-live="polite">{shown.length} of {exercises.length} exercises</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map((e) => {
              const color = CATEGORY_COLORS[e.category];
              return (
                <li key={e.slug}>
                  <button
                    type="button"
                    onClick={() => setOpen(e)}
                    className="w-full h-full text-left bg-obsidian-wave border border-white-30/10 rounded-2xl p-5 hover:border-lime-light/50 transition-colors group"
                  >
                    <span className="flex items-start justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: `${color}22`, color }}>{e.category}</span>
                      <ChevronRight className="w-4 h-4 text-white-70 group-hover:text-lime-light" aria-hidden="true" />
                    </span>
                    <span className="block font-extrabold text-white text-base leading-tight mb-2">{e.name}</span>
                    <span className="block text-xs text-white-70">{e.primaryMuscles.join(', ')}</span>
                    <span className="block text-[11px] text-white-70 mt-2">{e.equipment.length ? e.equipment.join(', ') : 'No equipment'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {open && <ExerciseDetails exercise={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ExerciseDetails({ exercise: e, onClose }: { exercise: Exercise; onClose: () => void }) {
  const color = CATEGORY_COLORS[e.category];
  return (
    <Modal title={e.name} onClose={onClose} size="lg" placement="sheet">
      <div className="space-y-5 overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ backgroundColor: `${color}22`, color }}>{e.category}</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white-70">{TRACKING[e.trackingType]}</span>
        </div>
        {e.aliases.length > 0 && <p className="text-xs text-white-70">Also called: {e.aliases.join(', ')}</p>}
        <dl className="grid grid-cols-2 gap-3 bg-noir-eclipse/60 p-4 rounded-2xl text-sm">
          <div>
            <dt className="text-[10px] font-bold text-white-70 uppercase tracking-wider">Muscles</dt>
            <dd className="font-semibold text-white mt-0.5">{e.primaryMuscles.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold text-white-70 uppercase tracking-wider">Equipment</dt>
            <dd className="font-semibold text-white mt-0.5">{e.equipment.length ? e.equipment.join(', ') : 'None'}</dd>
          </div>
        </dl>
        {e.instructions.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-white-70 uppercase tracking-wider mb-2">How to do it</h3>
            <ol className="space-y-2">
              {e.instructions.map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm text-white">
                  <span className="w-5 h-5 rounded-full bg-lime-light/20 text-lime-light text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
        )}
        {e.formCues.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-white-70 uppercase tracking-wider mb-2">Form cues</h3>
            <ul className="bg-lime-light/5 border border-lime-light/20 rounded-2xl p-4 space-y-1.5">
              {e.formCues.map((cue) => (
                <li key={cue} className="text-sm text-white flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-lime-light shrink-0 mt-0.5" aria-hidden="true" /> {cue}
                </li>
              ))}
            </ul>
          </section>
        )}
        {e.commonMistakes.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-white-70 uppercase tracking-wider mb-2">Common mistakes</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-white-70">
              {e.commonMistakes.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
