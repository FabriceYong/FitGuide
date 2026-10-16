'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, ChevronRight, Heart, CheckCircle } from 'lucide-react';
const PARQ_QUESTIONS = [
    {
        id: 'q1',
        text: 'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?',
        warning: 'Existing heart conditions require medical clearance.',
    },
    {
        id: 'q2',
        text: 'Do you feel pain in your chest when you do physical activity?',
        warning: 'Chest pain during activity is a serious cardiac warning sign.',
    },
    {
        id: 'q3',
        text: 'In the past month, have you had chest pain when you were not doing physical activity?',
        warning: 'Resting chest pain requires medical evaluation.',
    },
    {
        id: 'q4',
        text: 'Do you lose your balance because of dizziness or do you ever lose consciousness?',
        warning: 'Dizziness or fainting episodes must be assessed by a healthcare professional.',
    },
    {
        id: 'q5',
        text: 'Do you have a bone or joint problem (for example, back, knee or hip) that could be made worse by a change in your physical activity?',
        warning: 'Joint/bone concerns may require a modified exercise program.',
    },
    {
        id: 'q6',
        text: 'Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?',
        warning: 'Certain medications affect exercise response and intensity limits.',
    },
    {
        id: 'q7',
        text: 'Do you know of any other reason why you should not do physical activity?',
        warning: 'Any other health concern should be evaluated before starting exercise.',
    },
];
const STORAGE_KEY = 'fitguide_parq_result';
export const ParqModal = ({ onClose }) => {
    const [step, setStep] = useState('intro');
    const [answers, setAnswers] = useState({});
    const [currentQ, setCurrentQ] = useState(0);
    const [animating, setAnimating] = useState(false);
    const handleAnswer = (value) => {
        if (animating)
            return;
        setAnimating(true);
        const newAnswers = { ...answers, [PARQ_QUESTIONS[currentQ].id]: value };
        setAnswers(newAnswers);
        setTimeout(() => {
            if (currentQ < PARQ_QUESTIONS.length - 1) {
                setCurrentQ(currentQ + 1);
                setAnimating(false);
            }
            else {
                // All answered — compute result
                const anyYes = Object.values(newAnswers).some((v) => v === true);
                const result = {
                    completed: true,
                    cleared: !anyYes,
                    answers: newAnswers,
                    completedAt: new Date().toISOString(),
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
                setStep('result');
                setAnimating(false);
            }
        }, 300);
    };
    const cleared = !Object.values(answers).some((v) => v === true);
    // Which questions were flagged "Yes"
    const flaggedQuestions = PARQ_QUESTIONS.filter((q) => answers[q.id] === true);
    const progress = ((currentQ) / PARQ_QUESTIONS.length) * 100;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md"/>

      {/* Modal Panel */}
      <div className="relative w-full max-w-lg bg-gradient-to-br from-[#16161f] to-[#1a1a2e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-lime-light/10 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-[#00C4B4]"/>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">PAR-Q+ Health Screening</h2>
              <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">
                Physical Activity Readiness Questionnaire
              </p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* ─── INTRO ─── */}
          {step === 'intro' && (<div className="space-y-5 animate-fade-in">
              <p className="text-sm text-white/70 leading-relaxed">
                The <strong className="text-white">PAR-Q+</strong> is the internationally accepted
                gold standard pre-exercise health screening questionnaire recommended by the{' '}
                <strong className="text-[#00C4B4]">American Council on Exercise (ACE)</strong> and
                the Canadian Society for Exercise Physiology.
              </p>
              <div className="bg-[#00C4B4]/5 border border-[#00C4B4]/20 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] font-bold text-[#00C4B4] uppercase tracking-wider">
                  Why complete this screening?
                </p>
                <ul className="space-y-1.5 text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[#00C4B4] flex-shrink-0 mt-0.5"/>
                    Identify any health conditions that may limit safe exercise
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[#00C4B4] flex-shrink-0 mt-0.5"/>
                    Ensure you train safely and effectively
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[#00C4B4] flex-shrink-0 mt-0.5"/>
                    Get a personalised clearance status for your profile
                  </li>
                </ul>
              </div>
              <p className="text-[11px] text-white/40">
                This screening is for informational purposes only and does not replace professional
                medical advice.
              </p>
              <button onClick={() => setStep('questions')} className="w-full py-3.5 bg-[#00C4B4] text-[#0a0a0f] font-extrabold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer">
                Begin Screening
                <ChevronRight className="w-5 h-5"/>
              </button>
            </div>)}

          {/* ─── QUESTIONS ─── */}
          {step === 'questions' && (<div className="space-y-6 animate-fade-in">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-white/50 uppercase">
                  <span>Question {currentQ + 1} of {PARQ_QUESTIONS.length}</span>
                  <span>{Math.round(progress)}% Complete</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00C4B4] rounded-full transition-all duration-500" style={{ width: `${progress}%` }}/>
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2 transition-all duration-300" style={{ opacity: animating ? 0 : 1, transform: animating ? 'translateY(8px)' : 'translateY(0)' }}>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">
                  Health Question {currentQ + 1}
                </p>
                <p className="text-base font-semibold text-white leading-relaxed">
                  {PARQ_QUESTIONS[currentQ].text}
                </p>
              </div>

              {/* Yes / No Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleAnswer(true)} disabled={animating} className="py-4 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-400 font-extrabold text-lg hover:bg-red-500/20 hover:border-red-500/60 transition-all cursor-pointer disabled:opacity-50">
                  Yes
                </button>
                <button onClick={() => handleAnswer(false)} disabled={animating} className="py-4 rounded-2xl border border-[#00C4B4]/40 bg-[#00C4B4]/10 text-[#00C4B4] font-extrabold text-lg hover:bg-[#00C4B4]/20 hover:border-[#00C4B4]/60 transition-all cursor-pointer disabled:opacity-50">
                  No
                </button>
              </div>

              {/* Previous answers summary */}
              {currentQ > 0 && (<div className="flex flex-wrap gap-1.5 pt-1">
                  {PARQ_QUESTIONS.slice(0, currentQ).map((q, i) => (<div key={q.id} className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${answers[q.id]
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-[#00C4B4]/10 border-[#00C4B4]/20 text-[#00C4B4]'}`}>
                      Q{i + 1}: {answers[q.id] ? 'Yes' : 'No'}
                    </div>))}
                </div>)}
            </div>)}

          {/* ─── RESULT ─── */}
          {step === 'result' && (<div className="space-y-5 animate-fade-in text-center">
              {cleared ? (<>
                  {/* Cleared */}
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-20 h-20 rounded-full bg-[#00C4B4]/10 border-2 border-[#00C4B4]/40 flex items-center justify-center mb-2">
                      <ShieldCheck className="w-10 h-10 text-[#00C4B4]"/>
                    </div>
                    <h3 className="text-2xl font-extrabold text-[#00C4B4]">Cleared to Exercise!</h3>
                    <p className="text-sm text-white/70 max-w-sm leading-relaxed">
                      Based on your responses, you appear to be physically ready for increased
                      activity. You can safely begin or progress your FitGuide training program.
                    </p>
                  </div>
                  <div className="bg-[#00C4B4]/5 border border-[#00C4B4]/20 rounded-2xl p-4 text-left">
                    <p className="text-[10px] font-bold text-[#00C4B4] uppercase tracking-wider mb-2">
                      ✅ ACE Recommendation
                    </p>
                    <p className="text-xs text-white/60 leading-relaxed">
                      You are cleared to participate in moderate to vigorous physical activity. Start
                      gradually and increase intensity over time. Listen to your body and stop if
                      unusual symptoms occur.
                    </p>
                  </div>
                </>) : (<>
                  {/* Needs Medical Clearance */}
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-orange-500/40 flex items-center justify-center mb-2">
                      <AlertTriangle className="w-10 h-10 text-orange-400"/>
                    </div>
                    <h3 className="text-xl font-extrabold text-orange-400">Medical Consultation Recommended</h3>
                    <p className="text-sm text-white/70 max-w-sm leading-relaxed">
                      Based on your responses, we recommend speaking with a healthcare professional
                      before starting or changing your exercise routine.
                    </p>
                  </div>

                  {/* Flagged questions */}
                  {flaggedQuestions.length > 0 && (<div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 text-left space-y-3">
                      <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                        ⚠️ Areas Flagged for Review
                      </p>
                      {flaggedQuestions.map((q) => (<div key={q.id} className="text-xs text-white/60 leading-relaxed border-l-2 border-orange-500/40 pl-3">
                          {q.warning}
                        </div>))}
                    </div>)}
                </>)}

              {/* Disclaimer */}
              <p className="text-[10px] text-white/30 leading-relaxed">
                This questionnaire is based on the PAR-Q+ recommended by ACE and the Canadian
                Society for Exercise Physiology. It does not replace medical advice.
              </p>

              <button onClick={onClose} className={`w-full py-3.5 font-extrabold rounded-xl transition-all cursor-pointer ${cleared
                ? 'bg-[#00C4B4] text-[#0a0a0f] hover:scale-[1.02]'
                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'}`}>
                {cleared ? 'Start Training! 🚀' : 'Understood, I\'ll consult my doctor'}
              </button>
            </div>)}
        </div>
      </div>
    </div>);
};
export { STORAGE_KEY as PARQ_STORAGE_KEY };
