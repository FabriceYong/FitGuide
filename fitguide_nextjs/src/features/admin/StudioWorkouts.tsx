'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, ImageOff, Loader2, Plus, Send, Trash2, X } from 'lucide-react';
import { CATALOG } from '@fitguide/shared';
import { useExerciseDemo } from '../workout/hooks/useExerciseDemo';
import {
  deleteMyWorkout, saveMyWorkout, submitMyWorkout,
  type CoachWorkout, type CoachWorkoutInput, type ReviewStatus, type StepDemo, type WorkoutStep,
} from '../../services/adminService';

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5';
const field = 'w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white';

export const STATUS_TEXT: Record<ReviewStatus, string> = {
  draft: 'Draft',
  pending: 'Waiting for review',
  published: 'Published',
  rejected: 'Changes requested',
};

const csv = (items: string[]) => items.join(', ');
const fromCsv = (text: string) => text.split(',').map((s) => s.trim()).filter(Boolean);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const blankStep = (): WorkoutStep => ({ instruction: '', duration: 30 });
export const blankWorkout = (): CoachWorkoutInput => ({
  title: '', description: '', shortDescription: '', category: 'Strength', difficulty: 'Beginner', duration: 20, calories: null,
  intensity: 'Moderate', equipment: [], targetMuscles: [], steps: [blankStep()],
});

export const toInput = (w: CoachWorkout): CoachWorkoutInput => ({
  title: w.title, description: w.description, shortDescription: w.shortDescription, category: w.category, difficulty: w.difficulty,
  duration: w.duration, calories: w.calories, intensity: w.intensity, equipment: w.equipment, targetMuscles: w.targetMuscles, steps: w.steps,
});

/**
 * What a step will show while training: its own picture, or the demo the
 * API matches from the exercise name or instruction (the same free sources
 * as the catalog). The app also draws a figure for matched movements.
 */
function StepDemoPreview({ step }: { step: WorkoutStep }) {
  const own = step.gifUrl || step.imageUrl;
  // Look the demo up once typing pauses, not on every key.
  const [settled, setSettled] = useState({ exerciseName: step.exerciseName, instruction: step.instruction });
  useEffect(() => {
    const timer = setTimeout(() => setSettled({ exerciseName: step.exerciseName, instruction: step.instruction }), 400);
    return () => clearTimeout(timer);
  }, [step.exerciseName, step.instruction]);
  // The hook is plain JS, so give its result the API's demo shape.
  const { demo, loading } = useExerciseDemo(own ? null : settled) as { demo: StepDemo | null; loading: boolean };
  const frame = own || demo?.media?.frames?.[0];
  return (
    <div className="w-full sm:w-36 shrink-0 space-y-1">
      <div className="aspect-square rounded-xl bg-noir-eclipse border border-white-30/10 overflow-hidden flex items-center justify-center">
        {frame
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={frame} alt={demo ? `Demonstration: ${demo.name}` : ''} className="w-full h-full object-cover" />
          : loading ? <Loader2 className="w-5 h-5 animate-spin text-white-70" />
            : <ImageOff className="w-6 h-6 text-white-70" aria-hidden="true" />}
      </div>
      <p className="text-[11px] text-white-70 leading-snug">
        {own ? 'Your picture'
          : demo ? <>Automatic demo: <strong className="text-white">{demo.name}</strong>{demo.media ? '' : ' (drawn in the app)'}</>
            : loading ? 'Finding a demo…' : 'No demo matches yet. Name the exercise or add a picture.'}
      </p>
    </div>
  );
}

function StepRow({ step, index, count, onChange, onMove, onRemove }: {
  step: WorkoutStep; index: number; count: number;
  onChange: (step: WorkoutStep) => void; onMove: (by: number) => void; onRemove: () => void;
}) {
  return (
    <li className="bg-noir-eclipse/60 rounded-xl p-3 flex flex-col sm:flex-row gap-3">
      <div className="flex-1 grid sm:grid-cols-4 gap-2">
        <label className="sm:col-span-4 text-[11px] font-bold text-white-70">Step {index + 1}: instruction
          <textarea required rows={2} maxLength={1000} value={step.instruction} onChange={(e) => onChange({ ...step, instruction: e.target.value })}
            placeholder="Push-ups: hands under shoulders, lower your chest to the floor" className={`${field} mt-1`} />
        </label>
        <label className="text-[11px] font-bold text-white-70">Seconds
          <input type="number" min={0} max={3600} value={step.duration ?? ''} onChange={(e) => onChange({ ...step, duration: e.target.value === '' ? undefined : Number(e.target.value) })} className={`${field} mt-1`} />
        </label>
        <label className="sm:col-span-3 text-[11px] font-bold text-white-70">Exercise name (optional)
          <input maxLength={100} value={step.exerciseName || ''} onChange={(e) => onChange({ ...step, exerciseName: e.target.value || undefined })} placeholder="Found automatically when left empty" className={`${field} mt-1`} />
        </label>
        <label className="sm:col-span-4 text-[11px] font-bold text-white-70">Picture or GIF link (optional)
          <input type="url" maxLength={500} value={step.gifUrl || ''} onChange={(e) => onChange({ ...step, gifUrl: e.target.value || undefined, imageUrl: undefined })} placeholder="https://…" className={`${field} mt-1`} />
        </label>
        <div className="sm:col-span-4 flex gap-1">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move step ${index + 1} up`} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
          <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move step ${index + 1} down`} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
          <button type="button" disabled={count === 1} onClick={onRemove} aria-label={`Remove step ${index + 1}`} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-red-300 disabled:opacity-30"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <StepDemoPreview step={step} />
    </li>
  );
}

/** Write or edit one of the coach's workouts, step by step. */
export function CoachWorkoutEditor({ initial, slug, onDone }: { initial: CoachWorkoutInput; slug: string | null; onDone: () => void }) {
  const [w, setW] = useState<CoachWorkoutInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof CoachWorkoutInput>(k: K, v: CoachWorkoutInput[K]) => setW((prev) => ({ ...prev, [k]: v }));
  const setStep = (i: number, step: WorkoutStep) => set('steps', w.steps.map((s, j) => (j === i ? step : s)));
  const moveStep = (i: number, by: number) => {
    const steps = [...w.steps];
    [steps[i], steps[i + by]] = [steps[i + by], steps[i]];
    set('steps', steps);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await saveMyWorkout({ ...w, shortDescription: w.shortDescription || null }, slug);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${card} space-y-4`}>
      <h2 className="font-extrabold text-lg">{slug ? 'Edit workout' : 'New workout'}</h2>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="md:col-span-2 text-xs font-bold text-white-70">Title<input required minLength={3} maxLength={100} value={w.title} onChange={(e) => set('title', e.target.value)} className={`${field} mt-1`} /></label>
        <label className="md:col-span-2 text-xs font-bold text-white-70">Description<textarea required minLength={10} maxLength={1000} rows={3} value={w.description} onChange={(e) => set('description', e.target.value)} className={`${field} mt-1`} /></label>
        <label className="text-xs font-bold text-white-70">Category
          <select value={w.category} onChange={(e) => set('category', e.target.value)} className={`${field} mt-1`}>{CATALOG.WORKOUT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="text-xs font-bold text-white-70">Difficulty
          <select value={w.difficulty} onChange={(e) => set('difficulty', e.target.value)} className={`${field} mt-1`}>{CATALOG.DIFFICULTIES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="text-xs font-bold text-white-70">Minutes<input type="number" required min={1} max={300} value={w.duration} onChange={(e) => set('duration', Number(e.target.value))} className={`${field} mt-1`} /></label>
        <label className="text-xs font-bold text-white-70">Intensity
          <select value={w.intensity} onChange={(e) => set('intensity', e.target.value)} className={`${field} mt-1`}>{CATALOG.INTENSITIES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="text-xs font-bold text-white-70">Equipment (comma separated)<input value={csv(w.equipment)} onChange={(e) => set('equipment', fromCsv(e.target.value))} placeholder="None" className={`${field} mt-1`} /></label>
        <label className="text-xs font-bold text-white-70">Target muscles<input value={csv(w.targetMuscles)} onChange={(e) => set('targetMuscles', fromCsv(e.target.value))} className={`${field} mt-1`} /></label>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold text-sm">Steps</h3>
        <p className="text-xs text-white-70">Start an instruction with the exercise name (&quot;Squats: …&quot;). Steps without a picture of their own get a demonstration automatically, from the same free sources as the FitGuide catalog.</p>
        <ol className="space-y-2">
          {w.steps.map((step, i) => (
            <StepRow
              key={i}
              step={step}
              index={i}
              count={w.steps.length}
              onChange={(next) => setStep(i, next)}
              onMove={(by) => moveStep(i, by)}
              onRemove={() => set('steps', w.steps.filter((_, j) => j !== i))}
            />
          ))}
        </ol>
        <button type="button" onClick={() => set('steps', [...w.steps, blankStep()])} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-white/10"><Plus className="w-3.5 h-3.5" /> Add step</button>
      </div>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Save draft'}</button>
        <button type="button" onClick={onDone} className="px-5 py-2.5 rounded-xl bg-white/10 font-bold text-sm">Cancel</button>
      </div>
    </form>
  );
}

/** The coach's workouts, with their review status. */
export function WorkoutList({ workouts, onEdit, act }: {
  workouts: CoachWorkout[];
  onEdit: (w: CoachWorkout) => void;
  act: (task: () => Promise<unknown>, done: string) => void;
}) {
  if (!workouts.length) return <p className="text-white-70 text-sm">You haven&apos;t written a workout yet.</p>;
  return (
    <ul className="space-y-3">
      {workouts.map((w) => {
        const auto = w.demos.filter((d, i) => d && !w.steps[i].gifUrl && !w.steps[i].imageUrl).length;
        return (
          <li key={w.slug} className={`${card} flex flex-wrap items-start justify-between gap-3`}>
            <div className="min-w-0">
              <p className="font-bold">{w.title}</p>
              <p className="text-xs text-white-70">{STATUS_TEXT[w.status]} · {w.category} · {w.duration} min · {plural(w.steps.length, 'step')} · {plural(auto, 'automatic demo')}</p>
              {w.status === 'rejected' && w.reviewNote && <p className="text-sm text-amber-200 mt-1">Reviewer: {w.reviewNote}</p>}
            </div>
            <div className="flex gap-2">
              {w.status === 'published' && <a href={`/workouts/${w.slug}`} className="text-xs font-bold px-3 py-2 rounded-lg bg-white/10">View</a>}
              {(w.status === 'draft' || w.status === 'rejected') && (
                <>
                  <button onClick={() => onEdit(w)} className="text-xs font-bold px-3 py-2 rounded-lg bg-white/10">Edit</button>
                  <button onClick={() => act(() => submitMyWorkout(w.slug), 'Sent for review. It joins the catalog once the FitGuide team approves it.')} className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg bg-lime-light text-noir-eclipse"><Send className="w-3.5 h-3.5" /> Publish</button>
                  <button onClick={() => window.confirm(`Delete ${w.title}?`) && act(() => deleteMyWorkout(w.slug), 'Deleted.')} aria-label={`Delete ${w.title}`} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-red-300"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
