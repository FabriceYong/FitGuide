'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Award, Clock, Flame, Trophy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { logSession, newClientId } from '../../services/trainingService';
import { track } from '../../lib/analytics';
import { formatDay, formatRecord } from '../progress/format';
import { useUnits, weightIn, weightUnit } from '../../lib/units';
import { drawWorkoutCard } from '../../lib/shareCard';
import { localToday } from '../../services/trainingService';
import { ShareButton } from '../../components/ShareButton';
import { WorkoutFeedback } from './WorkoutFeedback';

const EFFORT_LABELS = { 1: 'Very easy', 3: 'Easy', 5: 'Moderate', 7: 'Hard', 9: 'Very hard', 10: 'Max effort' };

/**
 * End-of-workout sheet: review the session, rate the effort, add notes and
 * save it to the account. Guests see the summary but can't save.
 *
 * @param {object} props.draft  Session fields from the player (everything but effort/notes)
 * @param {'completed'|'partial'} props.status
 * @param {number} props.caloriesPerMinute  The workout's burn rate, for the estimate shown before saving
 * @param {(result?: object) => void} props.onDone     Leave the player
 * @param {() => void} [props.onResume]                Go back to the workout (partial only)
 */
export function SessionSummary({ draft, status, caloriesPerMinute, tintColor, onDone, onResume }) {
    const { hasAccount, user } = useAuth();
    const units = useUnits();
    const [minutes, setMinutes] = useState(Math.max(1, Math.round(draft.durationSec / 60)));
    const [effort, setEffort] = useState(null);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [saved, setSaved] = useState(null);
    // Kept across retries of Save, so a retry after a lost response isn't saved twice.
    const [clientId] = useState(newClientId);

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            const result = await logSession({
                ...draft,
                status,
                durationSec: Math.round(Number(minutes) * 60),
                perceivedEffort: effort,
                notes: notes.trim(),
                clientId,
            }, user.id);
            setSaved(result);
            track('workout_completed', { status, queued: Boolean(result.queued) });
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const loggedSets = draft.sets.filter((s) => s.reps != null || s.weightKg != null).length;
    const volumeKg = draft.sets.reduce((n, s) => n + (s.reps || 0) * (s.weightKg || 0), 0);

    const makeCard = () => drawWorkoutCard({
        title: draft.workoutTitle,
        date: formatDay(localToday(), { weekday: 'long', day: 'numeric', month: 'long' }),
        stats: [
            { label: 'Minutes', value: String(Math.round(Number(minutes) || 0)) },
            { label: 'Calories', value: String(saved?.session?.calories ?? Math.round((Number(minutes) || 0) * caloriesPerMinute)) },
            ...(loggedSets ? [{ label: loggedSets === 1 ? 'Set' : 'Sets', value: String(loggedSets) }] : []),
            ...(volumeKg > 0 ? [{ label: 'Lifted', value: `${Math.round(weightIn(volumeKg, units)).toLocaleString()} ${weightUnit(units)}` }] : []),
        ],
        records: (saved?.newRecords || []).map((r) => `${r.exerciseName} · ${formatRecord(r, units)}`),
    });

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0A0C10]/95 backdrop-blur-md">
            <div className="min-h-full flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-[#131921] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="text-center">
                        <div className="text-5xl mb-3">{status === 'completed' ? '🏆' : '💪'}</div>
                        <h2 className="text-3xl font-black" style={{ color: tintColor }}>
                            {status === 'completed' ? 'Workout Complete!' : 'Good effort'}
                        </h2>
                        <p className="text-sm text-white/60 mt-1">{draft.workoutTitle}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                        <Stat icon={<Clock className="w-5 h-5 mx-auto mb-1 text-blue-400" />} value={minutes} label="Minutes" />
                        <Stat icon={<Flame className="w-5 h-5 mx-auto mb-1 text-orange-400" />} value={saved?.session?.calories ?? Math.round((Number(minutes) || 0) * caloriesPerMinute)} label="Calories" />
                        <Stat icon={<Award className="w-5 h-5 mx-auto mb-1" style={{ color: tintColor }} />} value={`${draft.stepsCompleted}/${draft.totalSteps}`} label="Steps" />
                    </div>

                    {saved ? (
                        <div className="space-y-4">
                            <p className="flex items-center justify-center gap-2 text-emerald-400 font-semibold">
                                <Check className="w-5 h-5" /> Saved to your progress
                            </p>
                            {saved.queued && (
                                <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                                    You&apos;re offline. This session is saved on this device and will sync when you&apos;re back online.
                                </p>
                            )}
                            {saved.newRecords.length > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                                    <h3 className="flex items-center gap-2 font-bold text-amber-300 mb-2">
                                        <Trophy className="w-5 h-5" /> New personal record{saved.newRecords.length > 1 ? 's' : ''}
                                    </h3>
                                    <ul className="space-y-1 text-sm">
                                        {saved.newRecords.map((r) => (
                                            <li key={r.exerciseSlug || r.exerciseName} className="flex justify-between gap-4">
                                                <span className="text-white/80">{r.exerciseName}</span>
                                                <span className="font-bold text-white">{formatRecord(r, units)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {!saved.queued && saved.session?.id && <WorkoutFeedback sessionId={saved.session.id} color={tintColor} />}
                            <ShareButton make={makeCard} filename="fitguide-workout.png" text={`Just finished ${draft.workoutTitle} on FitGuide`} label="Share my workout" kind="workout" className="w-full" />
                            <div className="flex gap-3">
                                <Link href="/progress" className="flex-1 py-3.5 rounded-xl font-bold text-sm text-center bg-white/10 hover:bg-white/20 transition-all">
                                    View progress
                                </Link>
                                <button onClick={() => onDone(saved)} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-[#0A0C10]" style={{ backgroundColor: tintColor }}>
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : hasAccount ? (
                        <div className="space-y-5">
                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-wider text-white/50">Active time (minutes)</span>
                                <input
                                    type="number" min="1" max="1440" value={minutes}
                                    onChange={(e) => setMinutes(e.target.value)}
                                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                />
                            </label>

                            <fieldset>
                                <legend className="text-xs font-bold uppercase tracking-wider text-white/50">
                                    How hard was it? {effort && <span className="normal-case text-white/70">— {effort}/10 {EFFORT_LABELS[effort] || ''}</span>}
                                </legend>
                                <div className="mt-2 grid grid-cols-10 gap-1">
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                        <button
                                            key={n} type="button" onClick={() => setEffort(n)} aria-pressed={effort === n}
                                            className={`py-2 rounded-lg text-sm font-bold transition-all ${effort === n ? 'text-[#0A0C10]' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}
                                            style={effort === n ? { backgroundColor: tintColor } : undefined}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-wider text-white/50">Notes (optional)</span>
                                <textarea
                                    value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3}
                                    placeholder="How did it feel? Anything to change next time?"
                                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none"
                                />
                            </label>

                            {loggedSets > 0 && <p className="text-xs text-white/50">{loggedSets} logged set{loggedSets > 1 ? 's' : ''} will be saved with this session.</p>}

                            {error && (
                                <p className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
                                </p>
                            )}

                            <div className="flex gap-3">
                                {onResume ? (
                                    <button onClick={onResume} disabled={saving} className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 transition-all">
                                        Keep going
                                    </button>
                                ) : (
                                    <button onClick={() => onDone()} disabled={saving} className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 transition-all">
                                        Don&apos;t save
                                    </button>
                                )}
                                <button
                                    onClick={save} disabled={saving || !(Number(minutes) > 0)}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-sm text-[#0A0C10] flex items-center justify-center gap-2 disabled:opacity-60"
                                    style={{ backgroundColor: tintColor }}
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save session
                                </button>
                            </div>
                            {onResume && (
                                <button onClick={() => onDone()} disabled={saving} className="w-full text-xs text-white/50 hover:text-white/80">
                                    Exit without saving
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 text-center">
                            <p className="text-sm text-white/70">
                                You&apos;re browsing as a guest, so this session isn&apos;t saved. Create an account to track sessions, streaks and personal records.
                            </p>
                            <div className="flex gap-3">
                                {onResume && (
                                    <button onClick={onResume} className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 transition-all">
                                        Keep going
                                    </button>
                                )}
                                <button onClick={() => onDone()} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-[#0A0C10]" style={{ backgroundColor: tintColor }}>
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const Stat = ({ icon, value, label }) => (
    <div className="bg-white/5 border border-white/10 py-4 rounded-2xl">
        {icon}
        <span className="text-2xl font-black">{value}</span>
        <p className="text-xs text-white/40 mt-0.5">{label}</p>
    </div>
);
