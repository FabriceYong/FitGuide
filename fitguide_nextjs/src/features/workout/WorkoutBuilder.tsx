'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Link2, Loader2, Plus, Trash2 } from 'lucide-react';
import { CATALOG } from '@fitguide/shared';
import { fetchExercises } from '../../services/contentService';
import { saveMyWorkout, type BuilderAnswers, type BuilderExercise, type MyWorkout } from '../../services/myWorkoutService';
import type { Exercise } from '../../types/catalog';

const RESTS = [30, 45, 60, 90, 120, 180];
const newExercise = (): BuilderExercise => ({ name: '', sets: 3, reps: '10', seconds: null, weighted: false, supersetNext: false });
const blank = (): BuilderAnswers => ({ title: '', category: 'Strength', restSec: 90, exercises: [newExercise()] });
const restLabel = (s: number) => (s < 60 ? `${s} s` : `${s / 60} min`.replace('.5 min', ' min 30 s'));

const inputClass = 'w-full h-11 bg-noir-eclipse border border-white-30/40 rounded-lg px-3.5 text-white text-base focus:outline-none focus:border-lime-light focus:ring-2 focus:ring-lime-light/30';

/**
 * Make or change one of your own workouts: exercises with sets of reps or of
 * a time, optionally paired into supersets. Library exercises are suggested
 * as you type and set reps/time and weights to suit.
 */
export function WorkoutBuilder({ workout, onSaved, onCancel }: { workout?: MyWorkout; onSaved: (w: MyWorkout) => void; onCancel: () => void }) {
  const listId = useId();
  const [answers, setAnswers] = useState<BuilderAnswers>(() => workout?.builtFrom ?? blank());
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExercises().then(setLibrary).catch(() => setLibrary([])); // suggestions only
  }, []);

  const set = (changes: Partial<BuilderAnswers>) => setAnswers((a) => ({ ...a, ...changes }));
  const setExercise = (i: number, changes: Partial<BuilderExercise>) =>
    setAnswers((a) => ({ ...a, exercises: a.exercises.map((e, j) => (j === i ? { ...e, ...changes } : e)) }));

  // Picking a library exercise sets reps or time, and weights, to suit it.
  const rename = (i: number, name: string) => {
    const match = library.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    const current = answers.exercises[i];
    if (!match || current.name.trim().toLowerCase() === match.name.toLowerCase()) return setExercise(i, { name });
    const timed = match.trackingType === 'duration';
    setExercise(i, {
      name,
      weighted: match.trackingType === 'weighted',
      ...(timed ? { reps: null, seconds: current.seconds || 30 } : { seconds: null, reps: current.reps || '10' }),
    });
  };

  const move = (i: number, by: number) => setAnswers((a) => {
    const exercises = [...a.exercises];
    [exercises[i], exercises[i + by]] = [exercises[i + by], exercises[i]];
    return { ...a, exercises };
  });
  const remove = (i: number) => setAnswers((a) => ({ ...a, exercises: a.exercises.filter((_, j) => j !== i) }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const exercises = answers.exercises.map((x, i) => ({
        ...x,
        name: x.name.trim(),
        supersetNext: x.supersetNext && i < answers.exercises.length - 1,
      }));
      onSaved(await saveMyWorkout({ ...answers, title: answers.title.trim(), exercises }, workout?.slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the workout.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5" aria-label={workout ? `Edit ${workout.title}` : 'Build a workout'}>
      <datalist id={listId}>
        {library.map((x) => <option key={x.slug} value={x.name} />)}
      </datalist>

      <label className="block space-y-1.5">
        <span className="block text-sm font-medium text-white">Name</span>
        <input value={answers.title} onChange={(e) => set({ title: e.target.value })} required minLength={3} maxLength={100} placeholder="Leg day" className={inputClass} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor={`${listId}-type`} className="block text-sm font-medium text-white">Type</label>
          <select id={`${listId}-type`} value={answers.category} onChange={(e) => set({ category: e.target.value })} className={inputClass}>
            {CATALOG.WORKOUT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${listId}-rest`} className="block text-sm font-medium text-white">Rest between sets</label>
          <select id={`${listId}-rest`} value={answers.restSec} onChange={(e) => set({ restSec: Number(e.target.value) })} className={inputClass}>
            {RESTS.map((s) => <option key={s} value={s}>{restLabel(s)}</option>)}
          </select>
        </div>
      </div>

      <ol className="space-y-3">
        {answers.exercises.map((x, i) => {
          const last = i === answers.exercises.length - 1;
          const label = `Exercise ${i + 1}`;
          return (
            <li key={i} className="bg-obsidian-wave rounded-2xl p-4 space-y-3" aria-label={label}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold tracking-widest text-white-70 uppercase">{label}</span>
                <div className="flex gap-1">
                  <IconButton label={`Move exercise ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></IconButton>
                  <IconButton label={`Move exercise ${i + 1} down`} disabled={last} onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></IconButton>
                  <IconButton label={`Remove exercise ${i + 1}`} disabled={answers.exercises.length === 1} onClick={() => remove(i)}><Trash2 className="w-4 h-4" /></IconButton>
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className="block text-sm font-medium text-white">Exercise</span>
                <input value={x.name} onChange={(e) => rename(i, e.target.value)} list={listId} required maxLength={100} placeholder="Start typing, e.g. Squat" className={inputClass} />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block space-y-1.5">
                  <span className="block text-sm font-medium text-white">Sets</span>
                  <input type="number" inputMode="numeric" min={1} max={10} required value={x.sets} onChange={(e) => setExercise(i, { sets: Number(e.target.value) })} className={inputClass} />
                </label>
                <div className="space-y-1.5">
                  <label htmlFor={`${listId}-count-${i}`} className="block text-sm font-medium text-white">Count</label>
                  <select id={`${listId}-count-${i}`} value={x.seconds ? 'time' : 'reps'} onChange={(e) => setExercise(i, e.target.value === 'time' ? { reps: null, seconds: x.seconds || 30 } : { seconds: null, reps: x.reps || '10' })} className={inputClass}>
                    <option value="reps">Reps</option>
                    <option value="time">Time</option>
                  </select>
                </div>
                {x.seconds ? (
                  <label className="block space-y-1.5">
                    <span className="block text-sm font-medium text-white">Seconds</span>
                    <input type="number" inputMode="numeric" min={5} max={600} required value={x.seconds} onChange={(e) => setExercise(i, { seconds: Number(e.target.value) })} className={inputClass} />
                  </label>
                ) : (
                  <label className="block space-y-1.5">
                    <span className="block text-sm font-medium text-white">Reps</span>
                    <input value={x.reps ?? ''} onChange={(e) => setExercise(i, { reps: e.target.value })} required pattern="\d{1,3}(\s*[\-–]\s*\d{1,3})?" title="A number, or a range like 8-10" placeholder="8-10" className={inputClass} />
                  </label>
                )}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <Check label="Log a weight" checked={x.weighted} onChange={(weighted) => setExercise(i, { weighted })} />
                {!last && (
                  <Check
                    label={<><Link2 className="w-3.5 h-3.5 inline -mt-0.5" aria-hidden="true" /> Superset with the next one</>}
                    checked={x.supersetNext}
                    onChange={(supersetNext) => setExercise(i, { supersetNext })}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => set({ exercises: [...answers.exercises, newExercise()] })}
        disabled={answers.exercises.length >= 30}
        className="w-full h-11 rounded-lg border border-dashed border-white-30/50 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:border-lime-light/60 disabled:opacity-50"
      >
        <Plus className="w-4 h-4" aria-hidden="true" /> Add an exercise
      </button>
      <p className="text-xs text-white-70">A superset goes straight from one exercise to the next and rests after the pair.</p>

      {error && (
        <p role="alert" className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {error}
        </p>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 h-11 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 h-11 bg-lime-light text-noir-eclipse font-semibold rounded-lg text-[15px] flex items-center justify-center gap-2 hover:bg-lime-light/90 disabled:opacity-60">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Saving…</> : 'Save workout'}
        </button>
      </div>
    </form>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="w-9 h-9 rounded-lg bg-white/5 text-white-70 hover:text-white flex items-center justify-center disabled:opacity-30">
      {children}
    </button>
  );
}

function Check({ label, checked, onChange }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-lime-light" />
      {label}
    </label>
  );
}
