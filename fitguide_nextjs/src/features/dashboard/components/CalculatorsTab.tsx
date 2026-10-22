'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, Dumbbell, Flame, Gauge, Heart, Ruler, Scale, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Reference data ──────────────────────────────────────────────────────────
// Same activity factors the Nutrition page uses for calorie targets.
const ACTIVITY_LEVELS = [
  { factor: 1.2, label: 'Sedentary (little or no exercise)' },
  { factor: 1.375, label: 'Lightly active (exercise 1–3 days a week)' },
  { factor: 1.465, label: 'Moderately active (exercise 3–4 days a week)' },
  { factor: 1.55, label: 'Active (exercise 4–5 days a week)' },
  { factor: 1.725, label: 'Very active (hard exercise 6–7 days a week)' },
  { factor: 1.9, label: 'Extra active (physical job plus training)' },
];
const PROFILE_ACTIVITY: Record<string, number> = { Inactive: 1.2, 'Moderately Active': 1.465, Active: 1.55, 'Very Active': 1.725 };

// Compendium of Physical Activities MET values.
const MET_ACTIVITIES = [
  { label: 'Walking, slow (2 mph)', met: 2.5 },
  { label: 'Walking, brisk (3.5 mph)', met: 4.3 },
  { label: 'Running (5 mph)', met: 8.3 },
  { label: 'Running (7 mph)', met: 11.0 },
  { label: 'Running (9 mph)', met: 12.8 },
  { label: 'Cycling, moderate (12–14 mph)', met: 8.0 },
  { label: 'Cycling, vigorous (16–19 mph)', met: 12.0 },
  { label: 'Swimming laps, moderate', met: 5.8 },
  { label: 'Swimming laps, vigorous', met: 9.8 },
  { label: 'Jumping rope', met: 11.8 },
  { label: 'Weight training, moderate', met: 3.5 },
  { label: 'Weight training, vigorous', met: 6.0 },
  { label: 'Circuit training / HIIT', met: 8.0 },
  { label: 'Yoga (hatha)', met: 2.5 },
  { label: 'Pilates', met: 3.0 },
  { label: 'Dancing (aerobic)', met: 7.3 },
  { label: 'Rowing machine, moderate', met: 7.0 },
  { label: 'Elliptical, moderate', met: 5.0 },
  { label: 'Stair climbing', met: 8.8 },
  { label: 'Hiking', met: 6.0 },
];

const HR_ZONES = [
  { name: 'Zone 1 · Very light', min: 50, max: 60, color: '#60A5FA', use: 'Warm-ups, recovery' },
  { name: 'Zone 2 · Light', min: 60, max: 70, color: '#34D399', use: 'Easy, long endurance work' },
  { name: 'Zone 3 · Moderate', min: 70, max: 80, color: '#00C4B4', use: 'Steady aerobic training' },
  { name: 'Zone 4 · Hard', min: 80, max: 90, color: '#FB923C', use: 'Tempo and threshold efforts' },
  { name: 'Zone 5 · Maximum', min: 90, max: 100, color: '#EF4444', use: 'Short all-out intervals' },
];

// Common loading ranges by training goal (% of one-rep max).
const LOAD_ZONES = [
  { name: 'Strength', pct: [85, 100], reps: '1–5', color: '#F87171' },
  { name: 'Power', pct: [75, 90], reps: '1–5, moved fast', color: '#FB923C' },
  { name: 'Muscle growth', pct: [67, 85], reps: '6–12', color: '#00C4B4' },
  { name: 'Muscular endurance', pct: [50, 67], reps: '12–20+', color: '#34D399' },
];

// WHO classification (adults).
const BMI_CATEGORIES = [
  { label: 'Underweight', below: 18.5, color: '#93C5FD', range: 'under 18.5' },
  { label: 'Healthy weight', below: 25, color: '#00C4B4', range: '18.5–24.9' },
  { label: 'Overweight', below: 30, color: '#FB923C', range: '25–29.9' },
  { label: 'Obesity', below: Infinity, color: '#FCA5A5', range: '30 or more' },
];

// American Heart Association categories (2017).
const BP_CATEGORIES = [
  { label: 'Normal', range: 'under 120 and under 80', color: '#34D399', advice: 'Keep up your healthy habits.' },
  { label: 'Elevated', range: '120–129 and under 80', color: '#00C4B4', advice: 'Lifestyle changes can bring it down.' },
  { label: 'High, stage 1', range: '130–139 or 80–89', color: '#FB923C', advice: 'Talk to your doctor about it.' },
  { label: 'High, stage 2', range: '140+ or 90+', color: '#F87171', advice: 'See your doctor; treatment is usually recommended.' },
  { label: 'Hypertensive crisis', range: 'over 180 and/or over 120', color: '#FCA5A5', advice: 'Wait a few minutes and measure again. If still this high, get medical care now.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** A number from a text field, or null when it's empty or not positive. */
const num = (s: string) => {
  const n = Number(s);
  return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
};
const str = (n: number | null | undefined) => (n ? String(n) : '');

type Sex = 'male' | 'female';

const CALCULATORS = [
  { id: '1rm', label: 'One-rep max', icon: Dumbbell },
  { id: 'tdee', label: 'Daily calories', icon: Flame },
  { id: 'bmi', label: 'BMI', icon: Scale },
  { id: 'hr', label: 'Heart rate zones', icon: Heart },
  { id: 'burn', label: 'Calories burned', icon: Activity },
  { id: 'whr', label: 'Waist-to-hip', icon: Ruler },
  { id: 'bp', label: 'Blood pressure', icon: Gauge },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon }[];
type CalcId = (typeof CALCULATORS)[number]['id'];

/** Fitness calculators, prefilled from the profile where possible. Results update as you type. */
export function CalculatorsTab() {
  const { user } = useAuth();
  const [active, setActive] = useState<CalcId>('1rm');
  const age = user?.birthYear ? new Date().getFullYear() - user.birthYear : null;
  const profile = {
    age: str(age),
    sex: (user?.gender === 'Female' ? 'female' : user?.gender === 'Male' ? 'male' : null) as Sex | null,
    height: str(user?.height),
    weight: str(user?.weight),
    activity: PROFILE_ACTIVITY[user?.activityStatus || ''] || 1.465,
  };

  return (
    <div className="space-y-8 pb-10 text-left">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Calculators</h1>
        <p className="text-sm text-white-70 mt-1">Estimates to guide your training. They&apos;re not medical advice.</p>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-7 gap-2 bg-obsidian-wave p-1.5 rounded-2xl border border-white-30/20" role="group" aria-label="Calculator">
        {CALCULATORS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            aria-pressed={active === id}
            className={`py-2.5 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1.5 text-center ${active === id ? 'bg-lime-light text-noir-eclipse' : 'text-white-70 hover:text-white'}`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {active === '1rm' && <OneRepMax />}
      {active === 'tdee' && <DailyCalories profile={profile} />}
      {active === 'bmi' && <Bmi height={profile.height} weight={profile.weight} />}
      {active === 'hr' && <HeartRateZones age={profile.age} />}
      {active === 'burn' && <CaloriesBurned weight={profile.weight} />}
      {active === 'whr' && <WaistToHip sex={profile.sex} />}
      {active === 'bp' && <BloodPressure />}
    </div>
  );
}

// ─── Building blocks ─────────────────────────────────────────────────────────
function Layout({ title, intro, form, result }: { title: string; intro: ReactNode; form: ReactNode; result: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <section className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 space-y-4" aria-label={`${title} inputs`}>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-xs text-white-70 leading-relaxed">{intro}</p>
        {form}
      </section>
      <section className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 min-h-64" aria-live="polite" aria-label={`${title} result`}>
        {result}
      </section>
    </div>
  );
}

function Field({ label, unit, value, onChange, min, max, step = 'any' }: {
  label: string; unit?: string; value: string; onChange: (v: string) => void; min?: number; max?: number; step?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-white-70 uppercase mb-2">{label}{unit && <span className="normal-case font-normal"> ({unit})</span>}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:border-lime-light"
      />
    </label>
  );
}

function SexChoice({ value, onChange }: { value: Sex | null; onChange: (s: Sex) => void }) {
  return (
    <fieldset>
      <legend className="block text-xs font-bold text-white-70 uppercase mb-2">Sex <span className="normal-case font-normal">(the formulas differ)</span></legend>
      <div className="flex gap-2">
        {(['male', 'female'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={value === s}
            className={`flex-1 py-3 rounded-xl text-xs font-bold border capitalize ${value === s ? 'bg-lime-light border-lime-light text-noir-eclipse' : 'bg-noir-eclipse border-white-30/20 text-white'}`}
          >
            {s}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Empty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-12 text-white-70">
      <Icon className="w-12 h-12 mb-3 opacity-40" aria-hidden="true" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

const Big = ({ value, unit, color = '#00C4B4', caption }: { value: ReactNode; unit?: string; color?: string; caption?: string }) => (
  <div className="text-center py-4">
    <p className="text-6xl font-extrabold" style={{ color }}>{value}{unit && <span className="text-2xl font-bold ml-1">{unit}</span>}</p>
    {caption && <p className="text-sm text-white-70 mt-2">{caption}</p>}
  </div>
);

// ─── Calculators ─────────────────────────────────────────────────────────────
function OneRepMax() {
  const [weight, setWeight] = useState('80');
  const [reps, setReps] = useState('5');
  const w = num(weight);
  const r = num(reps);
  const valid = w && r && Number.isInteger(r) && r <= 12;
  // Average of the Epley and Brzycki formulas.
  const max = valid ? Math.round((w * (1 + r / 30) + (r === 1 ? w : w / (1.0278 - 0.0278 * r))) / 2) : null;
  return (
    <div className="space-y-6">
      <Layout
        title="Estimate your one-rep max"
        intro="Enter a set you did with good form. The estimate (average of the Epley and Brzycki formulas) is most accurate for sets of 10 reps or fewer."
        form={(
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight lifted" unit="kg" value={weight} onChange={setWeight} min={1} />
            <Field label="Reps done" value={reps} onChange={setReps} min={1} max={12} step="1" />
          </div>
        )}
        result={max ? (
          <div>
            <Big value={max} unit="kg" caption="Estimated one-rep max" />
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-center">
              {[{ n: 3, pct: 0.93 }, { n: 5, pct: 0.87 }, { n: 10, pct: 0.75 }].map(({ n, pct }) => (
                <div key={n} className="bg-noir-eclipse p-2.5 rounded-lg">
                  <div className="text-white-70">{n} reps</div>
                  <div className="font-extrabold text-white mt-1">~{Math.round(max * pct)} kg</div>
                </div>
              ))}
            </div>
          </div>
        ) : <Empty icon={Dumbbell} text="Enter a weight and 1–12 reps." />}
      />
      {max && (
        <section className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 space-y-3">
          <h3 className="font-extrabold text-white">Training loads for a {max} kg max</h3>
          {LOAD_ZONES.map((z) => (
            <div key={z.name} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/5">
              <span className="font-extrabold text-sm" style={{ color: z.color }}>{z.name}</span>
              <span className="text-xs text-white-70">{z.pct[0]}–{z.pct[1]}% · {z.reps} reps</span>
              <span className="text-sm font-bold text-white">{Math.round((max * z.pct[0]) / 100)}–{Math.round((max * z.pct[1]) / 100)} kg</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function DailyCalories({ profile }: { profile: { age: string; sex: Sex | null; height: string; weight: string; activity: number } }) {
  const [age, setAge] = useState(profile.age);
  const [sex, setSex] = useState<Sex | null>(profile.sex);
  const [height, setHeight] = useState(profile.height);
  const [weight, setWeight] = useState(profile.weight);
  const [activity, setActivity] = useState(profile.activity);
  const a = num(age);
  const h = num(height);
  const w = num(weight);
  // Mifflin-St Jeor resting energy, times the activity factor.
  const bmr = a && h && w && sex ? 10 * w + 6.25 * h - 5 * a + (sex === 'male' ? 5 : -161) : null;
  const tdee = bmr ? Math.round(bmr * activity) : null;
  return (
    <Layout
      title="Daily calories (TDEE)"
      intro="Total daily energy expenditure: the calories you burn in a day, from the Mifflin-St Jeor equation and your activity level. Filled in from your profile where possible."
      form={(
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Age" value={age} onChange={setAge} min={13} max={120} step="1" />
            <Field label="Height" unit="cm" value={height} onChange={setHeight} min={100} max={250} />
            <Field label="Weight" unit="kg" value={weight} onChange={setWeight} min={30} max={300} />
          </div>
          <SexChoice value={sex} onChange={setSex} />
          <label className="block">
            <span className="block text-xs font-bold text-white-70 uppercase mb-2">Activity level</span>
            <select value={activity} onChange={(e) => setActivity(Number(e.target.value))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-3 py-3 text-sm text-white">
              {ACTIVITY_LEVELS.map((l) => <option key={l.factor} value={l.factor}>{l.label}</option>)}
            </select>
          </label>
        </div>
      )}
      result={tdee && bmr ? (
        <div className="space-y-5">
          <Big value={tdee.toLocaleString()} unit="kcal/day" caption="To keep your current weight" />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-noir-eclipse p-3.5 rounded-xl">
              <div className="text-xs text-white-70">To lose about 0.5 kg a week</div>
              <div className="font-extrabold text-white mt-1">{Math.max(1200, tdee - 500).toLocaleString()} kcal</div>
            </div>
            <div className="bg-noir-eclipse p-3.5 rounded-xl">
              <div className="text-xs text-white-70">To gain muscle slowly</div>
              <div className="font-extrabold text-white mt-1">{(tdee + 300).toLocaleString()} kcal</div>
            </div>
          </div>
          <p className="text-xs text-white-70">At rest you burn about {Math.round(bmr).toLocaleString()} kcal a day.</p>
          <Link href="/nutrition" className="flex items-center justify-between gap-2 p-4 rounded-2xl bg-lime-light/10 border border-lime-light/30 text-sm font-bold text-lime-light">
            Set daily targets and log food on the Nutrition page <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      ) : <Empty icon={Flame} text="Enter your age, height, weight and sex." />}
    />
  );
}

function Bmi({ height: h0, weight: w0 }: { height: string; weight: string }) {
  const [height, setHeight] = useState(h0);
  const [weight, setWeight] = useState(w0);
  const h = num(height);
  const w = num(weight);
  const bmi = h && w ? Math.round((w / (h / 100) ** 2) * 10) / 10 : null;
  const category = bmi ? BMI_CATEGORIES.find((c) => bmi < c.below)! : null;
  const marker = bmi ? Math.min(100, Math.max(0, ((bmi - 10) / 30) * 100)) : 0;
  return (
    <Layout
      title="Body mass index"
      intro="BMI compares weight with height. It's a quick screening number for adults, not a measure of body fat: muscular people often score high."
      form={(
        <div className="grid grid-cols-2 gap-3">
          <Field label="Height" unit="cm" value={height} onChange={setHeight} min={100} max={250} />
          <Field label="Weight" unit="kg" value={weight} onChange={setWeight} min={30} max={300} />
        </div>
      )}
      result={bmi && category ? (
        <div className="space-y-6">
          <Big value={bmi} color={category.color} caption={category.label} />
          <div className="relative h-3 rounded-full" style={{ background: 'linear-gradient(to right, #60A5FA 0%, #00C4B4 33%, #FB923C 66%, #EF4444 100%)' }} aria-hidden="true">
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-noir-eclipse" style={{ left: `calc(${marker}% - 8px)` }} />
          </div>
          <ul className="grid grid-cols-2 gap-2 text-xs">
            {BMI_CATEGORIES.map((c) => (
              <li key={c.label} className="bg-noir-eclipse rounded-xl p-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} aria-hidden="true" />
                <span><span className="block text-white-70">{c.range}</span><span className="font-bold text-white">{c.label}</span></span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-white-70">Categories from the World Health Organization.</p>
        </div>
      ) : <Empty icon={Scale} text="Enter your height and weight." />}
    />
  );
}

function HeartRateZones({ age: a0 }: { age: string }) {
  const [age, setAge] = useState(a0);
  const [resting, setResting] = useState('');
  const a = num(age);
  const rest = num(resting);
  const maxHr = a && a < 120 ? 220 - Math.round(a) : null;
  const karvonen = Boolean(maxHr && rest && rest < maxHr);
  // Karvonen: resting + % of heart-rate reserve. Without a resting pulse: % of max.
  const bpm = (pct: number) => Math.round(karvonen ? rest! + ((maxHr! - rest!) * pct) / 100 : (maxHr! * pct) / 100);
  return (
    <Layout
      title="Heart rate zones"
      intro="Max heart rate is estimated as 220 minus your age, which can be off by 10 or more beats for any one person. Add your resting pulse (taken in bed in the morning) for zones based on heart-rate reserve (the Karvonen method)."
      form={(
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age" value={age} onChange={setAge} min={13} max={100} step="1" />
          <Field label="Resting pulse (optional)" unit="bpm" value={resting} onChange={setResting} min={30} max={120} step="1" />
        </div>
      )}
      result={maxHr ? (
        <div className="space-y-3">
          <p className="text-center text-sm text-white-70">
            Estimated max <span className="text-2xl font-extrabold text-lime-light">{maxHr}</span> bpm
            <span className="block text-xs mt-1">{karvonen ? 'Zones use your heart-rate reserve (Karvonen).' : 'Zones are percentages of max heart rate.'}</span>
          </p>
          <ul className="space-y-2">
            {HR_ZONES.map((z) => (
              <li key={z.name} className="flex items-center justify-between gap-3 p-3 rounded-2xl" style={{ backgroundColor: `${z.color}14` }}>
                <span className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: z.color }} aria-hidden="true" />
                  <span><span className="block font-bold text-white text-sm">{z.name}</span><span className="text-xs text-white-70">{z.use}</span></span>
                </span>
                <span className="text-right"><span className="block font-extrabold text-sm text-white">{bpm(z.min)}–{bpm(z.max)}</span><span className="text-xs text-white-70">bpm</span></span>
              </li>
            ))}
          </ul>
        </div>
      ) : <Empty icon={Heart} text="Enter your age to see your zones." />}
    />
  );
}

function CaloriesBurned({ weight: w0 }: { weight: string }) {
  const [weight, setWeight] = useState(w0);
  const [minutes, setMinutes] = useState('30');
  const [index, setIndex] = useState(0);
  const w = num(weight);
  const m = num(minutes);
  const activity = MET_ACTIVITIES[index];
  const kcal = w && m ? Math.round(activity.met * w * (m / 60)) : null;
  return (
    <Layout
      title="Calories burned"
      intro="Calories ≈ MET × body weight (kg) × hours, using MET values from the Compendium of Physical Activities. Real burn varies with fitness, effort and terrain."
      form={(
        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-bold text-white-70 uppercase mb-2">Activity</span>
            <select value={index} onChange={(e) => setIndex(Number(e.target.value))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-3 py-3 text-sm text-white">
              {MET_ACTIVITIES.map((act, i) => <option key={act.label} value={i}>{act.label} (MET {act.met})</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Body weight" unit="kg" value={weight} onChange={setWeight} min={30} max={300} />
            <Field label="Duration" unit="min" value={minutes} onChange={setMinutes} min={1} max={600} step="1" />
          </div>
        </div>
      )}
      result={kcal ? <Big value={kcal} unit="kcal" caption={`${activity.label} for ${m} min`} /> : <Empty icon={Activity} text="Enter your weight and how long you trained." />}
    />
  );
}

function WaistToHip({ sex: s0 }: { sex: Sex | null }) {
  const [sex, setSex] = useState<Sex | null>(s0);
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const wa = num(waist);
  const hi = num(hip);
  const ratio = wa && hi ? Math.round((wa / hi) * 100) / 100 : null;
  // WHO: substantially increased risk at 0.90+ (men) or 0.85+ (women).
  const limit = sex === 'female' ? 0.85 : 0.9;
  const high = ratio !== null && ratio >= limit;
  return (
    <Layout
      title="Waist-to-hip ratio"
      intro="Measure your waist midway between your lowest rib and hip bone, and your hips at the widest point. A high ratio means more fat around the middle, which is linked to heart and metabolic risk."
      form={(
        <div className="space-y-4">
          <SexChoice value={sex} onChange={setSex} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Waist" unit="cm" value={waist} onChange={setWaist} min={40} max={200} />
            <Field label="Hips" unit="cm" value={hip} onChange={setHip} min={40} max={200} />
          </div>
        </div>
      )}
      result={ratio && sex ? (
        <div className="space-y-4">
          <Big value={ratio.toFixed(2)} color={high ? '#FB923C' : '#34D399'} caption={high ? 'Above the healthy limit' : 'Within the healthy range'} />
          <p className="text-sm text-white-70 text-center">
            The World Health Organization links a ratio of {limit.toFixed(2)} or more ({sex === 'female' ? 'women' : 'men'}) with substantially higher health risk.
          </p>
        </div>
      ) : <Empty icon={Ruler} text="Choose your sex and enter both measurements." />}
    />
  );
}

function BloodPressure() {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const s = num(systolic);
  const d = num(diastolic);
  const index = s && d
    ? s > 180 || d > 120 ? 4 : s >= 140 || d >= 90 ? 3 : s >= 130 || d >= 80 ? 2 : s >= 120 ? 1 : 0
    : null;
  const result = index === null ? null : BP_CATEGORIES[index];
  return (
    <Layout
      title="Blood pressure"
      intro="Enter a reading from a home or pharmacy monitor, taken seated after five minutes of rest. One reading isn't a diagnosis; your doctor looks at the average of several."
      form={(
        <div className="grid grid-cols-2 gap-3">
          <Field label="Systolic (top)" unit="mmHg" value={systolic} onChange={setSystolic} min={60} max={260} step="1" />
          <Field label="Diastolic (bottom)" unit="mmHg" value={diastolic} onChange={setDiastolic} min={30} max={160} step="1" />
        </div>
      )}
      result={(
        <div className="space-y-5">
          {result ? (
            <div className="text-center space-y-2">
              <p className="inline-block px-5 py-2 rounded-full font-extrabold text-lg" style={{ backgroundColor: `${result.color}20`, color: result.color }}>{result.label}</p>
              <p className="text-sm text-white-70">{result.advice}</p>
            </div>
          ) : <p className="text-sm text-white-70 text-center">Enter both numbers to see your category.</p>}
          <div>
            <p className="text-xs font-bold text-white-70 uppercase tracking-wider mb-2">American Heart Association categories (mmHg)</p>
            <ul className="space-y-1.5">
              {BP_CATEGORIES.map((c) => (
                <li
                  key={c.label}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs border"
                  style={result?.label === c.label ? { borderColor: `${c.color}80`, backgroundColor: `${c.color}14` } : { borderColor: 'transparent' }}
                >
                  <span className="font-bold" style={{ color: c.color }}>{c.label}</span>
                  <span className="text-white-70">{c.range}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    />
  );
}
