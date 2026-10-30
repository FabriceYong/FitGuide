'use client';

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Flame, Footprints, HeartPulse, Link2, Loader2, Moon, RefreshCw, Smartphone, Trash2, Unlink, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { localToday } from '../../services/trainingService';
import {
  addBloodPressure, BP_CATEGORIES, connectIntegration, deleteBloodPressure, disconnectIntegration, fetchHealth, fetchIntegrations,
  importHealthCsv, saveHealthDay, SOURCE_LABELS, syncIntegration, type HealthSummary, type Integration,
} from '../../services/healthService';

const RESULT_MESSAGES: Record<string, string> = {
  connected: 'connected. Your data is syncing.',
  denied: 'sign-in was cancelled.',
  expired: 'sign-in took too long. Please try again.',
  error: "couldn't be connected. Please try again.",
};

const hours = (minutes: number | null | undefined) => (minutes == null ? '—' : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`);
const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString());
const sourceNote = (sources: string[] | undefined) => (sources?.length ? ` · ${sources.map((s) => SOURCE_LABELS[s] || s).join(', ')}` : '');
// The phone may upload new numbers at any time: reload when the tab comes back, at most this often.
const REFRESH_ON_FOCUS_MS = 30_000;

/**
 * Steps, active calories, sleep, resting heart rate and blood pressure, with
 * wearable connections and imports. The mobile app uploads Apple Health /
 * Health Connect, so this shows the same numbers as the app.
 */
export function HealthPanel() {
  const { ready, hasAccount } = useAuth();
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [services, setServices] = useState<Integration[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ steps: '', sleepHours: '', restingHr: '' });
  const [bp, setBp] = useState({ systolic: '', diastolic: '', pulse: '' });

  const load = useCallback(() => Promise.all([fetchHealth(30), fetchIntegrations()]), []);
  const show = useCallback(([h, s]: [HealthSummary, Integration[]]) => {
    setHealth(h);
    setServices(s);
  }, []);
  const refresh = () => load().then(show).catch((err: Error) => setMessage(err.message));

  useEffect(() => {
    if (!ready || !hasAccount) return;
    load().then(show).catch((err: Error) => setMessage(err.message));
    let loadedAt = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - loadedAt < REFRESH_ON_FOCUS_MS) return;
      loadedAt = Date.now();
      load().then(show).catch(() => { /* keep showing what we have */ });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [ready, hasAccount, load, show]);

  // Coming back from a provider's sign-in page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const integration = params.get('integration');
    const result = params.get('result');
    if (!integration || !result) return;
    const name = integration.charAt(0).toUpperCase() + integration.slice(1);
    window.history.replaceState(null, '', window.location.pathname);
    // Defer so the message isn't set synchronously during the effect.
    queueMicrotask(() => setMessage(`${name} ${RESULT_MESSAGES[result] || RESULT_MESSAGES.error}`));
  }, []);

  const run = async (key: string, task: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    setMessage(null);
    try {
      await task();
      if (done) setMessage(done);
      await refresh();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const saveToday = (event: FormEvent) => {
    event.preventDefault();
    const values = {
      ...(form.steps && { steps: Number(form.steps) }),
      ...(form.sleepHours && { sleepMinutes: Math.round(Number(form.sleepHours) * 60) }),
      ...(form.restingHr && { restingHr: Number(form.restingHr) }),
    };
    run('save', () => saveHealthDay(localToday(), values), "Saved today's numbers.").then(() => setForm({ steps: '', sleepHours: '', restingHr: '' }));
  };

  const saveReading = (event: FormEvent) => {
    event.preventDefault();
    const reading = { systolic: Number(bp.systolic), diastolic: Number(bp.diastolic), ...(bp.pulse && { pulse: Number(bp.pulse) }) };
    run('bp', () => addBloodPressure(reading), 'Blood pressure saved.').then(() => setBp({ systolic: '', diastolic: '', pulse: '' }));
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const csv = await file.text();
    run('import', async () => {
      const result = await importHealthCsv(csv);
      setMessage(`Imported ${result.imported} day(s).${result.skipped ? ` Skipped ${result.skipped}: ${result.errors.slice(0, 3).join('; ')}` : ''}`);
    });
  };

  if (!ready || !hasAccount) return null;
  if (!health) return <p className="flex items-center gap-2 text-white-70 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading health data…</p>;

  const latestBp = health.bloodPressure.latest;
  const tiles = [
    { icon: Footprints, label: 'Steps today', value: fmt(health.today?.steps), sub: `7-day average ${fmt(health.weekAverage.steps)}${sourceNote(health.today?.sources)}` },
    { icon: Flame, label: 'Active calories today', value: health.today?.activeCalories != null ? `${fmt(health.today.activeCalories)} kcal` : '—', sub: `7-day average ${fmt(health.weekAverage.activeCalories)}` },
    { icon: Moon, label: 'Sleep last night', value: hours(health.today?.sleepMinutes), sub: `7-day average ${hours(health.weekAverage.sleepMinutes)}` },
    { icon: HeartPulse, label: 'Resting heart rate', value: health.latestRestingHr ? `${health.latestRestingHr.value} bpm` : '—', sub: health.latestRestingHr ? `on ${health.latestRestingHr.date}` : 'No reading yet' },
  ];
  const field = 'w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white';

  return (
    <section aria-labelledby="health-heading" className="space-y-6">
      <h2 id="health-heading" className="text-2xl font-extrabold">Health data</h2>
      {message && <p role="status" className="text-sm bg-white/5 border border-white-30/10 rounded-xl px-4 py-3">{message}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white-70 flex items-center gap-2"><Icon className="w-4 h-4 text-lime-light" /> {label}</p>
            <p className="text-3xl font-extrabold mt-2">{value}</p>
            <p className="text-xs text-white-70 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {health.days.some((d) => d.steps != null) && (
        <div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-3">Steps, last 30 days</h3>
          <div className="h-44" role="img" aria-label="Steps per day for the last 30 days">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={health.days} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8)} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8 }} formatter={(v) => [Number(v).toLocaleString(), 'Steps']} />
                <Bar dataKey="steps" fill="#00C4B4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-5 grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-lime-light" /> Blood pressure</h3>
          {latestBp ? (
            <div>
              <p className="text-3xl font-extrabold">{latestBp.systolic}/{latestBp.diastolic} <span className="text-base font-semibold text-white-70">mmHg</span></p>
              <p className={`text-sm font-bold ${BP_CATEGORIES[latestBp.category].className}`}>{BP_CATEGORIES[latestBp.category].label}</p>
              <p className="text-xs text-white-70 mt-1">
                {new Date(latestBp.measuredAt).toLocaleString()}{latestBp.pulse ? ` · pulse ${latestBp.pulse}` : ''}{sourceNote([latestBp.source])}
              </p>
            </div>
          ) : (
            <p className="text-sm text-white-70">No readings yet. Enter one from your cuff, or sync a cuff that writes to Apple Health or Health Connect through the FitGuide app.</p>
          )}
          {health.bloodPressure.readings.length > 1 && (
            <ul className="text-sm divide-y divide-white-30/10" aria-label="Recent blood pressure readings">
              {health.bloodPressure.readings.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <span><span className="font-bold">{r.systolic}/{r.diastolic}</span> <span className="text-xs text-white-70">{new Date(r.measuredAt).toLocaleDateString()}{sourceNote([r.source])}</span></span>
                  <span className="flex items-center gap-2">
                    <span className={`text-xs font-bold whitespace-nowrap ${BP_CATEGORIES[r.category].className}`}>{BP_CATEGORIES[r.category].label.split(':')[0]}</span>
                    {r.source === 'manual' && (
                      <button type="button" onClick={() => run('bp-del', () => deleteBloodPressure(r.id))} disabled={busy !== null} aria-label={`Delete reading ${r.systolic}/${r.diastolic}`} className="p-1 text-white-70 hover:text-red-300">
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form onSubmit={saveReading} className="space-y-3">
          <h3 className="font-bold">Add a reading</h3>
          {/* Bottom-aligned, so a label that wraps on a phone doesn't push its box out of line. */}
          <div className="grid grid-cols-3 gap-3 items-end">
            <label className="text-xs font-bold text-white-70">Systolic (top)
              <input type="number" min={60} max={260} required value={bp.systolic} onChange={(e) => setBp({ ...bp, systolic: e.target.value })} className={`${field} mt-1`} />
            </label>
            <label className="text-xs font-bold text-white-70">Diastolic (bottom)
              <input type="number" min={30} max={160} required value={bp.diastolic} onChange={(e) => setBp({ ...bp, diastolic: e.target.value })} className={`${field} mt-1`} />
            </label>
            <label className="text-xs font-bold text-white-70">Pulse
              <input type="number" min={25} max={220} value={bp.pulse} onChange={(e) => setBp({ ...bp, pulse: e.target.value })} className={`${field} mt-1`} />
            </label>
          </div>
          <button type="submit" disabled={busy !== null || !(bp.systolic && bp.diastolic)} className="px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-50">
            {busy === 'bp' ? 'Saving…' : 'Save reading'}
          </button>
          <p className="text-xs text-white-70">FitGuide isn&apos;t a medical device. Use a validated upper-arm cuff, and talk to a doctor about readings that worry you.</p>
        </form>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold">Connected services</h3>
          <ul className="space-y-3">
            {services.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-white-70">
                    {s.description}
                    {s.connected && s.lastSyncAt && <> · synced {new Date(s.lastSyncAt).toLocaleString()}</>}
                  </p>
                  {s.lastError && <p className="text-xs text-red-300">{s.lastError}</p>}
                </div>
                {!s.available ? (
                  <span className="text-xs text-white-70">Not available on this server</span>
                ) : s.connected ? (
                  <div className="flex gap-2">
                    <button onClick={() => run(`sync-${s.id}`, () => syncIntegration(s.id), `${s.name} synced.`)} disabled={busy !== null} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15">
                      {busy === `sync-${s.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync
                    </button>
                    <button onClick={() => window.confirm(`Disconnect ${s.name}? Data already imported stays.`) && run(`off-${s.id}`, () => disconnectIntegration(s.id))} disabled={busy !== null} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15">
                      <Unlink className="w-3.5 h-3.5" /> Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => run(`on-${s.id}`, async () => { window.location.assign(await connectIntegration(s.id)); })}
                    disabled={busy !== null}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-lime-light text-noir-eclipse"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Connect
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-white-70 flex gap-2">
            <Smartphone className="w-4 h-4 shrink-0 text-lime-light" aria-hidden="true" />
            <span>
              Apple Health and Health Connect have no web connection: open the FitGuide app on your phone and connect
              them there, and your steps, calories, heart rate and blood pressure show up here too. Or export a CSV
              (columns: date, steps, resting_hr, sleep_hours, active_calories) and import it below.
            </span>
          </p>
          <label className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 cursor-pointer">
            {busy === 'import' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Import CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={importFile} />
          </label>
        </div>

        <form onSubmit={saveToday} className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold">Enter today&apos;s numbers</h3>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-bold text-white-70">Steps
              <input type="number" min={0} max={100000} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} className={`${field} mt-1`} />
            </label>
            <label className="text-xs font-bold text-white-70">Sleep (hours)
              <input type="number" min={0} max={24} step={0.25} value={form.sleepHours} onChange={(e) => setForm({ ...form, sleepHours: e.target.value })} className={`${field} mt-1`} />
            </label>
            <label className="text-xs font-bold text-white-70">Resting HR
              <input type="number" min={25} max={220} value={form.restingHr} onChange={(e) => setForm({ ...form, restingHr: e.target.value })} className={`${field} mt-1`} />
            </label>
          </div>
          <button type="submit" disabled={busy !== null || !(form.steps || form.sleepHours || form.restingHr)} className="px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-50">
            {busy === 'save' ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </section>
  );
}
