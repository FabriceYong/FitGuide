'use client';

import React, { useState } from 'react';
import { Plus, Minus, Scale, Sparkles, Zap } from 'lucide-react';

export const WeightStep = ({ onWeightSelected }) => {
    const [unit, setUnit] = useState('kg'); // 'kg' or 'lbs'
    const [weightKg, setWeightKg] = useState(70);

    const minWeightKg = 30;
    const maxWeightKg = 150;

    const displayWeight = unit === 'kg' ? weightKg : Math.round(weightKg * 2.20462);

    const adjustWeight = (deltaKg) => {
        const newWeight = Math.max(minWeightKg, Math.min(maxWeightKg, weightKg + deltaKg));
        setWeightKg(newWeight);
        onWeightSelected(newWeight);
    };

    return (
        <div className="flex flex-col justify-center min-h-[60vh] text-center p-6 select-none w-full max-w-md mx-auto relative z-10">
            <div className="space-y-2 mb-6">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-lime-light tracking-widest uppercase bg-lime-light/10 px-3 py-1 rounded-full border border-lime-light/30">
                    <Sparkles className="w-3 h-3" /> Step 2 of Personalization
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                    What Is Your Target Weight?
                </h2>
                <p className="text-xs text-white-70">
                    Used to calculate recommended daily target caloric intake and macro distribution.
                </p>
            </div>

            {/* Unit Switcher */}
            <div className="inline-flex mx-auto p-1 bg-obsidian-wave border border-white-30/20 rounded-2xl mb-6 shadow-inner">
                <button
                    type="button"
                    onClick={() => setUnit('kg')}
                    className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer ${
                        unit === 'kg'
                            ? 'bg-lime-light text-noir-eclipse shadow-[0_0_15px_rgba(0,196,180,0.3)] scale-[1.02]'
                            : 'text-white-70 hover:text-white'
                    }`}
                >
                    Kilograms (kg)
                </button>
                <button
                    type="button"
                    onClick={() => setUnit('lbs')}
                    className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer ${
                        unit === 'lbs'
                            ? 'bg-lime-light text-noir-eclipse shadow-[0_0_15px_rgba(0,196,180,0.3)] scale-[1.02]'
                            : 'text-white-70 hover:text-white'
                    }`}
                >
                    Pounds (lbs)
                </button>
            </div>

            {/* Main Weight Counter Card */}
            <div className="bg-obsidian-wave/90 border border-white-30/20 rounded-3xl p-6 mb-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Scale className="w-32 h-32 text-lime-light" />
                </div>

                <div className="flex items-center justify-center gap-6 relative z-10">
                    <button
                        type="button"
                        onClick={() => adjustWeight(-1)}
                        disabled={weightKg <= minWeightKg}
                        className="w-14 h-14 rounded-2xl bg-white/10 border-2 border-white-30/30 hover:border-lime-light hover:bg-lime-light/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center active:scale-95 text-white cursor-pointer"
                    >
                        <Minus className="w-6 h-6" />
                    </button>

                    <div className="flex items-baseline">
                        <span className="text-7xl font-black tracking-tight text-white font-mono">{displayWeight}</span>
                        <span className="text-xl font-extrabold text-lime-light ml-2 uppercase tracking-wider">{unit}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => adjustWeight(1)}
                        disabled={weightKg >= maxWeightKg}
                        className="w-14 h-14 rounded-2xl bg-white/10 border-2 border-white-30/30 hover:border-lime-light hover:bg-lime-light/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center active:scale-95 text-white cursor-pointer"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>

                {/* Quick Adjustment Chips */}
                <div className="flex justify-center gap-2 mt-6 relative z-10">
                    {[-5, -1, +1, +5].map((delta) => (
                        <button
                            key={delta}
                            type="button"
                            onClick={() => adjustWeight(delta)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-white/5 border border-white-30/20 text-white-70 hover:text-white hover:border-lime-light hover:bg-white/10 transition-all cursor-pointer"
                        >
                            {delta > 0 ? `+${delta}` : delta} kg
                        </button>
                    ))}
                </div>
            </div>

            {/* Calorie recommendation hint */}
            <div className="bg-white/5 border border-white-30/10 rounded-2xl p-3.5 flex items-center justify-between text-xs text-white-70">
                <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-lime-light" />
                    Estimated Maintenance Target
                </span>
                <span className="font-mono font-extrabold text-lime-light">{Math.round(weightKg * 32)} kcal / day</span>
            </div>
        </div>
    );
};
