'use client';

/**
 * The guided workout player: one step at a time with its demonstration, a
 * countdown (or a rep target for steps counted in reps), what comes next,
 * rests between steps and optional spoken cues. For accounts, each step
 * shows the same set last time and what to aim for now. The app's
 * player_screen.dart works the same way.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { calorieFactor } from '@fitguide/shared';
import { repExerciseFor } from '@fitguide/shared/repCounter';
import { setPraise, stepCoaching } from '@fitguide/shared/voiceCoach';
import { useAuth } from '../../contexts/AuthContext';
import { kgFrom, useUnits, weightIn, weightUnit, weightUnitName } from '../../lib/units';
import { SessionSummary } from './SessionSummary';
import { StepDemo } from './StepDemo';
import { SwapExercise } from './SwapExercise';
import { RepCamera } from './RepCamera';
import { repTarget, setLabel, setName, stepClock, stepName, stepsFor, suggestionReason, usesWeights } from './workoutSteps';
import { fetchAiStatus } from '../../services/aiService';
import { fetchPreviousSets } from '../../services/trainingService';
import {
  X, Play, Pause, ChevronLeft, ChevronRight, Check, Clock, Flame, AlertTriangle, Volume2, VolumeX, Info, ListOrdered, Plus, Minus, SkipForward, Shuffle, History, TrendingUp, Camera,
} from 'lucide-react';

// Rest lengths picked on the rest screen, by workout: { [slug]: seconds }.
const REST_KEY = 'fitguide_rest_seconds';
const readRests = () => {
  try { return JSON.parse(localStorage.getItem(REST_KEY) || '{}') || {}; } catch (_) { return {}; }
};
const saveRest = (slug, seconds) => {
  try { localStorage.setItem(REST_KEY, JSON.stringify({ ...readRests(), [slug]: seconds })); } catch (_) { /* storage unavailable */ }
};
// How long a lift counted in reps rests when the workout sets no rest.
const LIFT_REST_SEC = 90;

const shortDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** The countdown ring. `fraction` is how much of the step is left (1 when counting up). */
function CircularTimer({ fraction, color, size = 168 }) {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - fraction)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
      />
    </svg>
  );
}

/** Says `text` out loud (where the browser can), replacing anything still being said. */
function say(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch (_) { /* speech unavailable */ }
}

function beep() {
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.25;
    osc.start();
    setTimeout(() => osc.stop(), 100);
  } catch (_) { /* audio unavailable */ }
}

/** "10 reps", "3 × 10 reps" or "2:30" for a step. */
const targetLabel = (step) => {
  const reps = repTarget(step);
  if (reps) return `${reps.sets ? `${reps.sets} × ` : ''}${reps.reps} reps`;
  return step?.duration ? stepClock(step.duration) : '';
};

/** What's said when a step starts: "Jump Squats. 15 reps" or "Plank. 45 seconds". */
const spokenTarget = (step) => {
  const reps = repTarget(step);
  if (reps) return `${reps.sets ? `${reps.sets} sets of ` : ''}${reps.reps.replace(/[–-]/, ' to ')} reps`;
  const s = step?.duration || 0;
  if (!s) return '';
  const m = Math.floor(s / 60);
  return [m && `${m} minute${m > 1 ? 's' : ''}`, s % 60 && `${s % 60} seconds`].filter(Boolean).join(' ');
};

/**
 * Guided workout player. When the workout ends (or the user stops early and
 * chooses to save) it opens SessionSummary, which saves the session.
 *
 * @param {object} [props.program]  { enrollmentId, week, day } when this is a scheduled program day
 * @param {(result?: object) => void} props.onComplete  Called when the user leaves the summary
 */
export const EnhancedWorkoutExecution = ({ workout, tintColor = '#00C4B4', program = null, onExit, onComplete }) => {
  const { user, hasAccount } = useAuth();
  // Weights are entered and shown in the user's units, and saved in kg.
  const units = useUnits();
  // The workout's burn rate scaled to this user's body, as the API does when saving.
  const caloriesPerMinute = ((workout?.calories || 0) / (workout?.duration || 1)) * calorieFactor(user);
  const [steps, setSteps] = useState(() => stepsFor(workout));
  const [swapping, setSwapping] = useState(false);
  const [canSwap, setCanSwap] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(() => steps[0]?.duration || 60);
  const [stepTotalDuration, setStepTotalDuration] = useState(() => steps[0]?.duration || 60);
  // Seconds on a step counted in reps (it counts up instead of down).
  const [stepElapsed, setStepElapsed] = useState(0);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isResting, setIsResting] = useState(false);
  const [restTotal, setRestTotal] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  // The camera rep counter, for squats and push-ups.
  const [showCamera, setShowCamera] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  // { status: 'completed' | 'partial', completedAt } while the end-of-session summary is open
  const [summary, setSummary] = useState(null);
  // Optional reps/weight the user logged per step: { [stepIndex]: { reps, weightKg } }
  const [setInputs, setSetInputs] = useState({});
  // Per step: { last, suggestion } from the API (accounts only).
  const [previous, setPrevious] = useState([]);
  const startedAtRef = useRef(new Date().toISOString());
  const stepSecondsRef = useRef({}); // active seconds spent on each step
  const announced = useRef(-1);
  // Praise for the step just finished, said with the next announcement.
  const praise = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];
  const reps = repTarget(currentStep);
  const cameraExercise = currentStep ? repExerciseFor(stepName(currentStep)) : null;
  const counting = Boolean(reps) && !isResting;
  const weights = usesWeights(workout);
  const progress = (completedSteps.size / totalSteps) * 100;
  const estimatedCaloriesBurned = Math.floor((totalElapsedTime / 60) * caloriesPerMinute);
  const color = tintColor;

  const cue = useCallback((text) => { if (soundEnabled) say(text); }, [soundEnabled]);

  /** A step's logged set in kg, as the voice coach compares it with last time. */
  const loggedSet = useCallback((idx) => {
    const input = setInputs[idx] || {};
    const reps = parseInt(input.reps, 10);
    const weight = parseFloat(input.weightKg);
    return { reps: Number.isFinite(reps) ? reps : undefined, weightKg: Number.isFinite(weight) ? kgFrom(weight, units) : undefined };
  }, [setInputs, units]);
  const praiseFor = useCallback((idx) => setPraise({ logged: loggedSet(idx), last: previous[idx]?.last, units }), [loggedSet, previous, units]);

  // The swap shows for accounts when the server has AI set up.
  useEffect(() => {
    if (!hasAccount) return;
    fetchAiStatus().then((s) => setCanSwap(s.available)).catch(() => setCanSwap(false));
  }, [hasAccount]);

  // Last time and what to aim for, per step. Offline or signed out: nothing shown.
  useEffect(() => {
    if (!hasAccount) return undefined;
    let live = true;
    const targets = steps.map((step, i) => ({ name: setName(step, i), ...(repTarget(step) && { reps: repTarget(step).reps }) }));
    fetchPreviousSets(targets).then((list) => { if (live) setPrevious(list); }).catch(() => {});
    return () => { live = false; };
  }, [hasAccount, steps]);

  /** Use a suggested exercise for the current step, keeping its length. */
  const applySwap = (swapped) => {
    setSteps((all) => all.map((s, i) => (i === currentStepIndex ? { ...s, ...swapped, gifUrl: undefined, imageUrl: undefined } : s)));
    announced.current = -1;
    setSwapping(false);
  };

  /** Move to a step, with its clock reset. */
  const goToStep = useCallback((index) => {
    const dur = steps[index]?.duration || 60;
    setIsResting(false);
    setCurrentStepIndex(index);
    setTimeRemaining(dur);
    setStepTotalDuration(dur);
    setStepElapsed(0);
  }, [steps]);

  const handleWorkoutComplete = useCallback(() => {
    setIsPlaying(false);
    setIsResting(false);
    setCompletedSteps((prev) => new Set(prev).add(currentStepIndex));
    if (soundEnabled) say('Workout complete. Great job!');
    setSummary({ status: 'completed', completedAt: new Date().toISOString() });
  }, [currentStepIndex, soundEnabled]);

  /**
   * Finish the current step: rest first if there's a rest, else straight to
   * the next. The rest is the one picked for this workout on the rest
   * screen, else the workout's, else LIFT_REST_SEC after a lift in reps.
   * Inside a superset (restAfter: false) there's none.
   */
  const completeStep = useCallback(() => {
    setCompletedSteps((prev) => new Set(prev).add(currentStepIndex));
    if (currentStepIndex >= totalSteps - 1) { handleWorkoutComplete(); return; }
    praise.current = praiseFor(currentStepIndex);
    const rest = currentStep?.restAfter === false ? 0 : readRests()[workout?.slug] || workout?.restPeriod || (weights && repTarget(currentStep) ? LIFT_REST_SEC : 0);
    if (rest > 0) {
      setIsResting(true);
      setRestTotal(rest);
      setTimeRemaining(rest);
      setIsPlaying(true);
      cue([praise.current, `Rest. Next up: ${stepName(steps[currentStepIndex + 1])}`].filter(Boolean).join(' '));
      praise.current = null;
    } else {
      goToStep(currentStepIndex + 1);
    }
  }, [currentStepIndex, currentStep, totalSteps, workout, weights, steps, cue, goToStep, handleWorkoutComplete, praiseFor]);

  // Announce each step as it starts.
  useEffect(() => {
    if (!isPlaying || isResting || announced.current === currentStepIndex) return;
    announced.current = currentStepIndex;
    const prev = previous[currentStepIndex];
    const coaching = stepCoaching({ index: currentStepIndex, total: totalSteps, last: prev?.last, suggestion: prev?.suggestion, units });
    cue([praise.current, `${stepName(currentStep)}. ${spokenTarget(currentStep)}`, coaching].filter(Boolean).join(' '));
    praise.current = null;
  }, [isPlaying, isResting, currentStepIndex, currentStep, cue, previous, totalSteps, units]);

  // The clock: counts down a timed step or a rest, counts up a step in reps.
  // At zero, a rest leads to the next step and a step to its rest (or the next one).
  useEffect(() => {
    if (!isPlaying || summary) return undefined;
    const interval = window.setInterval(() => {
      setTotalElapsedTime((t) => t + 1);
      if (!isResting) stepSecondsRef.current[currentStepIndex] = (stepSecondsRef.current[currentStepIndex] || 0) + 1;
      if (counting) { setStepElapsed((s) => s + 1); return; }
      if (timeRemaining <= 1) {
        if (isResting) goToStep(currentStepIndex + 1);
        else completeStep();
        return;
      }
      if (timeRemaining <= 4 && soundEnabled) {
        if ('speechSynthesis' in window) say(String(timeRemaining - 1));
        else beep();
      }
      setTimeRemaining(timeRemaining - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isResting, counting, currentStepIndex, soundEnabled, summary, timeRemaining, goToStep, completeStep]);

  const handlePreviousStep = () => { if (currentStepIndex > 0) goToStep(currentStepIndex - 1); };
  const handleNextStep = () => {
    if (currentStepIndex >= totalSteps - 1) return;
    setCompletedSteps((prev) => new Set(prev).add(currentStepIndex));
    praise.current = praiseFor(currentStepIndex);
    goToStep(currentStepIndex + 1);
  };

  const handleSaveAndExit = () => {
    setShowExitDialog(false);
    setIsPlaying(false);
    setSummary({ status: 'partial', completedAt: new Date().toISOString() });
  };

  /** Change the rest length by `delta` seconds, now and for this workout's later rests. */
  const adjustRest = (delta) => {
    const total = Math.max(15, restTotal + delta);
    setTimeRemaining((t) => Math.max(1, t + total - restTotal));
    setRestTotal(total);
    if (workout?.slug) saveRest(workout.slug, total);
  };

  /** Fill this step's log with the suggested reps and weight. */
  const applySuggestion = () => {
    const suggestion = previous[currentStepIndex]?.suggestion;
    if (!suggestion) return;
    setSetInputs((prev) => ({
      ...prev,
      [currentStepIndex]: { ...prev[currentStepIndex], reps: String(suggestion.reps), ...(suggestion.weightKg && { weightKg: String(weightIn(suggestion.weightKg, units)) }) },
    }));
  };

  const updateSetInput = (field, value) => {
    setSetInputs((prev) => ({ ...prev, [currentStepIndex]: { ...prev[currentStepIndex], [field]: value } }));
  };

  /** The session as the API expects it (effort and notes are added by SessionSummary). */
  const buildSessionDraft = () => {
    const parse = (value, fn) => (value === undefined || value === '' ? undefined : fn(value));
    const wallClockSec = Math.round((Date.parse(summary.completedAt) - Date.parse(startedAtRef.current)) / 1000);
    const sets = steps.map((step, idx) => {
      const seconds = stepSecondsRef.current[idx] || 0;
      const input = setInputs[idx] || {};
      const loggedReps = parse(input.reps, (v) => Math.max(0, parseInt(v, 10)));
      const weightKg = parse(input.weightKg, (v) => Math.max(0, kgFrom(parseFloat(v), units)));
      if (!completedSteps.has(idx) && !seconds && loggedReps === undefined && weightKg === undefined) return null;
      return {
        exerciseName: setName(step, idx),
        reps: Number.isFinite(loggedReps) ? loggedReps : undefined,
        weightKg: Number.isFinite(weightKg) ? weightKg : undefined,
        durationSec: seconds || undefined,
      };
    }).filter(Boolean);
    return {
      workoutSlug: workout.slug,
      workoutTitle: workout.title,
      startedAt: startedAtRef.current,
      completedAt: summary.completedAt,
      // Timer time if the timer was used, otherwise time since the player opened.
      durationSec: totalElapsedTime > 0 ? totalElapsedTime : wallClockSec,
      stepsCompleted: completedSteps.size,
      totalSteps,
      sets,
      ...(program && { enrollmentId: program.enrollmentId, programWeek: program.week, programDay: program.day }),
    };
  };

  const handleExit = () => {
    if (totalElapsedTime > 30 || completedSteps.size > 0) setShowExitDialog(true);
    else onExit();
  };

  const urgent = !counting && timeRemaining <= 5 ? '#f87171' : !counting && timeRemaining <= 10 ? '#fb923c' : color;
  const hasCues = currentStep && (currentStep.formCues?.length > 0 || currentStep.breathingPattern || currentStep.commonMistakes?.length > 0);
  const name = stepName(currentStep);
  const prev = previous[currentStepIndex];
  const nextSuggestion = previous[currentStepIndex + 1]?.suggestion;
  // A weight box also for a lift logged with a weight before, whatever the workout lists.
  const showWeight = weights || prev?.last?.weightKg > 0;

  const stepList = (
    <ol className="space-y-1.5">
      {steps.map((step, idx) => {
        const isCurrent = idx === currentStepIndex;
        const isDone = completedSteps.has(idx);
        return (
          <li key={idx}>
            <button
              type="button"
              onClick={() => { goToStep(idx); setShowSteps(false); }}
              aria-current={isCurrent ? 'step' : undefined}
              className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 border transition-colors ${isCurrent ? 'bg-white/10' : isDone ? 'bg-green-500/5 border-transparent' : 'border-transparent hover:bg-white/5'}`}
              style={{ borderColor: isCurrent ? color : undefined }}
            >
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: isDone ? '#22c55e' : isCurrent ? color : 'rgba(255,255,255,0.12)', color: isDone || isCurrent ? '#0A0C10' : '#fff' }}>
                {isDone ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : idx + 1}
              </span>
              <span className="flex-1 min-w-0 text-sm font-semibold truncate">{stepName(step)}</span>
              <span className="text-[11px] text-white/50 tabular-nums shrink-0">{targetLabel(step)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="min-h-screen text-white relative bg-[#0A0C10] font-sans">
      {/* Ambient glow in the workout's colour */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 opacity-20" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl" style={{ background: color }} />
      </div>

      {/* ── Top bar: exit, progress, live stats, sound ── */}
      <header className="sticky top-0 z-30 flex items-center gap-4 px-4 md:px-6 py-3 bg-[#0A0C10]/90 backdrop-blur-md border-b border-white/10">
        <button type="button" onClick={handleExit} aria-label="Exit workout" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-3 text-xs text-white/60 mb-1.5">
            <span className="truncate font-semibold text-white/80">{workout?.title}</span>
            <span className="shrink-0">{completedSteps.size}/{totalSteps} done</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden" role="progressbar" aria-label="Steps done" aria-valuenow={completedSteps.size} aria-valuemin={0} aria-valuemax={totalSteps}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: color }} />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-white/70 shrink-0">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden="true" /> {formatTime(totalElapsedTime)}</span>
          <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" /> {estimatedCaloriesBurned} kcal</span>
        </div>
        <button type="button" onClick={() => setSoundEnabled((s) => !s)} aria-pressed={soundEnabled} aria-label={soundEnabled ? 'Turn off spoken cues' : 'Turn on spoken cues'} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0">
          {soundEnabled ? <Volume2 className="w-5 h-5" aria-hidden="true" /> : <VolumeX className="w-5 h-5 text-white/40" aria-hidden="true" />}
        </button>
      </header>

      {/* ── Rest screen: the next step, so you know what's coming ── */}
      {isResting && !summary && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0A0C10]/95 backdrop-blur-2xl p-6" role="dialog" aria-modal="true" aria-label="Rest">
          <div className="w-full max-w-md text-center space-y-6">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color }}>Rest</p>
            <div className="relative inline-flex items-center justify-center">
              <CircularTimer fraction={restTotal ? timeRemaining / restTotal : 0} color={color} size={180} />
              <span className="absolute text-5xl font-black tabular-nums" style={{ color }}>{timeRemaining}</span>
            </div>
            {nextStep && (
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 text-left">
                <span className="w-20 h-20 shrink-0"><StepDemo step={nextStep} color={color} size="thumb" /></span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-white/50">Next up</span>
                  <span className="block font-extrabold text-lg leading-tight">{stepName(nextStep)}</span>
                  <span className="block text-sm text-white/60">{targetLabel(nextStep)}</span>
                  {nextSuggestion && <span className="block text-sm font-bold mt-0.5" style={{ color }}>Today: {setLabel(nextSuggestion, units)}</span>}
                </span>
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => adjustRest(-15)} disabled={restTotal <= 15} aria-label="15 seconds less rest" className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 flex items-center justify-center gap-1.5 disabled:opacity-40">
                <Minus className="w-4 h-4" aria-hidden="true" /> 15 s
              </button>
              <button type="button" onClick={() => adjustRest(15)} aria-label="15 seconds more rest" className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" aria-hidden="true" /> 15 s
              </button>
              <button type="button" onClick={() => goToStep(currentStepIndex + 1)} className="flex-[2] py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-1.5" style={{ backgroundColor: color, color: '#0A0C10' }}>
                <SkipForward className="w-4 h-4" aria-hidden="true" /> Skip rest
              </button>
            </div>
            <p className="text-xs text-white/50">Rests in this workout: {stepClock(restTotal)}. Changes here are kept for next time.</p>
          </div>
        </div>
      )}

      {swapping && currentStep && (
        <SwapExercise step={currentStep} workout={workout} color={color} onUse={applySwap} onClose={() => setSwapping(false)} />
      )}

      {summary && (
        <SessionSummary
          draft={buildSessionDraft()}
          status={summary.status}
          caloriesPerMinute={caloriesPerMinute}
          tintColor={color}
          onDone={(result) => (summary.status === 'completed' || result ? onComplete(result) : onExit())}
          onResume={summary.status === 'partial' ? () => setSummary(null) : undefined}
        />
      )}

      <main id="main" className="relative z-10 max-w-[1280px] mx-auto px-4 md:px-6 py-5 md:py-8 grid lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
        {/* ── Focus: the step, its demo, the clock and controls ── */}
        <section className="space-y-5 min-w-0">
          <div className="text-center lg:text-left" aria-live="polite">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">Step {currentStepIndex + 1} of {totalSteps}</p>
            <h1 className="text-2xl md:text-3xl font-extrabold leading-tight mt-1">{name}</h1>
            {name !== currentStep?.instruction && <p className="text-sm text-white/60 mt-1">{currentStep?.instruction}</p>}
            {canSwap && (
              <button type="button" onClick={() => { setIsPlaying(false); setSwapping(true); }} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15">
                <Shuffle className="w-3.5 h-3.5" aria-hidden="true" /> Swap this exercise
              </button>
            )}
          </div>

          {/* Capped so the clock and controls stay on screen on a laptop. */}
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] md:aspect-[16/9] max-h-[42vh] w-full mx-auto bg-[#131921] border border-white/10">
            <StepDemo step={currentStep} color={color} />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
            <div className="relative flex items-center justify-center">
              <CircularTimer fraction={counting ? 1 : stepTotalDuration ? timeRemaining / stepTotalDuration : 1} color={urgent} />
              <div className="absolute flex flex-col items-center">
                {counting ? (
                  <>
                    <span className="text-4xl font-black tabular-nums" style={{ color }}>{reps.reps}</span>
                    <span className="text-xs text-white/60 uppercase tracking-wider">{reps.sets ? `reps × ${reps.sets} sets` : 'reps'}</span>
                    <span className="text-[11px] text-white/40 tabular-nums mt-1">{formatTime(stepElapsed)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-black tabular-nums" style={{ color: urgent }}>{formatTime(Math.max(0, timeRemaining))}</span>
                    <span className="text-xs text-white/50 uppercase tracking-wider">left</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-4">
                <button type="button" onClick={handlePreviousStep} disabled={currentStepIndex === 0} aria-label="Previous step" className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center disabled:opacity-30">
                  <ChevronLeft className="w-6 h-6" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setIsPlaying((p) => !p)} aria-label={isPlaying ? 'Pause' : 'Start'} className="w-20 h-20 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg" style={{ backgroundColor: color }}>
                  {isPlaying ? <Pause className="w-9 h-9 text-[#0A0C10]" aria-hidden="true" /> : <Play className="w-9 h-9 text-[#0A0C10] ml-1" aria-hidden="true" />}
                </button>
                <button type="button" onClick={handleNextStep} disabled={currentStepIndex === totalSteps - 1} aria-label="Skip to next step" className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center disabled:opacity-30">
                  <ChevronRight className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>
              {counting && (
                <button type="button" onClick={completeStep} className="px-8 py-3 rounded-xl font-extrabold text-sm uppercase tracking-wider flex items-center gap-2" style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}66` }}>
                  <Check className="w-4 h-4" aria-hidden="true" /> Done
                </button>
              )}
            </div>
          </div>

          {nextStep ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="w-14 h-14 shrink-0"><StepDemo step={nextStep} color={color} size="thumb" animate={false} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-white/50">Next up</span>
                <span className="block font-bold truncate">{stepName(nextStep)}</span>
              </span>
              <span className="text-xs text-white/60 tabular-nums">{targetLabel(nextStep)}</span>
            </div>
          ) : (
            <p className="text-center text-sm text-white/60">Last step. Finish strong!</p>
          )}

          {hasCues && (
            <details className="rounded-2xl bg-[#131921] border border-white/10 open:pb-4" open>
              <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer font-bold text-sm">
                <Info className="w-4 h-4" style={{ color }} aria-hidden="true" /> How to do it
              </summary>
              <div className="px-4 grid gap-3 md:grid-cols-2">
                {currentStep.formCues?.length > 0 && (
                  <ul className="space-y-1.5 text-sm text-white/80">
                    {currentStep.formCues.map((c) => <li key={c} className="flex gap-2"><Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} aria-hidden="true" /> {c}</li>)}
                  </ul>
                )}
                <div className="space-y-3">
                  {currentStep.breathingPattern && (
                    <p className="text-sm text-white/80"><span className="block text-[11px] font-bold uppercase tracking-wider text-indigo-300">Breathing</span>{currentStep.breathingPattern}</p>
                  )}
                  {currentStep.commonMistakes?.length > 0 && (
                    <div className="text-sm text-orange-100">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-orange-300">Avoid</span>
                      {currentStep.commonMistakes.join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            </details>
          )}
        </section>

        {/* ── Side: every step, an optional set log and Finish ── */}
        <aside className="space-y-4">
          <div className="rounded-2xl bg-[#131921] border border-white/10 p-3">
            <button type="button" onClick={() => setShowSteps((s) => !s)} aria-expanded={showSteps} className="lg:hidden w-full flex items-center justify-between px-1 py-1 text-sm font-bold">
              <span className="flex items-center gap-2"><ListOrdered className="w-4 h-4" style={{ color }} aria-hidden="true" /> All steps</span>
              <span className="text-white/50">{currentStepIndex + 1}/{totalSteps}</span>
            </button>
            <h2 className="hidden lg:flex items-center gap-2 px-1 pb-2 text-sm font-bold"><ListOrdered className="w-4 h-4" style={{ color }} aria-hidden="true" /> All steps</h2>
            <div className={`${showSteps ? 'block mt-2' : 'hidden'} lg:block max-h-[50vh] overflow-y-auto custom-scrollbar`}>{stepList}</div>
          </div>

          <div className="rounded-2xl bg-[#131921] border border-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">Log this step (optional)</p>
            {prev?.last && (
              <p className="text-xs text-white/60 mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Last time ({shortDate(prev.last.completedAt)}): <span className="font-bold text-white/85">{setLabel(prev.last, units)}</span></span>
              </p>
            )}
            {prev?.suggestion && (
              <div className="mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ backgroundColor: `${color}14`, border: `1px solid ${color}40` }}>
                <TrendingUp className="w-4 h-4 shrink-0" style={{ color }} aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold">Today: {setLabel(prev.suggestion, units)}</span>
                  <span className="block text-[11px] text-white/60 leading-snug">{suggestionReason(prev.suggestion)}</span>
                </span>
                <button type="button" onClick={applySuggestion} aria-label={`Log ${setLabel(prev.suggestion, units)}`} className="shrink-0 text-xs font-extrabold px-3 py-2 rounded-md" style={{ backgroundColor: color, color: '#0A0C10' }}>Use</button>
              </div>
            )}
            <div className={`grid gap-2 ${showWeight ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <label className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                <input
                  type="number" min="0" max="1000" inputMode="numeric" aria-label="Reps done"
                  value={setInputs[currentStepIndex]?.reps ?? ''}
                  onChange={(e) => updateSetInput('reps', e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-white outline-none"
                  placeholder={String(prev?.suggestion?.reps ?? (reps ? reps.reps.split(/[–-]/)[0] : '0'))}
                />
                <span className="text-xs text-white/50">reps</span>
              </label>
              {showWeight && (
                <label className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <input
                    type="number" min="0" max="2500" step="0.5" inputMode="decimal" aria-label={`Weight in ${weightUnitName(units)}`}
                    value={setInputs[currentStepIndex]?.weightKg ?? ''}
                    onChange={(e) => updateSetInput('weightKg', e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-white outline-none"
                    placeholder={String(weightIn(prev?.suggestion?.weightKg ?? prev?.last?.weightKg ?? 0, units))}
                  />
                  <span className="text-xs text-white/50">{weightUnit(units)}</span>
                </label>
              )}
            </div>
            {cameraExercise && (
              <button type="button" onClick={() => setShowCamera(true)} className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/15">
                <Camera className="w-3.5 h-3.5" aria-hidden="true" /> Count reps with the camera
              </button>
            )}
          </div>

          <button type="button" onClick={handleWorkoutComplete} className="w-full py-4 rounded-xl font-extrabold flex items-center justify-center gap-2 text-sm uppercase tracking-wider border border-white/10 hover:scale-[1.01] active:scale-[0.99] transition-transform" style={{ backgroundColor: color, color: '#0A0C10' }}>
            <Check className="w-5 h-5" aria-hidden="true" /> Finish workout
          </button>
        </aside>
      </main>

      {showCamera && cameraExercise && (
        <RepCamera
          exercise={cameraExercise}
          onClose={() => setShowCamera(false)}
          onDone={(n) => {
            updateSetInput('reps', String(n));
            setShowCamera(false);
          }}
        />
      )}

      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="exit-title">
          <div className="bg-[#131921] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" aria-hidden="true" />
            </div>
            <h2 id="exit-title" className="text-2xl font-bold mb-2">Exit workout?</h2>
            <p className="text-sm text-white/60 mb-6">You&apos;ve done {completedSteps.size} of {totalSteps} steps.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowExitDialog(false)} className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20">Keep going</button>
              <button type="button" onClick={onExit} className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white">Exit</button>
            </div>
            <button type="button" onClick={handleSaveAndExit} className="mt-3 w-full py-3 rounded-xl font-bold text-sm border border-white/15 hover:bg-white/5">Save progress &amp; exit</button>
          </div>
        </div>
      )}
    </div>
  );
};
