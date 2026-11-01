'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Flame, Footprints, GlassWater, Minus, Play, Plus, Utensils } from 'lucide-react';
import { ProgressRing } from '../../../components/ProgressRing';
import { addWater, fetchDayLog, type DayLog } from '../../../services/nutritionService';
import { useUnits, volumeText } from '../../../lib/units';
import { fetchHealth, type HealthSummary } from '../../../services/healthService';
import { localToday, type ProgressSummary } from '../../../services/trainingService';
import { playHref } from '../../programs/ProgramDetail';
import { formatDay } from '../../progress/format';
import type { Workout } from '../../../types/catalog';

// A common daily target; FitGuide doesn't ask for a personal one yet.
const STEP_GOAL = 10000;
// One tap on the water card.
const GLASS_ML = 250;

const card = 'bg-obsidian-wave border border-white-30/10 rounded-3xl p-5 flex flex-col gap-4 min-h-[188px]';
const label = 'text-[11px] font-bold uppercase tracking-wider text-white-70 flex items-center gap-1.5';

/**
 * "Today" on the home page: the next workout, food logged against the day's
 * target, water, steps from a phone or wearable, and the streak, each a tap
 * from where to act on it. Signed-in accounts only.
 */
export function TodayPanel({ summary, suggestion }: { summary: ProgressSummary | undefined; suggestion: Workout | undefined }) {
  const [food, setFood] = useState<DayLog | null>(null);
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [water, setWater] = useState<number | null>(null);
  const [waterFailed, setWaterFailed] = useState(false);
  const units = useUnits();

  useEffect(() => {
    fetchDayLog(localToday()).then(setFood).catch(() => setFood(null));
    fetchHealth(7).then(setHealth).catch(() => setHealth(null));
  }, []);

  const enrollment = summary?.activeEnrollment || null;
  const nextDay = enrollment?.nextDay || null;
  const steps = health?.today?.steps ?? null;
  const eaten = food ? Math.round(food.totals.calories) : null;
  const target = food ? Math.round(food.targets.calories) : null;
  const streak = summary?.streak;
  const drunk = water ?? food?.water.ml ?? null;
  const waterGoal = food?.targets.waterMl ?? 2000;

  // Add (or take away) a glass, showing it straight away.
  const drink = async (ml: number) => {
    const before = drunk ?? 0;
    setWater(Math.max(0, before + ml));
    setWaterFailed(false);
    try {
      setWater(await addWater(ml));
    } catch {
      setWater(before);
      setWaterFailed(true);
    }
  };

  return (
    <section aria-labelledby="home-today" className="space-y-4">
      <h2 id="home-today" className="text-2xl font-extrabold text-white">Today</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Next workout */}
        <li className={`${card} bg-gradient-to-br from-lime-light/15 to-obsidian-wave`}>
          <span className={label}><CalendarDays className="w-3.5 h-3.5 text-lime-light" aria-hidden="true" /> {nextDay ? 'Your plan' : 'Suggested workout'}</span>
          {nextDay && enrollment ? (
            <>
              <span className="flex-1">
                <span className="block font-extrabold text-lg leading-snug text-white">{nextDay.title}</span>
                <span className="block text-xs text-white-70 mt-1">Week {nextDay.week}, day {nextDay.day}{nextDay.date ? ` · ${formatDay(nextDay.date)}` : ''}</span>
              </span>
              <Link href={playHref(enrollment, nextDay)} className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-light text-noir-eclipse text-xs font-extrabold uppercase tracking-wider">
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> Start
              </Link>
            </>
          ) : suggestion ? (
            <>
              <span className="flex-1">
                <span className="block font-extrabold text-lg leading-snug text-white">{suggestion.title}</span>
                <span className="block text-xs text-white-70 mt-1">{suggestion.duration} min · {suggestion.difficulty}</span>
              </span>
              <span className="flex flex-wrap gap-3 items-center">
                <Link href={`/workouts/${suggestion.slug}`} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-light text-noir-eclipse text-xs font-extrabold uppercase tracking-wider">
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> Start
                </Link>
                <Link href="/plan" className="text-xs font-bold text-lime-light">Build a plan →</Link>
              </span>
            </>
          ) : (
            <span className="flex-1 h-12 rounded-xl bg-white/5 animate-pulse" aria-hidden="true" />
          )}
        </li>

        {/* Food */}
        <li>
          <Link href="/nutrition" className={`${card} h-full hover:border-emerald-400/40 transition-colors`}>
            <span className={label}><Utensils className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" /> Food</span>
            <span className="flex items-center gap-4 flex-1">
              <ProgressRing value={eaten ?? 0} goal={target ?? 1} color="#34D399" size={84}>
                <span className="text-lg font-extrabold text-white tabular-nums">{eaten ?? '–'}</span>
                <span className="text-[10px] text-white-70">kcal</span>
              </ProgressRing>
              <span className="text-sm text-white-70">
                {food ? (
                  <>
                    <span className="block text-white font-bold">{target! - eaten! > 0 ? `${target! - eaten!} kcal left` : 'Target reached'}</span>
                    <span className="block text-xs mt-0.5">of {target} today · {Math.round(food.totals.protein)} / {Math.round(food.targets.protein)} g protein</span>
                  </>
                ) : 'Log a meal to see how today adds up.'}
              </span>
            </span>
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">Log food <ArrowRight className="w-3 h-3" aria-hidden="true" /></span>
          </Link>
        </li>

        {/* Water */}
        <li className={card}>
          <span className={label}><GlassWater className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" /> Water</span>
          <span className="flex items-center gap-4 flex-1">
            <ProgressRing value={drunk ?? 0} goal={waterGoal} color="#60A5FA" size={84}>
              <span className="text-lg font-extrabold text-white tabular-nums">{drunk == null ? '–' : Math.floor(drunk / GLASS_ML)}</span>
              <span className="text-[10px] text-white-70">glasses</span>
            </ProgressRing>
            <span className="text-sm text-white-70" aria-live="polite">
              {food ? (
                <>
                  <span className="block text-white font-bold">{drunk! >= waterGoal ? 'Goal reached' : `${volumeText(waterGoal - drunk!, units)} to go`}</span>
                  <span className="block text-xs mt-0.5">{waterFailed ? 'Couldn’t save that. Check your connection.' : `${volumeText(drunk!, units)} of ${volumeText(waterGoal, units)}`}</span>
                </>
              ) : 'Tap + each time you drink a glass.'}
            </span>
          </span>
          <span className="flex gap-2">
            <button type="button" onClick={() => drink(-GLASS_ML)} disabled={!food || !drunk} aria-label="Remove a glass of water" className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center disabled:opacity-40">
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => drink(GLASS_ML)} disabled={!food} aria-label={`Add a glass of water (${volumeText(GLASS_ML, units)})`} className="flex-1 h-10 rounded-xl bg-blue-400 text-noir-eclipse text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-40">
              <Plus className="w-4 h-4" aria-hidden="true" /> Glass
            </button>
          </span>
        </li>

        {/* Steps */}
        <li>
          <Link href="/progress#health" className={`${card} h-full hover:border-sky-400/40 transition-colors`}>
            <span className={label}><Footprints className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" /> Steps</span>
            <span className="flex items-center gap-4 flex-1">
              <ProgressRing value={steps ?? 0} goal={STEP_GOAL} color="#38BDF8" size={84}>
                <span className="text-base font-extrabold text-white tabular-nums">{steps != null ? (steps >= 10000 ? `${(steps / 1000).toFixed(1)}k` : steps.toLocaleString()) : '–'}</span>
                <span className="text-[10px] text-white-70">steps</span>
              </ProgressRing>
              <span className="text-sm text-white-70">
                {steps != null ? (
                  <>
                    <span className="block text-white font-bold">{steps >= STEP_GOAL ? 'Goal reached' : `${(STEP_GOAL - steps).toLocaleString()} to go`}</span>
                    <span className="block text-xs mt-0.5">Daily goal {STEP_GOAL.toLocaleString()}</span>
                  </>
                ) : 'Connect your phone or a wearable to count steps.'}
              </span>
            </span>
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1">{steps != null ? 'Health details' : 'Connect'} <ArrowRight className="w-3 h-3" aria-hidden="true" /></span>
          </Link>
        </li>

        {/* Streak */}
        <li className={card}>
          <span className={label}><Flame className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" /> Streak</span>
          <span className="flex items-end gap-2 flex-1">
            <span className="text-5xl font-black text-white tabular-nums leading-none">{streak?.current ?? '–'}</span>
            <span className="text-sm text-white-70 pb-1">{streak?.current === 1 ? 'day' : 'days'}</span>
          </span>
          {/* The last seven days, a dot each; read out as one picture with its label. */}
          <span className="flex gap-1.5" role={summary ? 'img' : undefined} aria-label={summary ? `Trained on ${summary.days.slice(-7).filter((d) => d.sessions > 0).length} of the last 7 days` : undefined}>
            {(summary?.days.slice(-7) || Array.from({ length: 7 }, () => null)).map((d, i) => (
              <span key={i} className={`flex-1 h-2 rounded-full ${d && d.sessions > 0 ? 'bg-orange-400' : 'bg-white/10'}`} aria-hidden="true" />
            ))}
          </span>
          <span className="text-xs text-white-70">
            {streak ? (streak.current && !streak.trainedToday ? 'Train today to keep it going' : streak.trainedToday ? 'Trained today. Nice work!' : `Best: ${streak.longest} days`) : ' '}
          </span>
        </li>
      </ul>
    </section>
  );
}
