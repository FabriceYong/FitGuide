'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, ScanBarcode, Search, X } from 'lucide-react';
import type { Meal } from '@fitguide/shared';
import { logFood, lookupBarcode, searchFoods, type BarcodeProduct, type Food } from '../../services/nutritionService';
import { BarcodeCamera, canScanBarcodes } from './BarcodeCamera';
import { track } from '../../lib/analytics';

interface Props {
  meal: Meal;
  date: string;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * Dialog to log a food: search the catalog, look up a packaged food by its
 * barcode (read by the camera where the browser can, or typed), or enter a
 * one-off item. A found product fills in the manual form, to check and add.
 */
export function FoodPicker({ meal, date, onClose, onAdded }: Props) {
  const [search, setSearch] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Food | null>(null);
  const [servings, setServings] = useState(1);
  const [mode, setMode] = useState<'search' | 'barcode' | 'manual'>('search');
  const custom = mode === 'manual';
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [perServing, setPerServing] = useState(true);
  const [manual, setManual] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      searchFoods(search)
        .then((found) => setFoods(found))
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.querySelector('input')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The product's numbers per serving or per 100 g, in the manual form.
  const fill = (p: BarcodeProduct, serving: boolean) => {
    const m = (serving ? p.perServing : p.per100g)!;
    setPerServing(serving);
    setManual({
      name: `${[p.brand, p.name].filter(Boolean).join(' ')} (${serving ? p.serving || '1 serving' : '100 g'})`,
      calories: String(m.calories), protein: String(m.protein), carbs: String(m.carbs), fat: String(m.fat),
    });
  };

  const findBarcode = useCallback(async (value: string) => {
    setScanning(false);
    if (!/^(\d{8}|\d{12,14})$/.test(value)) return setError('A barcode is 8, 12, 13 or 14 digits.');
    setBusy(true);
    setError(null);
    try {
      const found = await lookupBarcode(value);
      if (!found) return setError('We couldn’t find that product. Enter it manually instead.');
      setProduct(found);
      fill(found, Boolean(found.perServing));
      setMode('manual');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  const onCode = useCallback((value: string) => { setCode(value); findBarcode(value); }, [findBarcode]);
  const onCameraError = useCallback((message: string) => { setScanning(false); setError(message); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (custom) {
        const n = (v: string) => Number(v || 0);
        await logFood({ date, meal, servings, name: manual.name, calories: n(manual.calories), protein: n(manual.protein), carbs: n(manual.carbs), fat: n(manual.fat) });
      } else if (selected) {
        await logFood({ date, meal, servings, foodSlug: selected.slug });
      }
      track('food_logged', { custom, barcode: Boolean(product) });
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Clicking outside closes the dialog; keyboard users have Escape and the close button. */}
      <button type="button" tabIndex={-1} aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/70 cursor-default" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="food-picker-title"
        className="relative w-full max-w-lg bg-obsidian-wave border border-white-30/10 rounded-2xl p-5 space-y-4 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between">
          <h2 id="food-picker-title" className="font-extrabold">Add to {meal}</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-bold">
          {([['search', 'Search foods'], ['barcode', 'Barcode'], ['manual', 'Enter manually']] as const).map(([id, text]) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => { setMode(id); setError(null); setScanning(false); }} className={`px-3 py-2 rounded-lg ${mode === id ? 'bg-lime-light text-noir-eclipse' : 'bg-white/10'}`}>{text}</button>
          ))}
        </div>

        {mode === 'barcode' && (
          <div className="space-y-3">
            {scanning ? (
              <>
                <BarcodeCamera onCode={onCode} onError={onCameraError} />
                <button type="button" onClick={() => setScanning(false)} className="text-xs font-bold text-white-70 underline">Stop the camera</button>
              </>
            ) : canScanBarcodes() && (
              <button type="button" onClick={() => { setError(null); setScanning(true); }} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">
                <ScanBarcode className="w-4 h-4" aria-hidden="true" /> Scan with the camera
              </button>
            )}
            <form onSubmit={(e) => { e.preventDefault(); findBarcode(code.trim()); }} className="flex items-end gap-2">
              <label className="flex-1 block text-xs font-bold text-white-70">{canScanBarcodes() ? 'Or type the barcode' : 'Barcode number'}
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={14} placeholder="e.g. 3017620422003" className={`${field} mt-1`} />
              </label>
              <button type="submit" disabled={busy || !code} className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Look up
              </button>
            </form>
            <p className="text-xs text-white-70">Product details from <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer" className="underline">Open Food Facts</a>.</p>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          </div>
        )}

        {mode !== 'barcode' && (
        <form onSubmit={submit} className="flex flex-col gap-3 min-h-0">
          {mode === 'search' ? (
            <>
              <label className="relative block">
                <span className="sr-only">Search foods</span>
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white-70" />
                <input value={search} onChange={(e) => { setLoading(true); setSearch(e.target.value); }} placeholder="Search, e.g. oats, salmon" className={`${field} pl-9`} />
              </label>
              <ul className="overflow-y-auto min-h-0 max-h-64 divide-y divide-white-30/10" aria-busy={loading}>
                {loading && <li className="py-3 text-sm text-white-70 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Searching…</li>}
                {!loading && foods.length === 0 && <li className="py-3 text-sm text-white-70">No foods found. Try “Enter manually”.</li>}
                {!loading && foods.map((f) => (
                  <li key={f.slug}>
                    <button
                      type="button"
                      onClick={() => setSelected(f)}
                      aria-pressed={selected?.slug === f.slug}
                      className={`w-full text-left py-2.5 px-2 rounded-lg ${selected?.slug === f.slug ? 'bg-lime-light/15' : 'hover:bg-white/5'}`}
                    >
                      <span className="block text-sm font-semibold">{f.name}{f.isCustom && <span className="ml-2 text-[10px] uppercase text-white-70">yours</span>}</span>
                      <span className="block text-xs text-white-70">{f.servingLabel} · {f.calories} kcal · P {f.protein} g · C {f.carbs} g · F {f.fat} g</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {product && (
                <div className="col-span-2 space-y-2">
                  <p className="text-xs text-white-70">From Open Food Facts. Check the numbers against the pack.</p>
                  {product.perServing && product.per100g && (
                    <div className="flex gap-2 text-xs font-bold" role="group" aria-label="Numbers for">
                      <button type="button" aria-pressed={perServing} onClick={() => fill(product, true)} className={`px-3 py-2 rounded-lg ${perServing ? 'bg-lime-light/15 border border-lime-light' : 'bg-white/10'}`}>Per serving{product.serving ? ` (${product.serving})` : ''}</button>
                      <button type="button" aria-pressed={!perServing} onClick={() => fill(product, false)} className={`px-3 py-2 rounded-lg ${!perServing ? 'bg-lime-light/15 border border-lime-light' : 'bg-white/10'}`}>Per 100 g</button>
                    </div>
                  )}
                </div>
              )}
              <label className="col-span-2 block text-xs font-bold text-white-70">Name
                <input required value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} maxLength={120} className={`${field} mt-1`} />
              </label>
              {(['calories', 'protein', 'carbs', 'fat'] as const).map((k) => (
                <label key={k} className="block text-xs font-bold text-white-70 capitalize">{k}{k === 'calories' ? ' (kcal)' : ' (g)'} per serving
                  <input required={k === 'calories'} type="number" min={0} step="any" value={manual[k]} onChange={(e) => setManual({ ...manual, [k]: e.target.value })} className={`${field} mt-1`} />
                </label>
              ))}
            </div>
          )}

          <label className="block text-xs font-bold text-white-70">Servings
            <input type="number" min={0.25} max={20} step={0.25} value={servings} onChange={(e) => setServings(Number(e.target.value))} className={`${field} mt-1`} />
          </label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={busy || (!custom && !selected)} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Add
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
