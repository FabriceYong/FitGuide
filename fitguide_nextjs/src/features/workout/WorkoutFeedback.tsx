'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { fetchAiStatus, fetchWorkoutFeedback, type Feedback } from '../../services/aiService';

/**
 * "Coach's take" on the end-of-workout sheet: a line or two on how this
 * session compares with earlier ones and one thing to try next time.
 * Loads by itself once the session is saved; hidden when AI isn't set up,
 * the allowance is used up, or it fails.
 */
export function WorkoutFeedback({ sessionId, color }: { sessionId: string; color: string }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'hidden'>('loading');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const status = await fetchAiStatus();
        if (!status.available || !status.allowance.feedback.left) throw new Error('unavailable');
        const res = await fetchWorkoutFeedback(sessionId);
        if (active) { setFeedback(res.feedback); setState('done'); }
      } catch {
        if (active) setState('hidden');
      }
    })();
    return () => { active = false; };
  }, [sessionId]);

  if (state === 'hidden') return null;
  return (
    <section aria-live="polite" className="rounded-2xl border p-4 space-y-2 text-left" style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}>
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color }}>
        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Coach&apos;s take
      </h3>
      {state === 'loading' || !feedback ? (
        <div className="space-y-2" role="status" aria-label="Writing your feedback">
          <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
        </div>
      ) : (
        <>
          <p className="font-extrabold text-white">{feedback.headline}</p>
          {feedback.notes.map((n) => <p key={n} className="text-sm text-white/80">{n}</p>)}
          {feedback.nextTime && (
            <p className="flex gap-2 text-sm text-white"><ArrowRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} aria-hidden="true" /> <span><span className="font-bold">Next time: </span>{feedback.nextTime}</span></p>
          )}
        </>
      )}
    </section>
  );
}
