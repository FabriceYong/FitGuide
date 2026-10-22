'use client';

import React, { useState, useEffect } from 'react';
import {
    Dumbbell,
    Timer,
    Utensils,
    Activity,
    Play,
    Pause,
    RotateCcw,
    ChevronRight,
    Flame,
    Zap,
    Target,
    Award,
    CheckCircle2,
    Volume2
} from 'lucide-react';
import { StepHeading } from '../ui';

export const InteractiveConceptStep = () => {
    const [activeConcept, setActiveConcept] = useState(0);

    // Concept 1: Muscle Selector State
    const [selectedMuscle, setSelectedMuscle] = useState('chest');
    const muscleData = {
        chest: { name: 'Chest & Pecs', exercises: ['Barbell Bench Press', 'Incline Dumbbell Flyes', 'Cable Crossover'], color: '#00C4B4', level: 'Intermediate' },
        back: { name: 'Back & Lats', exercises: ['Pull-ups', 'Lat Pulldown', 'Bent-Over Barbell Row'], color: '#3E25F5', level: 'All Levels' },
        legs: { name: 'Legs & Quads', exercises: ['Barbell Back Squat', 'Romanian Deadlift', 'Leg Extension'], color: '#10B981', level: 'Advanced' },
        core: { name: 'Abs & Core', exercises: ['Hanging Leg Raises', 'Plank Hold', 'Russian Twists'], color: '#EF4444', level: 'Beginner' },
        arms: { name: 'Biceps & Triceps', exercises: ['Dumbbell Bicep Curl', 'Tricep Rope Pushdown', 'Hammer Curls'], color: '#F59E0B', level: 'All Levels' },
    };

    // Concept 2: Smart Timer State
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(45);

    useEffect(() => {
        let interval = null;
        if (isTimerRunning && timerSeconds > 0) {
            interval = setInterval(() => {
                setTimerSeconds((prev) => prev - 1);
            }, 1000);
        } else if (timerSeconds === 0) {
            setIsTimerRunning(false);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timerSeconds]);

    // Concept 3: Macro Nutrition Slider State
    const [calories, setCalories] = useState(2400);
    const proteinGrams = Math.round((calories * 0.30) / 4);
    const carbGrams = Math.round((calories * 0.45) / 4);
    const fatGrams = Math.round((calories * 0.25) / 9);

    // Concept 4: Calculator Switch State
    const [calcTab, setCalcTab] = useState('bmi');

    const concepts = [
        { id: 0, title: 'Muscle Map', icon: Dumbbell, color: '#00C4B4' },
        { id: 1, title: 'Smart Player', icon: Timer, color: '#3E25F5' },
        { id: 2, title: 'Macro Sync', icon: Utensils, color: '#10B981' },
        { id: 3, title: 'Analytics', icon: Activity, color: '#EF4444' },
    ];

    return (
        <div className="text-left w-full">
            <StepHeading title="A quick look around" description="Try the tabs to preview some of what FitGuide does. The numbers here are examples." />

            {/* Concept Selector Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-obsidian-wave border border-white-30/20 rounded-2xl mb-4">
                {concepts.map((concept) => {
                    const Icon = concept.icon;
                    const isActive = activeConcept === concept.id;
                    return (
                        <button
                            key={concept.id}
                            type="button"
                            onClick={() => setActiveConcept(concept.id)}
                            aria-pressed={isActive}
                            className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-200 cursor-pointer ${
                                isActive
                                    ? 'bg-lime-light text-noir-eclipse font-semibold'
                                    : 'text-white-70 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
                            <span className="text-sm max-w-full font-semibold leading-tight">{concept.title}</span>
                        </button>
                    );
                })}
            </div>

            {/* Dynamic Concept Card Content */}
            <div className="bg-obsidian-wave/90 border border-white-30/20 rounded-2xl p-4 backdrop-blur-md min-h-[260px] flex flex-col justify-between relative overflow-hidden shadow-2xl">
                {/* Visual Ambient Glow */}
                <div
                    className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl pointer-events-none"
                    style={{ backgroundColor: concepts[activeConcept].color }}
                />

                {/* CONCEPT 0: INTERACTIVE MUSCLE & EXERCISE SELECTOR */}
                {activeConcept === 0 && (
                    <div className="space-y-3 z-10">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-lime-light flex items-center gap-1">
                                <Target className="w-3 h-3" /> Target Muscle Selector
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-lime-light/10 text-lime-light border border-lime-light/20 font-semibold">
                                {muscleData[selectedMuscle].level}
                            </span>
                        </div>

                        {/* Muscle selector pills */}
                        <div className="flex flex-wrap gap-1.5">
                            {Object.keys(muscleData).map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setSelectedMuscle(key)}
                                    className={`px-2.5 py-1 rounded-lg text-sm font-bold capitalize transition-all cursor-pointer ${
                                        selectedMuscle === key
                                            ? 'bg-lime-light text-noir-eclipse scale-105 shadow'
                                            : 'bg-white/10 text-white-70 hover:bg-white/20 hover:text-white'
                                    }`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>

                        {/* Targeted exercises list */}
                        <div className="bg-noir-eclipse/80 p-3 rounded-xl border border-white-30/10 space-y-2 mt-2">
                            <h4 className="text-sm font-bold text-white flex items-center justify-between">
                                <span>{muscleData[selectedMuscle].name} Focus</span>
                                <span className="text-xs text-white-70">3 Recommended Moves</span>
                            </h4>
                            <div className="space-y-1.5">
                                {muscleData[selectedMuscle].exercises.map((ex, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/5 border border-white-30/5">
                                        <span className="font-medium text-white flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-lime-light" />
                                            {ex}
                                        </span>
                                        <span className="text-xs text-white-70 font-mono">3 × 12 reps</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* CONCEPT 1: SMART GUIDED WORKOUT TIMER PLAYER */}
                {activeConcept === 1 && (
                    <div className="space-y-3 z-10 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-lime-light flex items-center gap-1">
                                <Zap className="w-3 h-3" /> Live Workout Engine
                            </span>
                            <div className="flex items-center gap-1 text-xs text-lime-light">
                                <Volume2 className="w-3 h-3 animate-pulse" />
                                <span>Audio Beeps On</span>
                            </div>
                        </div>

                        <div className="bg-noir-eclipse/80 p-4 rounded-xl border border-white-30/10 text-center space-y-2">
                            <div className="text-xs font-bold text-white-70 tracking-wider">
                                Current Set • Exercise 2 of 6
                            </div>
                            <div className="text-4xl font-black tracking-tight font-mono text-lime-light">
                                00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
                            </div>
                            <p className="text-sm font-bold text-white">Incline Dumbbell Press</p>
                        </div>

                        {/* Player Controls */}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setTimerSeconds(45);
                                    setIsTimerRunning(false);
                                }}
                                className="p-2.5 rounded-full bg-white/10 text-white-70 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsTimerRunning(!isTimerRunning)}
                                className={`px-6 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer ${
                                    isTimerRunning
                                        ? 'bg-amber-400 text-noir-eclipse border border-amber-400/40 hover:bg-amber-400/90'
                                        : 'bg-lime-light text-noir-eclipse border border-lime-light/40 hover:bg-lime-light/90'
                                }`}
                            >
                                {isTimerRunning ? (
                                    <>
                                        <Pause className="w-4 h-4" /> Pause timer
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4" /> Start step timer
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* CONCEPT 2: PRECISION NUTRITION & MACRO SLIDER */}
                {activeConcept === 2 && (
                    <div className="space-y-3 z-10">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-lime-light flex items-center gap-1">
                                <Flame className="w-3 h-3" /> Precision Macro Calculator
                            </span>
                            <span className="text-sm font-black text-white">{calories} kcal / day</span>
                        </div>

                        {/* Interactive Calorie Slider */}
                        <div className="space-y-1">
                            <input
                                type="range"
                                min="1500"
                                max="3500"
                                step="50"
                                value={calories}
                                onChange={(e) => setCalories(Number(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lime-light"
                            />
                            <div className="flex justify-between text-xs text-white-70 font-semibold">
                                <span>1500 kcal (Deficit)</span>
                                <span>2500 kcal (Maintenance)</span>
                                <span>3500 kcal (Bulk)</span>
                            </div>
                        </div>

                        {/* Visual Macro Distribution Bars */}
                        <div className="bg-noir-eclipse/80 p-3 rounded-xl border border-white-30/10 space-y-2.5">
                            {/* Protein */}
                            <div>
                                <div className="flex justify-between text-sm font-bold text-white mb-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                        Protein (30%)
                                    </span>
                                    <span className="text-cyan-400 font-mono">{proteinGrams}g</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: '30%' }} />
                                </div>
                            </div>

                            {/* Carbs */}
                            <div>
                                <div className="flex justify-between text-sm font-bold text-white mb-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        Carbohydrates (45%)
                                    </span>
                                    <span className="text-emerald-400 font-mono">{carbGrams}g</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: '45%' }} />
                                </div>
                            </div>

                            {/* Healthy Fats */}
                            <div>
                                <div className="flex justify-between text-sm font-bold text-white mb-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                                        Healthy Fats (25%)
                                    </span>
                                    <span className="text-amber-400 font-mono">{fatGrams}g</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400 rounded-full" style={{ width: '25%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONCEPT 3: BODY CALCULATOR & ANALYTICS PREVIEW */}
                {activeConcept === 3 && (
                    <div className="space-y-3 z-10">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-lime-light flex items-center gap-1">
                                <Award className="w-3 h-3" /> Body Health Analytics
                            </span>
                            <div className="flex gap-1">
                                {['bmi', 'bmr', 'tdee'].map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setCalcTab(tab)}
                                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                                            calcTab === tab
                                                ? 'bg-lime-light text-noir-eclipse'
                                                : 'bg-white/10 text-white-70 hover:text-white'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Interactive Calc Display */}
                        <div className="bg-noir-eclipse/80 p-4 rounded-xl border border-white-30/10 space-y-2">
                            {calcTab === 'bmi' && (
                                <div className="space-y-1 text-center">
                                    <div className="text-xs text-white-70 font-semibold">Body Mass Index (BMI)</div>
                                    <div className="text-3xl font-black text-lime-light">22.4 <span className="text-sm font-normal text-emerald-400">(Normal Range)</span></div>
                                    <p className="text-sm text-white-70">Optimal weight-to-height ratio for lean athletic performance.</p>
                                </div>
                            )}
                            {calcTab === 'bmr' && (
                                <div className="space-y-1 text-center">
                                    <div className="text-xs text-white-70 font-semibold">Basal Metabolic Rate (BMR)</div>
                                    <div className="text-3xl font-black text-lime-light">1,780 <span className="text-sm font-normal text-cyan-400">kcal/day</span></div>
                                    <p className="text-sm text-white-70">Calories burned naturally at rest every 24 hours.</p>
                                </div>
                            )}
                            {calcTab === 'tdee' && (
                                <div className="space-y-1 text-center">
                                    <div className="text-xs text-white-70 font-semibold">Total Daily Energy Expenditure</div>
                                    <div className="text-3xl font-black text-lime-light">2,450 <span className="text-sm font-normal text-purple-400">kcal/day</span></div>
                                    <p className="text-sm text-white-70">Calculated energy burn including workout sessions & daily steps.</p>
                                </div>
                            )}
                        </div>

                        {/* Streak Tracker Badge */}
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white-30/10 text-sm">
                            <span className="text-white-70 flex items-center gap-1.5 font-medium">
                                <CheckCircle2 className="w-4 h-4 text-lime-light" />
                                7-Day Consistency Streak Active
                            </span>
                            <span className="font-semibold text-lime-light">+120 XP</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
