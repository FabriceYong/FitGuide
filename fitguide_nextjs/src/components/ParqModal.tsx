'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';

/**
 * The seven questions of the original PAR-Q (Physical Activity Readiness
 * Questionnaire, Canadian Society for Exercise Physiology). A "yes" to any
 * of them means: talk to a doctor before becoming much more active.
 */
const QUESTIONS = [
  {
    text: 'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?',
    note: 'A known heart condition needs medical clearance first.',
  },
  { text: 'Do you feel pain in your chest when you do physical activity?', note: 'Chest pain during activity should be checked by a doctor.' },
  {
    text: 'In the past month, have you had chest pain when you were not doing physical activity?',
    note: 'Chest pain at rest should be checked by a doctor.',
  },
  {
    text: 'Do you lose your balance because of dizziness or do you ever lose consciousness?',
    note: 'Dizziness or fainting should be assessed before exercising.',
  },
  {
    text: 'Do you have a bone or joint problem (for example, back, knee or hip) that could be made worse by a change in your physical activity?',
    note: 'A bone or joint problem may need adapted exercises.',
  },
  {
    text: 'Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?',
    note: 'Some medicines change how your body responds to exercise.',
  },
  { text: 'Do you know of any other reason why you should not do physical activity?', note: 'Mention any other concern to your doctor.' },
];

export const PARQ_STORAGE_KEY = 'fitguide_parq_result';

/** Whether this device has a saved PAR-Q answer set. */
export function hasParqResult() {
  try {
    return Boolean(localStorage.getItem(PARQ_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function ParqModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'intro' | 'questions' | 'result'>('intro');
  const [answers, setAnswers] = useState<boolean[]>([]);
  const current = answers.length;

  const answer = (yes: boolean) => {
    const next = [...answers, yes];
    setAnswers(next);
    if (next.length === QUESTIONS.length) {
      try {
        localStorage.setItem(PARQ_STORAGE_KEY, JSON.stringify({ answers: next, flagged: next.some(Boolean), completedAt: new Date().toISOString() }));
      } catch {
        // storage unavailable: the banner will just ask again next time
      }
      setStep('result');
    }
  };
  const flagged = QUESTIONS.filter((_, i) => answers[i]);

  return (
    <Modal title="Health check (PAR-Q)" onClose={onClose}>
      {step === 'intro' && (
        <div className="space-y-4">
          <p className="text-sm text-white-70 leading-relaxed">
            Seven yes-or-no questions from the Physical Activity Readiness Questionnaire (PAR-Q), a screening widely used
            before starting an exercise program. It takes about a minute.
          </p>
          <p className="text-xs text-white-70">
            Your answers stay on this device. This is a screening aid, not a diagnosis or medical advice.
          </p>
          <button
            type="button"
            onClick={() => setStep('questions')}
            className="w-full py-3.5 bg-lime-light text-noir-eclipse font-extrabold rounded-xl flex items-center justify-center gap-2"
          >
            Start <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {step === 'questions' && current < QUESTIONS.length && (
        <div className="space-y-5">
          <div>
            <div className="flex justify-between text-xs font-bold text-white-70 mb-2">
              <span>Question {current + 1} of {QUESTIONS.length}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden" aria-hidden="true">
              <div className="h-full bg-lime-light rounded-full transition-all" style={{ width: `${(current / QUESTIONS.length) * 100}%` }} />
            </div>
          </div>
          <p className="text-base font-semibold text-white leading-relaxed" aria-live="polite">{QUESTIONS[current].text}</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => answer(true)} className="py-4 rounded-2xl border border-orange-400/40 bg-orange-500/10 text-orange-300 font-extrabold text-lg hover:bg-orange-500/20">
              Yes
            </button>
            <button type="button" onClick={() => answer(false)} className="py-4 rounded-2xl border border-lime-light/40 bg-lime-light/10 text-lime-light font-extrabold text-lg hover:bg-lime-light/20">
              No
            </button>
          </div>
          {current > 0 && (
            <button type="button" onClick={() => setAnswers(answers.slice(0, -1))} className="flex items-center gap-1 text-xs font-bold text-white-70 hover:text-white">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Previous question
            </button>
          )}
        </div>
      )}

      {step === 'result' && (
        <div className="space-y-5 text-center" role="status">
          {flagged.length === 0 ? (
            <>
              <ShieldCheck className="w-14 h-14 text-lime-light mx-auto" aria-hidden="true" />
              <h3 className="text-xl font-extrabold text-lime-light">No flags raised</h3>
              <p className="text-sm text-white-70 leading-relaxed">
                You answered no to every question, so you can reasonably start becoming more active. Start gently, build up
                gradually, and stop if you feel unwell. If your health changes, take the check again.
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-14 h-14 text-orange-300 mx-auto" aria-hidden="true" />
              <h3 className="text-xl font-extrabold text-orange-300">Talk to a doctor first</h3>
              <p className="text-sm text-white-70 leading-relaxed">
                You answered yes to {flagged.length === 1 ? 'one question' : `${flagged.length} questions`}. Speak with a doctor
                before becoming much more physically active, and tell them which ones.
              </p>
              <ul className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 text-left space-y-2">
                {flagged.map((q) => <li key={q.text} className="text-xs text-white-70 border-l-2 border-orange-400/50 pl-3">{q.note}</li>)}
              </ul>
            </>
          )}
          <button type="button" onClick={onClose} className="w-full py-3.5 font-extrabold rounded-xl bg-lime-light text-noir-eclipse">
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
