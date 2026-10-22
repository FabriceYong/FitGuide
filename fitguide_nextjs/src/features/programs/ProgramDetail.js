'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, Clock, Flame, Loader2, Play, Target, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../lib/api';
import { enrollInProgram, fetchEnrollments, leaveProgram, localToday } from '../../services/trainingService';
import { LEVEL_COLORS } from './ProgramCard';
import { scheduleHref } from '../progress/format';

export const STATUS_STYLES = {
    done: { label: 'Done', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    today: { label: 'Today', className: 'bg-lime-light/15 text-lime-light border-lime-light/40' },
    missed: { label: 'Missed', className: 'bg-red-500/10 text-red-300 border-red-500/30' },
    upcoming: { label: 'Upcoming', className: 'bg-white/5 text-white-70 border-white-30/20' },
};

export const formatDate = (ymd) => new Date(`${ymd}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export const playHref = (enrollment, day) => `/workouts/${day.workoutSlug}/play?${new URLSearchParams({
    enrollment: enrollment.id, week: String(day.week), day: String(day.day), program: enrollment.programSlug,
})}`;

/**
 * Program page body: overview, enrollment controls and the week-by-week
 * schedule. Rendered on the server with the catalog data; the signed-in
 * user's enrollment is loaded in the browser and overlaid on the schedule.
 */
export function ProgramDetail({ program, workouts }) {
    const { ready, hasAccount } = useAuth();
    const [enrollments, setEnrollments] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [conflict, setConflict] = useState(null);
    const [startDate, setStartDate] = useState('');

    const load = useCallback(async () => {
        try {
            const data = await fetchEnrollments();
            setEnrollments(data.enrollments);
        } catch (err) {
            setError(err.message);
        }
    }, []);

    useEffect(() => {
        setStartDate(localToday());
        if (ready && hasAccount) load();
    }, [ready, hasAccount, load]);

    const active = enrollments?.find((e) => e.status === 'active') || null;
    const mine = active?.programSlug === program.slug ? active : null;
    const scheduleByKey = new Map((mine?.schedule || []).map((d) => [`${d.week}:${d.day}`, d]));

    const enroll = async (replace = false) => {
        setBusy(true);
        setError(null);
        try {
            await enrollInProgram(program.slug, { replace, startDate: startDate || localToday() });
            setConflict(null);
            await load();
        } catch (err) {
            if (err instanceof ApiError && err.data?.code === 'ACTIVE_ENROLLMENT') setConflict(err.message);
            else setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const leave = async () => {
        if (!window.confirm(`Leave ${program.title}? Your completed sessions stay in your history.`)) return;
        setBusy(true);
        setError(null);
        try {
            await leaveProgram(mine.id);
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const color = LEVEL_COLORS[program.level] || '#00C4B4';
    const weeks = Array.from({ length: program.weeks }, (_, i) => i + 1);

    return (
        <main id="main" className="max-w-[1100px] mx-auto px-4 md:px-8 py-10 space-y-8">
            {/* Overview */}
            <section className="space-y-4">
                <Link href="/programs" className="text-xs font-bold uppercase tracking-wider text-white-70 hover:text-white">← All programs</Link>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ backgroundColor: `${color}20`, color }}>{program.level}</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 text-white-70">{program.goal}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold">{program.title}</h1>
                {program.createdBy && <p className="text-sm text-white-70">By {program.createdBy}, FitGuide creator</p>}
                <p className="text-white-70 max-w-3xl leading-relaxed">{program.description}</p>
                <div className="flex flex-wrap gap-5 text-sm text-white-70">
                    <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />{program.weeks} weeks</span>
                    <span className="flex items-center gap-1.5"><Target className="w-4 h-4" />{program.daysPerWeek} sessions a week</span>
                    <span className="flex items-center gap-1.5"><Check className="w-4 h-4" />{program.days.length} sessions in total</span>
                </div>
            </section>

            {/* Enrollment */}
            <section className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 space-y-4">
                {!ready || (hasAccount && enrollments === null && !error) ? (
                    <p className="flex items-center gap-2 text-white-70 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading your programs…</p>
                ) : !hasAccount ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-white-70 text-sm">Sign in to follow this program and track each session.</p>
                        <Link href="/" className="px-5 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Sign in</Link>
                    </div>
                ) : mine ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-lime-light">You&apos;re following this program</p>
                                <p className="text-sm text-white-70 mt-1">
                                    Week {mine.currentWeek} of {program.weeks} · started {formatDate(mine.startDate)}
                                    {mine.adherencePct != null && <> · {mine.adherencePct}% of scheduled sessions done</>}
                                </p>
                            </div>
                            <button onClick={leave} disabled={busy} className="flex items-center gap-1.5 text-xs font-bold text-red-300 hover:text-red-200">
                                <X className="w-4 h-4" /> Leave program
                            </button>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-white-70 mb-1.5">
                                <span>{mine.completedCount} of {mine.totalDays} sessions</span>
                                <span>{mine.percentComplete}%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-lime-light transition-all" style={{ width: `${mine.percentComplete}%` }} />
                            </div>
                        </div>
                        {mine.nextDay && (
                            <div className="flex flex-wrap items-center justify-between gap-4 bg-noir-eclipse/60 rounded-xl p-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white-70">Next up · {formatDate(mine.nextDay.date)}</p>
                                    <p className="font-bold mt-0.5">Week {mine.nextDay.week}, day {mine.nextDay.day}: {mine.nextDay.title}</p>
                                </div>
                                <Link href={playHref(mine, mine.nextDay)} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">
                                    <Play className="w-4 h-4" /> Start session
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {active && (
                            <p className="text-sm text-white-70">
                                You&apos;re currently following <Link href={scheduleHref(active)} className="text-white underline">{active.programTitle}</Link>.
                            </p>
                        )}
                        <div className="flex flex-wrap items-end gap-4">
                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-wider text-white-70">Start date</span>
                                <input
                                    type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                    className="mt-1.5 block bg-noir-eclipse border border-white-30/20 rounded-xl px-4 py-2.5 text-white [color-scheme:dark]"
                                />
                            </label>
                            <button onClick={() => enroll(false)} disabled={busy || !startDate} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-60">
                                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Start this program
                            </button>
                        </div>
                        {conflict && (
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                                <p className="text-sm text-amber-200">{conflict}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setConflict(null)} className="px-4 py-2 rounded-lg text-sm font-bold bg-white/10">Cancel</button>
                                    <button onClick={() => enroll(true)} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-400 text-noir-eclipse">Switch program</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {error && <p className="flex items-center gap-2 text-sm text-red-300"><AlertTriangle className="w-4 h-4" /> {error}</p>}
            </section>

            {/* Schedule */}
            <section className="space-y-6">
                <h2 className="text-xl font-extrabold">Schedule</h2>
                {weeks.map((week) => (
                    <div key={week} className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white-70">Week {week}</h3>
                        <ul className="space-y-2">
                            {program.days.filter((d) => d.week === week).map((d) => {
                                const scheduled = scheduleByKey.get(`${d.week}:${d.day}`);
                                const status = scheduled ? STATUS_STYLES[scheduled.status] : null;
                                const workout = workouts[d.workoutSlug];
                                return (
                                    <li key={`${d.week}:${d.day}`} className="flex flex-wrap items-center gap-4 bg-obsidian-wave border border-white-30/10 rounded-xl px-4 py-3">
                                        <div className="w-24 shrink-0">
                                            <p className="text-sm font-bold">Day {d.day}</p>
                                            {scheduled && <p className="text-[11px] text-white-70">{formatDate(scheduled.date)}</p>}
                                        </div>
                                        <div className="flex-1 min-w-[180px]">
                                            <Link href={`/workouts/${d.workoutSlug}`} className="font-semibold hover:text-lime-light">{d.title}</Link>
                                            <div className="flex flex-wrap gap-3 text-[11px] text-white-70 mt-0.5">
                                                {workout && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{workout.duration} min</span>}
                                                {workout?.calories ? <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{workout.calories} kcal</span> : null}
                                                {workout && <span>{workout.category}</span>}
                                            </div>
                                            {d.notes && <p className="text-xs text-white-70 mt-1 italic">{d.notes}</p>}
                                        </div>
                                        {status && <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${status.className}`}>{status.label}</span>}
                                        {mine && scheduled && scheduled.status !== 'done' && (
                                            <Link href={playHref(mine, scheduled)} aria-label={`Start week ${d.week} day ${d.day}`} className="w-9 h-9 rounded-full bg-white/10 hover:bg-lime-light hover:text-noir-eclipse flex items-center justify-center transition-colors">
                                                <Play className="w-4 h-4" />
                                            </Link>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </section>
        </main>
    );
}
