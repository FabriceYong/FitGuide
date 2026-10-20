'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Utensils } from 'lucide-react';
import { NUTRITION, type Meal } from '@fitguide/shared';
import { useAuth } from '../../contexts/AuthContext';
import { localToday } from '../../services/trainingService';
import {
  deleteLogEntry, fetchDayLog, fetchMealPlan, fetchNutritionHistory, logFood,
  type DayLog, type Macros, type MealPlan,
} from '../../services/nutritionService';
import { FoodPicker } from './FoodPicker';

const MEAL_LABELS: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' };

const shiftDate = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatDay = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

function MacroBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const over = value > target * 1.05;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold uppercase tracking-wider text-white-70">{label}</span>
        <span className={over ? 'text-amber-300' : 'text-white'}>{Math.round(value)} / {target} {unit}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={target}>
        <div className={`h-full rounded-full ${over ? 'bg-amber-400' : 'bg-lime-light'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Everything the page shows for one day. */
async function loadDay(day: string) {
  const [log, plan, history] = await Promise.all([fetchDayLog(day), fetchMealPlan(day), fetchNutritionHistory(14)]);
  return { log, plan, history: history.days };
}

const macroLine = (m: Macros) => `${Math.round(m.calories)} kcal · P ${Math.round(m.protein)} g · C ${Math.round(m.carbs)} g · F ${Math.round(m.fat)} g`;

/** /nutrition: daily targets, the food log, a suggested meal plan and recent history. */
export function NutritionView() {
  const { ready, hasAccount } = useAuth();
  const [date, setDate] = useState(() => (typeof window === 'undefined' ? '' : localToday()));
  const [log, setLog] = useState<DayLog | null>(null);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [history, setHistory] = useState<(Macros & { date: string })[]>([]);
  const [adding, setAdding] = useState<Meal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = date && date === localToday();

  const show = useCallback((data: Awaited<ReturnType<typeof loadDay>>) => {
    setLog(data.log);
    setPlan(data.plan);
    setHistory(data.history);
  }, []);
  const fail = (err: Error) => setError(err.message);
  const refresh = (day: string) => loadDay(day).then(show).catch(fail);

  useEffect(() => {
    if (!ready || !hasAccount || !date) return;
    loadDay(date).then(show).catch((err: Error) => setError(err.message));
    // Load once per sign-in; day changes call refresh() directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hasAccount, show]);

  const go = (days: number) => {
    const next = shiftDate(date, days);
    if (next > localToday()) return;
    setDate(next);
    setLog(null);
    refresh(next);
  };

  const remove = async (id: string) => {
    await deleteLogEntry(id);
    refresh(date);
  };

  const addSuggested = async (meal: Meal) => {
    const suggestion = plan?.meals.find((m) => m.meal === meal);
    if (!suggestion) return;
    for (const item of suggestion.items) {
      await logFood({ date, meal, foodSlug: item.foodSlug, servings: item.servings });
    }
    refresh(date);
  };

  if (!ready) return <p className="flex items-center gap-2 text-white-70"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>;
  if (!hasAccount) {
    return (
      <div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-8 text-center space-y-4">
        <p className="text-white-70">Sign in to get calorie and macro targets and log what you eat.</p>
        <Link href="/?next=/nutrition" className="inline-block px-6 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3"><Utensils className="w-8 h-8 text-lime-light" /> Nutrition</h1>
        {date && (
          <div className="flex items-center gap-2">
            <button onClick={() => go(-1)} aria-label="Previous day" className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-bold min-w-[170px] text-center">{today ? 'Today' : formatDay(date)}</span>
            <button onClick={() => go(1)} disabled={Boolean(today)} aria-label="Next day" className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertTriangle className="w-4 h-4" /> {error}</p>}
      {!log ? (
        <p className="flex items-center gap-2 text-white-70"><Loader2 className="w-4 h-4 animate-spin" /> Loading your day…</p>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
          <div className="space-y-6 min-w-0">
            <section className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white-70">Eaten</p>
                  <p className="text-4xl font-extrabold">{log.totals.calories}<span className="text-base text-white-70 font-semibold"> / {log.targets.calories} kcal</span></p>
                </div>
                <p className="text-sm text-white-70">{Math.max(0, log.targets.calories - log.totals.calories)} kcal left</p>
              </div>
              <MacroBar label="Protein" value={log.totals.protein} target={log.targets.protein} unit="g" />
              <MacroBar label="Carbs" value={log.totals.carbs} target={log.targets.carbs} unit="g" />
              <MacroBar label="Fat" value={log.totals.fat} target={log.targets.fat} unit="g" />
              <p className="text-xs text-white-70">
                Targets for your goal ({log.targets.goal.toLowerCase()}) and diet ({log.targets.diet}), estimated from your profile.
                {' '}{log.targets.notes.join(' ')}{' '}
                {log.targets.ageIsEstimate && <Link href="/" className="underline">Update your profile</Link>}
                {' '}These are estimates, not medical advice.
              </p>
            </section>

            {NUTRITION.MEALS.map((meal) => (
              <section key={meal} className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-extrabold">{MEAL_LABELS[meal]}</h2>
                  <button onClick={() => setAdding(meal)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15">
                    <Plus className="w-3.5 h-3.5" /> Add food
                  </button>
                </div>
                {log.meals[meal].length === 0 ? (
                  <p className="text-sm text-white-70">Nothing logged.</p>
                ) : (
                  <ul className="divide-y divide-white-30/10">
                    {log.meals[meal].map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{e.name} <span className="text-white-70 font-normal">× {e.servings}</span></p>
                          <p className="text-xs text-white-70">{macroLine(e)}</p>
                        </div>
                        <button onClick={() => remove(e.id)} aria-label={`Remove ${e.name}`} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white-70 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <div className="space-y-6">
            {plan && (
              <section className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="font-extrabold">Suggested meals</h2>
                  <p className="text-xs text-white-70 mt-1">A sample day for your diet, about {plan.totals.calories} kcal. A new mix each day.</p>
                </div>
                {plan.meals.map((m) => (
                  <div key={m.meal} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white-70">{MEAL_LABELS[m.meal]} · {m.totals.calories} kcal</h3>
                      <button onClick={() => addSuggested(m.meal)} className="text-xs font-bold text-lime-light hover:underline">Log these</button>
                    </div>
                    <ul className="text-sm space-y-0.5">
                      {m.items.map((item) => (
                        <li key={item.foodSlug}>{item.name} <span className="text-white-70">· {item.servings} × {item.servingLabel}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {history.length > 0 && (
              <section className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-5 space-y-3">
                <h2 className="font-extrabold">Last 14 days</h2>
                <div className="h-48" role="img" aria-label="Calories per day for the last 14 days">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={history} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8)} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[0, (max: number) => Math.ceil((Math.max(max, log.targets.calories) * 1.1) / 100) * 100]} />
                      <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8 }} formatter={(v) => [`${v} kcal`, 'Eaten']} />
                      <ReferenceLine y={log.targets.calories} stroke="#E5E7EB" strokeDasharray="4 4" />
                      <Bar dataKey="calories" fill="#00C4B4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-white-70">Dashed line: your daily target.</p>
              </section>
            )}
          </div>
        </div>
      )}

      {adding && (
        <FoodPicker
          meal={adding}
          date={date}
          onClose={() => setAdding(null)}
          onAdded={() => {
            setAdding(null);
            refresh(date);
          }}
        />
      )}
    </div>
  );
}
