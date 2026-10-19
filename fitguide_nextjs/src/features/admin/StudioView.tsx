'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, PenTool, Plus, Send, Trash2 } from 'lucide-react';
import { CATALOG } from '@fitguide/shared';
import { useAuth } from '../../contexts/AuthContext';
import {
  createProgram, deleteProgram, fetchMyPrograms, fetchWorkoutOptions, submitProgram, updateProgram,
  type CatalogProgram, type ProgramInput,
} from '../../services/adminService';

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5';
const field = 'w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white';
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATUS_TEXT: Record<CatalogProgram['status'], string> = {
  draft: 'Draft',
  pending: 'Waiting for review',
  published: 'Published',
  rejected: 'Changes requested',
};

type WorkoutOption = { slug: string; title: string; category: string; duration: number };

const blank = (): ProgramInput => ({ title: '', description: '', level: 'Beginner', goal: '', weeks: 4, daysPerWeek: 3, days: [] });

function ProgramEditor({ initial, slug, workouts, onDone }: { initial: ProgramInput; slug: string | null; workouts: WorkoutOption[]; onDone: () => void }) {
  const [p, setP] = useState<ProgramInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bySlug = new Map(workouts.map((w) => [w.slug, w]));

  const slot = (week: number, day: number) => p.days.find((d) => d.week === week && d.day === day)?.workoutSlug || '';
  const setSlot = (week: number, day: number, workoutSlug: string) => {
    const others = p.days.filter((d) => !(d.week === week && d.day === day));
    const next = workoutSlug ? [...others, { week, day, workoutSlug, title: bySlug.get(workoutSlug)?.title || workoutSlug }] : others;
    next.sort((a, b) => a.week - b.week || a.day - b.day);
    setP({ ...p, days: next });
  };
  const copyWeekOne = () => {
    const first = p.days.filter((d) => d.week === 1);
    const days = Array.from({ length: p.weeks }, (_, i) => first.map((d) => ({ ...d, week: i + 1 }))).flat();
    setP({ ...p, days });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const daysPerWeek = Math.max(1, ...Array.from({ length: p.weeks }, (_, i) => p.days.filter((d) => d.week === i + 1).length));
    const input = { ...p, daysPerWeek, days: p.days.filter((d) => d.week <= p.weeks) };
    try {
      if (slug) await updateProgram(slug, input);
      else await createProgram(input);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${card} space-y-4`}>
      <h2 className="font-extrabold text-lg">{slug ? 'Edit program' : 'New program'}</h2>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-xs font-bold text-white-70">Title<input required minLength={3} maxLength={100} value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} className={`${field} mt-1`} /></label>
        <label className="text-xs font-bold text-white-70">Goal<input required minLength={2} maxLength={60} placeholder="e.g. Build strength" value={p.goal} onChange={(e) => setP({ ...p, goal: e.target.value })} className={`${field} mt-1`} /></label>
        <label className="md:col-span-2 text-xs font-bold text-white-70">Description<textarea required minLength={10} maxLength={1000} rows={3} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} className={`${field} mt-1`} /></label>
        <label className="text-xs font-bold text-white-70">Level
          <select value={p.level} onChange={(e) => setP({ ...p, level: e.target.value })} className={`${field} mt-1`}>{CATALOG.DIFFICULTIES.map((l) => <option key={l}>{l}</option>)}</select>
        </label>
        <label className="text-xs font-bold text-white-70">Weeks
          <select value={p.weeks} onChange={(e) => setP({ ...p, weeks: Number(e.target.value) })} className={`${field} mt-1`}>{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">Schedule</h3>
          <button type="button" onClick={copyWeekOne} className="text-xs font-bold underline text-white-70">Repeat week 1 for every week</button>
        </div>
        {Array.from({ length: p.weeks }, (_, i) => i + 1).map((week) => (
          <fieldset key={week} className="bg-noir-eclipse/60 rounded-xl p-3">
            <legend className="text-xs font-bold uppercase tracking-wider text-white-70 px-1">Week {week}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
              {DAY_NAMES.map((name, i) => (
                <label key={name} className="text-[11px] font-bold text-white-70">{name}
                  <select value={slot(week, i + 1)} onChange={(e) => setSlot(week, i + 1, e.target.value)} className={`${field} mt-1 text-xs`}>
                    <option value="">Rest</option>
                    {workouts.map((w) => <option key={w.slug} value={w.slug}>{w.title} ({w.duration}m)</option>)}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !p.days.length} className="px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Save draft'}</button>
        <button type="button" onClick={onDone} className="px-5 py-2.5 rounded-xl bg-white/10 font-bold text-sm">Cancel</button>
      </div>
    </form>
  );
}

/** /studio: creators write programs and submit them for review. */
export function StudioView() {
  const { ready, user } = useAuth();
  const [programs, setPrograms] = useState<CatalogProgram[] | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutOption[]>([]);
  const [editing, setEditing] = useState<{ input: ProgramInput; slug: string | null } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const allowed = user?.role === 'creator' || user?.role === 'admin';

  const load = useCallback(() => Promise.all([fetchMyPrograms(), fetchWorkoutOptions()]), []);
  const show = useCallback(([mine, all]: [CatalogProgram[], WorkoutOption[]]) => {
    setPrograms(mine);
    setWorkouts(all);
  }, []);
  const refresh = () => load().then(show).catch((err: Error) => setMessage(err.message));

  useEffect(() => {
    if (ready && allowed) load().then(show).catch((err: Error) => setMessage(err.message));
  }, [ready, allowed, load, show]);

  const act = async (task: () => Promise<unknown>, done: string) => {
    try {
      await task();
      setMessage(done);
      await refresh();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  if (!ready) return <Loader2 className="w-5 h-5 animate-spin" />;
  if (!allowed) {
    return (
      <div className={`${card} space-y-2`}>
        <h1 className="text-2xl font-extrabold">Creator studio</h1>
        <p className="text-white-70 text-sm">The studio is for FitGuide creators. Coaches and trainers who&apos;d like to publish programs can ask the FitGuide team for creator access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3"><PenTool className="w-8 h-8 text-lime-light" /> Creator studio</h1>
        {!editing && <button onClick={() => setEditing({ input: blank(), slug: null })} className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-lime-light text-noir-eclipse"><Plus className="w-4 h-4" /> New program</button>}
      </div>
      <p className="text-sm text-white-70 max-w-3xl">Build a multi-week program from catalog workouts. When it&apos;s ready, submit it: the FitGuide team reviews it before it appears in Programs with your name.</p>
      {message && <p role="status" className="text-sm bg-white/5 border border-white-30/10 rounded-xl px-4 py-3">{message}</p>}

      {editing ? (
        <ProgramEditor initial={editing.input} slug={editing.slug} workouts={workouts} onDone={() => { setEditing(null); refresh(); }} />
      ) : !programs ? <Loader2 className="w-5 h-5 animate-spin" /> : programs.length === 0 ? (
        <p className="text-white-70 text-sm">You haven&apos;t written a program yet.</p>
      ) : (
        <ul className="space-y-3">
          {programs.map((p) => (
            <li key={p.slug} className={`${card} flex flex-wrap items-start justify-between gap-3`}>
              <div className="min-w-0">
                <p className="font-bold">{p.title}</p>
                <p className="text-xs text-white-70">{STATUS_TEXT[p.status]} · {p.weeks} weeks · {p.days.length} sessions</p>
                {p.status === 'rejected' && p.reviewNote && <p className="text-sm text-amber-200 mt-1">Reviewer: {p.reviewNote}</p>}
              </div>
              <div className="flex gap-2">
                {p.status === 'published' && <Link href={`/programs/${p.slug}`} className="text-xs font-bold px-3 py-2 rounded-lg bg-white/10">View</Link>}
                {(p.status === 'draft' || p.status === 'rejected') && (
                  <>
                    <button onClick={() => setEditing({ input: { title: p.title, description: p.description, level: p.level, goal: p.goal, weeks: p.weeks, daysPerWeek: p.daysPerWeek, days: p.days }, slug: p.slug })} className="text-xs font-bold px-3 py-2 rounded-lg bg-white/10">Edit</button>
                    <button onClick={() => act(() => submitProgram(p.slug), 'Submitted for review.')} className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg bg-lime-light text-noir-eclipse"><Send className="w-3.5 h-3.5" /> Submit</button>
                    <button onClick={() => window.confirm(`Delete ${p.title}?`) && act(() => deleteProgram(p.slug), 'Deleted.')} aria-label={`Delete ${p.title}`} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-red-300"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
