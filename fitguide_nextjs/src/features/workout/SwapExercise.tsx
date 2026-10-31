'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Loader2, Sparkles } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { suggestSwap, type Swap, type SwapReason } from '../../services/aiService';

const REASONS: { id: SwapReason; label: string }[] = [
  { id: 'pain', label: 'It hurts or a joint is sore' },
  { id: 'space', label: 'No room, or must be quiet' },
  { id: 'equipment', label: "I don't have the equipment" },
  { id: 'harder', label: 'Too hard right now' },
  { id: 'easier', label: 'Too easy' },
  { id: 'other', label: 'Something else' },
];

interface Step { instruction: string; exerciseName?: string; formCues?: string[] }
interface Workout { title: string; category: string; difficulty: string; equipment?: string[] }

/**
 * "Swap this exercise" in the player: pick why, get one alternative that
 * trains the same thing, and use it for this workout (nothing is saved to the
 * catalog). Pain gets a safety note.
 */
export function SwapExercise({ step, workout, color, onUse, onClose }: {
  step: Step;
  workout: Workout;
  color: string;
  onUse: (swapped: Step & { breathingPattern?: string; commonMistakes?: string[] }) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<SwapReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swap, setSwap] = useState<Swap | null>(null);

  const ask = async () => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      const res = await suggestSwap({
        step: { instruction: step.instruction, ...(step.exerciseName && { exerciseName: step.exerciseName }) },
        reason,
        ...(details.trim() && { details: details.trim() }),
        workout: { title: workout.title, category: workout.category, difficulty: workout.difficulty, equipment: workout.equipment || [] },
      });
      setSwap(res.swap);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Swap this exercise" onClose={onClose} placement="sheet">
      <div className="space-y-4">
        <p className="text-sm text-white-70">Replacing: <span className="font-bold text-white">{step.instruction}</span></p>
        {!swap ? (
          <>
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold uppercase tracking-wider text-white-70 mb-2">Why do you want to swap it?</legend>
              <div className="grid sm:grid-cols-2 gap-2">
                {REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setReason(r.id)}
                    aria-pressed={reason === r.id}
                    className={`text-left text-sm font-semibold px-3 py-2.5 rounded-xl border transition-colors ${reason === r.id ? 'text-noir-eclipse' : 'bg-white/5 border-white-30/15 text-white hover:border-white-30/40'}`}
                    style={reason === r.id ? { backgroundColor: color, borderColor: color } : undefined}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-xs font-bold text-white-70">Anything else? <span className="font-normal">(optional)</span>
              <input value={details} maxLength={200} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. my left knee aches when I land" className="mt-1 w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white font-normal" />
            </label>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <button type="button" onClick={ask} disabled={!reason || busy} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-sm disabled:opacity-50" style={{ backgroundColor: color, color: '#0A0C10' }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />} Find an alternative
            </button>
          </>
        ) : (
          <>
            <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: `${color}55`, backgroundColor: `${color}12` }}>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>Try instead</p>
              <p className="text-xl font-extrabold">{swap.name}</p>
              <p className="text-sm text-white/85">{swap.why}</p>
              {swap.formCues.length > 0 && (
                <ul className="space-y-1">
                  {swap.formCues.map((c) => <li key={c} className="flex gap-2 text-sm"><Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} aria-hidden="true" /> {c}</li>)}
                </ul>
              )}
            </div>
            {swap.safetyNote && (
              <p className="flex gap-2 text-sm text-orange-100 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-300" aria-hidden="true" /> {swap.safetyNote}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setSwap(null)} className="flex-1 py-3 rounded-xl bg-white/10 font-bold text-sm">Try another</button>
              <button
                type="button"
                onClick={() => onUse({ instruction: swap.instruction, exerciseName: swap.name, formCues: swap.formCues, commonMistakes: [], breathingPattern: undefined })}
                className="flex-[2] py-3 rounded-xl font-extrabold text-sm"
                style={{ backgroundColor: color, color: '#0A0C10' }}
              >
                Use this exercise
              </button>
            </div>
            <p className="text-[11px] text-white-70">Only changes this workout. Suggested by AI: stop if anything hurts.</p>
          </>
        )}
      </div>
    </Modal>
  );
}
