/**
 * Packaged food by barcode, from Open Food Facts (openfoodfacts.org, open
 * data under the ODbL: apps that show it credit them). Their API needs no
 * key, asks for a User-Agent naming the app, and allows about 100 product
 * lookups a minute, so results are kept for a day.
 */
const BASE = () => (process.env.OFF_API_BASE || 'https://world.openfoodfacts.org').replace(/\/+$/, '');
const USER_AGENT = 'FitGuide/1.0 (https://fitguide.app; support@fitguide.app)';
const FIELDS = 'code,product_name,brands,serving_size,serving_quantity,nutriments';
const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 2000;

let fetcher = (...args) => fetch(...args);
const cache = new Map(); // code → { at, product }

/** Replace how Open Food Facts is called (tests). */
function setFetch(fn) {
  fetcher = fn || ((...args) => fetch(...args));
  cache.clear();
}

/** EAN-8, UPC-A (12), EAN-13 or GTIN-14 digits. */
const isBarcode = (code) => /^(\d{8}|\d{12,14})$/.test(String(code));

const num = (v) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 10) / 10);

/** kcal: given, or worked out from kJ. */
const kcal = (n, suffix) => num(n[`energy-kcal_${suffix}`]) ?? (num(n[`energy_${suffix}`]) != null ? num(n[`energy_${suffix}`] / 4.184) : null);

function macros(n, suffix) {
  const values = { calories: kcal(n, suffix), protein: num(n[`proteins_${suffix}`]), carbs: num(n[`carbohydrates_${suffix}`]), fat: num(n[`fat_${suffix}`]) };
  return values.calories == null ? null : { calories: values.calories, protein: values.protein ?? 0, carbs: values.carbs ?? 0, fat: values.fat ?? 0 };
}

/** The product as the apps use it: per 100 g (or ml) and, if known, per serving. */
function toProduct(code, p) {
  const n = p.nutriments || {};
  const per100g = macros(n, '100g');
  const perServing = macros(n, 'serving');
  if (!per100g && !perServing) return null;
  return {
    code,
    name: String(p.product_name || '').trim() || `Product ${code}`,
    brand: String(p.brands || '').split(',')[0].trim() || null,
    serving: p.serving_size ? String(p.serving_size).slice(0, 60) : null,
    per100g,
    perServing,
  };
}

/**
 * Look up a barcode. Null when Open Food Facts doesn't know it (or has no
 * calories for it). Throws if the service can't be reached.
 */
async function lookup(code) {
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < DAY_MS) return hit.product;

  const res = await fetcher(`${BASE()}/api/v2/product/${code}.json?fields=${FIELDS}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return remember(code, null);
  if (!res.ok) throw new Error(`Open Food Facts answered ${res.status}`);
  const data = await res.json();
  return remember(code, data.status === 1 && data.product ? toProduct(code, data.product) : null);
}

function remember(code, product) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(code, { at: Date.now(), product });
  return product;
}

module.exports = { isBarcode, lookup, setFetch, toProduct };
