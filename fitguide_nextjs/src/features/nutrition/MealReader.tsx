'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Check, Loader2, PenLine, Sparkles, Trash2 } from 'lucide-react';
import { NUTRITION, type Meal } from '@fitguide/shared';
import { Modal } from '../../components/Modal';
import {
  fetchMealReadingStatus, logFood, readMealPhoto, readMealText,
  type MealReading, type MealReadingStatus, type ReadItem,
} from '../../services/nutritionService';

const MEAL_LABELS: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

/** The meal that fits the time of day. */
const mealNow = (): Meal => {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
};

const CONFIDENCE = { high: '', medium: 'Check the portion', low: 'Rough guess: check it' } as const;

/** An item with the member's edits: kept or not, and how many servings. */
type Row = ReadItem & { keep: boolean; amount: number };

/** Nutrition for a row at its edited amount (list foods scale by servings; one-offs by their single serving). */
const scaleRow = (r: Row) => {
  const k = r.amount / r.servings;
  return { calories: Math.round(r.calories * k), protein: Math.round(r.protein * k * 10) / 10, carbs: Math.round(r.carbs * k * 10) / 10, fat: Math.round(r.fat * k * 10) / 10 };
};

/**
 * "Snap a meal" and "Type a meal" on the Nutrition page: Claude reads the
 * foods and portions, the member checks and adjusts them, and only then are
 * they logged. Shows the day's remaining allowance.
 */
export function MealReader({ date, onLogged }: { date: string; onLogged: () => void }) {
  const [status, setStatus] = useState<MealReadingStatus | null>(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'photo' | 'text' | 'log' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<MealReading | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [meal, setMeal] = useState<Meal>(mealNow);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMealReadingStatus().then(setStatus).catch(() => setStatus(null));
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const show = (result: MealReading) => {
    setReading(result);
    setRows(result.items.map((i) => ({ ...i, keep: true, amount: i.servings })));
    setStatus((s) => (s ? { ...s, allowance: result.allowance } : s));
    setMeal(mealNow());
  };

  const fail = (err: Error) => setError(err.message);

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setBusy('photo');
    setPreview(URL.createObjectURL(file));
    try {
      show(await readMealPhoto(file));
    } catch (err) {
      fail(err as Error);
      setPreview(null);
    } finally {
      setBusy(null);
    }
  };

  const onText = async () => {
    if (text.trim().length < 2) return;
    setError(null);
    setBusy('text');
    try {
      show(await readMealText(text.trim()));
      setTyping(false);
      setText('');
    } catch (err) {
      fail(err as Error);
    } finally {
      setBusy(null);
    }
  };

  const close = () => { setReading(null); setPreview(null); };

  const logAll = async () => {
    setBusy('log');
    setError(null);
    try {
      for (const r of rows.filter((x) => x.keep && x.amount > 0)) {
        if (r.foodSlug) await logFood({ date, meal, foodSlug: r.foodSlug, servings: r.amount });
        else await logFood({ date, meal, servings: r.amount, name: r.name, calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat });
      }
      close();
      onLogged();
    } catch (err) {
      fail(err as Error);
    } finally {
      setBusy(null);
    }
  };

  if (!status?.available) return null;
  const { photos, texts } = status.allowance;
  const kept = rows.filter((r) => r.keep && r.amount > 0);
  const total = kept.reduce((n, r) => n + scaleRow(r).calories, 0);

  return (
    <section aria-labelledby="meal-reader" className="rounded-2xl p-5 space-y-4 border border-lime-light/25 bg-gradient-to-br from-lime-light/10 to-obsidian-wave">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="meal-reader" className="font-extrabold flex items-center gap-2"><Sparkles className="w-4 h-4 text-lime-light" aria-hidden="true" /> Log a meal in seconds</h2>
          <p className="text-xs text-white-70 mt-1">Snap your plate or describe it, then check what FitGuide found before logging.</p>
        </div>
        <p className="text-[11px] text-white-70 text-right">{photos.left} of {photos.max} photos · {texts.left} of {texts.max} descriptions left today</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy !== null || photos.left === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-50"
        >
          {busy === 'photo' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Camera className="w-4 h-4" aria-hidden="true" />}
          {busy === 'photo' ? 'Reading your meal…' : 'Snap a meal'}
        </button>
        {/* capture opens the camera on a phone; a computer gets a file picker. */}
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={onPhoto} aria-label="Photo of your meal" tabIndex={-1} />
        <button type="button" onClick={() => setTyping(!typing)} aria-expanded={typing} disabled={busy !== null || texts.left === 0} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 font-bold text-sm disabled:opacity-50">
          <PenLine className="w-4 h-4" aria-hidden="true" /> Type a meal
        </button>
      </div>

      {typing && (
        <div className="space-y-2">
          <label htmlFor="meal-text" className="sr-only">What did you eat?</label>
          <textarea
            id="meal-text"
            rows={2}
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 2 scrambled eggs, a slice of wholemeal toast with butter and a flat white"
            className="w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white"
          />
          <button type="button" onClick={onText} disabled={busy !== null || text.trim().length < 2} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-50">
            {busy === 'text' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Find the foods
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {(photos.left === 0 || texts.left === 0) && (
        <p className="text-xs text-white-70">{photos.left === 0 ? 'No photos left today. ' : ''}{texts.left === 0 ? 'No descriptions left today. ' : ''}They refresh over the next 24 hours; you can still add foods by hand.</p>
      )}

      {reading && (
        <Modal title="Check your meal" onClose={close} size="lg" placement="sheet">
          <div className="space-y-4">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Your meal" className="w-full max-h-56 object-cover rounded-xl border border-white-30/10" />
            )}
            {rows.length === 0 ? (
              <p className="text-sm text-white-70">{reading.note || 'No food found. Try another photo or describe the meal in words.'}</p>
            ) : (
              <>
                {reading.note && <p className="text-xs text-amber-200 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">{reading.note}</p>}
                <ul className="space-y-2">
                  {rows.map((r, i) => {
                    const n = scaleRow(r);
                    const set = (change: Partial<Row>) => setRows((all) => all.map((x, j) => (j === i ? { ...x, ...change } : x)));
                    return (
                      <li key={`${r.name}-${i}`} className={`flex items-center gap-3 p-3 rounded-xl border ${r.keep ? 'bg-obsidian-wave border-white-30/15' : 'border-white-30/10 opacity-50'}`}>
                        <input type="checkbox" checked={r.keep} onChange={(e) => set({ keep: e.target.checked })} aria-label={`Log ${r.name}`} className="w-4 h-4 accent-lime-light shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold truncate">{r.name}</span>
                          <span className="block text-xs text-white-70">
                            {r.portion} · ~{r.grams} g · {n.calories} kcal · P {n.protein} g
                            {CONFIDENCE[r.confidence] && <span className="text-amber-300"> · {CONFIDENCE[r.confidence]}</span>}
                          </span>
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-white-70 shrink-0">
                          <span className="sr-only">Servings of {r.name}</span>
                          <input
                            type="number"
                            min="0.25"
                            max={NUTRITION.MAX_SERVINGS}
                            step="0.25"
                            value={r.amount}
                            onChange={(e) => set({ amount: Math.min(NUTRITION.MAX_SERVINGS, Math.max(0, Number(e.target.value) || 0)) })}
                            className="w-16 bg-noir-eclipse border border-white-30/20 rounded-lg px-2 py-1 text-sm text-white text-right"
                          />
                          ×
                        </label>
                        <button type="button" onClick={() => setRows((all) => all.filter((_, j) => j !== i))} aria-label={`Remove ${r.name}`} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white-70 hover:text-red-300 shrink-0">
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-white-70">Add to</span>
                    <select value={meal} onChange={(e) => setMeal(e.target.value as Meal)} className="bg-noir-eclipse border border-white-30/20 rounded-lg px-2 py-1.5 text-sm text-white">
                      {NUTRITION.MEALS.map((m) => <option key={m} value={m}>{MEAL_LABELS[m]}</option>)}
                    </select>
                  </label>
                  <span className="text-sm font-bold">{total} kcal</span>
                </div>
                <p className="text-[11px] text-white-70">Portions and nutrition are estimates from the {preview ? 'photo' : 'description'}. Sauces and oil can be hard to see. Adjust anything that looks off.</p>
                <button type="button" onClick={logAll} disabled={busy !== null || kept.length === 0} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-light text-noir-eclipse font-extrabold text-sm disabled:opacity-50">
                  {busy === 'log' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
                  Log {kept.length} {kept.length === 1 ? 'item' : 'items'}
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
