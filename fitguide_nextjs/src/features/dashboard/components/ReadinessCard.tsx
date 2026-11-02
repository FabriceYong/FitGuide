'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Check, Gauge, Loader2 } from 'lucide-react';
import { checkInReadiness, fetchReadiness, swapPlanDay, type Readiness } from '../../../services/readinessService';

const ENERGY = ['Drained', 'Low', 'OK', 'Good', 'Great'];
const SORENESS = ['None', 'A little', 'Sore', 'Quite', 'Very'];
const BAND_COLORS = { push: '#10B981', steady: '#00C4B4', easy: '#F59E0B' } as const;

function Scale({ label, options, value, onChange }: { label: string; options: string[]; value: number | null; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-1.5">
      <p className="text-xs font-bold text-white-70">{label}</p>
      <div className="grid grid-cols-5 gap-1.5">
        {options.map((o, i) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === i + 1}
            onClick={() => onChange(i + 1)}
            className={`py-2 rounded-lg text-xs font-bold ${value === i + 1 ? 'bg-lime-light text-noir-eclipse' : 'bg-white/10 hover:bg-white/15'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The score as a ring, coloured by band. */
function Ring({ score, color }: { score: number; color: string }) {
  const r = 34;
  const length = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="w-20 h-20 shrink-0" role="img" aria-label={`Readiness ${score} out of 100`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score / 100) * length} ${length}`} transform="rotate(-90 40 40)" />
      <text x="40" y="47" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">{score}</text>
    </svg>
  );
}

/**
 * The home page's daily readiness: a quick check-in (energy and soreness),
 * then a 0–100 score with why, and on a low day an easier workout for today
 * (the app's readiness_card.dart).
 */
export function ReadinessCard({ onPlanChanged }: { onPlanChanged?: () => void }) {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [editing, setEditing] = useState(false);
  const [energy, setEnergy] = useState<number | null>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [swapped, setSwapped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReadiness().then(setReadiness).catch(() => setReadiness(null));
  }, []);

  if (!readiness) return null;

  const submit = async () => {
    if (!energy || !soreness) return;
    setBusy(true);
    setError(null);
    try {
      setReadiness(await checkInReadiness(energy, soreness));
      setEditing(false);
      setSwapped(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const swap = async () => {
    const s = readiness.easierSwap;
    if (!s) return;
    setBusy(true);
    setError(null);
    try {
      await swapPlanDay(s.week, s.day, s.workoutSlug);
      setSwapped(s.newTitle.replace(/^.*?: /, ''));
      onPlanChanged?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5 space-y-4';
  const heading = <h2 id="readiness-heading" className="font-extrabold flex items-center gap-2"><Gauge className="w-5 h-5 text-lime-light" aria-hidden="true" /> Today&apos;s readiness</h2>;

  if (!readiness.checkedIn || editing) {
    return (
      <section aria-labelledby="readiness-heading" className={card}>
        {heading}
        <p className="text-sm text-white-70">Two taps tell you how hard to go today. It also uses your sleep and resting heart rate when your phone or watch shares them.</p>
        <Scale label="Energy" options={ENERGY} value={energy} onChange={setEnergy} />
        <Scale label="Soreness" options={SORENESS} value={soreness} onChange={setSoreness} />
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="button" onClick={submit} disabled={!energy || !soreness || busy} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-50">
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} See my readiness
        </button>
      </section>
    );
  }

  const color = BAND_COLORS[readiness.band!];
  const easier = readiness.easierSwap;
  return (
    <section aria-labelledby="readiness-heading" className={card}>
      {heading}
      <div className="flex items-center gap-4">
        <Ring score={readiness.score!} color={color} />
        <div className="min-w-0">
          <p className="text-lg font-extrabold" style={{ color }}>{readiness.headline}</p>
          <p className="text-sm text-white-70 mt-0.5">{readiness.advice}</p>
        </div>
      </div>
      {readiness.reasons!.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="What went into it">
          {readiness.reasons!.map((r) => (
            <li key={r.text} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white-30/15">
              {r.effect === 'up' ? <ArrowUp className="w-3 h-3 text-emerald-400" aria-label="raises it" /> : r.effect === 'down' ? <ArrowDown className="w-3 h-3 text-amber-400" aria-label="lowers it" /> : null}
              {r.text}
            </li>
          ))}
        </ul>
      )}
      {easier && !swapped && (
        <div className="bg-noir-eclipse/60 rounded-xl p-4 space-y-3">
          <p className="text-sm flex flex-wrap items-center gap-1.5">
            Today: {easier.title.replace(/^.*?: /, '')} <ArrowRight className="w-3.5 h-3.5 text-lime-light" aria-hidden="true" /><span className="sr-only">could become</span> <strong>{easier.newTitle.replace(/^.*?: /, '')}</strong>
          </p>
          <button type="button" onClick={swap} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lime-light text-noir-eclipse font-bold text-xs disabled:opacity-60">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />} Swap to the easier one
          </button>
        </div>
      )}
      {swapped && <p role="status" className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-lime-light" aria-hidden="true" /> Swapped. Today&apos;s session is now {swapped}.</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button
        type="button"
        onClick={() => {
          setEnergy(readiness.energy ?? null);
          setSoreness(readiness.soreness ?? null);
          setEditing(true);
        }}
        className="text-xs font-bold text-lime-light hover:underline"
      >
        Change my answers
      </button>
      <p className="text-[11px] text-white-70">A guide for training, not a medical measure.</p>
    </section>
  );
}
