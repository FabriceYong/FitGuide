'use client';

/**
 * Picture cards to share a workout or a week: drawn on a canvas at
 * Instagram portrait size (1080 × 1350), then shared through the device's
 * share sheet where the browser supports sharing files, or saved as a PNG.
 * The app draws the same cards (lib/src/widgets/share_card.dart).
 */
import { BACK, FRONT } from '../features/dashboard/components/BodyMap';

const W = 1080;
const H = 1350;
const LIME = '#00C4B4';
const INK = '#0A0C10';
const FONT = '"Inter", "Segoe UI", system-ui, sans-serif';

export interface WorkoutCard {
  title: string;
  /** Shown under the title, e.g. "Mon 2 Nov". */
  date: string;
  stats: { label: string; value: string }[];
  /** "Goblet Squat · 24 kg × 8" */
  records: string[];
}

export interface WeekCard {
  /** Workouts in the last 7 days that worked each body region. */
  regions: Record<string, number>;
  stats: { label: string; value: string }[];
}

function canvas() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#16202B');
  bg.addColorStop(1, INK);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = LIME;
  ctx.fillRect(0, 0, W, 14);
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText('FITGUIDE', 80, 120);
  return { c, ctx };
}

/** Text that shrinks to fit `maxWidth`, wrapping onto a second line if it has to. */
function title(ctx: CanvasRenderingContext2D, text: string, y: number) {
  let size = 96;
  ctx.fillStyle = '#FFFFFF';
  for (; size > 56; size -= 4) {
    ctx.font = `900 ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= W - 160) break;
  }
  if (ctx.measureText(text).width <= W - 160) {
    ctx.fillText(text, 80, y);
    return y;
  }
  const words = text.split(' ');
  let line = '';
  let used = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > W - 160 && line) {
      ctx.fillText(line, 80, used);
      used += size * 1.1;
      line = word;
    } else line = next;
  }
  ctx.fillText(line, 80, used);
  return used;
}

function stats(ctx: CanvasRenderingContext2D, items: { label: string; value: string }[], top: number) {
  const cols = Math.min(2, items.length);
  const gap = 24;
  const w = (W - 160 - gap * (cols - 1)) / cols;
  const h = 170;
  items.slice(0, 4).forEach((s, i) => {
    const x = 80 + (i % cols) * (w + gap);
    const y = top + Math.floor(i / cols) * (h + gap);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 28);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText(s.value, x + 36, y + 92);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText(s.label, x + 36, y + 138);
  });
  return top + Math.ceil(Math.min(items.length, 4) / cols) * (h + gap);
}

function footer(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText('Trained with FitGuide', 80, H - 80);
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not make the picture.'))), 'image/png'));

/** A finished workout: its title, numbers and any personal records. */
export function drawWorkoutCard(card: WorkoutCard): Promise<Blob> {
  const { c, ctx } = canvas();
  ctx.fillStyle = LIME;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText('WORKOUT COMPLETE', 80, 250);
  const bottom = title(ctx, card.title, 350);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `500 34px ${FONT}`;
  ctx.fillText(card.date, 80, bottom + 64);
  let y = stats(ctx, card.stats, bottom + 120);
  if (card.records.length) {
    y += 30;
    ctx.fillStyle = '#FCD34D';
    ctx.font = `800 38px ${FONT}`;
    ctx.fillText(card.records.length === 1 ? '🏆 New personal record' : '🏆 New personal records', 80, y);
    ctx.font = `600 34px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    card.records.slice(0, 3).forEach((r, i) => ctx.fillText(r, 80, y + 64 + i * 54));
  }
  footer(ctx);
  return toBlob(c);
}

/** Front and back figures shaded by how often each region was trained (as MusclesThisWeek). */
function figure(ctx: CanvasRenderingContext2D, paths: [string, string][], regions: Record<string, number>, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(100, 30, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fill(new Path2D('M92,46 L108,46 L106,58 L94,58 Z'));
  for (const [region, d] of paths) {
    const n = regions[region] || 0;
    const path = new Path2D(d);
    if (n > 0) {
      ctx.globalAlpha = n >= 3 ? 1 : 0.35 + 0.3 * (n - 1);
      ctx.fillStyle = LIME;
      ctx.fill(path);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill(path);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
    }
    ctx.stroke(path);
  }
  ctx.restore();
}

/** The week: the muscle map and the week's numbers. */
export function drawWeekCard(card: WeekCard): Promise<Blob> {
  const { c, ctx } = canvas();
  ctx.fillStyle = LIME;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText('MY WEEK', 80, 250);
  title(ctx, 'Muscles trained', 350);
  const scale = 1.9;
  figure(ctx, FRONT, card.regions, 150, 410, scale);
  figure(ctx, BACK, card.regions, 550, 410, scale);
  stats(ctx, card.stats, 1030);
  footer(ctx);
  return toBlob(c);
}

/**
 * Share the picture with the device's share sheet, or save it when the
 * browser can't share files. Resolves "cancelled" if the person closes the sheet.
 */
export async function shareImage(blob: Blob, filename: string, text: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'cancelled';
      // Some browsers refuse files after saying they can share them; save instead.
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'saved';
}
