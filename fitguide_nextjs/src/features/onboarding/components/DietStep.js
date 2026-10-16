'use client';

import React from 'react';
import { Flame, Waves, Sprout, Timer, Apple, CheckCircle2, Sparkles } from 'lucide-react';

export const DietStep = ({ selectedDiet, onDietSelected }) => {
    const diets = [
        {
            id: 'Keto Diet',
            title: 'Keto Diet Strategy',
            subtitle: 'Ultra-low carb, high healthy fat. Forces metabolism to burn fat for fuel.',
            icon: Flame,
            macro: '70% Fat • 25% Pro • 5% Carb',
            color: '#F59E0B',
        },
        {
            id: 'Mediterranean Diet',
            title: 'Mediterranean Diet',
            subtitle: 'Heart-healthy whole foods, olive oil, lean seafood & fresh anti-oxidant produce.',
            icon: Waves,
            macro: 'Balanced Fats & Whole Grains',
            color: '#06B6D4',
        },
        {
            id: 'Paleo Diet',
            title: 'Paleo Ancestral Plan',
            subtitle: 'Clean whole-food nutrition — lean meats, vegetables, nuts & berries.',
            icon: Sprout,
            macro: 'High Protein • Zero Refined Grains',
            color: '#10B981',
        },
        {
            id: 'Intermittent Fasting',
            title: 'Intermittent Fasting (16:8)',
            subtitle: 'Structured eating window promoting cellular repair and autophagy.',
            icon: Timer,
            macro: 'Time-Restricted Window',
            color: '#8B5CF6',
        },
        {
            id: 'Flexible Balanced Plan',
            title: 'Flexible Balanced Macros',
            subtitle: 'Versatile macro ratio tailored for sustainable performance and lifestyle.',
            icon: Apple,
            macro: '40% Carb • 30% Pro • 30% Fat',
            color: '#00C4B4',
        },
    ];

    return (
        <div className="flex flex-col justify-center min-h-[60vh] text-left p-6 w-full max-w-md mx-auto relative z-10">
            <div className="space-y-2 mb-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-lime-light tracking-widest uppercase bg-lime-light/10 px-3 py-1 rounded-full border border-lime-light/30">
                    <Sparkles className="w-3 h-3" /> Step 3 of Personalization
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                    Select Your Nutrition Strategy
                </h2>
                <p className="text-xs text-white-70">
                    Your suggested recipes and macro targets will synchronize with this strategy.
                </p>
            </div>

            <div className="space-y-3 w-full">
                {diets.map((diet) => {
                    const isSelected = selectedDiet === diet.id;
                    const Icon = diet.icon;
                    return (
                        <button
                            key={diet.id}
                            type="button"
                            onClick={() => onDietSelected(diet.id)}
                            className={`w-full flex items-center p-3.5 rounded-2xl transition-all duration-200 border text-left cursor-pointer relative overflow-hidden ${
                                isSelected
                                    ? 'bg-obsidian-wave border-lime-light border-2 shadow-[0_0_25px_rgba(0,196,180,0.25)] scale-[1.01]'
                                    : 'bg-white/5 border-white-30/15 hover:border-white-30/40 hover:bg-white/10'
                            }`}
                        >
                            {isSelected && (
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-lime-light" />
                            )}

                            <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${
                                    isSelected ? 'bg-lime-light text-noir-eclipse font-extrabold shadow' : 'bg-white/10 text-white'
                                }`}
                                style={{
                                    backgroundColor: isSelected ? undefined : `${diet.color}20`,
                                    color: isSelected ? undefined : diet.color,
                                    border: isSelected ? undefined : `1px solid ${diet.color}40`,
                                }}
                            >
                                <Icon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <h3 className="text-xs md:text-sm font-extrabold text-white leading-none truncate">{diet.title}</h3>
                                    <span
                                        className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded"
                                        style={{ backgroundColor: `${diet.color}20`, color: diet.color }}
                                    >
                                        {diet.macro}
                                    </span>
                                </div>
                                <p className="text-xs text-white-70 leading-tight">{diet.subtitle}</p>
                            </div>

                            {isSelected && (
                                <div className="flex-shrink-0 ml-1">
                                    <CheckCircle2 className="w-5 h-5 text-lime-light" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
