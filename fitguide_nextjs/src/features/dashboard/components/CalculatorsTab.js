'use client';

import React, { useState } from 'react';
import { Calculator, Flame, Dumbbell, Sparkles, Scale, Heart, Activity, Ruler, Gauge } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
// ACE / AHA Blood Pressure categories
const BP_CATEGORIES = [
    { label: 'Normal', systolicMax: 120, diastolicMax: 80, color: '#34D399', desc: 'Keep up the great work! Maintain a healthy lifestyle.' },
    { label: 'Elevated', systolicMax: 129, diastolicMax: 80, color: '#00C4B4', desc: 'Lifestyle changes are recommended to lower blood pressure.' },
    { label: 'High — Stage 1', systolicMax: 139, diastolicMax: 89, color: '#FB923C', desc: 'Consult your doctor. Lifestyle changes and possibly medication.' },
    { label: 'High — Stage 2', systolicMax: 180, diastolicMax: 120, color: '#EF4444', desc: 'High blood pressure. Medical attention is strongly recommended.' },
    { label: 'Crisis', systolicMax: Infinity, diastolicMax: Infinity, color: '#be123c', desc: 'Hypertensive crisis — seek emergency care immediately.' },
];
// ACE 1RM Training Load percentages
const ONE_RM_ZONES = [
    { name: 'Strength', pctMin: 85, pctMax: 100, repsRange: '1–5', color: '#EF4444', desc: 'Maximum force development, neural adaptations' },
    { name: 'Power', pctMin: 75, pctMax: 90, repsRange: '3–6', color: '#FB923C', desc: 'Speed-strength, explosive performance' },
    { name: 'Hypertrophy', pctMin: 67, pctMax: 85, repsRange: '6–12', color: '#00C4B4', desc: 'Muscle size increase, metabolic stress' },
    { name: 'Muscular Endurance', pctMin: 50, pctMax: 67, repsRange: '12–20+', color: '#34D399', desc: 'Fatigue resistance, local muscle endurance' },
];
const MET_ACTIVITIES = [
    { label: 'Walking (slow, 2mph)', met: 2.5 },
    { label: 'Walking (brisk, 3.5mph)', met: 3.5 },
    { label: 'Running (5mph)', met: 8.3 },
    { label: 'Running (7mph)', met: 11.0 },
    { label: 'Running (9mph)', met: 13.5 },
    { label: 'Cycling (moderate, 12-14mph)', met: 8.0 },
    { label: 'Cycling (vigorous, 16-19mph)', met: 12.0 },
    { label: 'Swimming (moderate)', met: 5.8 },
    { label: 'Swimming (vigorous laps)', met: 10.0 },
    { label: 'Jump Rope', met: 12.3 },
    { label: 'Weight Training (moderate)', met: 3.5 },
    { label: 'Weight Training (vigorous)', met: 6.0 },
    { label: 'HIIT / Circuit Training', met: 8.0 },
    { label: 'Yoga', met: 2.5 },
    { label: 'Pilates', met: 3.0 },
    { label: 'Dancing', met: 5.0 },
    { label: 'Basketball', met: 6.5 },
    { label: 'Football / Soccer', met: 7.0 },
    { label: 'Rowing (moderate)', met: 7.0 },
    { label: 'Rowing (vigorous)', met: 12.0 },
    { label: 'Elliptical (moderate)', met: 5.0 },
    { label: 'Stair Climbing', met: 8.8 },
    { label: 'Hiking', met: 6.0 },
    { label: 'Rock Climbing', met: 8.0 },
];
const BMI_CATEGORIES = [
    { label: 'Underweight', max: 18.5, color: '#60A5FA', textColor: '#93C5FD' },
    { label: 'Normal Weight', max: 25.0, color: '#00C4B4', textColor: '#00C4B4' },
    { label: 'Overweight', max: 30.0, color: '#FB923C', textColor: '#FB923C' },
    { label: 'Obese', max: Infinity, color: '#EF4444', textColor: '#FCA5A5' },
];
const HR_ZONES = [
    { name: 'Warm-Up', min: 50, max: 60, color: '#60A5FA', desc: 'Very light, active recovery' },
    { name: 'Fat Burn', min: 60, max: 70, color: '#34D399', desc: 'Moderate, efficient fat burning' },
    { name: 'Aerobic', min: 70, max: 80, color: '#00C4B4', desc: 'Cardiovascular endurance' },
    { name: 'Anaerobic', min: 80, max: 90, color: '#FB923C', desc: 'High intensity, lactate threshold' },
    { name: 'Max VO2', min: 90, max: 100, color: '#EF4444', desc: 'Maximum effort, sprint intervals' },
];
export const CalculatorsTab = () => {
    const { user } = useAuth();
    // Pre-fill from user profile
    const userProfileHeight = user?.height || 175;
    const userProfileWeight = user?.weight || 75;
    const userProfileGender = user?.gender === 'Female' ? 'female' : 'male';

    const [activeCalc, setActiveCalc] = useState('1rm');
    // --- 1RM Calculator States ---
    const [weight, setWeight] = useState(80);
    const [reps, setReps] = useState(5);
    const [calculated1RM, setCalculated1RM] = useState(null);
    // --- TDEE Calculator States ---
    const [age, setAge] = useState(25);
    const [gender, setGender] = useState(userProfileGender);
    const [height, setHeight] = useState(userProfileHeight);
    const [userWeight, setUserWeight] = useState(userProfileWeight);
    const [activity, setActivity] = useState(1.2);
    const [tdee, setTdee] = useState(null);
    // --- Macros Calculator States ---
    const [macroGoal, setMacroGoal] = useState('maintain');
    const [dailyCalories, setDailyCalories] = useState(2000);
    const [macroSplit, setMacroSplit] = useState(null);
    // --- BMI Calculator States ---
    const [bmiWeight, setBmiWeight] = useState(userProfileWeight);
    const [bmiHeight, setBmiHeight] = useState(userProfileHeight);
    const [bmiResult, setBmiResult] = useState(null);
    // --- Heart Rate Zones States ---
    const [hrAge, setHrAge] = useState(25);
    const [hrResult, setHrResult] = useState(null);
    // --- Activity Calorie Burn States ---
    const [activityWeight, setActivityWeight] = useState(userProfileWeight);
    const [activityDuration, setActivityDuration] = useState(30);
    const [selectedActivity, setSelectedActivity] = useState(0);
    const [burnResult, setBurnResult] = useState(null);
    // --- Waist-to-Hip Ratio States ---
    const [whrWaist, setWhrWaist] = useState(80);
    const [whrHip, setWhrHip] = useState(95);
    const [whrGender, setWhrGender] = useState(userProfileGender);
    const [whrResult, setWhrResult] = useState(null);
    // --- Blood Pressure States ---
    const [bpSystolic, setBpSystolic] = useState(120);
    const [bpDiastolic, setBpDiastolic] = useState(80);
    const [bpResult, setBpResult] = useState(null);
    // --- 1RM Logic ---
    const calculate1RM = (e) => {
        e.preventDefault();
        if (weight > 0 && reps > 0) {
            const epley = weight * (1 + reps / 30);
            const brzycki = reps === 1 ? weight : weight / (1.0278 - 0.0278 * reps);
            setCalculated1RM(Math.round((epley + brzycki) / 2));
        }
    };
    // --- TDEE Logic ---
    const calculateTDEE = (e) => {
        e.preventDefault();
        if (age > 0 && height > 0 && userWeight > 0) {
            let bmr = 10 * userWeight + 6.25 * height - 5 * age;
            bmr += gender === 'male' ? 5 : -161;
            const calculatedTdee = Math.round(bmr * activity);
            setTdee(calculatedTdee);
            setDailyCalories(calculatedTdee);
        }
    };
    // --- Macros Logic ---
    const calculateMacros = (e) => {
        e.preventDefault();
        if (dailyCalories > 500) {
            let targetCals = dailyCalories;
            if (macroGoal === 'gain')
                targetCals += 300;
            if (macroGoal === 'lose')
                targetCals -= 500;
            let pP = 0.3, cP = 0.4, fP = 0.3;
            if (macroGoal === 'gain') {
                pP = 0.35;
                cP = 0.45;
                fP = 0.20;
            }
            else if (macroGoal === 'lose') {
                pP = 0.40;
                cP = 0.25;
                fP = 0.35;
            }
            setMacroSplit({
                protein: Math.round((targetCals * pP) / 4),
                carbs: Math.round((targetCals * cP) / 4),
                fat: Math.round((targetCals * fP) / 9),
            });
        }
    };
    // --- BMI Logic ---
    const calculateBMI = (e) => {
        e.preventDefault();
        if (bmiWeight > 0 && bmiHeight > 0) {
            const heightM = bmiHeight / 100;
            setBmiResult(Math.round((bmiWeight / (heightM * heightM)) * 10) / 10);
        }
    };
    const getBMICategory = (bmi) => {
        return BMI_CATEGORIES.find(c => bmi < c.max) || BMI_CATEGORIES[BMI_CATEGORIES.length - 1];
    };
    const getBMIPercent = (bmi) => {
        // Map BMI 10–40 to 0–100%
        return Math.min(100, Math.max(0, ((bmi - 10) / 30) * 100));
    };
    // --- Heart Rate Zones Logic ---
    const calculateHRZones = (e) => {
        e.preventDefault();
        const maxHR = 220 - hrAge;
        const zones = HR_ZONES.map(z => ({
            ...z,
            min: Math.round(maxHR * (z.min / 100)),
            max: Math.round(maxHR * (z.max / 100)),
        }));
        setHrResult({ maxHR, zones });
    };
    // --- Activity Calorie Burn Logic ---
    const calculateBurn = (e) => {
        e.preventDefault();
        const met = MET_ACTIVITIES[selectedActivity].met;
        // Calories = MET × weight(kg) × duration(hours)
        const cals = Math.round(met * activityWeight * (activityDuration / 60));
        setBurnResult(cals);
    };
    // --- WHR Logic ---
    const calculateWHR = (e) => {
        e.preventDefault();
        if (whrWaist > 0 && whrHip > 0) {
            setWhrResult(Math.round((whrWaist / whrHip) * 100) / 100);
        }
    };
    const getWHRCategory = (ratio, gender) => {
        if (gender === 'male') {
            if (ratio < 0.90)
                return { label: 'Low Risk', color: '#34D399', desc: 'Healthy fat distribution — keep it up!' };
            if (ratio < 1.00)
                return { label: 'Moderate Risk', color: '#00C4B4', desc: 'Some abdominal fat accumulation. Monitor diet and exercise.' };
            return { label: 'High Risk', color: '#EF4444', desc: 'High abdominal obesity. Consult a health professional.' };
        }
        else {
            if (ratio < 0.80)
                return { label: 'Low Risk', color: '#34D399', desc: 'Healthy fat distribution — keep it up!' };
            if (ratio < 0.85)
                return { label: 'Moderate Risk', color: '#00C4B4', desc: 'Some abdominal fat accumulation. Monitor diet and exercise.' };
            return { label: 'High Risk', color: '#EF4444', desc: 'High abdominal obesity. Consult a health professional.' };
        }
    };
    // --- Blood Pressure Logic ---
    const calculateBP = (e) => {
        e.preventDefault();
        const s = bpSystolic;
        const d = bpDiastolic;
        if (s > 180 || d > 120) {
            setBpResult(BP_CATEGORIES[4]);
        }
        else if (s >= 140 || d >= 90) {
            setBpResult(BP_CATEGORIES[3]);
        }
        else if (s >= 130 || d >= 80) {
            setBpResult(BP_CATEGORIES[2]);
        }
        else if (s >= 120 && d < 80) {
            setBpResult(BP_CATEGORIES[1]);
        }
        else {
            setBpResult(BP_CATEGORIES[0]);
        }
    };
    const calcTabs = [
        { id: '1rm', label: 'One-Rep Max (1RM)', shortLabel: '1RM', icon: Dumbbell },
        { id: 'tdee', label: 'Daily Calories (TDEE)', shortLabel: 'TDEE', icon: Flame },
        { id: 'macros', label: 'Macro Splitter', shortLabel: 'Macros', icon: Sparkles },
        { id: 'bmi', label: 'BMI Calculator', shortLabel: 'BMI', icon: Scale },
        { id: 'heartrate', label: 'Heart Rate Zones', shortLabel: 'HR Zones', icon: Heart },
        { id: 'calories', label: 'Activity Calorie Burn', shortLabel: 'Cal Burn', icon: Activity },
        { id: 'whr', label: 'Waist-to-Hip Ratio', shortLabel: 'WHR', icon: Ruler },
        { id: 'bp', label: 'Blood Pressure', shortLabel: 'BP Check', icon: Gauge },
    ];
    return (<div className="space-y-8 pb-10 text-left">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Fitness Calculators</h1>
        <p className="text-sm text-white-70 mt-1">
          Calculate your lift limits, energy expenditure, heart rate zones, and nutrition targets.
        </p>
      </div>

      {/* Calculator Navigation — 2-row grid on mobile, 4-col on tablet, 8-col on desktop */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 bg-obsidian-wave p-1.5 rounded-2xl border border-white-30/20">
        {calcTabs.map(({ id, shortLabel, icon: Icon }) => (<button key={id} onClick={() => setActiveCalc(id)} className={`py-2.5 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${activeCalc === id
                ? 'bg-lime-light text-noir-eclipse border border-lime-light/40'
                : 'text-white-70 hover:text-white'}`}>
            <Icon className="w-4 h-4"/>
            {shortLabel}
          </button>))}
      </div>

      {/* ─── 1RM CALCULATOR ─── */}
      {activeCalc === '1rm' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
          <form onSubmit={calculate1RM} className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Estimate One-Rep Max</h3>
            <div>
              <label className="block text-xs font-bold text-white-50 uppercase mb-2">Weight Lifted (kg)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-light" required/>
            </div>
            <div>
              <label className="block text-xs font-bold text-white-50 uppercase mb-2">Repetitions Completed</label>
              <input type="number" value={reps} onChange={(e) => setReps(Math.max(1, parseInt(e.target.value, 10) || 0))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-light" min="1" max="30" required/>
            </div>
            <button type="submit" className="w-full py-3 bg-lime-light text-noir-eclipse font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">Calculate Max</button>
          </form>
          <div className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Estimated Max</h3>
              <p className="text-xs text-white-50 mb-6">Average of Epley & Brzycki formulas.</p>
            </div>
            {calculated1RM !== null ? (<div className="text-center py-6">
                <div className="text-6xl font-extrabold text-lime-light mb-2">{calculated1RM} <span className="text-2xl font-bold">kg</span></div>
                <p className="text-xs text-white-70 mt-4">Estimated Rep Ranges:</p>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  {[{ r: 3, pct: 0.93 }, { r: 5, pct: 0.89 }, { r: 10, pct: 0.75 }].map(({ r, pct }) => (<div key={r} className="bg-noir-eclipse p-2.5 rounded-lg border border-white-30/10">
                      <div className="font-bold text-white-50">{r} Reps</div>
                      <div className="font-extrabold text-white mt-1">{Math.round(calculated1RM * pct)}kg</div>
                    </div>))}
                </div>
              </div>) : (<div className="text-center py-12 text-white-30">
                <Calculator className="w-16 h-16 mx-auto mb-3 opacity-30"/>
                <p className="text-xs font-semibold">Enter your lifts to estimate your 1RM</p>
              </div>)}
          </div>
        </div>)}

      {/* ─── TDEE CALCULATOR ─── */}
      {activeCalc === 'tdee' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
          <form onSubmit={calculateTDEE} className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Calculate Daily Energy (TDEE)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-white-50 uppercase mb-2">Age</label>
                <input type="number" value={age} onChange={(e) => setAge(Math.max(1, parseInt(e.target.value, 10) || 0))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-light" required/>
              </div>
              <div>
                <label className="block text-xs font-bold text-white-50 uppercase mb-2">Gender</label>
                <div className="flex gap-2">
                  {['male', 'female'].map(g => (<button key={g} type="button" onClick={() => setGender(g)} className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${gender === g ? 'bg-lime-light border-lime-light text-noir-eclipse' : 'bg-noir-eclipse border-white-30/20 text-white'}`}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-white-50 uppercase mb-2">Height (cm)</label>
                <input type="number" value={height} onChange={(e) => setHeight(Math.max(1, parseFloat(e.target.value) || 0))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-light" required/>
              </div>
              <div>
                <label className="block text-xs font-bold text-white-50 uppercase mb-2">Weight (kg)</label>
                <input type="number" value={userWeight} onChange={(e) => setUserWeight(Math.max(1, parseFloat(e.target.value) || 0))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-light" required/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-white-50 uppercase mb-2">Activity Level</label>
              <select value={activity} onChange={(e) => setActivity(parseFloat(e.target.value))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-lime-light cursor-pointer">
                <option value="1.2">Sedentary (Office job, little exercise)</option>
                <option value="1.375">Lightly Active (Light exercise 1–3 days/wk)</option>
                <option value="1.55">Moderately Active (Moderate exercise 3–5 days/wk)</option>
                <option value="1.725">Very Active (Hard exercise 6–7 days/wk)</option>
              </select>
            </div>
            <button type="submit" className="w-full py-3 bg-lime-light text-noir-eclipse font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">Calculate Expenditure</button>
          </form>
          <div className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Energy Expenditure</h3>
              <p className="text-xs text-white-50 mb-6">TDEE measures total daily calories burned including exercise.</p>
            </div>
            {tdee !== null ? (<div className="text-center py-6 space-y-6">
                <div>
                  <div className="text-6xl font-extrabold text-lime-light mb-2">{tdee} <span className="text-2xl font-bold">kcal/day</span></div>
                  <p className="text-xs text-white-50">To maintain weight</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-noir-eclipse p-3.5 rounded-xl border border-white-30/10">
                    <div className="font-bold text-red-400">Fat Loss Target</div>
                    <div className="font-extrabold text-white text-base mt-1">{tdee - 500} kcal</div>
                  </div>
                  <div className="bg-noir-eclipse p-3.5 rounded-xl border border-white-30/10">
                    <div className="font-bold text-lime-light">Muscle Gain Target</div>
                    <div className="font-extrabold text-white text-base mt-1">{tdee + 300} kcal</div>
                  </div>
                </div>
              </div>) : (<div className="text-center py-12 text-white-30">
                <Flame className="w-16 h-16 mx-auto mb-3 opacity-30"/>
                <p className="text-xs font-semibold">Enter details to calculate TDEE</p>
              </div>)}
          </div>
        </div>)}

      {/* ─── MACROS SPLITTER ─── */}
      {activeCalc === 'macros' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
          <form onSubmit={calculateMacros} className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Macronutrient Splitter</h3>
            <div>
              <label className="block text-xs font-bold text-white-50 uppercase mb-2">Daily Calorie Target (kcal)</label>
              <input type="number" value={dailyCalories} onChange={(e) => setDailyCalories(Math.max(1, parseInt(e.target.value, 10) || 0))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-light" required/>
            </div>
            <div>
              <label className="block text-xs font-bold text-white-50 uppercase mb-2">Fitness Goal</label>
              <div className="flex gap-2">
                {[['lose', 'Fat Loss'], ['maintain', 'Maintain'], ['gain', 'Gain Muscle']].map(([val, lbl]) => (<button key={val} type="button" onClick={() => setMacroGoal(val)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${macroGoal === val ? 'bg-lime-light border-lime-light text-noir-eclipse' : 'bg-noir-eclipse border-white-30/20 text-white'}`}>
                    {lbl}
                  </button>))}
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-lime-light text-noir-eclipse font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">Split Macros</button>
          </form>
          <div className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Suggested Macro Targets</h3>
              <p className="text-xs text-white-50 mb-6">Splits adjusted based on your fitness goal.</p>
            </div>
            {macroSplit !== null ? (<div className="py-2 space-y-4">
                {[['Protein', macroSplit.protein, 4, '#00C4B4'], ['Carbohydrates', macroSplit.carbs, 4, '#60A5FA'], ['Fat', macroSplit.fat, 9, '#FB923C']].map(([name, grams, kcalPer, color]) => (<div key={name} className="bg-noir-eclipse border border-white-30/10 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white-50 uppercase">{name}</div>
                      <div className="text-[9px] text-white-30">{kcalPer} kcal / gram</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold" style={{ color }}>{grams}g</div>
                      <div className="text-xs text-white-50">{grams * kcalPer} kcal</div>
                    </div>
                  </div>))}
              </div>) : (<div className="text-center py-12 text-white-30">
                <Sparkles className="w-16 h-16 mx-auto mb-3 opacity-30"/>
                <p className="text-xs font-semibold">Enter calories to estimate daily macros</p>
              </div>)}
          </div>
        </div>)}

      {/* ─── BMI CALCULATOR ─── */}
      {activeCalc === 'bmi' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
          <form onSubmit={calculateBMI} className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Body Mass Index (BMI)</h3>
            <p className="text-xs text-white-50">BMI is a simple screening index based on height and weight. It is not a direct measure of body fat.</p>
            <div>
              <label className="block text-xs font-bold text-white-50 uppercase mb-2">Weight (kg)</label>
              <input type="number" value={bmiWeight} onChange={(e) => setBmiWeight(Math.max(1, parseFloat(e.target.value) || 0))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-light" required/>
            </div>
            <div>
              <label className="block text-xs font-bold text-white-50 uppercase mb-2">Height (cm)</label>
              <input type="number" value={bmiHeight} onChange={(e) => setBmiHeight(Math.max(1, parseFloat(e.target.value) || 0))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-light" required/>
            </div>
            <button type="submit" className="w-full py-3 bg-lime-light text-noir-eclipse font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">Calculate BMI</button>
          </form>
          <div className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Your BMI Score</h3>
              <p className="text-xs text-white-50 mb-4">Based on WHO classification standards.</p>
            </div>
            {bmiResult !== null ? (() => {
                const cat = getBMICategory(bmiResult);
                const pct = getBMIPercent(bmiResult);
                return (<div className="space-y-6">
                  <div className="text-center">
                    <div className="text-7xl font-extrabold mb-1" style={{ color: cat.textColor }}>{bmiResult}</div>
                    <div className="text-sm font-bold" style={{ color: cat.textColor }}>{cat.label}</div>
                  </div>
                  {/* Gradient Bar */}
                  <div className="space-y-2">
                    <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #60A5FA 0%, #00C4B4 33%, #FB923C 66%, #EF4444 100%)' }}>
                      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-noir-eclipse transition-all duration-500" style={{ left: `calc(${pct}% - 8px)` }}/>
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-white-50">
                      {BMI_CATEGORIES.map(c => <span key={c.label}>{c.label === 'Normal Weight' ? 'Normal' : c.label.split(' ')[0]}</span>)}
                    </div>
                  </div>
                  {/* Reference Table */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[['< 18.5', 'Underweight', '#60A5FA'], ['18.5–24.9', 'Normal', '#00C4B4'], ['25–29.9', 'Overweight', '#FB923C'], ['≥ 30', 'Obese', '#EF4444']].map(([range, lbl, clr]) => (<div key={lbl} className="bg-noir-eclipse rounded-xl p-3 border border-white-30/10 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: clr }}/>
                        <div>
                          <div className="font-bold text-white-50">{range}</div>
                          <div className="font-extrabold text-white">{lbl}</div>
                        </div>
                      </div>))}
                  </div>
                </div>);
            })() : (<div className="text-center py-12 text-white-30">
                <Scale className="w-16 h-16 mx-auto mb-3 opacity-30"/>
                <p className="text-xs font-semibold">Enter your measurements to calculate BMI</p>
              </div>)}
          </div>
        </div>)}

      {/* ─── HEART RATE ZONES CALCULATOR ─── */}
      {activeCalc === 'heartrate' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
          <form onSubmit={calculateHRZones} className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Heart Rate Training Zones</h3>
            <p className="text-xs text-white-50">Based on the Karvonen method using age-predicted max heart rate (220 − age).</p>
            <div>
              <label className="block text-xs font-bold text-white-50 uppercase mb-2">Your Age</label>
              <input type="number" value={hrAge} onChange={(e) => setHrAge(Math.max(1, Math.min(120, parseInt(e.target.value, 10) || 0)))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-light" min="1" max="120" required/>
            </div>
            <div className="bg-noir-eclipse/50 rounded-2xl p-4 border border-white-30/10 space-y-2">
              <p className="text-[10px] font-bold text-white-50 uppercase tracking-wider">Zone Overview</p>
              {HR_ZONES.map(z => (<div key={z.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: z.color }}/>
                  <span className="font-bold text-white w-24">{z.name}</span>
                  <span className="text-white-50">{z.min}–{z.max}% MHR</span>
                </div>))}
            </div>
            <button type="submit" className="w-full py-3 bg-lime-light text-noir-eclipse font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">Calculate My Zones</button>
          </form>
          <div className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-1">Your Training Zones</h3>
            <p className="text-xs text-white-50 mb-4">Train in each zone to target different fitness adaptations.</p>
            {hrResult !== null ? (<div className="space-y-3 flex-1">
                <div className="text-center mb-4">
                  <span className="text-xs text-white-50 uppercase font-bold">Max Heart Rate</span>
                  <div className="text-4xl font-extrabold text-lime-light">{hrResult.maxHR} <span className="text-lg font-bold">bpm</span></div>
                </div>
                {hrResult.zones.map((z) => (<div key={z.name} className="relative rounded-2xl overflow-hidden border border-white-30/10">
                    <div className="absolute inset-0 opacity-10" style={{ background: z.color }}/>
                    <div className="relative p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: z.color }}/>
                        <div>
                          <div className="font-bold text-white text-sm">{z.name}</div>
                          <div className="text-[10px] text-white-50">{z.desc}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-sm" style={{ color: z.color }}>{z.min}–{z.max}</div>
                        <div className="text-[10px] text-white-50">bpm</div>
                      </div>
                    </div>
                  </div>))}
              </div>) : (<div className="flex-1 flex flex-col items-center justify-center text-white-30">
                <Heart className="w-16 h-16 mb-3 opacity-30"/>
                <p className="text-xs font-semibold">Enter your age to see your heart rate zones</p>
              </div>)}
          </div>
        </div>)}

      {/* ─── ACTIVITY CALORIE BURN CALCULATOR ─── */}
      {activeCalc === 'calories' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
          <form onSubmit={calculateBurn} className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Activity Calorie Burn Estimator</h3>
            <p className="text-xs text-white-50">Uses MET (Metabolic Equivalent of Task) values to estimate calories burned per activity.</p>
            <div>
              <label className="block text-xs font-bold text-white-50 uppercase mb-2">Select Activity</label>
              <select value={selectedActivity} onChange={(e) => setSelectedActivity(parseInt(e.target.value, 10))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-lime-light cursor-pointer">
                {MET_ACTIVITIES.map((a, i) => (<option key={i} value={i}>{a.label} (MET {a.met})</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-white-50 uppercase mb-2">Body Weight (kg)</label>
                <input type="number" value={activityWeight} onChange={(e) => setActivityWeight(Math.max(1, parseFloat(e.target.value) || 0))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-light" required/>
              </div>
              <div>
                <label className="block text-xs font-bold text-white-50 uppercase mb-2">Duration (min)</label>
                <input type="number" value={activityDuration} onChange={(e) => setActivityDuration(Math.max(1, parseInt(e.target.value, 10) || 0))} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-light" required/>
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-lime-light text-noir-eclipse font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">Estimate Burn</button>
          </form>
          <div className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Calorie Burn Estimate</h3>
              <p className="text-xs text-white-50 mb-4">Formula: MET × weight(kg) × hours. Values are estimates; actual burn varies by individual.</p>
            </div>
            {burnResult !== null ? (<div className="space-y-6">
                <div className="text-center py-4">
                  <div className="text-7xl font-extrabold text-lime-light mb-2">{burnResult}</div>
                  <div className="text-lg font-bold text-white-70">kcal burned</div>
                  <div className="text-xs text-white-50 mt-1">
                    {MET_ACTIVITIES[selectedActivity].label} • {activityDuration} min • {activityWeight} kg
                  </div>
                </div>
                {/* Intensity Indicator */}
                <div className="bg-noir-eclipse rounded-2xl p-4 border border-white-30/10 space-y-3">
                  <p className="text-xs font-bold text-white-50 uppercase">MET Intensity Level</p>
                  <div className="relative h-3 bg-white-30/20 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{
                    width: `${Math.min(100, (MET_ACTIVITIES[selectedActivity].met / 15) * 100)}%`,
                    background: MET_ACTIVITIES[selectedActivity].met < 4 ? '#60A5FA' : MET_ACTIVITIES[selectedActivity].met < 7 ? '#00C4B4' : MET_ACTIVITIES[selectedActivity].met < 10 ? '#FB923C' : '#EF4444'
                }}/>
                  </div>
                  <div className="flex justify-between text-[9px] text-white-50 font-bold">
                    <span>Light</span><span>Moderate</span><span>Vigorous</span><span>Max</span>
                  </div>
                </div>
                {/* Contextual equivalents */}
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="bg-noir-eclipse rounded-xl p-3 border border-white-30/10">
                    <div className="font-bold text-white-50">🍕 Pizza Slices</div>
                    <div className="font-extrabold text-white mt-1">~{Math.round(burnResult / 285)}</div>
                  </div>
                  <div className="bg-noir-eclipse rounded-xl p-3 border border-white-30/10">
                    <div className="font-bold text-white-50">🍫 Choc Bars</div>
                    <div className="font-extrabold text-white mt-1">~{Math.round(burnResult / 230)}</div>
                  </div>
                  <div className="bg-noir-eclipse rounded-xl p-3 border border-white-30/10">
                    <div className="font-bold text-white-50">🥤 Sodas</div>
                    <div className="font-extrabold text-white mt-1">~{Math.round(burnResult / 150)}</div>
                  </div>
                </div>
              </div>) : (<div className="text-center py-12 text-white-30">
                <Activity className="w-16 h-16 mx-auto mb-3 opacity-30"/>
                <p className="text-xs font-semibold">Select an activity and enter details to estimate burn</p>
              </div>)}
          </div>
        </div>)}

      {/* ─── WAIST-TO-HIP RATIO CALCULATOR ─── */}
      {activeCalc === 'whr' && (<div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="card-container p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-[#34D399]/10 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-[#34D399]"/>
              </div>
              <div>
                <h3 className="font-extrabold text-white">Waist-to-Hip Ratio</h3>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">ACE Health Risk Assessment</p>
              </div>
            </div>
            <form onSubmit={calculateWHR} className="space-y-4">
              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-white/70 mb-2">Biological Sex</label>
                <div className="grid grid-cols-2 gap-2">
                  {['male', 'female'].map((g) => (<button key={g} type="button" onClick={() => setWhrGender(g)} className={`py-2 rounded-xl text-xs font-bold capitalize cursor-pointer transition-all border ${whrGender === g
                    ? 'bg-[#34D399]/20 border-[#34D399]/60 text-[#34D399]'
                    : 'border-white/10 text-white/50 hover:border-white/30'}`}>
                      {g}
                    </button>))}
                </div>
              </div>
              {/* Waist */}
              <div>
                <label className="flex justify-between text-xs font-bold text-white/70 mb-1">
                  <span>Waist Circumference</span>
                  <span className="text-white">{whrWaist} cm</span>
                </label>
                <input type="range" min={50} max={150} value={whrWaist} onChange={(e) => setWhrWaist(+e.target.value)} className="w-full accent-[#34D399]"/>
              </div>
              {/* Hip */}
              <div>
                <label className="flex justify-between text-xs font-bold text-white/70 mb-1">
                  <span>Hip Circumference</span>
                  <span className="text-white">{whrHip} cm</span>
                </label>
                <input type="range" min={60} max={160} value={whrHip} onChange={(e) => setWhrHip(+e.target.value)} className="w-full accent-[#34D399]"/>
              </div>
              <button type="submit" className="w-full py-3 bg-[#34D399] text-[#0a0a0f] font-extrabold rounded-xl hover:opacity-90 transition-all cursor-pointer">
                Calculate WHR
              </button>
            </form>
          </div>

          {/* Result */}
          <div className="card-container p-6 flex flex-col justify-center">
            {whrResult !== null ? (() => {
                const cat = getWHRCategory(whrResult, whrGender);
                return (<div className="space-y-5 text-center">
                  <div className="w-24 h-24 rounded-full border-4 mx-auto flex items-center justify-center" style={{ borderColor: cat.color, backgroundColor: cat.color + '15' }}>
                    <span className="text-3xl font-extrabold" style={{ color: cat.color }}>{whrResult.toFixed(2)}</span>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold" style={{ color: cat.color }}>{cat.label}</p>
                    <p className="text-sm text-white/60 mt-2 leading-relaxed">{cat.desc}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left text-xs space-y-2">
                    <p className="font-bold text-white/70 uppercase tracking-wider text-[10px] mb-2">ACE Risk Thresholds</p>
                    {['male', 'female'].map((g) => (<div key={g} className="flex items-center gap-2">
                        <span className="capitalize w-12 text-white/50">{g}:</span>
                        <span className="text-[#34D399] font-bold">&lt;0.90</span>
                        <span className="text-white/30">Low</span>
                        <span className="mx-1 text-white/20">|</span>
                        <span className="text-[#00C4B4] font-bold">{g === 'male' ? '0.90–0.99' : '0.80–0.84'}</span>
                        <span className="text-white/30">Mod</span>
                        <span className="mx-1 text-white/20">|</span>
                        <span className="text-[#EF4444] font-bold">≥{g === 'male' ? '1.00' : '0.85'}</span>
                        <span className="text-white/30">High</span>
                      </div>))}
                  </div>
                </div>);
            })() : (<div className="text-center py-12 text-white/30">
                <Ruler className="w-16 h-16 mx-auto mb-3 opacity-30"/>
                <p className="text-xs font-semibold">Enter your measurements to assess abdominal health risk</p>
              </div>)}
          </div>
        </div>)}

      {/* ─── BLOOD PRESSURE CALCULATOR ─── */}
      {activeCalc === 'bp' && (<div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="card-container p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Gauge className="w-5 h-5 text-red-400"/>
              </div>
              <div>
                <h3 className="font-extrabold text-white">Blood Pressure Assessment</h3>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">AHA / ACE Classification</p>
              </div>
            </div>
            <form onSubmit={calculateBP} className="space-y-5">
              {/* Systolic */}
              <div>
                <label className="flex justify-between text-xs font-bold text-white/70 mb-1">
                  <span>Systolic Pressure <span className="text-white/40 font-normal">(top number)</span></span>
                  <span className="text-white">{bpSystolic} mmHg</span>
                </label>
                <input type="range" min={80} max={200} value={bpSystolic} onChange={(e) => setBpSystolic(+e.target.value)} className="w-full accent-red-500"/>
              </div>
              {/* Diastolic */}
              <div>
                <label className="flex justify-between text-xs font-bold text-white/70 mb-1">
                  <span>Diastolic Pressure <span className="text-white/40 font-normal">(bottom number)</span></span>
                  <span className="text-white">{bpDiastolic} mmHg</span>
                </label>
                <input type="range" min={50} max={130} value={bpDiastolic} onChange={(e) => setBpDiastolic(+e.target.value)} className="w-full accent-red-500"/>
              </div>
              {/* Preview reading */}
              <div className="text-center">
                <span className="text-4xl font-extrabold text-white">{bpSystolic}</span>
                <span className="text-2xl text-white/40 mx-1">/</span>
                <span className="text-4xl font-extrabold text-white">{bpDiastolic}</span>
                <span className="block text-xs text-white/40 mt-1">mmHg</span>
              </div>
              <button type="submit" className="w-full py-3 bg-red-500 text-white font-extrabold rounded-xl hover:opacity-90 transition-all cursor-pointer">
                Assess Blood Pressure
              </button>
            </form>
          </div>

          {/* Result + AHA Stages table */}
          <div className="card-container p-6 flex flex-col gap-5">
            {bpResult ? (<>
                <div className="text-center py-4 space-y-3">
                  <div className="inline-flex items-center px-5 py-2 rounded-full font-extrabold text-lg" style={{ backgroundColor: bpResult.color + '20', color: bpResult.color, border: `1px solid ${bpResult.color}40` }}>
                    {bpResult.label}
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed max-w-xs mx-auto">{bpResult.desc}</p>
                </div>
                <hr className="border-white/10"/>
              </>) : null}
            {/* AHA Stages Reference */}
            <div>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-3">AHA Blood Pressure Categories</p>
              <div className="space-y-2">
                {BP_CATEGORIES.map((cat) => (<div key={cat.label} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border transition-all ${bpResult?.label === cat.label
                    ? 'border-opacity-60'
                    : 'border-white/5 bg-white/3'}`} style={bpResult?.label === cat.label ? { borderColor: cat.color + '60', backgroundColor: cat.color + '10' } : {}}>
                    <span className="font-bold" style={{ color: cat.color }}>{cat.label}</span>
                    <span className="text-white/40 text-[10px]">
                      {cat.label === 'Normal' ? '<120 / <80' :
                    cat.label === 'Elevated' ? '120–129 / <80' :
                        cat.label === 'High — Stage 1' ? '130–139 / 80–89' :
                            cat.label === 'High — Stage 2' ? '≥140 / ≥90' : '>180 / >120'} mmHg
                    </span>
                  </div>))}
              </div>
            </div>
          </div>
        </div>)}

      {/* ─── 1RM TRAINING LOAD TABLES (shown below result in '1rm' tab) ─── */}
      {activeCalc === '1rm' && calculated1RM !== null && (<div className="card-container p-6 space-y-5">
          <div>
            <h4 className="font-extrabold text-white">ACE Training Load Tables</h4>
            <p className="text-xs text-white/50 mt-0.5">Based on your estimated 1RM of <span className="text-[#00C4B4] font-bold">{calculated1RM} kg</span></p>
          </div>
          <div className="space-y-3">
            {ONE_RM_ZONES.map((zone) => {
                const minKg = Math.round(calculated1RM * zone.pctMin / 100);
                const maxKg = Math.round(calculated1RM * zone.pctMax / 100);
                return (<div key={zone.name} className="flex items-start gap-4 p-4 rounded-2xl border border-white/5 bg-white/3 hover:bg-white/5 transition-all">
                  <div className="w-2 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: zone.color }}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-sm" style={{ color: zone.color }}>{zone.name}</span>
                      <span className="text-xs font-bold text-white/70">{zone.pctMin}–{zone.pctMax}% 1RM</span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5 mb-2">{zone.desc}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                        🏋️ <span className="font-bold text-white">{minKg}–{maxKg} kg</span>
                      </span>
                      <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                        🔁 <span className="font-bold text-white">{zone.repsRange} reps</span>
                      </span>
                    </div>
                  </div>
                </div>);
            })}
          </div>
        </div>)}
    </div>);
};
