'use client';

import { useEffect, useRef } from 'react';
import { demoBounds, figureAt, HEAD_RADIUS, periodMs, stillFrame, type DrawnDemo as Demo, type Figure, type Pt } from './drawnDemos';

/** "#00C4B4" with an alpha (0..1) as an rgba() colour. */
function rgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const last = (pts: Pt[]) => pts[pts.length - 1];
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, demo: Demo, fig: Figure, color: string) {
  ctx.clearRect(0, 0, w, h);
  const inset = Math.min(w, h) * 0.06;
  const area = { left: inset, top: inset, right: w - inset, bottom: h - inset };
  const aw = area.right - area.left, ah = area.bottom - area.top;
  if (aw <= 0 || ah <= 0) return;
  const b = demoBounds(demo);
  const bw = b.right - b.left, bh = b.bottom - b.top;
  // Same figure size across demos: fit a standing person's height, unless the movement needs more room.
  const scale = Math.min(aw / bw, ah / Math.max(bh, 112));
  const dx = (area.left + area.right) / 2 - ((b.left + b.right) / 2) * scale;
  const dy = area.bottom - b.bottom * scale - Math.max(0, ah - bh * scale) * 0.12;

  ctx.save();
  ctx.translate(dx, dy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const left = (area.left - dx) / scale, right = (area.right - dx) / scale;
  const stroke = (c: string, width: number) => { ctx.strokeStyle = c; ctx.lineWidth = width; };
  const line = (a: Pt, z: Pt) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(z.x, z.y); ctx.stroke(); };
  const circle = (c: Pt, r: number, fill: string, edge?: string) => {
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
    if (edge) { stroke(edge, 1.5); ctx.stroke(); }
  };
  const limb = (pts: Pt[], c: string) => {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (const q of pts.slice(1)) ctx.lineTo(q.x, q.y);
    stroke(c, 5); ctx.stroke();
  };

  if (demo.anchor !== 'hang') {
    // Floor and a soft shadow under the figure.
    stroke(rgba(color, 0.18), 1.2);
    line({ x: left, y: 1.5 }, { x: right, y: 1.5 });
    const xs = [fig.hip.x, fig.shoulder.x, fig.leg1[2].x, last(fig.arm1).x];
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const half = (Math.max(...xs) - Math.min(...xs)) / 2 + 14;
    ctx.beginPath(); ctx.ellipse(cx, 1.5, half, 2.5, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
  }

  // Equipment behind the figure.
  const gear = rgba(color, 0.35);
  for (const prop of demo.props) {
    stroke(rgba(color, 0.45), 2.5);
    if (prop === 'bench') {
      const top = Math.max(fig.hip.y, fig.shoulder.y) + 4.5;
      const x0 = Math.min(fig.hip.x, fig.shoulder.x) - 4, x1 = Math.max(fig.hip.x, fig.shoulder.x) + 4;
      ctx.fillStyle = gear; ctx.beginPath(); ctx.roundRect(x0, top, x1 - x0, 4, 2); ctx.fill();
      line({ x: x0 + 5, y: top + 4 }, { x: x0 + 5, y: 0 });
      line({ x: x1 - 5, y: top + 4 }, { x: x1 - 5, y: 0 });
    } else if (prop === 'dipBench') {
      const hand = last(fig.arm1);
      const top = hand.y + 2.5;
      ctx.fillStyle = gear; ctx.beginPath(); ctx.roundRect(hand.x - 16, top, 22, 4, 2); ctx.fill();
      line({ x: hand.x - 12, y: top + 4 }, { x: hand.x - 12, y: 0 });
      line({ x: hand.x + 2, y: top + 4 }, { x: hand.x + 2, y: 0 });
    } else if (prop === 'wall') {
      const x = Math.max(...[...fig.leg1, ...fig.leg2].map((o) => o.x)) + 5;
      ctx.fillStyle = gear; ctx.fillRect(x, -120, 4, 120);
    } else if (prop === 'bar') {
      const y = last(fig.arm1).y - 1;
      stroke(rgba(color, 0.5), 3);
      line({ x: left, y }, { x: right, y });
    } else if (prop === 'roller') {
      // Under the calves
      const m = mid(fig.leg1[1], fig.leg1[2]);
      const r = Math.max(3, -m.y / 2 - 1);
      circle({ x: m.x, y: -r }, r, gear);
    }
  }

  const far = rgba(color, demo.front ? 1 : 0.4);
  if (!demo.front) limb(fig.arm2, far);
  limb(fig.leg2, far);
  limb(fig.leg1, color);
  ctx.beginPath();
  ctx.moveTo(fig.hip.x, fig.hip.y);
  ctx.quadraticCurveTo(fig.spine.x, fig.spine.y, fig.shoulder.x, fig.shoulder.y);
  stroke(color, 7); ctx.stroke();
  stroke(color, 4); line(fig.shoulder, fig.head);
  circle(fig.head, HEAD_RADIUS, color);
  if (demo.front) limb(fig.arm2, far);
  limb(fig.arm1, color);

  // Equipment in the hands.
  const held = rgba(color, 0.55);
  for (const prop of demo.props) {
    if (prop === 'barbell') {
      const at = demo.front ? mid(last(fig.arm1), last(fig.arm2)) : last(fig.arm1);
      circle(at, 9, held, color);
      circle(at, 2, color);
    } else if (prop === 'dumbbells') {
      for (const hand of [last(fig.arm1), last(fig.arm2)]) circle(hand, 4, held, color);
    } else if (prop === 'gloves') {
      for (const hand of [last(fig.arm2), last(fig.arm1)]) circle(hand, 4.2, color);
    } else if (prop === 'ball') {
      const m = mid(last(fig.arm1), last(fig.arm2));
      circle({ x: m.x + 1, y: m.y + 3 }, 5.5, held, color);
    }
  }
  ctx.restore();
}

/**
 * Plays a drawn demo on a loop (the app's ExerciseDemoView): a figure moving
 * between its key poses. Shows the key pose without moving when `animate` is
 * false or the visitor prefers reduced motion.
 */
export function DrawnDemo({ demo, color, animate = true, className = '' }: { demo: Demo; color: string; animate?: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return undefined;
    const moving = animate && demo.frames.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const period = periodMs(demo);
    const start = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const ratio = window.devicePixelRatio || 1;
      const w = el.clientWidth, h = el.clientHeight;
      if (el.width !== Math.round(w * ratio) || el.height !== Math.round(h * ratio)) {
        el.width = Math.round(w * ratio);
        el.height = Math.round(h * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const progress = moving ? ((now - start) % period) / period : stillFrame(demo) / demo.frames.length;
      paint(ctx, w, h, demo, figureAt(demo, progress), color);
      if (moving) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    // Redraw the still pose when the canvas changes size.
    const resize = new ResizeObserver(() => { if (!moving) raf = requestAnimationFrame(draw); });
    resize.observe(el);
    return () => { cancelAnimationFrame(raf); resize.disconnect(); };
  }, [demo, color, animate]);

  return <canvas ref={canvas} role="img" aria-label={`Demonstration: ${demo.name}`} className={`block w-full h-full ${className}`} />;
}
