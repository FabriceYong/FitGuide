'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Flame, LayoutGrid, Search, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useWorkouts } from '../../context/WorkoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { fetchEnrollments, fetchPrograms } from '../../services/trainingService';
import type { Plan } from '../../services/planService';
import type { ProgramSummary } from '../../types/catalog';
import { WorkoutCard } from '../dashboard/components/WorkoutCard';
import { scheduleHref } from '../progress/format';
import { LEVEL_COLORS, ProgramCard } from './ProgramCard';

const LEVELS = [
  { level: 'All', icon: LayoutGrid, text: 'Everything' },
  { level: 'Beginner', icon: Zap, text: 'Build foundations' },
  { level: 'Intermediate', icon: TrendingUp, text: 'Step it up' },
  { level: 'Advanced', icon: Flame, text: 'Peak performance' },
] as const;
type LevelFilter = (typeof LEVELS)[number]['level'];

const LEVEL_TEXT: Record<string, string> = {
  Beginner: 'For starting out or coming back: simpler movements and lower intensity.',
  Intermediate: 'For regular exercisers: more volume, intensity and complexity.',
  Advanced: 'For experienced athletes: high intensity and demanding movements.',
  'All Levels': 'Easy to scale up or down to suit you.',
};

/** Multi-week programs, the personal plan, and single workouts grouped by level. */
export function ProgramsTab() {
  const { workouts } = useWorkouts();
  const { hasAccount } = useAuth();
  const [programs, setPrograms] = useState<ProgramSummary[] | null>(null);
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [active, setActive] = useState<Plan | null>(null);
  const [level, setLevel] = useState<LevelFilter>('All');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchPrograms().then((d) => setPrograms(d.programs)).catch((err: Error) => setProgramsError(err.message));
  }, []);
  useEffect(() => {
    if (!hasAccount) return;
    fetchEnrollments().then((d) => setActive(d.active)).catch(() => setActive(null));
  }, [hasAccount]);

  const categories = useMemo(() => [...new Set(workouts.map((w) => w.category))].sort(), [workouts]);
  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = workouts.filter((w) => (!category || w.category === category)
      && (!term || w.title.toLowerCase().includes(term) || w.description.toLowerCase().includes(term)));
    const levels = level === 'All' ? ['Beginner', 'Intermediate', 'Advanced', 'All Levels'] : [level, 'All Levels'];
    return levels.map((l) => ({ level: l, workouts: matches.filter((w) => w.difficulty === l) }));
  }, [workouts, level, category, query]);
  const personalPlan = active?.programSlug.startsWith('plan-') ? active : null;
  const sortedPrograms = [...(programs || [])].sort((a, b) => Number(b.slug === active?.programSlug) - Number(a.slug === active?.programSlug));

  return (
    <div className="space-y-12 pb-10 text-left">
      <header className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">Programs</h1>
        <p className="text-white-70 max-w-3xl">
          Follow a multi-week program, let FitGuide build a plan around you, or pick single workouts for your level.
        </p>
      </header>

      {/* Personal plan */}
      <section aria-labelledby="programs-plan" className="rounded-3xl bg-gradient-to-br from-royal-nebula/30 to-obsidian-wave border border-white/10 p-6 md:p-8 flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-2xl">
          <h2 id="programs-plan" className="flex items-center gap-2 text-2xl font-extrabold text-white">
            <Sparkles className="w-6 h-6 text-lime-light" aria-hidden="true" /> {personalPlan ? 'Your personal plan' : 'Want a plan made for you?'}
          </h2>
          <p className="text-white-70 mt-2">
            {personalPlan
              ? `Week ${personalPlan.currentWeek} of ${personalPlan.weeks ?? '?'} · ${personalPlan.completedCount} of ${personalPlan.totalDays} sessions done.`
              : 'Tell FitGuide your goal, level, available days and equipment, and it builds a weekly schedule. The AI coach can adjust it later.'}
          </p>
        </div>
        <Link href="/plan" className="px-6 py-3.5 bg-lime-light text-noir-eclipse font-extrabold rounded-xl text-sm flex items-center gap-2">
          {personalPlan ? 'Open my plan' : 'Build my plan'} <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </section>

      {/* Catalog programs */}
      <section aria-labelledby="programs-list" className="space-y-5">
        <div>
          <h2 id="programs-list" className="text-2xl font-extrabold text-white">Multi-week programs</h2>
          <p className="text-sm text-white-70 mt-1">A schedule of workouts, week by week, with your sessions tracked against it.</p>
        </div>
        {active && !personalPlan && (
          <Link href={scheduleHref(active)} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-lime-light/10 border border-lime-light/30 text-sm text-white">
            You’re following <strong>{active.programTitle}</strong>: week {active.currentWeek}, {active.percentComplete}% done.
            <ArrowRight className="w-4 h-4 text-lime-light shrink-0" aria-hidden="true" />
          </Link>
        )}
        {programsError ? (
          <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertCircle className="w-4 h-4" aria-hidden="true" /> {programsError}</p>
        ) : !programs ? (
          <div className="grid gap-5 md:grid-cols-2" aria-hidden="true">
            {Array.from({ length: 2 }, (_, i) => <div key={i} className="h-48 bg-obsidian-wave rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {sortedPrograms.map((p) => (
              <li key={p.slug}><ProgramCard program={p} badge={p.slug === active?.programSlug ? 'Following' : null} /></li>
            ))}
          </ul>
        )}
      </section>

      {/* Single workouts by level */}
      <section aria-labelledby="programs-workouts" className="space-y-6">
        <h2 id="programs-workouts" className="text-2xl font-extrabold text-white">Single workouts by level</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" role="group" aria-label="Level">
          {LEVELS.map(({ level: l, icon: Icon, text }) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              aria-pressed={level === l}
              className={`p-4 rounded-2xl border text-center ${level === l ? 'bg-lime-light text-noir-eclipse border-lime-light' : 'bg-obsidian-wave text-white border-white/15 hover:border-lime-light/50'}`}
            >
              <Icon className="w-6 h-6 mx-auto mb-2" aria-hidden="true" />
              <span className="block font-bold text-sm uppercase tracking-wider">{l === 'All' ? 'All levels' : l}</span>
              <span className={`block text-xs mt-1 ${level === l ? 'text-noir-eclipse/80' : 'text-white-70'}`}>{text}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <label className="flex-1 flex items-center bg-obsidian-wave border border-white-30/30 rounded-xl px-4 py-3 focus-within:border-lime-light">
            <Search className="w-5 h-5 text-white-70 mr-3 shrink-0" aria-hidden="true" />
            <span className="sr-only">Search workouts</span>
            <input type="search" placeholder="Search workouts" value={query} onChange={(e) => setQuery(e.target.value)} className="bg-transparent text-white w-full focus:outline-none placeholder:text-white-70 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-white-70">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-obsidian-wave border border-white-30/30 rounded-xl px-3 py-3 text-sm text-white">
              <option value="">All</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>

        {groups.map(({ level: l, workouts: list }) => (
          <div key={l} className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <h3 className="text-xl font-extrabold text-white" style={{ color: LEVEL_COLORS[l] }}>{l}</h3>
              <span className="text-xs font-bold text-white-70">{list.length} workout{list.length === 1 ? '' : 's'}</span>
              <p className="w-full text-sm text-white-70">{LEVEL_TEXT[l]}</p>
            </div>
            {list.length ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((w) => <li key={w.slug}><WorkoutCard workout={w} /></li>)}
              </ul>
            ) : <p className="text-sm text-white-70">No {l.toLowerCase()} workouts match.</p>}
          </div>
        ))}
      </section>
    </div>
  );
}
