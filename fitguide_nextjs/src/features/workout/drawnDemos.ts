/**
 * Drawn demonstrations for workout steps: a stick figure moving between a few
 * key poses, so every movement has a picture that matches it, with no network
 * or licensing needed. A port of the app's lib/src/features/workout/
 * exercise_demos.dart (same names, poses and timing); the API's
 * /exercise-media/demo names the movement, and DrawnDemo.tsx draws it.
 *
 * Angles are in degrees: 0 points down, 90 forward (the way the figure faces),
 * 180 up, -90 back. Side-view figures face right; front-view ones face the viewer.
 */

type Limb = [number, number];

/**
 * One key pose. t torso (hip to shoulders), h head turn from the torso, c
 * spine curve (+ rounds the back, - arches it), a1/a2 near/far arm (upper arm,
 * forearm), l1/l2 near/far leg (thigh, shin). In front view 1 is the limb on
 * the viewer's left. lift raises the figure off the floor (a jump); pt points
 * the toes; f fixes the foot angle (90 = flat).
 */
export interface Pose {
  t: number;
  h: number;
  c: number;
  a1: Limb;
  a2: Limb;
  l1: Limb;
  l2: Limb;
  lift: number;
  pt: boolean;
  f?: number;
}

/** Which point stays put while the figure moves. */
type Anchor = 'foot' | 'farFoot' | 'hand' | 'hip' | 'hang';

/** Equipment drawn with the figure. */
export type Prop = 'barbell' | 'dumbbells' | 'bench' | 'dipBench' | 'wall' | 'bar' | 'roller' | 'ball' | 'gloves';

export interface DrawnDemo {
  name: string;
  frames: Pose[];
  /** Only used when no other demo matches (e.g. a plain "stretch"). */
  weak: boolean;
  front: boolean;
  anchor: Anchor;
  /** Seconds from one key pose to the next, and the share of that spent holding the pose. */
  beat: number;
  hold: number;
  props: Prop[];
  /** The key pose to show when not animating. */
  still?: number;
}

const P = (p: Partial<Pose>): Pose => ({ t: 180, h: 0, c: 0, a1: [8, 14], a2: [-6, 2], l1: [0, 0], l2: [0, 0], lift: 0, pt: false, ...p });
const D = (name: string, frames: Pose[], o: Partial<DrawnDemo> = {}): DrawnDemo => ({
  name, frames, weak: false, front: false, anchor: 'foot', beat: 0.9, hold: 0.3, props: [], ...o,
});

const mix = (a: number, b: number, x: number) => a + (b - a) * x;
const mixLimb = (a: Limb, b: Limb, x: number): Limb => [mix(a[0], b[0], x), mix(a[1], b[1], x)];

function lerpPose(a: Pose, b: Pose, x: number): Pose {
  return {
    t: mix(a.t, b.t, x),
    h: mix(a.h, b.h, x),
    c: mix(a.c, b.c, x),
    a1: mixLimb(a.a1, b.a1, x),
    a2: mixLimb(a.a2, b.a2, x),
    l1: mixLimb(a.l1, b.l1, x),
    l2: mixLimb(a.l2, b.l2, x),
    lift: mix(a.lift, b.lift, x),
    pt: x < 0.5 ? a.pt : b.pt,
    f: a.f != null && b.f != null ? mix(a.f, b.f, x) : (x < 0.5 ? a.f : b.f),
  };
}

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

export const stillFrame = (d: DrawnDemo) => d.still ?? (d.frames.length > 1 ? 1 : 0);
export const periodMs = (d: DrawnDemo) => Math.round(d.beat * d.frames.length * 1000);

/** The pose at `progress` (0..1) through one loop of the key poses. */
export function poseAt(d: DrawnDemo, progress: number): Pose {
  const { frames } = d;
  if (frames.length === 1) return frames[0];
  const n = frames.length;
  const p = (((progress % 1) + 1) % 1) * n;
  const i = Math.floor(p) % n;
  const local = p - Math.floor(p);
  const x = local <= d.hold ? 0 : ease((local - d.hold) / (1 - d.hold));
  return lerpPose(frames[i], frames[(i + 1) % n], x);
}

// ─── Geometry ────────────────────────────────────────────────────────────────

export interface Pt { x: number; y: number }
export interface Figure {
  hip: Pt;
  shoulder: Pt;
  spine: Pt;
  head: Pt;
  arm1: Pt[];
  arm2: Pt[];
  leg1: Pt[];
  leg2: Pt[];
}
export interface Box { left: number; top: number; right: number; bottom: number }

const TORSO = 30, NECK = 3, UPPER_ARM = 17, FOREARM = 17, THIGH = 26, SHIN = 26, FOOT = 6;
export const HEAD_RADIUS = 7;
const SHOULDER_HALF = 7, HIP_HALF = 4.5;

const dir = (deg: number): Pt => { const r = (deg * Math.PI) / 180; return { x: Math.sin(r), y: Math.cos(r) }; };
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });

const pointsOf = (f: Figure) => [f.hip, f.shoulder, ...f.arm1, ...f.arm2, ...f.leg1, ...f.leg2];

/** A posed figure in world units, standing on the floor (y = 0, up is negative) or hanging from a bar. */
export function figureFor(p: Pose, d: DrawnDemo): Figure {
  const { front } = d;
  const up = dir(p.t);
  const side = dir(p.t - 90);
  const hip = { x: 0, y: 0 };
  const shoulder = mul(up, TORSO);
  const spine = sub(mul(shoulder, 0.5), mul(side, p.c * 2));
  const head = add(shoulder, mul(dir(p.t + p.h), NECK + HEAD_RADIUS));

  const arm = (a: Limb, s: number) => {
    const root = front ? add(shoulder, mul(side, SHOULDER_HALF * s)) : shoulder;
    const elbow = add(root, mul(dir(a[0]), UPPER_ARM));
    return [root, elbow, add(elbow, mul(dir(a[1]), FOREARM))];
  };
  const leg = (l: Limb, s: number) => {
    const root = front ? add(hip, mul(side, HIP_HALF * s)) : hip;
    const knee = add(root, mul(dir(l[0]), THIGH));
    const ankle = add(knee, mul(dir(l[1]), SHIN));
    const foot = front ? 90 * s : (p.f ?? (p.pt ? l[1] : l[1] + 90));
    return [root, knee, ankle, add(ankle, mul(dir(foot), front ? FOOT * 0.6 : FOOT))];
  };

  const fig: Figure = { hip, shoulder, spine, head, arm1: arm(p.a1, -1), arm2: arm(p.a2, 1), leg1: leg(p.l1, -1), leg2: leg(p.l2, 1) };

  let shift: Pt;
  if (d.anchor === 'hang') {
    shift = mul(fig.arm1[fig.arm1.length - 1], -1);
  } else {
    const pin = d.anchor === 'farFoot' ? fig.leg2[2] : d.anchor === 'hand' ? fig.arm1[fig.arm1.length - 1] : d.anchor === 'hip' ? fig.hip : fig.leg1[2];
    const lowest = Math.max(...pointsOf(fig).map((o) => o.y), head.y + HEAD_RADIUS);
    shift = { x: -pin.x, y: -lowest - p.lift };
  }
  const move = (o: Pt) => add(o, shift);
  return {
    hip: move(fig.hip), shoulder: move(fig.shoulder), spine: move(fig.spine), head: move(fig.head),
    arm1: fig.arm1.map(move), arm2: fig.arm2.map(move), leg1: fig.leg1.map(move), leg2: fig.leg2.map(move),
  };
}

export const figureAt = (d: DrawnDemo, progress: number) => figureFor(poseAt(d, progress), d);

function figureBox(f: Figure): Box {
  const box = { left: f.head.x - HEAD_RADIUS, top: f.head.y - HEAD_RADIUS, right: f.head.x + HEAD_RADIUS, bottom: f.head.y + HEAD_RADIUS };
  for (const o of pointsOf(f)) {
    box.left = Math.min(box.left, o.x - 3);
    box.top = Math.min(box.top, o.y - 3);
    box.right = Math.max(box.right, o.x + 3);
    box.bottom = Math.max(box.bottom, o.y + 3);
  }
  return box;
}

const boundsCache = new Map<string, Box>();

/** Everything the figure covers over a loop, for fitting it to the canvas. */
export function demoBounds(d: DrawnDemo): Box {
  let box = boundsCache.get(d.name);
  if (!box) {
    box = figureBox(figureAt(d, 0));
    for (let i = 1; i <= 64; i += 1) {
      const b = figureBox(figureAt(d, i / 64));
      box = { left: Math.min(box.left, b.left), top: Math.min(box.top, b.top), right: Math.max(box.right, b.right), bottom: Math.max(box.bottom, b.bottom) };
    }
    boundsCache.set(d.name, box);
  }
  return box;
}

/** The drawn demo with this name (the API's demo name), if there is one. */
export const drawnDemo = (name: string | null | undefined) => (name ? DRAWN_DEMOS.find((d) => d.name === name) || null : null);

// ─── Poses ───────────────────────────────────────────────────────────────────

// Side view
const _stand = P({});
const _prayer = P({ a1: [20, 140], a2: [20, 140] });
const _armsUp = P({ t: 186, c: -2, h: 12, a1: [172, 176], a2: [170, 174] });
const _fold = P({ t: 25, c: 3, h: -5, a1: [-45, 40], a2: [-45, 40] });
const _halfLift = P({ t: 60, h: 25, a1: [-35, -65], a2: [-35, -65] });
const _plank = P({ t: 114.5, h: -5, a1: [0, 0], a2: [0, 0], l1: [-65.5, -65.5], l2: [-65.5, -65.5] });
const _plankLow = P({ t: 102.5, h: -5, a1: [-70, 45], a2: [-70, 45], l1: [-77.5, -77.5], l2: [-77.5, -77.5] });
const _forearmPlank = P({ t: 102, h: -5, a1: [0, 90], a2: [0, 90], l1: [-78, -78], l2: [-78, -78] });
const _upDog = P({ t: 146, c: -3, h: 15, a1: [0, 0], a2: [0, 0], l1: [-87, -87], l2: [-87, -87], pt: true });
const _downDog = P({ t: 43, a1: [43, 43], a2: [43, 43], l1: [-25, -25], l2: [-25, -25], f: 70 });
const _crouch = P({ t: 130, h: 30, c: 2, a1: [5, 5], a2: [5, 5], l1: [110, -30], l2: [110, -30], f: 90 });
const _jump = P({ t: 182, a1: [172, 176], a2: [170, 174], lift: 12, pt: true });
const _squat = P({ t: 145, h: 20, a1: [90, 92], a2: [90, 92], l1: [85, -25], l2: [85, -25], f: 90 });
const _lunge = P({ a1: [10, 30], a2: [-10, 10], l1: [80, 0], l2: [-15, -90] });
const _table = P({ t: 105.5, a1: [0, 0], a2: [0, 0], l1: [0, -90], l2: [0, -90], pt: true });
const _supine = P({ t: -90, a1: [85, 90], a2: [85, 90], l1: [90, 90], l2: [90, 90] });
const _supineKnees = P({ t: -90, a1: [85, 90], a2: [85, 90], l1: [140, 15], l2: [140, 15] });
const _prone = P({ t: 93, a1: [-140, 30], a2: [-140, 30], l1: [-90, -90], l2: [-90, -90], pt: true });
const _seated = P({ t: 180, a1: [15, 75], a2: [15, 75], l1: [82, -96], l2: [88, -84] });
const _hinge = P({ t: 95, h: 15, a1: [0, 0], a2: [0, 0], l1: [18, -5], l2: [18, -5], f: 90 });
// Front view
const _fStand = P({ a1: [-8, -4], a2: [8, 4] });
const _fWarrior = P({ a1: [-90, -90], a2: [90, 90], l1: [-48, -48], l2: [70, 0] });
const _fSidePlank = P({ t: 102, a1: [180, 180], a2: [0, 90], l1: [-78, -78], l2: [-78, -78] });
export const DRAWN_DEMOS: DrawnDemo[] = [
  // Standing and yoga
  D("Mountain pose", [_stand, _prayer], { beat: 1.6, hold: .5 }),
  D("Raised arms", [_stand, _armsUp], { beat: 1.4, hold: .4 }),
  D("Forward fold", [_stand, _fold], { beat: 1.5, hold: .45, still: 1 }),
  D("Half lift", [_fold, _halfLift], { beat: 1.4, hold: .45 }),
  D("Sun salutation", [_prayer, _armsUp, _fold, _halfLift, _plank, _plankLow, _upDog, _downDog], { anchor: "hand", beat: 1.1, hold: .35, still: 7 }),
  D("Crescent lunge", [P({ a1: [176, 178], a2: [174, 176], l1: [80, 0], l2: [-15, -90] }), P({ c: -1.5, h: 10, a1: [178, 180], a2: [176, 178], l1: [84, 0], l2: [-18, -92] })], { beat: 1.6, hold: .4, anchor: "farFoot" }),
  D("Lunge", [_stand, _lunge], { beat: .9, anchor: "farFoot" }),
  D("Warrior I", [P({ t: 182, a1: [176, 178], a2: [174, 176], l1: [60, 0], l2: [-41, -41], f: 90 }), P({ t: 184, c: -1.5, h: 10, a1: [178, 180], a2: [176, 178], l1: [60, 0], l2: [-41, -41], f: 90 })], { beat: 1.6, hold: .4, anchor: "farFoot" }),
  D("Warrior II", [_fWarrior, P({ a1: [-92, -90], a2: [92, 90], l1: [-50, -50], l2: [75, 0] })], { front: true, beat: 1.6, hold: .4, anchor: "hip" }),
  D("Side angle & reverse warrior", [P({ t: 125, a1: [125, 125], a2: [20, 50], l1: [-48, -48], l2: [70, 0] }), P({ t: 205, a1: [-20, -15], a2: [200, 200], l1: [-48, -48], l2: [70, 0] })], { front: true, beat: 1.6, hold: .4, anchor: "hip" }),
  D("Triangle pose", [P({ t: 100, a1: [180, 180], a2: [0, 0], l1: [-32, -32], l2: [32, 32] }), P({ t: 260, a1: [360, 360], a2: [180, 180], l1: [-32, -32], l2: [32, 32] })], { front: true, beat: 1.8, hold: .45, anchor: "hip" }),
  D("Tree pose", [P({ a1: [-40, 100], a2: [40, -100], l2: [60, -80] }), P({ a1: [-195, 170], a2: [195, -170], l2: [60, -80] })], { front: true, beat: 1.6, hold: .45, anchor: "foot" }),
  D("Neck rolls", [P({ h: -35, a1: [-8, -4], a2: [8, 4] }), P({ h: 35, a1: [-8, -4], a2: [8, 4] })], { front: true, beat: 1.4, hold: .2 }),
  D("Seated breathing", [_seated, P({ t: 179, c: -1.2, a1: [16, 76], a2: [16, 76], l1: [82, -96], l2: [88, -84] })], { beat: 2.2, hold: .3, anchor: "hip" }),
  D("Leg swings", [P({ a1: [85, 88], a2: [80, 85], l1: [50, 45] }), P({ a1: [85, 88], a2: [80, 85], l1: [-35, -35] })], { beat: .7, hold: .1, anchor: "farFoot" }),
  D("Quad stretch", [P({ a1: [-15, -12], a2: [85, 90], l1: [-12, -158] }), P({ c: -1, a1: [-15, -12], a2: [150, 160], l1: [-12, -158] })], { beat: 1.6, hold: .4, anchor: "farFoot" }),
  D("Chest opener", [P({ a1: [-30, -20], a2: [-30, -20] }), P({ c: -2, h: 8, a1: [-55, -50], a2: [-55, -50] })], { beat: 1.5, hold: .4 }),
  D("Standing stretch", [P({ t: 165, a1: [160, 165], a2: [168, 160], l1: [-6, -6], l2: [6, 6] }), P({ t: 195, a1: [192, 200], a2: [200, 195], l1: [-6, -6], l2: [6, 6] })], { weak: true, front: true, beat: 1.6, hold: .4, anchor: "hip" }),
  // Cardio
  D("March in place", [P({ a1: [-30, -10], a2: [35, 70], l1: [70, 0] }), P({ a1: [35, 70], a2: [-30, -10], l2: [70, 0] })], { beat: .55, hold: .2, anchor: "hip" }),
  D("Warm-up march", [P({ a1: [-30, -10], a2: [35, 70], l1: [70, 0] }), P({ a1: [35, 70], a2: [-30, -10], l2: [70, 0] })], { weak: true, beat: .55, hold: .2, anchor: "hip" }),
  D("Walk", [P({ a1: [-20, -10], a2: [25, 45], l1: [22, 5], l2: [-22, -35] }), P({ a1: [25, 45], a2: [-20, -10], l1: [-22, -35], l2: [22, 5] })], { beat: .6, hold: 0, anchor: "hip" }),
  D("Jog", [P({ t: 170, a1: [-40, 60], a2: [40, 150], l1: [45, -15], l2: [-25, -90], lift: 3 }), P({ t: 170, a1: [40, 150], a2: [-40, 60], l1: [-25, -90], l2: [45, -15], lift: 3 })], { beat: .4, hold: 0, anchor: "hip" }),
  D("High knees", [P({ t: 175, a1: [-45, 45], a2: [50, 150], l1: [95, 0], lift: 2 }), P({ t: 175, a1: [50, 150], a2: [-45, 45], l2: [95, 0], lift: 2 })], { beat: .3, hold: .05, anchor: "hip" }),
  D("Butt kicks", [P({ t: 175, a1: [30, 120], a2: [-40, 40], l1: [-5, -165], lift: 2 }), P({ t: 175, a1: [-40, 40], a2: [30, 120], l2: [-5, -165], lift: 2 })], { beat: .3, hold: .05, anchor: "hip" }),
  D("Jumping jacks", [P({ a1: [-10, -6], a2: [10, 6] }), P({ a1: [-165, -170], a2: [165, 170], l1: [-22, -22], l2: [22, 22] })], { front: true, beat: .35, hold: .1, anchor: "hip" }),
  D("Skater hops", [P({ t: 195, a1: [-120, -130], a2: [-30, -40], l1: [-25, 10], l2: [-30, -50] }), P({ t: 165, a1: [30, 40], a2: [120, 130], l1: [30, 50], l2: [25, -10] })], { front: true, beat: .5, hold: .15, anchor: "hip" }),
  D("Lateral shuffle", [P({ t: 180, a1: [-30, 40], a2: [30, -40], l1: [-35, -5], l2: [35, 5] }), P({ t: 180, a1: [-30, 40], a2: [30, -40], l1: [-15, 0], l2: [15, 0] })], { front: true, beat: .3, hold: .1, anchor: "hip" }),
  D("Fast feet", [P({ t: 150, h: 25, a1: [40, 120], a2: [40, 120], l1: [55, -20], l2: [40, -25], lift: 1 }), P({ t: 150, h: 25, a1: [40, 120], a2: [40, 120], l1: [40, -25], l2: [55, -20], lift: 1 })], { beat: .2, hold: 0, anchor: "hip" }),
  D("Shadow boxing", [P({ t: 175, a1: [25, 160], a2: [20, 165], l1: [18, 0], l2: [-18, -10] }), P({ t: 172, a1: [92, 92], a2: [20, 165], l1: [18, 0], l2: [-18, -10] }), P({ t: 175, a1: [25, 160], a2: [20, 165], l1: [18, 0], l2: [-18, -10] }), P({ t: 168, a1: [25, 160], a2: [92, 92], l1: [18, 0], l2: [-18, -10] })], { props: ["gloves"], beat: .32, hold: .25, anchor: "farFoot" }),
  D("Burpee", [_stand, _crouch, _plank, _crouch, _jump], { beat: .45, hold: .15, anchor: "hip", still: 2 }),
  D("Mountain climbers", [P({ t: 114.5, h: -5, a1: [0, 0], a2: [0, 0], l1: [55, -95], l2: [-65.5, -65.5] }), P({ t: 114.5, h: -5, a1: [0, 0], a2: [0, 0], l1: [-65.5, -65.5], l2: [55, -95] })], { beat: .35, hold: .1, anchor: "hand" }),
  // Lower body
  D("Squat", [_stand, _squat], { beat: .9 }),
  D("Barbell back squat", [P({ a1: [-45, 160], a2: [-45, 160] }), P({ t: 140, h: 25, a1: [-85, 120], a2: [-85, 120], l1: [85, -25], l2: [85, -25], f: 90 })], { props: ["barbell"], beat: 1 }),
  D("Jump squat", [P({ t: 145, h: 20, a1: [-40, -30], a2: [-40, -30], l1: [85, -25], l2: [85, -25], f: 90 }), P({ t: 178, a1: [150, 160], a2: [150, 160], lift: 12, pt: true })], { beat: .5, hold: .15 }),
  D("Romanian deadlift", [P({ a1: [0, 0], a2: [0, 0] }), _hinge], { props: ["barbell"], beat: 1.1 }),
  D("Glute bridge", [_supineKnees, P({ t: -50, a1: [90, 90], a2: [90, 90], l1: [105, 0], l2: [105, 0] })], { beat: .9 }),
  // Upper body
  D("Push-up", [_plank, _plankLow], { anchor: "hand", beat: .8 }),
  D("Chaturanga", [_plank, _plankLow], { anchor: "hand", beat: 1.4, hold: .45 }),
  D("Bench press", [P({ t: -90, a1: [15, 175], a2: [15, 175], l1: [90, 0], l2: [90, 0] }), P({ t: -90, a1: [178, 180], a2: [178, 180], l1: [90, 0], l2: [90, 0] })], { props: ["bench", "barbell"], beat: .9 }),
  D("Bent-over row", [P({ t: 110, h: 20, a1: [0, 0], a2: [0, 0], l1: [20, -5], l2: [20, -5], f: 90 }), P({ t: 110, h: 20, a1: [-70, 10], a2: [-70, 10], l1: [20, -5], l2: [20, -5], f: 90 })], { props: ["barbell"], beat: .9 }),
  D("Overhead press", [P({ a1: [25, 165], a2: [25, 165] }), P({ a1: [178, 180], a2: [178, 180] })], { props: ["barbell"], beat: .9 }),
  D("Pull-up", [P({ a1: [180, 180], a2: [180, 180], l1: [5, -15], l2: [10, -25] }), P({ a1: [40, 175], a2: [40, 175], l1: [5, -15], l2: [10, -25] })], { props: ["bar"], anchor: "hang", beat: 1 }),
  D("Lateral raise", [_fStand, P({ a1: [-85, -88], a2: [85, 88] })], { props: ["dumbbells"], front: true, beat: .9 }),
  D("Biceps curl", [P({ a1: [0, 0], a2: [0, 0] }), P({ a1: [5, 165], a2: [5, 165] })], { props: ["dumbbells"], beat: .8 }),
  D("Triceps dip", [P({ a1: [-12, -12], a2: [-12, -12], l1: [90, 0], l2: [90, 0], f: 90 }), P({ a1: [-75, 15], a2: [-75, 15], l1: [115, 0], l2: [115, 0], f: 90 })], { props: ["dipBench"], anchor: "hand", beat: .9 }),
  D("Overhead triceps extension", [P({ a1: [178, 178], a2: [178, 178] }), P({ a1: [178, 345], a2: [178, 345] })], { props: ["dumbbells"], beat: .9 }),
  D("Face pull", [P({ a1: [85, 90], a2: [85, 90] }), P({ a1: [-80, 110], a2: [-80, 110] })], { beat: .9 }),
  // Floor and core
  D("Plank", [_plank, P({ t: 113, c: .8, h: -5, a1: [0, 0], a2: [0, 0], l1: [-64, -64], l2: [-64, -64] })], { anchor: "hand", beat: 1.8, hold: .3 }),
  D("Forearm plank", [_forearmPlank, P({ t: 101, c: .8, h: -5, a1: [0, 90], a2: [0, 90], l1: [-77, -77], l2: [-77, -77] })], { anchor: "hand", beat: 1.8, hold: .3 }),
  D("Plank shoulder taps", [_plank, P({ t: 114.5, h: -5, a1: [70, -140], a2: [0, 0], l1: [-65.5, -65.5], l2: [-65.5, -65.5] })], { anchor: "hip", beat: .6, hold: .2 }),
  D("Plank to down dog", [_plank, _downDog], { anchor: "hand", beat: 1.1 }),
  D("Side plank", [_fSidePlank, P({ t: 103, c: -.6, a1: [180, 180], a2: [0, 90], l1: [-77, -77], l2: [-77, -77] })], { front: true, anchor: "hand", beat: 1.8, hold: .3 }),
  D("Side plank hip dips", [_fSidePlank, P({ t: 96, a1: [180, 180], a2: [0, 90], l1: [-84, -84], l2: [-84, -84] })], { front: true, anchor: "hand", beat: .8 }),
  D("Upward-facing dog", [_plankLow, _upDog], { anchor: "hand", beat: 1.4, hold: .45 }),
  D("Downward-facing dog", [_downDog, P({ t: 43, a1: [43, 43], a2: [43, 43], l1: [-15, -50], l2: [-25, -25], f: 70 }), _downDog, P({ t: 43, a1: [43, 43], a2: [43, 43], l1: [-25, -25], l2: [-15, -50], f: 70 })], { anchor: "hand", beat: .9, hold: .3, still: 0 }),
  D("Cat-cow", [P({ t: 105.5, c: 5, h: -30, a1: [0, 0], a2: [0, 0], l1: [0, -90], l2: [0, -90], pt: true }), P({ t: 105.5, c: -4, h: 25, a1: [0, 0], a2: [0, 0], l1: [0, -90], l2: [0, -90], pt: true })], { anchor: "hand", beat: 1.6, hold: .35 }),
  D("Bird dog", [_table, P({ t: 105.5, a1: [95, 95], a2: [0, 0], l1: [0, -90], l2: [-95, -95], pt: true })], { anchor: "hip", beat: 1.2, hold: .4 }),
  D("Thread the needle", [P({ t: 105.5, a1: [180, 180], a2: [0, 0], l1: [0, -90], l2: [0, -90], pt: true }), P({ t: 92, h: -25, a1: [-80, -85], a2: [10, 10], l1: [0, -90], l2: [0, -90], pt: true })], { anchor: "hip", beat: 1.4, hold: .4 }),
  D("Child's pose", [P({ t: 72, h: -20, c: 5, a1: [100, 92], a2: [100, 92], l1: [65, -90], l2: [65, -90], pt: true }), P({ t: 74, h: -20, c: 6, a1: [100, 92], a2: [100, 92], l1: [65, -90], l2: [65, -90], pt: true })], { anchor: "hip", beat: 2, hold: .3 }),
  D("Cobra", [_prone, P({ t: 120, c: -3, h: 15, a1: [-40, 80], a2: [-40, 80], l1: [-90, -90], l2: [-90, -90], pt: true })], { anchor: "hip", beat: 1.4, hold: .4 }),
  D("Pigeon pose", [P({ t: 175, a1: [10, 5], a2: [10, 5], l1: [80, -100], l2: [-92, -92], pt: true }), P({ t: 95, h: -10, c: 2, a1: [95, 92], a2: [95, 92], l1: [80, -100], l2: [-92, -92], pt: true })], { anchor: "hip", beat: 1.6, hold: .45 }),
  D("Seated forward fold", [P({ t: 175, a1: [170, 175], a2: [170, 175], l1: [90, 90], l2: [90, 90] }), P({ t: 115, c: 3, h: -15, a1: [95, 95], a2: [95, 95], l1: [90, 90], l2: [90, 90] })], { anchor: "hip", beat: 1.6, hold: .45 }),
  D("Supine spinal twist", [P({ t: -90, a1: [-75, -80], a2: [-75, -80], l1: [150, 60], l2: [150, 60] }), P({ t: -90, a1: [-75, -80], a2: [-75, -80], l1: [105, 40], l2: [110, 45] })], { anchor: "hip", beat: 1.6, hold: .45 }),
  D("Happy baby", [P({ t: -90, a1: [172, 172], a2: [172, 172], l1: [-115, 178], l2: [-115, 178] }), P({ t: -87, a1: [168, 170], a2: [168, 170], l1: [-112, 175], l2: [-112, 175] })], { anchor: "hip", beat: 1.2, hold: .2 }),
  D("Knees to chest", [P({ t: -90, a1: [150, 80], a2: [150, 80], l1: [-130, 120], l2: [-130, 120] }), P({ t: -95, a1: [145, 75], a2: [145, 75], l1: [-140, 115], l2: [-140, 115] })], { anchor: "hip", beat: 1.4, hold: .3 }),
  D("Legs up the wall", [P({ t: -90, a1: [70, 80], a2: [70, 80], l1: [180, 180], l2: [180, 180] }), P({ t: -90, c: -.6, a1: [70, 80], a2: [70, 80], l1: [180, 180], l2: [180, 180] })], { props: ["wall"], anchor: "hip", beat: 2.2, hold: .3 }),
  D("Savasana", [_supine, P({ t: -90, c: -.8, a1: [85, 90], a2: [85, 90], l1: [90, 90], l2: [90, 90] })], { anchor: "hip", beat: 2.4, hold: .3 }),
  D("Pelvic tilt", [_supineKnees, P({ t: -88, c: 1.2, a1: [85, 90], a2: [85, 90], l1: [140, 15], l2: [140, 15] })], { beat: 1.6, hold: .3 }),
  D("Supine hamstring stretch", [P({ t: -90, a1: [150, 160], a2: [150, 160], l1: [180, 180], l2: [90, 90] }), P({ t: -90, a1: [155, 165], a2: [155, 165], l1: [195, 195], l2: [90, 90] })], { anchor: "hip", beat: 1.6, hold: .4 }),
  D("Dead bug", [P({ t: -90, a1: [180, 180], a2: [180, 180], l1: [180, 90], l2: [180, 90] }), P({ t: -90, a1: [-100, -100], a2: [180, 180], l1: [180, 90], l2: [95, 95] })], { anchor: "hip", beat: 1 }),
  D("Bicycle crunch", [P({ t: -110, c: 2, a1: [-130, 0], a2: [-130, 0], l1: [-160, 100], l2: [100, 100] }), P({ t: -110, c: 2, a1: [-130, 0], a2: [-130, 0], l1: [100, 100], l2: [-160, 100] })], { anchor: "hip", beat: .55, hold: .15 }),
  D("Reverse crunch", [P({ t: -90, a1: [85, 90], a2: [85, 90], l1: [180, 90], l2: [180, 90] }), P({ t: -90, c: 1.5, a1: [85, 90], a2: [85, 90], l1: [-150, 150], l2: [-150, 150] })], { anchor: "hip", beat: .9 }),
  D("Toe-touch crunch", [P({ t: -90, a1: [180, 180], a2: [180, 180], l1: [180, 180], l2: [180, 180] }), P({ t: -115, c: 2, a1: [150, 150], a2: [150, 150], l1: [180, 180], l2: [180, 180] })], { anchor: "hip", beat: .8 }),
  D("Crunch", [_supineKnees, P({ t: -115, c: 2, a1: [110, 110], a2: [110, 110], l1: [140, 15], l2: [140, 15] })], { beat: .8 }),
  D("Russian twist", [P({ t: -140, a1: [10, 40], a2: [10, 40], l1: [130, 75], l2: [130, 75] }), P({ t: -140, a1: [100, 120], a2: [100, 120], l1: [130, 75], l2: [130, 75] })], { props: ["ball"], anchor: "hip", beat: .6, hold: .15 }),
  D("Hollow body hold", [P({ t: -100, c: 1, a1: [-100, -100], a2: [-100, -100], l1: [100, 100], l2: [100, 100], pt: true }), P({ t: -102, c: 1.4, a1: [-102, -102], a2: [-102, -102], l1: [102, 102], l2: [102, 102], pt: true })], { anchor: "hip", beat: 1.4, hold: .3 }),
  D("V-sit", [P({ t: -140, a1: [115, 115], a2: [115, 115], l1: [140, 140], l2: [140, 140], pt: true }), P({ t: -145, a1: [112, 112], a2: [112, 112], l1: [135, 135], l2: [135, 135], pt: true })], { anchor: "hip", beat: .6, hold: .2 }),
  D("Flutter kicks", [P({ t: -95, a1: [80, 85], a2: [80, 85], l1: [100, 100], l2: [82, 82], pt: true }), P({ t: -95, a1: [80, 85], a2: [80, 85], l1: [82, 82], l2: [100, 100], pt: true })], { anchor: "hip", beat: .3, hold: 0 }),
  D("Foam rolling", [P({ t: -160, a1: [0, 0], a2: [0, 0], l1: [103, 103], l2: [103, 103] }), P({ t: -150, a1: [-15, -15], a2: [-15, -15], l1: [101, 101], l2: [101, 101] })], { props: ["roller"], anchor: "hand", beat: 1.2, hold: .2 }),
  // Rest between exercises
  D("Rest & recover", [P({ a1: [-40, 37], a2: [40, -37], l1: [-4, -4], l2: [4, 4] }), P({ c: -.6, a1: [-42, 35], a2: [42, -35], l1: [-4, -4], l2: [4, 4] })], { front: true, beat: 1.8, hold: .3 }),
];
