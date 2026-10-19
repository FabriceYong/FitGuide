'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
    Activity, AlertTriangle, CalendarDays, Clock, Dumbbell, Flame, Loader2, Play, Ruler, Scale, Trash2, Trophy, Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { deleteBodyMetric, deleteSession, fetchBodyMetrics, fetchProgressSummary, localToday, logBodyMetric } from '../../services/trainingService';
import { playHref } from '../programs/ProgramDetail';
import { formatDateTime, formatDay, formatRecord } from './format';

const ACCENT = '#00C4B4';

const MEASUREMENTS = [
    { key: 'weightKg', label: 'Weight', unit: 'kg', step: '0.1' },
    { key: 'bodyFatPct', label: 'Body fat', unit: '%', step: '0.1' },
    { key: 'waistCm', label: 'Waist', unit: 'cm', step: '0.5' },
    { key: 'hipsCm', label: 'Hips', unit: 'cm', step: '0.5' },
    { key: 'chestCm', label: 'Chest', unit: 'cm', step: '0.5' },
    { key: 'armCm', label: 'Arm', unit: 'cm', step: '0.5' },
    { key: 'thighCm', label: 'Thigh', unit: 'cm', step: '0.5' },
];

/**
 * The Progress page: everything here comes from the user's logged sessions,
 * program enrollment and body metrics.
 */
export function ProgressView() {
    const { ready, hasAccount, updateUser } = useAuth();
    const [data, setData] = useState(null);
    const [metrics, setMetrics] = useState([]);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        try {
            setError(null);
            const [progress, body] = await Promise.all([fetchProgressSummary(), fetchBodyMetrics()]);
            setData(progress);
            setMetrics(body.metrics);
        } catch (err) {
            setError(err.message);
        }
    }, []);

    useEffect(() => {
        if (ready && hasAccount) load();
    }, [ready, hasAccount, load]);

    if (!ready) return <Loading />;
    if (!hasAccount) {
        return (
            <div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-8 text-center space-y-4">
                <Activity className="w-10 h-10 text-lime-light mx-auto" />
                <h1 className="text-2xl font-extrabold text-white">Track your progress</h1>
                <p className="text-white-70 max-w-md mx-auto">
                    Create an account to save your workouts and see your streaks, personal records and body measurements over time.
                </p>
                <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Sign in or create an account</Link>
            </div>
        );
    }
    if (error && !data) {
        return (
            <div className="bg-obsidian-wave border border-red-500/30 rounded-2xl p-6 flex items-center justify-between gap-4">
                <p className="flex items-center gap-2 text-red-300"><AlertTriangle className="w-5 h-5" /> {error}</p>
                <button onClick={load} className="px-4 py-2 rounded-lg bg-white/10 text-sm font-bold text-white">Retry</button>
            </div>
        );
    }
    if (!data) return <Loading />;

    const { summary, recentSessions } = data;
    const removeSession = async (id) => {
        if (!window.confirm('Delete this session from your history?')) return;
        try {
            await deleteSession(id);
            await load();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="space-y-8 pb-10 text-left text-white">
            <h1 className="text-3xl font-extrabold">Your Progress</h1>
            {error && <p className="flex items-center gap-2 text-sm text-red-300"><AlertTriangle className="w-4 h-4" /> {error}</p>}

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
                <WeeklyChart days={summary.days.slice(-7)} />
                <ProgramCardPanel enrollment={summary.activeEnrollment} />
            </div>

            <ActivityCalendar days={summary.days} />

            <div className="grid gap-6 lg:grid-cols-2">
                <PersonalRecords records={summary.personalRecords} />
                <RecentSessions sessions={recentSessions} onDelete={removeSession} />
            </div>

            <BodyMetrics
                body={summary.body}
                metrics={metrics}
                onSaved={async (user) => {
                    if (user) updateUser(user);
                    await load();
                }}
                onDelete={async (id) => {
                    await deleteBodyMetric(id);
                    await load();
                }}
            />
        </div>
    );
}

const Loading = () => (
    <div className="flex items-center gap-2 text-white-70 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Loading your progress…</div>
);

const Panel = ({ title, icon: Icon, action, children, className = '' }) => (
    <section className={`bg-obsidian-wave border border-white-30/10 rounded-[24px] p-6 ${className}`}>
        <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="flex items-center gap-2 text-base font-bold">{Icon && <Icon className="w-5 h-5 text-lime-light" />}{title}</h2>
            {action}
        </div>
        {children}
    </section>
);

function StatTiles({ summary }) {
    const { thisWeek, streak, totals } = summary;
    const tiles = [
        { label: 'Sessions this week', value: thisWeek.sessions, sub: `${thisWeek.activeDays} active day${thisWeek.activeDays === 1 ? '' : 's'}`, icon: Dumbbell, color: '#00C4B4' },
        { label: 'Minutes this week', value: thisWeek.minutes, sub: `${thisWeek.calories} kcal`, icon: Clock, color: '#3E25F5' },
        {
            label: 'Day streak', value: streak.current,
            sub: streak.current && !streak.trainedToday ? 'Train today to keep it' : `Best: ${streak.longest}`,
            icon: Zap, color: '#FB923C',
        },
        { label: 'Total sessions', value: totals.sessions, sub: `${totals.minutes} min · ${totals.calories} kcal`, icon: Flame, color: '#C084FC' },
    ];
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {tiles.map(({ label, value, sub, icon: Icon, color }) => (
                <div key={label} className="bg-obsidian-wave p-4 rounded-[20px] border border-white-30/10 flex flex-col justify-between min-h-32 gap-3">
                    <div className="p-1.5 rounded-lg bg-noir-eclipse w-fit" style={{ color }}><Icon className="w-5 h-5" /></div>
                    <div>
                        <div className="text-2xl font-bold leading-tight">{value}</div>
                        <div className="text-xs text-white-70">{label}</div>
                        <div className="text-[11px] text-white-30 mt-0.5">{sub}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function WeeklyChart({ days }) {
    const max = Math.max(30, ...days.map((d) => d.minutes));
    return (
        <Panel title="Weekly Activity" icon={Activity} action={<span className="text-xs text-white-30">Last 7 days · minutes</span>}>
            <div className="flex justify-between items-end h-44 px-2">
                {days.map((d, i) => {
                    const isToday = i === days.length - 1;
                    return (
                        <div key={d.date} className="flex flex-col items-center flex-1" title={`${formatDay(d.date)}: ${d.minutes} min, ${d.sessions} session${d.sessions === 1 ? '' : 's'}`}>
                            <span className="text-[10px] text-white-70 mb-1 h-4">{d.minutes || ''}</span>
                            <div
                                className="w-4 rounded-full transition-all duration-500"
                                style={{
                                    height: `${Math.max(4, (d.minutes / max) * 120)}px`,
                                    backgroundColor: d.minutes ? ACCENT : 'rgba(255,255,255,0.08)',
                                    opacity: d.minutes && !isToday ? 0.7 : 1,
                                }}
                            />
                            <span className={`text-[11px] mt-3 ${isToday ? 'text-white font-bold' : 'text-white-30'}`}>
                                {formatDay(d.date, { weekday: 'short' })}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}

function ProgramCardPanel({ enrollment }) {
    if (!enrollment) {
        return (
            <Panel title="Program" icon={CalendarDays}>
                <p className="text-sm text-white-70 mb-4">Follow a multi-week program to get a schedule and track how consistently you stick to it.</p>
                <Link href="/programs" className="inline-block px-4 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Browse programs</Link>
            </Panel>
        );
    }
    const e = enrollment;
    return (
        <Panel title={e.programTitle} icon={CalendarDays} action={<Link href={`/programs/${e.programSlug}`} className="text-xs font-bold text-lime-light">View plan</Link>}>
            <div className="grid grid-cols-3 gap-3 text-center mb-5">
                <MiniStat value={`${e.currentWeek}/${e.weeks}`} label="Week" />
                <MiniStat value={`${e.completedCount}/${e.totalDays}`} label="Sessions" />
                <MiniStat value={e.adherencePct == null ? '–' : `${e.adherencePct}%`} label="On schedule" />
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-5">
                <div className="h-full bg-lime-light rounded-full" style={{ width: `${e.percentComplete}%` }} />
            </div>
            {e.nextDay ? (
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white-70">Next · {formatDay(e.nextDay.date)}</p>
                        <p className="font-semibold text-sm">{e.nextDay.title}</p>
                    </div>
                    <Link href={playHref(e, e.nextDay)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">
                        <Play className="w-4 h-4" /> Start
                    </Link>
                </div>
            ) : <p className="text-sm text-white-70">All sessions done. 🎉</p>}
        </Panel>
    );
}

const MiniStat = ({ value, label }) => (
    <div className="bg-noir-eclipse/60 rounded-xl py-3">
        <div className="text-lg font-bold">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-white-70">{label}</div>
    </div>
);

/** 12-week calendar, one column per week (Monday first), shaded by minutes trained. */
function ActivityCalendar({ days }) {
    const firstWeekday = (new Date(`${days[0].date}T12:00:00`).getDay() + 6) % 7; // Monday = 0
    const cells = [...Array(firstWeekday).fill(null), ...days];
    const shade = (d) => {
        if (!d) return 'transparent';
        if (!d.sessions) return 'rgba(255,255,255,0.06)';
        if (d.minutes >= 45) return ACCENT;
        if (d.minutes >= 20) return `${ACCENT}AA`;
        return `${ACCENT}66`;
    };
    const activeDays = days.filter((d) => d.sessions).length;
    return (
        <Panel title="Activity" icon={CalendarDays} action={<span className="text-xs text-white-30">{activeDays} active days in 12 weeks</span>}>
            <div className="overflow-x-auto">
                <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
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
            <div className="flex items-center gap-2 mt-4 text-[11px] text-white-30">
                <span>Less</span>
                {['rgba(255,255,255,0.06)', `${ACCENT}66`, `${ACCENT}AA`, ACCENT].map((c) => <span key={c} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: c }} />)}
                <span>More</span>
            </div>
        </Panel>
    );
}

function PersonalRecords({ records }) {
    return (
        <Panel title="Personal Records" icon={Trophy}>
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
                                <p className="text-[11px] text-white-30">{formatDay(r.achievedAt.slice(0, 10))} · {r.workoutTitle}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-bold text-amber-300">{formatRecord(r)}</p>
                                {r.estimatedOneRepMaxKg && <p className="text-[11px] text-white-30">≈ {r.estimatedOneRepMaxKg} kg 1RM</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function RecentSessions({ sessions, onDelete }) {
    return (
        <Panel title="Recent Sessions" icon={Dumbbell}>
            {sessions.length === 0 ? (
                <p className="text-sm text-white-70">Your saved workouts will appear here.</p>
            ) : (
                <ul className="divide-y divide-white-30/10">
                    {sessions.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                                <Link href={`/workouts/${s.workoutSlug}`} className="font-semibold text-sm hover:text-lime-light truncate block">{s.workoutTitle}</Link>
                                <p className="text-[11px] text-white-30">
                                    {formatDateTime(s.completedAt)} · {Math.round(s.durationSec / 60)} min · {s.calories} kcal
                                    {s.perceivedEffort ? ` · RPE ${s.perceivedEffort}` : ''}
                                    {s.status === 'partial' ? ' · partial' : ''}
                                    {s.enrollmentId ? ` · program W${s.programWeek}D${s.programDay}` : ''}
                                </p>
                            </div>
                            <button onClick={() => onDelete(s.id)} aria-label={`Delete ${s.workoutTitle} session`} className="p-2 rounded-lg text-white-30 hover:text-red-300 hover:bg-red-500/10">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function BodyMetrics({ body, metrics, onSaved, onDelete }) {
    const [form, setForm] = useState({ date: '', weightKg: '' });
    const [showMore, setShowMore] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => setForm((f) => ({ ...f, date: f.date || localToday() })), []);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const entry = { date: form.date };
            for (const m of MEASUREMENTS) {
                if (form[m.key] !== undefined && form[m.key] !== '') entry[m.key] = Number(form[m.key]);
            }
            const result = await logBodyMetric(entry);
            setForm({ date: form.date, weightKg: '' });
            await onSaved(result.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const chartData = body.weights.map((w) => ({ ...w, label: formatDay(w.date, { day: 'numeric', month: 'short' }) }));
    const fields = showMore ? MEASUREMENTS : MEASUREMENTS.slice(0, 1);

    return (
        <Panel title="Body" icon={Scale}>
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                        <div>
                            <span className="text-3xl font-bold">{body.latestWeight ? `${body.latestWeight.weightKg} kg` : '–'}</span>
                            {body.latestWeight && <span className="text-xs text-white-30 ml-2">{formatDay(body.latestWeight.date)}</span>}
                        </div>
                        {body.weightChangeKg != null && (
                            <span className={`text-sm font-bold ${body.weightChangeKg <= 0 ? 'text-emerald-400' : 'text-orange-300'}`}>
                                {body.weightChangeKg > 0 ? '+' : ''}{body.weightChangeKg} kg since {formatDay(body.weightChangeSince)}
                            </span>
                        )}
                    </div>
                    {chartData.length >= 2 ? (
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: '#131921', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                                        labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                                        formatter={(v) => [`${v} kg`, 'Weight']}
                                    />
                                    <Line type="monotone" dataKey="weightKg" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-sm text-white-70">Log your weight on two or more days to see a trend.</p>
                    )}

                    {Object.keys(body.latestMeasurements).some((k) => k !== 'weightKg') && (
                        <div className="flex flex-wrap gap-2">
                            {MEASUREMENTS.filter((m) => m.key !== 'weightKg' && body.latestMeasurements[m.key]).map((m) => (
                                <span key={m.key} className="px-3 py-1.5 rounded-full bg-noir-eclipse/60 text-xs">
                                    <span className="text-white-70">{m.label}</span> <span className="font-bold">{body.latestMeasurements[m.key].value} {m.unit}</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-5">
                    <form onSubmit={submit} className="space-y-3">
                        <h3 className="flex items-center gap-2 text-sm font-bold"><Ruler className="w-4 h-4 text-lime-light" /> Log measurements</h3>
                        <input
                            type="date" required value={form.date} max={localToday()}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                            aria-label="Date"
                            className="w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2.5 text-sm text-white [color-scheme:dark]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            {fields.map((m) => (
                                <label key={m.key} className="flex items-center gap-2 bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2">
                                    <input
                                        type="number" min="0" step={m.step} inputMode="decimal" aria-label={`${m.label} (${m.unit})`} placeholder={m.label}
                                        value={form[m.key] ?? ''} onChange={(e) => setForm({ ...form, [m.key]: e.target.value })}
                                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white-30"
                                    />
                                    <span className="text-xs text-white-30">{m.unit}</span>
                                </label>
                            ))}
                        </div>
                        <button type="button" onClick={() => setShowMore((v) => !v)} className="text-xs font-bold text-lime-light">
                            {showMore ? 'Fewer fields' : 'More measurements'}
                        </button>
                        {error && <p className="text-xs text-red-300">{error}</p>}
                        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
                        </button>
                    </form>

                    {metrics.length > 0 && (
                        <ul className="divide-y divide-white-30/10 max-h-56 overflow-y-auto">
                            {metrics.map((m) => (
                                <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                                    <span className="text-white-70 w-24 shrink-0">{formatDay(m.date)}</span>
                                    <span className="flex-1 truncate">
                                        {MEASUREMENTS.filter((f) => m[f.key] != null).map((f) => `${m[f.key]} ${f.unit}`).join(' · ')}
                                    </span>
                                    <button onClick={() => onDelete(m.id)} aria-label={`Delete entry for ${m.date}`} className="p-1.5 rounded-lg text-white-30 hover:text-red-300">
                                        <Trash2 className="w-3.5 h-3.5" />
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
