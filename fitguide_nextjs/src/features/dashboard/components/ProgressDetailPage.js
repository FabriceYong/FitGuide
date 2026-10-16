'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Dumbbell, Clock, Flame, Target, TrendingUp, TrendingDown,
  Calendar, Award, Zap, BarChart3, Activity, Scale, Bed, Heart,
  Trophy, CheckCircle2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';

// ─── Mock historical data ────────────────────────────────────────────────────
const last30Days = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    minutes: Math.floor(Math.random() * 80 + 20),
    calories: Math.floor(Math.random() * 700 + 800),
  };
});

const weeklyActivity = [
  { day: 'Mon', minutes: 48, calories: 380 },
  { day: 'Tue', minutes: 62, calories: 490 },
  { day: 'Wed', minutes: 90, calories: 720 },
  { day: 'Thu', minutes: 35, calories: 280 },
  { day: 'Fri', minutes: 75, calories: 600 },
  { day: 'Sat', minutes: 55, calories: 440 },
  { day: 'Sun', minutes: 20, calories: 160, today: true },
];

const monthlyWorkouts = [
  { month: 'Feb', count: 8 }, { month: 'Mar', count: 12 },
  { month: 'Apr', count: 10 }, { month: 'May', count: 15 },
  { month: 'Jun', count: 18 }, { month: 'Jul', count: 14 },
];

const caloriesWeek = [
  { day: 'Mon', intake: 2200, burned: 380 },
  { day: 'Tue', intake: 1950, burned: 490 },
  { day: 'Wed', intake: 2400, burned: 720 },
  { day: 'Thu', intake: 2100, burned: 280 },
  { day: 'Fri', intake: 2300, burned: 600 },
  { day: 'Sat', intake: 1800, burned: 440 },
  { day: 'Sun', intake: 2050, burned: 160 },
];

const achievements = [
  { label: '7-Day Streak', icon: '🔥', earned: true, desc: 'Work out 7 days in a row' },
  { label: 'First 100 min', icon: '⏱️', earned: true, desc: 'Log 100 minutes of exercise' },
  { label: 'Calorie Crusher', icon: '💪', earned: true, desc: 'Burn 500+ cal in a session' },
  { label: '30-Day Streak', icon: '🏆', earned: false, desc: '18 more days to go' },
  { label: 'Iron Warrior', icon: '⚔️', earned: false, desc: 'Complete 60 total workouts' },
  { label: 'Speed Demon', icon: '⚡', earned: false, desc: 'Complete a workout in under 20 min' },
];

const personalRecords = [
  { label: 'Longest Streak', value: '15 days', date: 'Jun 2026', icon: Flame, color: '#EF4444' },
  { label: 'Best Week', value: '7 workouts', date: 'May 2026', icon: Calendar, color: '#00C4B4' },
  { label: 'Peak Minutes', value: '142 min', date: 'Jun 2026', icon: Clock, color: '#3E25F5' },
  { label: 'Max Cal Burned', value: '890 cal', date: 'Apr 2026', icon: Zap, color: '#F59E0B' },
];

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 12px', fontSize: 11 }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill, fontWeight: 700 }}>
          {entry.name}: {entry.value}{unit}
        </p>
      ))}
    </div>
  );
};

// ─── Animated Counter ─────────────────────────────────────────────────────────
const AnimatedValue = ({ value, suffix = '' }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = typeof value === 'number' ? value : 0;
    if (end === 0) { setDisplay(0); return; }
    const step = Math.ceil(end / 55);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
};

// ─── Stat Hero Card ───────────────────────────────────────────────────────────
const StatHeroCard = ({ icon: Icon, label, value, suffix, change, color, chartData, chartType, target, comparison }) => {
  const pct = target && typeof value === 'number' ? Math.min(Math.round((value / target) * 100), 100) : null;
  const chartFormatted = (chartData || []).map((v, i) => ({ i, v }));

  return (
    <div style={{ background: 'linear-gradient(135deg, #13161e 0%, #0d1117 100%)', position: 'relative', overflow: 'hidden', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.3s' }}
      className="group hover:border-white/20">
      {/* Glow blob */}
      <div style={{ position: 'absolute', top: -24, right: -24, width: 128, height: 128, borderRadius: '50%', filter: 'blur(48px)', opacity: 0.15, background: color, transition: 'opacity 0.3s', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}22` }}>
            <Icon style={{ width: 24, height: 24, color }} />
          </div>
          {change !== undefined && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {change > 0
                  ? <TrendingUp style={{ width: 14, height: 14, color: '#4ade80' }} />
                  : <TrendingDown style={{ width: 14, height: 14, color: '#f87171' }} />}
                <span style={{ fontSize: 12, fontWeight: 700, color: change > 0 ? '#4ade80' : '#f87171' }}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              </div>
              {comparison && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>vs {comparison.label}</span>}
            </div>
          )}
        </div>
        {/* Value */}
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}><AnimatedValue value={value} /></span>
          {suffix && <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{suffix}</span>}
        </div>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>{label}</p>
        {/* Progress bar */}
        {pct !== null && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
              <span>PROGRESS TO GOAL</span>
              <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 99, transition: 'width 1s ease' }} />
            </div>
          </div>
        )}
        {/* Mini chart */}
        {chartFormatted.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <ResponsiveContainer width="100%" height={52}>
              {chartType === 'bar'
                ? <BarChart data={chartFormatted}>
                    <Bar dataKey="v" fill={color} radius={[3, 3, 0, 0]} opacity={0.7} />
                  </BarChart>
                : <AreaChart data={chartFormatted}>
                    <defs>
                      <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#sg-${label})`} dot={false} />
                  </AreaChart>}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, color = '#00C4B4' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
    <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}22` }}>
      <Icon style={{ width: 16, height: 16, color }} />
    </div>
    <h2 style={{ fontSize: 17, fontWeight: 900, color: 'white', letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const ProgressDetailPage = ({ onBack }) => {
  const [activeRange, setActiveRange] = useState('7d');
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.getAttribute('data-sid');
          if (id) setVisibleSections(prev => new Set(prev).add(id));
        }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    sectionRefs.current.forEach(r => r && observer.observe(r));
    return () => observer.disconnect();
  }, []);

  const rangeOptions = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '3M', value: '3m' },
  ];

  const registerRef = (idx) => (el) => { sectionRefs.current[idx] = el; };
  const revealStyle = (id) => ({
    transition: 'opacity 0.7s ease, transform 0.7s ease',
    opacity: visibleSections.has(id) ? 1 : 0,
    transform: visibleSections.has(id) ? 'translateY(0)' : 'translateY(24px)',
  });

  const cardStyle = {
    background: '#13161e',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
  };

  return (
    <div style={{ minHeight: '100vh', color: 'white', paddingBottom: 64 }}>
      {/* ── Sticky Header ──────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        margin: '0 -24px', padding: '16px 24px',
        background: 'rgba(10,10,15,0.85)',
      }}
        className="-mx-6 md:-mx-12 px-6 md:px-12">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={onBack}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s', fontSize: 14, fontWeight: 600 }}
              className="hover:text-white">
              <ArrowLeft style={{ width: 20, height: 20 }} />
              Back
            </button>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 900, color: 'white', margin: 0 }}>Your Progress</h1>
          </div>
          {/* Range selector */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 4 }}>
            {rangeOptions.map(opt => (
              <button key={opt.value} onClick={() => setActiveRange(opt.value)}
                style={{
                  padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                  transition: 'all 0.2s',
                  background: activeRange === opt.value ? '#00C4B4' : 'transparent',
                  color: activeRange === opt.value ? '#0a0a0f' : 'rgba(255,255,255,0.4)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 48 }}>

        {/* ── Hero Stat Cards ─────────────────────────────────────────── */}
        <section ref={registerRef(0)} data-sid="hero" style={revealStyle('hero')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatHeroCard icon={Dumbbell} label="Total Workouts" value={47} change={12} color="#00C4B4"
              chartData={[30, 35, 38, 42, 44, 45, 47]} chartType="area" target={50}
              comparison={{ label: 'last month', value: 35 }} />
            <StatHeroCard icon={Clock} label="Minutes This Week" value={320} suffix="min" change={8} color="#3E25F5"
              chartData={[280, 290, 295, 300, 305, 315, 320]} chartType="area" target={350} />
            <StatHeroCard icon={Flame} label="Calories Today" value={1240} suffix="cal" change={-3} color="#EF4444"
              chartData={[1100, 1150, 1200, 1180, 1220, 1260, 1240]} chartType="bar" target={1500} />
            <StatHeroCard icon={Target} label="Current Streak" value={12} suffix="days" color="#10B981"
              chartData={[5, 6, 7, 8, 9, 10, 11, 12]} chartType="area" target={30}
              comparison={{ label: 'best', value: 15 }} />
          </div>
        </section>

        {/* ── Weekly Activity ──────────────────────────────────────────── */}
        <section ref={registerRef(1)} data-sid="weekly" style={revealStyle('weekly')}>
          <SectionHeader icon={BarChart3} title="Weekly Activity" color="#00C4B4" />
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0 }}>
                  385 <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>min</span>
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Total this week</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <TrendingUp style={{ width: 16, height: 16, color: '#4ade80' }} />
                  <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 14 }}>+12%</span>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>vs last week</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyActivity} barCategoryGap="30%">
                <defs>
                  <linearGradient id="weeklyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C4B4" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#00C4B4" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} tickLine={false} unit="m" />
                <Tooltip content={<CustomTooltip unit=" min" />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="minutes" name="Minutes" radius={[6, 6, 0, 0]} fill="url(#weeklyGrad)" />
              </BarChart>
            </ResponsiveContainer>
            {/* Day highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 16 }}>
              {weeklyActivity.map((d) => (
                <div key={d.day} style={{
                  textAlign: 'center', padding: '8px 4px', borderRadius: 12,
                  background: d.today ? 'rgba(0,196,180,0.08)' : 'transparent',
                  border: d.today ? '1px solid rgba(0,196,180,0.25)' : '1px solid transparent',
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, color: d.today ? '#00C4B4' : 'rgba(255,255,255,0.3)' }}>{d.day}</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: d.today ? 'white' : 'rgba(255,255,255,0.6)' }}>{d.calories}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>cal</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 30-Day Training Trend ────────────────────────────────────── */}
        <section ref={registerRef(2)} data-sid="trend" style={revealStyle('trend')}>
          <SectionHeader icon={Activity} title="30-Day Training Trend" color="#3E25F5" />
          <div style={cardStyle}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={last30Days}>
                <defs>
                  <linearGradient id="minutesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3E25F5" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#3E25F5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip unit=" min" />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="minutes" name="Minutes" stroke="#3E25F5" strokeWidth={2} fill="url(#minutesAreaGrad)" dot={false} />
                <Line type="monotone" dataKey="calories" name="Calories" stroke="#EF4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 2, background: '#3E25F5', borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Minutes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 2, background: '#EF4444', borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Calories</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Calories Breakdown ───────────────────────────────────────── */}
        <section ref={registerRef(3)} data-sid="calories" style={revealStyle('calories')}>
          <SectionHeader icon={Flame} title="Calories This Week" color="#EF4444" />
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: 0 }}>3,070 <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>cal</span></p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Total burned</p>
              </div>
              <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p style={{ fontSize: 22, fontWeight: 900, color: '#EF4444', margin: 0 }}>15,200 <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(239,68,68,0.6)' }}>cal</span></p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Total intake</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={caloriesWeek} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="burned" name="Burned" fill="#EF4444" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Bar dataKey="intake" name="Intake" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Monthly Workouts + Streak Heatmap ────────────────────────── */}
        <section ref={registerRef(4)} data-sid="monthly" style={revealStyle('monthly')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly */}
            <div style={cardStyle}>
              <SectionHeader icon={Calendar} title="Monthly Workouts" color="#F59E0B" />
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyWorkouts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit=" workouts" />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="count" name="Workouts" fill="#F59E0B" radius={[5, 5, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Streak */}
            <div style={cardStyle}>
              <SectionHeader icon={Zap} title="Streak Overview" color="#10B981" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
                {[{ label: 'Current', val: 12, color: '#10B981' }, { label: 'Best', val: 15 }, { label: 'Total', val: 47 }].map((s, i) => (
                  <React.Fragment key={s.label}>
                    {i > 0 && <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.1)' }} />}
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: i === 0 ? 36 : 28, fontWeight: 900, color: s.color || 'rgba(255,255,255,0.6)', margin: 0 }}>{s.val}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              {/* Dot heatmap */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
                {last30Days.map((d, i) => {
                  const active = d.minutes > 30;
                  return (
                    <div key={i} title={`${d.date}: ${d.minutes} min`}
                      style={{
                        width: 20, height: 20, borderRadius: 6, transition: 'background 0.3s',
                        background: active ? `rgba(16,185,129,${0.25 + (d.minutes / 100) * 0.75})` : 'rgba(255,255,255,0.05)',
                      }} />
                  );
                })}
              </div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 10 }}>Last 30 days — darker = more active</p>
            </div>
          </div>
        </section>

        {/* ── Health Vitals ─────────────────────────────────────────────── */}
        <section ref={registerRef(5)} data-sid="health" style={revealStyle('health')}>
          <SectionHeader icon={Heart} title="Health Vitals" color="#F87171" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Weight', value: '72 kg', subtitle: '-2.1%', icon: Scale, color: '#3E25F5' },
              { title: 'Resting HR', value: '62 bpm', subtitle: '-5 bpm', icon: Heart, color: '#EF4444' },
              { title: 'Sleep', value: '7h 30m', subtitle: '+12 min', icon: Bed, color: '#8B5CF6' },
              { title: 'Recovery', value: '84%', subtitle: '+8%', icon: Activity, color: '#10B981' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.title} style={{ ...cardStyle, transition: 'border-color 0.3s' }} className="hover:border-white/20">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${stat.color}18` }}>
                      <Icon style={{ width: 20, height: 20, color: stat.color }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>{stat.subtitle}</span>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0 }}>{stat.value}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{stat.title}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Personal Records ─────────────────────────────────────────── */}
        <section ref={registerRef(6)} data-sid="records" style={revealStyle('records')}>
          <SectionHeader icon={Trophy} title="Personal Records" color="#F59E0B" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {personalRecords.map((pr) => {
              const Icon = pr.icon;
              return (
                <div key={pr.label} style={{ ...cardStyle, transition: 'border-color 0.3s' }} className="hover:border-white/20">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${pr.color}18` }}>
                      <Icon style={{ width: 20, height: 20, color: pr.color }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{pr.date}</span>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0 }}>{pr.value}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{pr.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Achievements ─────────────────────────────────────────────── */}
        <section ref={registerRef(7)} data-sid="achievements" style={revealStyle('achievements')}>
          <SectionHeader icon={Award} title="Achievements" color="#00C4B4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {achievements.map((ach) => (
              <div key={ach.label} style={{
                borderRadius: 18, padding: '16px 12px', textAlign: 'center', transition: 'all 0.3s',
                background: ach.earned ? 'rgba(0,196,180,0.08)' : 'rgba(255,255,255,0.02)',
                border: ach.earned ? '1px solid rgba(0,196,180,0.25)' : '1px solid rgba(255,255,255,0.06)',
                opacity: ach.earned ? 1 : 0.45,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{ach.icon}</div>
                <p style={{ fontSize: 11, fontWeight: 700, color: ach.earned ? 'white' : 'rgba(255,255,255,0.4)', lineHeight: 1.3, marginBottom: 4 }}>{ach.label}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', lineHeight: 1.4 }}>{ach.desc}</p>
                {ach.earned && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                    <CheckCircle2 style={{ width: 14, height: 14, color: '#00C4B4' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};
