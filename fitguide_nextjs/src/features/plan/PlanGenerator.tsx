'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import type { FitnessLevel, Goal } from '@fitguide/shared';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPlanOptions, generatePlan, type Plan, type PlanOptions, type PlanRequest } from '../../services/planService';

const MINUTES = [15, 20, 30, 45, 60, 75, 90];
const WEEKS = [2, 4, 6, 8, 12];
const GOAL_LABELS: Record<string, string> = {
  Vitality: 'Feel better overall',
  Muscle: 'Build strength and muscle',
  Weight: 'Lose weight',
  Flexibility: 'Move and stretch better',
};

interface Props {
  hasPlan: boolean;
  onCreated: (plan: Plan, warnings: string[]) => void;
  onCancel?: () => void;
}

/** The questions that drive the rules-based plan generator. */
export function PlanGenerator({ hasPlan, onCreated, onCancel }: Props) {
  const { user } = useAuth();
  const [options, setOptions] = useState<PlanOptions | null>(null);
  const [answers, setAnswers] = useState<PlanRequest>({
    goal: (user?.goal as Goal) || 'Vitality',
    level: (user?.fitnessLevel as FitnessLevel) || 'Beginner',
    daysPerWeek: 3,
    minutesPerSession: 30,
    weeks: 4,
    equipment: [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlanOptions().then(setOptions).catch((err: Error) => setError(err.message));
  }, []);

  const set = <K extends keyof PlanRequest>(key: K, value: PlanRequest[K]) => setAnswers((a) => ({ ...a, [key]: value }));
  const toggleEquipment = (item: string) => set('equipment', answers.equipment.includes(item)
    ? answers.equipment.filter((e) => e !== item)
    : [...answers.equipment, item]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (hasPlan && !window.confirm('Start a new plan? Your current plan ends, but your logged sessions stay in your history.')) return;
    setBusy(true);
    setError(null);
    try {
      const { plan, warnings } = await generatePlan(answers);
      onCreated(plan, warnings);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!options) {
    return error
      ? <p role="alert" className="text-sm text-red-300">{error}</p>
      : <p className="flex items-center gap-2 text-white-70 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>;
  }

  const chip = (active: boolean) => `px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
    active ? 'bg-lime-light text-noir-eclipse border-lime-light' : 'bg-noir-eclipse border-white-30/20 text-white-70 hover:text-white'
  }`;

  return (
    <form onSubmit={submit} className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-xl font-extrabold flex items-center gap-2"><Sparkles className="w-5 h-5 text-lime-light" /> Build your plan</h2>
        <p className="text-sm text-white-70 mt-1">Answer a few questions and we&apos;ll schedule workouts from the catalog that fit your goal, level, time and equipment.</p>
      </div>

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wider text-white-70 mb-2">Main goal</legend>
        <div className="flex flex-wrap gap-2">
          {options.goals.map((goal) => (
            <button type="button" key={goal} aria-pressed={answers.goal === goal} onClick={() => set('goal', goal)} className={chip(answers.goal === goal)}>
              {GOAL_LABELS[goal] || goal}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wider text-white-70 mb-2">Fitness level</legend>
        <div className="flex flex-wrap gap-2">
          {options.levels.map((level) => (
            <button type="button" key={level} aria-pressed={answers.level === level} onClick={() => set('level', level)} className={chip(answers.level === level)}>
              {level}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-white-70">Days per week</span>
          <select value={answers.daysPerWeek} onChange={(e) => set('daysPerWeek', Number(e.target.value))} className="mt-1.5 w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-4 py-2.5 text-white">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-white-70">Minutes per session</span>
          <select value={answers.minutesPerSession} onChange={(e) => set('minutesPerSession', Number(e.target.value))} className="mt-1.5 w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-4 py-2.5 text-white">
            {MINUTES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-white-70">Plan length (weeks)</span>
          <select value={answers.weeks} onChange={(e) => set('weeks', Number(e.target.value))} className="mt-1.5 w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-4 py-2.5 text-white">
            {WEEKS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-wider text-white-70 mb-1">Equipment you have</legend>
        <p className="text-xs text-white-70 mb-2">Bodyweight workouts and a mat are always included.</p>
        <div className="flex flex-wrap gap-2">
          {options.equipment.map((item) => (
            <label key={item} className={`${chip(answers.equipment.includes(item))} cursor-pointer`}>
              <input type="checkbox" className="sr-only" checked={answers.equipment.includes(item)} onChange={() => toggleEquipment(item)} />
              {item}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertTriangle className="w-4 h-4" /> {error}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {hasPlan ? 'Replace my plan' : 'Create my plan'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl bg-white/10 font-bold text-sm">Cancel</button>}
      </div>
    </form>
  );
}
