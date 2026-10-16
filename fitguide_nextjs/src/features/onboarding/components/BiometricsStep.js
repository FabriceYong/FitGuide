'use client';

import React, { useState } from 'react';
import { User, Ruler, Scale, Sparkles, CheckCircle2 } from 'lucide-react';

export const BiometricsStep = ({
    selectedGender,
    height,
    weight,
    onGenderSelected,
    onHeightSelected,
    onWeightSelected,
}) => {
    const [unit, setUnit] = useState('metric'); // 'metric' (cm/kg) or 'imperial' (ft/lbs)

    const genders = [
        { id: 'Male', label: 'Male', description: 'Optimizes male BMR & muscle recommendation algorithms' },
        { id: 'Female', label: 'Female', description: 'Optimizes female BMR & pelvic/core wellness paths' },
        { id: 'Non-binary', label: 'Non-Binary', description: 'Flexible balanced fitness & health metrics' },
        { id: 'Prefer not to say', label: 'Prefer not to say', description: 'Standard health baseline metrics' },
    ];

    const displayHeight = unit === 'metric' ? `${height} cm` : `${Math.floor(height / 30.48)}' ${Math.round((height % 30.48) / 2.54)}"`;
    const displayWeight = unit === 'metric' ? `${weight} kg` : `${Math.round(weight * 2.20462)} lbs`;

    return (
        <div className="flex flex-col justify-center min-h-[60vh] text-left p-6 w-full max-w-md mx-auto relative z-10">
            <div className="space-y-2 mb-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-lime-light tracking-widest uppercase bg-lime-light/10 px-3 py-1 rounded-full border border-lime-light/30">
                    <Sparkles className="w-3 h-3" /> Step 2 of Personalization
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                    Your Biometric Profile
                </h2>
                <p className="text-xs text-white-70">
                    We use gender, height, and weight to calculate your basal metabolism & recommended exercise intensity.
                </p>
            </div>

            {/* Unit Switcher */}
            <div className="flex justify-end mb-4">
                <div className="inline-flex p-1 bg-obsidian-wave border border-white-30/20 rounded-xl text-[10px] font-extrabold">
                    <button
                        type="button"
                        onClick={() => setUnit('metric')}
                        className={`px-3 py-1 rounded-lg uppercase cursor-pointer transition-all ${
                            unit === 'metric' ? 'bg-lime-light text-noir-eclipse' : 'text-white-70 hover:text-white'
                        }`}
                    >
                        Metric (cm/kg)
                    </button>
                    <button
                        type="button"
                        onClick={() => setUnit('imperial')}
                        className={`px-3 py-1 rounded-lg uppercase cursor-pointer transition-all ${
                            unit === 'imperial' ? 'bg-lime-light text-noir-eclipse' : 'text-white-70 hover:text-white'
                        }`}
                    >
                        Imperial (ft/lbs)
                    </button>
                </div>
            </div>

            {/* Gender Selection */}
            <div className="space-y-2 mb-5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-lime-light flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Gender Identity (For Calories & Workouts)
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {genders.map((g) => {
                        const isSelected = selectedGender === g.id;
                        return (
                            <button
                                key={g.id}
                                type="button"
                                onClick={() => onGenderSelected(g.id)}
                                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                                    isSelected
                                        ? 'bg-obsidian-wave border-lime-light border-2 text-white shadow-sm'
                                        : 'bg-white/5 border-white-30/15 text-white-70 hover:text-white hover:border-white-30/30'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs font-bold text-white">{g.label}</span>
                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-lime-light" />}
                                </div>
                                <p className="text-[10px] text-white-50 leading-tight line-clamp-1">{g.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Height & Weight Sliders */}
            <div className="bg-obsidian-wave/90 border border-white-30/15 rounded-2xl p-4 space-y-4 backdrop-blur-md">
                {/* Height Slider */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                            <Ruler className="w-4 h-4 text-cyan-400" /> Height
                        </span>
                        <span className="font-mono font-extrabold text-lime-light">{displayHeight}</span>
                    </div>
                    <input
                        type="range"
                        min="120"
                        max="220"
                        value={height}
                        onChange={(e) => onHeightSelected(Number(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lime-light"
                    />
                </div>

                {/* Current Weight Slider */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                            <Scale className="w-4 h-4 text-emerald-400" /> Current Weight
                        </span>
                        <span className="font-mono font-extrabold text-lime-light">{displayWeight}</span>
                    </div>
                    <input
                        type="range"
                        min="40"
                        max="180"
                        value={weight}
                        onChange={(e) => onWeightSelected(Number(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lime-light"
                    />
                </div>
            </div>
        </div>
    );
};
