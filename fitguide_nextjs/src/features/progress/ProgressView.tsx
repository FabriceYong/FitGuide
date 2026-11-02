'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Activity, AlertTriangle, Award, CalendarDays, Camera, PersonStanding, Clock, Dumbbell, Flame, Loader2, Lock, Play, Ruler, Scale, Trash2, TrendingDown, TrendingUp, Trophy, Zap, type LucideIcon,
} from 'lucide-react';
import type { MeasurementField } from '@fitguide/shared';
import { useAuth, type AuthUser } from '../../contexts/AuthContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  deleteBodyMetric, deleteSession, fetchBodyMetrics, fetchProgressSummary, localToday, logBodyMetric,
  type Achievement, type ActivityDay, type BodyMetric, type PersonalRecord, type ProgressSummary, type SessionRecord,
} from '../../services/trainingService';
import type { Plan } from '../../services/planService';
import { playHref } from '../programs/ProgramDetail';
import { useStartSignUp } from '../auth/AuthWrapper';
import { formatDateTime, formatDay, formatRecord, scheduleHref } from './format';
import { MusclesThisWeek } from './MusclesThisWeek';
import { WeekStreak } from './WeekStreak';
import { ProgressPhotos } from './ProgressPhotos';
import { measureFrom, measureText, measureUnit, useUnits, weightIn, weightText, weightUnit } from '../../lib/units';

const ACCENT = '#00C4B4';

// Shown and entered in the user's units (measureUnit); saved in kg and cm.
const MEASUREMENTS: { key: MeasurementField; label: string; step: string }[] = [
  { key: 'weightKg', label: 'Weight', step: '0.1' },
  { key: 'bodyFatPct', label: 'Body fat', step: '0.1' },
  { key: 'waistCm', label: 'Waist', step: '0.1' },
  { key: 'hipsCm', label: 'Hips', step: '0.1' },
  { key: 'chestCm', label: 'Chest', step: '0.1' },
  { key: 'armCm', label: 'Arm', step: '0.1' },
  { key: 'thighCm', label: 'Thigh', step: '0.1' },
];

type Data = { summary: ProgressSummary; recentSessions: SessionRecord[] };

/**
 * Progress: everything here comes from the user's logged sessions, program
 * enrollment and body metrics. Shown on /progress and in the dashboard.
 */
export function ProgressView() {
  const { ready, hasAccount, updateUser } = useAuth();
  const startSignUp = useStartSignUp();
  const [data, setData] = useState<Data | null>(null);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SessionRecord | null>(null);

  const load = useCallback(() => Promise.all([fetchProgressSummary(), fetchBodyMetrics()])
    .then(([progress, body]) => {
      setData(progress);
      setMetrics(body.metrics);
      setError(null);
    })
    .catch((err: Error) => setError(err.message)), []);

  useEffect(() => {
    if (ready && hasAccount) load();
  }, [ready, hasAccount, load]);

  if (!ready) return <Loading />;
  if (!hasAccount) {
    return (
      <div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-8 text-center space-y-4">
        <Activity className="w-10 h-10 text-lime-light mx-auto" aria-hidden="true" />
        <h1 className="text-2xl font-extrabold text-white">Track your progress</h1>
        <p className="text-white-70 max-w-md mx-auto">
          Create an account to save your workouts and see your streaks, personal records and body measurements over time.
        </p>
        {/* Guests only see this inside the dashboard (/progress sends signed-out visitors to sign in). */}
        <button type="button" onClick={startSignUp} className="px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">
          Create an account
        </button>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="bg-obsidian-wave border border-red-500/30 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <p role="alert" className="flex items-center gap-2 text-red-300"><AlertTriangle className="w-5 h-5" aria-hidden="true" /> {error}</p>
        <button type="button" onClick={load} className="px-4 py-2 rounded-lg bg-white/10 text-sm font-bold text-white">Retry</button>
      </div>
    );
  }
  if (!data) return <Loading />;

  const { summary, recentSessions } = data;

  return (
    <div className="space-y-8 pb-10 text-left text-white">
      <h1 className="text-3xl font-extrabold">Your progress</h1>
      {error && <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertTriangle className="w-4 h-4" aria-hidden="true" /> {error}</p>}

      <StatTiles summary={summary} />

      {summary.totals.sessions === 0 && (
        <div className="bg-obsidian-wave border border-lime-light/30 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-white-70">No sessions yet. Finish a workout and save it to start your streak.</p>
          <div className="flex gap-2">
            <Link href="/workouts" className="px-4 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Find a workout</Link>
            <Link href="/programs" className="px-4 py-2.5 rounded-xl bg-white/10 font-bold text-sm">Browse programs</Link>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyChart days={summary.days.slice(-7)} previous={summary.days.slice(-14, -7)} />
        <ProgramPanel enrollment={summary.activeEnrollment} />
      </div>

      <ActivityCalendar days={summary.days} />

      {summary.weekStreak && <Panel title="Week streak" icon={Zap}><WeekStreak streak={summary.weekStreak} /></Panel>}

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Panel title="Muscles this week" icon={PersonStanding}><MusclesThisWeek counts={summary.muscles?.regions || {}} week={summary.thisWeek} /></Panel>
        {summary.achievements?.length > 0 && <Achievements badges={summary.achievements} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PersonalRecords records={summary.personalRecords} />
        <RecentSessions sessions={recentSessions} onDelete={setConfirmDelete} />
      </div>

      <Panel title="Progress photos" icon={Camera}><ProgressPhotos /></Panel>

      <BodyMetrics
        body={summary.body}
        metrics={metrics}
        onSaved={async (user) => {
          if (user) updateUser(user);
          await load();
        }}
        onDelete={async (id) => {
          try {
            await deleteBodyMetric(id);
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not delete the entry.');
          }
        }}
      />

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this session?"
          message={`${confirmDelete.workoutTitle} on ${formatDateTime(confirmDelete.completedAt)} will be removed from your history, streaks and records.`}
          confirmText="Delete"
          danger
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteSession(confirmDelete.id).then(load).catch((err: Error) => setError(err.message));
          }}
        />
      )}
    </div>
  );
}

const Loading = () => (
  <p className="flex items-center gap-2 text-white-70 py-10" role="status"><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Loading your progress…</p>
);

function Panel({ title, icon: Icon, action, children }: { title: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-obsidian-wave border border-white-30/10 rounded-[24px] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-5">
        <h2 className="flex items-center gap-2 text-base font-bold">{Icon && <Icon className="w-5 h-5 text-lime-light" aria-hidden="true" />}{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatTiles({ summary }: { summary: ProgressSummary }) {
  const { thisWeek, weekStreak, totals } = summary;
  const tiles = [
    { label: 'Sessions this week', value: thisWeek.sessions, sub: `${thisWeek.activeDays} active day${thisWeek.activeDays === 1 ? '' : 's'}`, icon: Dumbbell, color: '#00C4B4' },
    { label: 'Minutes this week', value: thisWeek.minutes, sub: `${thisWeek.calories} kcal`, icon: Clock, color: '#8B7CF6' },
    {
      label: 'Week streak',
      value: weekStreak.weeks,
      sub: weekStreak.thisWeek.met ? 'This week done ✓' : `${weekStreak.thisWeek.activeDays} of ${weekStreak.goal} days this week`,
      icon: Zap,
      color: '#FB923C',
    },
    { label: 'Total sessions', value: totals.sessions, sub: `${totals.minutes} min · ${totals.calories} kcal`, icon: Flame, color: '#C084FC' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {tiles.map(({ label, value, sub, icon: Icon, color }) => (
        <div key={label} className="bg-obsidian-wave p-4 rounded-[20px] border border-white-30/10 flex flex-col justify-between min-h-32 gap-3">
          <div className="p-1.5 rounded-lg bg-noir-eclipse w-fit" style={{ color }}><Icon className="w-5 h-5" aria-hidden="true" /></div>
          <div>
            <div className="text-2xl font-bold leading-tight">{value}</div>
            <div className="text-xs text-white-70">{label}</div>
            <div className="text-[11px] text-white-70 mt-0.5">{sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Three round steps that cover the busiest day: 0 / 10 / 20 / 30, 0 / 20 / 40 / 60 and so on. */
function minuteTicks(peak: number) {
  const step = [10, 15, 20, 30, 45, 60, 90, 120].find((s) => s * 3 >= peak) ?? Math.ceil(peak / 3 / 60) * 60;
  return [0, step, step * 2, step * 3];
}

const workoutsLabel = (n: number) => `${n} workout${n === 1 ? '' : 's'}`;

/**
 * Minutes per day for the last 7 days: the week's total up top, compared with
 * the 7 days before, then one column per day on a light grid. Only the best
 * day carries its number; every day shows its details on hover or focus.
 */
function WeeklyChart({ days, previous }: { days: ActivityDay[]; previous: ActivityDay[] }) {
  const [active, setActive] = useState<number | null>(null);
  const total = days.reduce((n, d) => n + d.minutes, 0);
  const before = previous.reduce((n, d) => n + d.minutes, 0);
  const workouts = days.reduce((n, d) => n + d.sessions, 0);
  const peak = Math.max(0, ...days.map((d) => d.minutes));
  const peakIndex = peak ? days.map((d) => d.minutes).lastIndexOf(peak) : -1;
  const ticks = minuteTicks(peak);
  const top = ticks[ticks.length - 1];
  const change = total - before;
  const Trend = change > 0 ? TrendingUp : change < 0 ? TrendingDown : null;

  return (
    <Panel title="Weekly activity" icon={Activity} action={<span className="text-xs text-white-70">Last 7 days</span>}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1 mb-8">
        <p className="text-4xl font-extrabold leading-none">{total}<span className="text-base font-bold text-white-70 ml-1">min</span></p>
        <p className="flex items-center gap-1.5 text-sm text-white-70 pb-0.5">
          {Trend && <Trend className={`w-4 h-4 ${change > 0 ? 'text-lime-light' : 'text-amber-300'}`} aria-hidden="true" />}
          {!previous.length || (!before && !total) ? workoutsLabel(workouts)
            : change === 0 ? 'Same as the week before'
              : `${Math.abs(change)} min ${change > 0 ? 'more' : 'less'} than the week before`}
        </p>
      </div>

      <div className="flex gap-2" aria-hidden="true">
        <div className="relative w-7 h-40 shrink-0 text-[10px] text-white-70 tabular-nums">
          {ticks.map((t) => <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>{t}</span>)}
        </div>
        <div className="relative flex-1 h-40">
          {ticks.map((t) => <div key={t} className={`absolute inset-x-0 h-px ${t ? 'bg-white/10' : 'bg-white/25'}`} style={{ bottom: `${(t / top) * 100}%` }} />)}
          <div className="absolute inset-0 grid grid-cols-7">
            {days.map((d, i) => (
              <div key={d.date} className="relative flex flex-col items-center justify-end" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
                {i === peakIndex && active !== i && <span className="absolute text-[11px] font-bold text-white" style={{ bottom: `calc(${(d.minutes / top) * 100}% + 4px)` }}>{d.minutes}</span>}
                {d.minutes > 0 && (
                  <div
                    className={`w-full max-w-6 shrink-0 rounded-t-[4px] transition-[height,opacity] duration-500 ${active === null || active === i ? 'opacity-100' : 'opacity-50'}`}
                    style={{ height: `${(d.minutes / top) * 100}%`, backgroundColor: ACCENT }}
                  />
                )}
                {active === i && (
                  <div className={`absolute z-10 whitespace-nowrap rounded-lg bg-noir-eclipse border border-white-30/20 px-2.5 py-1.5 text-[11px] shadow-lg ${i < 2 ? 'left-0' : i > 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}
                    style={{ bottom: `calc(${(d.minutes / top) * 100}% + 6px)` }}>
                    <p className="font-bold">{formatDay(d.date)}</p>
                    <p className="text-white-70">{d.minutes ? `${d.minutes} min · ${workoutsLabel(d.sessions)}` : 'Rest day'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <div className="w-7 shrink-0" />
        <div className="flex-1 grid grid-cols-7">
          {days.map((d, i) => {
            const isToday = i === days.length - 1;
            return (
              <button
                key={d.date}
                type="button"
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(i)}
                // The name starts with the button's text ("Today" for today), for voice control.
                aria-label={`${isToday ? 'Today, ' : ''}${formatDay(d.date)}: ${d.minutes ? `${d.minutes} minutes, ${workoutsLabel(d.sessions)}` : 'rest day'}`}
                className={`py-1 text-[11px] rounded-md ${isToday ? 'text-white font-bold' : 'text-white-70'} ${active === i ? 'bg-white/5' : ''}`}
              >
                {isToday ? 'Today' : formatDay(d.date, { weekday: 'short' })}
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function ProgramPanel({ enrollment: e }: { enrollment: Plan | null }) {
  if (!e) {
    return (
      <Panel title="Program" icon={CalendarDays}>
        <p className="text-sm text-white-70 mb-4">Follow a program or build a personal plan to get a schedule and see how consistently you stick to it.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/plan" className="px-4 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Build my plan</Link>
          <Link href="/programs" className="px-4 py-2.5 rounded-xl bg-white/10 font-bold text-sm">Browse programs</Link>
        </div>
      </Panel>
    );
  }
  return (
    <Panel title={e.programTitle} icon={CalendarDays} action={<Link href={scheduleHref(e)} className="inline-block py-2 -my-2 text-xs font-bold text-lime-light">View schedule</Link>}>
      <div className="grid grid-cols-3 gap-3 text-center mb-5">
        <MiniStat value={`${e.currentWeek}/${e.weeks ?? '?'}`} label="Week" />
        <MiniStat value={`${e.completedCount}/${e.totalDays}`} label="Sessions" />
        <MiniStat value={e.adherencePct == null ? '–' : `${e.adherencePct}%`} label="On schedule" />
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-5" role="progressbar" aria-valuenow={e.percentComplete} aria-valuemin={0} aria-valuemax={100} aria-label="Program completed">
        <div className="h-full bg-lime-light rounded-full" style={{ width: `${e.percentComplete}%` }} />
      </div>
      {e.nextDay ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white-70">Next · {formatDay(e.nextDay.date)}</p>
            <p className="font-semibold text-sm">{e.nextDay.title}</p>
          </div>
          <Link href={playHref(e, e.nextDay)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">
            <Play className="w-4 h-4" aria-hidden="true" /> Start
          </Link>
        </div>
      ) : <p className="text-sm text-white-70">All sessions done.</p>}
    </Panel>
  );
}

const MiniStat = ({ value, label }: { value: string; label: string }) => (
  <div className="bg-noir-eclipse/60 rounded-xl py-3">
    <div className="text-lg font-bold">{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-white-70">{label}</div>
  </div>
);

/** 12-week calendar, one column per week (Monday first), shaded by minutes trained. */
function ActivityCalendar({ days }: { days: ActivityDay[] }) {
  const firstWeekday = (new Date(`${days[0].date}T12:00:00`).getDay() + 6) % 7; // Monday = 0
  const cells: (ActivityDay | null)[] = [...Array<null>(firstWeekday).fill(null), ...days];
  const shade = (d: ActivityDay | null) => {
    if (!d) return 'transparent';
    if (!d.sessions) return 'rgba(255,255,255,0.06)';
    if (d.minutes >= 45) return ACCENT;
    if (d.minutes >= 20) return `${ACCENT}AA`;
    return `${ACCENT}66`;
  };
  const activeDays = days.filter((d) => d.sessions).length;
  return (
    <Panel title="Activity" icon={CalendarDays} action={<span className="text-xs text-white-70">{activeDays} active days in 12 weeks</span>}>
      <div className="overflow-x-auto">
        <div className="grid grid-rows-7 grid-flow-col gap-1 w-max" role="img" aria-label={`Calendar of the last 12 weeks: ${activeDays} days with training`}>
          {cells.map((d, i) => (
            <div
              key={d?.date || `pad-${i}`}
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-[4px]"
              style={{ backgroundColor: shade(d) }}
              title={d ? `${formatDay(d.date)}: ${d.sessions ? `${d.sessions} session${d.sessions > 1 ? 's' : ''}, ${d.minutes} min` : 'rest'}` : undefined}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 text-[11px] text-white-70" aria-hidden="true">
        <span>Less</span>
        {['rgba(255,255,255,0.06)', `${ACCENT}66`, `${ACCENT}AA`, ACCENT].map((c) => <span key={c} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: c }} />)}
        <span>More</span>
      </div>
    </Panel>
  );
}

/** Badges earned (with when), then the rest with how far along you are. */
function Achievements({ badges }: { badges: Achievement[] }) {
  const earned = badges.filter((b) => b.earned);
  const ordered = [...earned, ...badges.filter((b) => !b.earned)];
  return (
    <Panel title="Achievements" icon={Award} action={<span className="text-xs text-white-70">{earned.length} of {badges.length}</span>}>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {ordered.map((b) => (
          <li key={b.id} className={`rounded-2xl p-3 border ${b.earned ? 'bg-amber-300/10 border-amber-300/40' : 'bg-noir-eclipse/60 border-white-30/10'}`}>
            {b.earned ? <Award className="w-5 h-5 text-amber-300" aria-hidden="true" /> : <Lock className="w-5 h-5 text-white-70" aria-hidden="true" />}
            <p className={`mt-2 text-sm font-bold ${b.earned ? 'text-white' : 'text-white-70'}`}>{b.title}</p>
            {b.earned ? (
              <p className="text-[11px] text-amber-300 mt-1">Earned {formatDay(b.earnedAt!.slice(0, 10))}</p>
            ) : (
              <>
                <p className="text-[11px] text-white-70 mt-1">{b.description}</p>
                <div className="mt-2 h-1 rounded-full bg-white/10" role="progressbar" aria-label={`${b.title}: ${b.progress.value} of ${b.progress.goal}`} aria-valuenow={b.progress.value} aria-valuemin={0} aria-valuemax={b.progress.goal}>
                  <div className="h-full rounded-full bg-amber-300" style={{ width: `${(b.progress.value / b.progress.goal) * 100}%` }} />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function PersonalRecords({ records }: { records: PersonalRecord[] }) {
  const units = useUnits();
  return (
    <Panel title="Personal records" icon={Trophy}>
      {records.length === 0 ? (
        <p className="text-sm text-white-70">
          Log reps or weights in the workout player (or hold a timed exercise like a plank) and your best efforts will show up here.
        </p>
      ) : (
        <ul className="divide-y divide-white-30/10">
          {records.slice(0, 10).map((r) => (
            <li key={r.exerciseSlug || r.exerciseName} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{r.exerciseName}</p>
                <p className="text-[11px] text-white-70">{formatDay(r.achievedAt.slice(0, 10))} · {r.workoutTitle}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-amber-300">{formatRecord(r, units)}</p>
                {r.estimatedOneRepMaxKg && <p className="text-[11px] text-white-70">≈ {weightText(r.estimatedOneRepMaxKg, units)} 1RM</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RecentSessions({ sessions, onDelete }: { sessions: SessionRecord[]; onDelete: (s: SessionRecord) => void }) {
  return (
    <Panel title="Recent sessions" icon={Dumbbell}>
      {sessions.length === 0 ? (
        <p className="text-sm text-white-70">Your saved workouts will appear here.</p>
      ) : (
        <ul className="divide-y divide-white-30/10">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <Link href={`/workouts/${s.workoutSlug}`} className="font-semibold text-sm hover:text-lime-light truncate block py-1 -my-1">{s.workoutTitle}</Link>
                <p className="text-[11px] text-white-70">
                  {formatDateTime(s.completedAt)} · {Math.round(s.durationSec / 60)} min{s.calories != null ? ` · ${s.calories} kcal` : ''}{s.avgHr ? ` · ${s.avgHr} bpm avg` : ''}
                  {s.perceivedEffort ? ` · RPE ${s.perceivedEffort}` : ''}
                  {s.status === 'partial' ? ' · partial' : ''}
                  {s.enrollmentId ? ` · program W${s.programWeek}D${s.programDay}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => onDelete(s)} aria-label={`Delete ${s.workoutTitle} session`} className="p-2 rounded-lg text-white-70 hover:text-red-300 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function BodyMetrics({ body, metrics, onSaved, onDelete }: {
  body: ProgressSummary['body'];
  metrics: BodyMetric[];
  onSaved: (user?: Partial<AuthUser>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  // Only rendered in the browser (after auth is ready), so the local date is safe here.
  const [form, setForm] = useState<Record<string, string>>(() => ({ date: localToday(), weightKg: '' }));
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const units = useUnits();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const entry: { date: string } & Partial<Record<MeasurementField, number>> = { date: form.date };
      for (const m of MEASUREMENTS) {
        if (form[m.key] !== undefined && form[m.key] !== '') entry[m.key] = measureFrom(m.key, Number(form[m.key]), units);
      }
      const result = await logBodyMetric(entry);
      setForm({ date: form.date, weightKg: '' });
      await onSaved(result.user as Partial<AuthUser> | undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const chartData = body.weights.map((w) => ({ ...w, weight: weightIn(w.weightKg, units), label: formatDay(w.date, { day: 'numeric', month: 'short' }) }));
  const fields = showMore ? MEASUREMENTS : MEASUREMENTS.slice(0, 1);
  const otherMeasurements = MEASUREMENTS.filter((m) => m.key !== 'weightKg' && body.latestMeasurements[m.key]);

  return (
    <Panel title="Body" icon={Scale}>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <span className="text-3xl font-bold">{body.latestWeight ? weightText(body.latestWeight.weightKg, units) : '–'}</span>
              {body.latestWeight && <span className="text-xs text-white-70 ml-2">{formatDay(body.latestWeight.date)}</span>}
            </div>
            {body.weightChangeKg != null && body.weightChangeSince && (
              <span className={`text-sm font-bold ${body.weightChangeKg <= 0 ? 'text-emerald-400' : 'text-orange-300'}`}>
                {body.weightChangeKg > 0 ? '+' : ''}{weightText(body.weightChangeKg, units)} since {formatDay(body.weightChangeSince)}
              </span>
            )}
          </div>
          {chartData.length >= 2 ? (
            <div className="h-56" role="img" aria-label={`Weight trend: ${chartData.length} weigh-ins`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#131921', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                    formatter={(v) => [`${v} ${weightUnit(units)}`, 'Weight']}
                  />
                  <Line type="monotone" dataKey="weight" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-white-70">Log your weight on two or more days to see a trend.</p>
          )}

          {otherMeasurements.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {otherMeasurements.map((m) => (
                <span key={m.key} className="px-3 py-1.5 rounded-full bg-noir-eclipse/60 text-xs">
                  <span className="text-white-70">{m.label}</span> <span className="font-bold">{measureText(m.key, body.latestMeasurements[m.key]!.value, units)}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <form onSubmit={submit} className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold"><Ruler className="w-4 h-4 text-lime-light" aria-hidden="true" /> Log measurements</h3>
            <input
              type="date"
              required
              value={form.date}
              max={localToday()}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              aria-label="Date"
              className="w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2.5 text-sm text-white [color-scheme:dark]"
            />
            <div className="grid grid-cols-2 gap-2">
              {fields.map((m) => (
                <label key={m.key} className="flex items-center gap-2 bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step={m.step}
                    inputMode="decimal"
                    aria-label={`${m.label} (${measureUnit(m.key, units)})`}
                    placeholder={m.label}
                    value={form[m.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [m.key]: e.target.value })}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white-70"
                  />
                  <span className="text-xs text-white-70">{measureUnit(m.key, units)}</span>
                </label>
              ))}
            </div>
            <button type="button" onClick={() => setShowMore((v) => !v)} className="self-start py-2 -my-2 text-xs font-bold text-lime-light">
              {showMore ? 'Fewer fields' : 'More measurements'}
            </button>
            {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Save
            </button>
          </form>

          {metrics.length > 0 && (
            <ul className="divide-y divide-white-30/10 max-h-56 overflow-y-auto">
              {metrics.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                  <span className="text-white-70 w-24 shrink-0">{formatDay(m.date)}</span>
                  <span className="flex-1 truncate">
                    {MEASUREMENTS.filter((f) => m[f.key] != null).map((f) => measureText(f.key, m[f.key]!, units)).join(' · ')}
                  </span>
                  <button type="button" onClick={() => onDelete(m.id)} aria-label={`Delete entry for ${formatDay(m.date)}`} className="p-1.5 rounded-lg text-white-70 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
