'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, Loader2, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { CATALOG } from '@fitguide/shared';
import { useAuth } from '../../contexts/AuthContext';
import {
  createOfficialChallenge, deleteReview, fetchActivity, fetchAdminPrograms, fetchAdminReviews, fetchAdminWorkouts, fetchStats, fetchUsers,
  reviewProgram, saveWorkout, setUserRole, setWorkoutFlags,
  type AdminReview, type AdminUser, type AdminWorkout, type CatalogProgram, type Stats,
} from '../../services/adminService';

const TABS = ['Overview', 'Programs', 'Workouts', 'Users', 'Challenges', 'Reviews'] as const;
type Tab = (typeof TABS)[number];

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5';
const field = 'w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark]';
const small = 'text-xs font-bold px-3 py-2 rounded-lg';

function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => load().then(setData).catch((err: Error) => setError(err.message)), [load]);
  useEffect(() => {
    load().then(setData).catch((err: Error) => setError(err.message));
  }, [load]);
  return { data, error, reload };
}

function Overview() {
  const loader = useCallback(() => Promise.all([fetchStats(), fetchActivity()]), []);
  const { data, error } = useLoad(loader);
  if (error) return <p role="alert" className="text-red-300 text-sm">{error}</p>;
  if (!data) return <Loader2 className="w-5 h-5 animate-spin" />;
  const [stats, days] = data as [Stats, { date: string; signups: number; sessions: number }[]];
  const tiles: [string, number][] = [
    ['Members', stats.users], ['New this week', stats.newUsers], ['Active this week', stats.activeUsers], ['Workouts this week', stats.sessionsWeek],
    ['PLUS members', stats.plusMembers], ['Programs to review', stats.pendingPrograms], ['Catalog workouts', stats.workouts], ['Reviews', stats.reviews],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map(([label, value]) => (
          <div key={label} className={card}>
            <p className="text-xs font-bold uppercase tracking-wider text-white-70">{label}</p>
            <p className="text-3xl font-extrabold mt-1">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className={card}>
        <h3 className="font-bold mb-3">Last 30 days</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="signups" name="Sign-ups" fill="#00C4B4" />
              <Bar dataKey="sessions" name="Workouts logged" fill="#C6F432" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Programs() {
  const [status, setStatus] = useState('pending');
  const loader = useCallback(() => fetchAdminPrograms(status || undefined), [status]);
  const { data, error, reload } = useLoad(loader);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const decide = async (p: CatalogProgram, change: Parameters<typeof reviewProgram>[1]) => {
    await reviewProgram(p.slug, change);
    reload();
  };

  return (
    <div className="space-y-4">
      <label className="text-xs font-bold text-white-70 inline-flex items-center gap-2">Show
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${field} w-auto`}>
          <option value="pending">Waiting for review</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Drafts</option>
          <option value="">All</option>
        </select>
      </label>
      {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
      {!data ? <Loader2 className="w-5 h-5 animate-spin" /> : data.length === 0 ? <p className="text-sm text-white-70">Nothing here.</p> : (
        <ul className="space-y-3">
          {data.map((p) => (
            <li key={p.slug} className={`${card} space-y-3`}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-bold">{p.title} <span className="text-xs text-white-70 font-normal">· {p.status}{p.isPremium && ' · PLUS'}</span></p>
                  <p className="text-xs text-white-70">{p.level} · {p.goal} · {p.weeks} weeks · {p.days.length} sessions · by {p.creator?.name || 'FitGuide'}</p>
                </div>
                {p.status === 'published' && <Link href={`/programs/${p.slug}`} className="text-xs underline text-white-70">View</Link>}
              </div>
              <p className="text-sm text-white-70">{p.description}</p>
              <details className="text-sm">
                <summary className="cursor-pointer text-xs font-bold text-white-70">Schedule</summary>
                <ul className="mt-2 space-y-0.5">
                  {p.days.map((d) => <li key={`${d.week}:${d.day}`}>Week {d.week}, day {d.day}: {d.title} <span className="text-white-70">({d.workoutSlug})</span></li>)}
                </ul>
              </details>
              <div className="flex flex-wrap items-center gap-2">
                {p.status !== 'published' && <button onClick={() => decide(p, { status: 'published', reviewNote: null })} className={`${small} bg-lime-light text-noir-eclipse flex items-center gap-1`}><Check className="w-3.5 h-3.5" /> Publish</button>}
                {p.status === 'pending' && (
                  <>
                    <input value={notes[p.slug] || ''} onChange={(e) => setNotes({ ...notes, [p.slug]: e.target.value })} placeholder="What should change?" aria-label="Rejection note" className={`${field} max-w-xs`} />
                    <button onClick={() => decide(p, { status: 'rejected', reviewNote: notes[p.slug] || 'Please revise and resubmit.' })} className={`${small} bg-white/10 flex items-center gap-1`}><X className="w-3.5 h-3.5" /> Reject</button>
                  </>
                )}
                {p.status === 'published' && <button onClick={() => decide(p, { status: 'draft' })} className={`${small} bg-white/10`}>Unpublish</button>}
                <label className="text-xs font-bold flex items-center gap-1.5 ml-auto">
                  <input type="checkbox" checked={p.isPremium} onChange={(e) => decide(p, { isPremium: e.target.checked })} className="accent-lime-light" /> PLUS only
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const csv = (items: string[]) => items.join(', ');
const fromCsv = (text: string) => text.split(',').map((s) => s.trim()).filter(Boolean);
const emptyWorkout = (): AdminWorkout => ({
  slug: '', title: '', description: '', shortDescription: '', category: 'Strength', difficulty: 'Beginner', duration: 30, calories: null,
  intensity: 'Moderate', equipment: [], targetMuscles: [], benefits: [], tags: [], steps: [], isPublished: true, isPremium: false,
});

function WorkoutEditor({ initial, isNew, onDone }: { initial: AdminWorkout; isNew: boolean; onDone: () => void }) {
  const [w, setW] = useState<AdminWorkout>(initial);
  const [stepsText, setStepsText] = useState(initial.steps.map((s) => (s.duration ? `${s.instruction} | ${s.duration}` : s.instruction)).join('\n'));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const steps = stepsText.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [instruction, seconds] = line.split('|').map((s) => s.trim());
      return seconds && Number.isFinite(Number(seconds)) ? { instruction, duration: Number(seconds) } : { instruction };
    });
    try {
      await saveWorkout({ ...w, shortDescription: w.shortDescription || null, steps }, isNew);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const set = <K extends keyof AdminWorkout>(k: K, v: AdminWorkout[K]) => setW((prev) => ({ ...prev, [k]: v }));

  return (
    <form onSubmit={submit} className={`${card} grid md:grid-cols-2 gap-3`}>
      <h3 className="md:col-span-2 font-bold">{isNew ? 'New workout' : `Edit ${initial.title}`}</h3>
      <label className="text-xs font-bold text-white-70">Title<input required value={w.title} onChange={(e) => set('title', e.target.value)} className={`${field} mt-1`} /></label>
      <label className="text-xs font-bold text-white-70">Slug (URL)<input required disabled={!isNew} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={w.slug} onChange={(e) => set('slug', e.target.value)} className={`${field} mt-1 disabled:opacity-60`} /></label>
      <label className="md:col-span-2 text-xs font-bold text-white-70">Description<textarea required minLength={10} rows={3} value={w.description} onChange={(e) => set('description', e.target.value)} className={`${field} mt-1`} /></label>
      <label className="md:col-span-2 text-xs font-bold text-white-70">Short description<input value={w.shortDescription || ''} onChange={(e) => set('shortDescription', e.target.value)} maxLength={200} className={`${field} mt-1`} /></label>
      <label className="text-xs font-bold text-white-70">Category
        <select value={w.category} onChange={(e) => set('category', e.target.value)} className={`${field} mt-1`}>{CATALOG.WORKOUT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <label className="text-xs font-bold text-white-70">Difficulty
        <select value={w.difficulty} onChange={(e) => set('difficulty', e.target.value)} className={`${field} mt-1`}>{CATALOG.DIFFICULTIES.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <label className="text-xs font-bold text-white-70">Minutes<input type="number" min={1} max={300} required value={w.duration} onChange={(e) => set('duration', Number(e.target.value))} className={`${field} mt-1`} /></label>
      <label className="text-xs font-bold text-white-70">Calories (estimate)<input type="number" min={0} value={w.calories ?? ''} onChange={(e) => set('calories', e.target.value === '' ? null : Number(e.target.value))} className={`${field} mt-1`} /></label>
      <label className="text-xs font-bold text-white-70">Intensity
        <select value={w.intensity} onChange={(e) => set('intensity', e.target.value)} className={`${field} mt-1`}>{CATALOG.INTENSITIES.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <label className="text-xs font-bold text-white-70">Equipment (comma separated)<input value={csv(w.equipment)} onChange={(e) => set('equipment', fromCsv(e.target.value))} className={`${field} mt-1`} /></label>
      <label className="text-xs font-bold text-white-70">Target muscles<input value={csv(w.targetMuscles)} onChange={(e) => set('targetMuscles', fromCsv(e.target.value))} className={`${field} mt-1`} /></label>
      <label className="text-xs font-bold text-white-70">Tags<input value={csv(w.tags)} onChange={(e) => set('tags', fromCsv(e.target.value))} className={`${field} mt-1`} /></label>
      <label className="md:col-span-2 text-xs font-bold text-white-70">Steps, one per line (optionally &quot;| seconds&quot;)
        <textarea rows={6} value={stepsText} onChange={(e) => setStepsText(e.target.value)} className={`${field} mt-1 font-mono`} />
      </label>
      {error && <p role="alert" className="md:col-span-2 text-sm text-red-300">{error}</p>}
      <div className="md:col-span-2 flex gap-2">
        <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onDone} className="px-5 py-2.5 rounded-xl bg-white/10 font-bold text-sm">Cancel</button>
      </div>
    </form>
  );
}

function Workouts() {
  const [search, setSearch] = useState('');
  const loader = useCallback(() => fetchAdminWorkouts(search), [search]);
  const { data, error, reload } = useLoad(loader);
  const [editing, setEditing] = useState<{ workout: AdminWorkout; isNew: boolean } | null>(null);

  if (editing) return <WorkoutEditor initial={editing.workout} isNew={editing.isNew} onDone={() => { setEditing(null); reload(); }} />;
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workouts" aria-label="Search workouts" className={field} />
        <button onClick={() => setEditing({ workout: emptyWorkout(), isNew: true })} className={`${small} bg-lime-light text-noir-eclipse flex items-center gap-1 shrink-0`}><Plus className="w-3.5 h-3.5" /> New</button>
      </div>
      {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
      {!data ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <ul className="divide-y divide-white-30/10">
          {data.map((w) => (
            <li key={w.slug} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="flex-1 min-w-[200px]">
                <p className={`font-semibold text-sm ${w.isPublished ? '' : 'text-white-70 line-through'}`}>{w.title}</p>
                <p className="text-xs text-white-70">{w.category} · {w.difficulty} · {w.duration} min</p>
              </div>
              <label className="text-xs font-bold flex items-center gap-1.5"><input type="checkbox" checked={w.isPublished} onChange={(e) => setWorkoutFlags(w.slug, { isPublished: e.target.checked }).then(reload)} className="accent-lime-light" /> Published</label>
              <label className="text-xs font-bold flex items-center gap-1.5"><input type="checkbox" checked={w.isPremium} onChange={(e) => setWorkoutFlags(w.slug, { isPremium: e.target.checked }).then(reload)} className="accent-lime-light" /> PLUS</label>
              <button onClick={() => setEditing({ workout: w, isNew: false })} aria-label={`Edit ${w.title}`} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Users() {
  const [search, setSearch] = useState('');
  const loader = useCallback(() => fetchUsers(search), [search]);
  const { data, error, reload } = useLoad(loader);
  const { user: me } = useAuth();
  return (
    <div className="space-y-4">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" aria-label="Search users" className={field} />
      {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
      {!data ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <>
          <p className="text-xs text-white-70">{data.total} members</p>
          <ul className="divide-y divide-white-30/10">
            {data.users.map((u: AdminUser) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold text-sm">{u.name}</p>
                  <p className="text-xs text-white-70">{u.email} · joined {new Date(u.createdAt).toLocaleDateString()} · {u.sessions} workouts</p>
                </div>
                <select value={u.role} disabled={u.id === me?.id} aria-label={`Role for ${u.name}`} onChange={(e) => setUserRole(u.id, e.target.value as AdminUser['role']).then(reload)} className={`${field} w-auto`}>
                  <option value="user">Member</option>
                  <option value="creator">Creator</option>
                  <option value="admin">Admin</option>
                </select>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Challenges() {
  const [form, setForm] = useState({ title: '', description: '', metric: 'activeDays', startDate: '', endDate: '' });
  const [message, setMessage] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createOfficialChallenge(form);
      setMessage('Official challenge created. Everyone can see and join it on the Community page.');
      setForm({ title: '', description: '', metric: 'activeDays', startDate: '', endDate: '' });
    } catch (err) {
      setMessage((err as Error).message);
    }
  };
  return (
    <form onSubmit={submit} className={`${card} grid md:grid-cols-2 gap-3`}>
      <h3 className="md:col-span-2 font-bold">New official challenge</h3>
      <label className="md:col-span-2 text-xs font-bold text-white-70">Title<input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${field} mt-1`} /></label>
      <label className="md:col-span-2 text-xs font-bold text-white-70">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${field} mt-1`} /></label>
      <label className="text-xs font-bold text-white-70">Count
        <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} className={`${field} mt-1`}>
          <option value="activeDays">Active days</option><option value="minutes">Active minutes</option><option value="sessions">Workouts</option><option value="steps">Steps</option>
        </select>
      </label>
      <span />
      <label className="text-xs font-bold text-white-70">Starts<input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={`${field} mt-1`} /></label>
      <label className="text-xs font-bold text-white-70">Ends<input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`${field} mt-1`} /></label>
      {message && <p role="status" className="md:col-span-2 text-sm">{message}</p>}
      <button type="submit" className="md:col-span-2 justify-self-start px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Create</button>
    </form>
  );
}

function Reviews() {
  const { data, error, reload } = useLoad(fetchAdminReviews);
  if (error) return <p role="alert" className="text-red-300 text-sm">{error}</p>;
  if (!data) return <Loader2 className="w-5 h-5 animate-spin" />;
  return (
    <ul className="divide-y divide-white-30/10">
      {data.map((r: AdminReview) => (
        <li key={r.id} className="flex items-start gap-3 py-3">
          <div className="flex-1">
            <p className="text-sm font-semibold">{r.name} · {'★'.repeat(r.rating)} <span className="text-xs text-white-70 font-normal">{r.workoutSlug || 'general'} · {new Date(r.createdAt).toLocaleDateString()}</span></p>
            <p className="text-sm text-white-70">{r.comment}</p>
          </div>
          <button onClick={() => window.confirm('Delete this review?') && deleteReview(r.id).then(reload)} aria-label="Delete review" className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-red-300"><Trash2 className="w-4 h-4" /></button>
        </li>
      ))}
    </ul>
  );
}

/** /admin: the content and community management console. */
export function AdminView() {
  const { ready, user } = useAuth();
  const [tab, setTab] = useState<Tab>('Overview');

  if (!ready) return <Loader2 className="w-5 h-5 animate-spin" />;
  if (user?.role !== 'admin') return <p className="text-white-70">This page is for FitGuide admins.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3"><ShieldCheck className="w-8 h-8 text-lime-light" /> Admin</h1>
      <div role="tablist" aria-label="Admin sections" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`${small} ${tab === t ? 'bg-lime-light text-noir-eclipse' : 'bg-white/10'}`}>{t}</button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'Overview' && <Overview />}
        {tab === 'Programs' && <Programs />}
        {tab === 'Workouts' && <Workouts />}
        {tab === 'Users' && <Users />}
        {tab === 'Challenges' && <Challenges />}
        {tab === 'Reviews' && <Reviews />}
      </div>
    </div>
  );
}
