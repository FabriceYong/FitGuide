'use client';

import React from 'react';
import { Dumbbell, Timer, Utensils, Activity, Sparkles, ShieldCheck, Zap, Award } from 'lucide-react';

export const FeaturesStep = ({ onContinue }) => {
    const features = [
        {
            icon: Dumbbell,
            title: '60+ HD Exercise Library',
            description: 'Step-by-step instructions, targeted muscle breakdown, form cues, and breathing patterns for every move.',
            badge: 'HD Visuals',
            color: '#00C4B4',
        },
        {
            icon: Timer,
            title: 'Smart Workout Engine',
            description: 'Real-time workout player with duration-driven step generation, audio beeps, and single-timer control.',
            badge: 'Dynamic Steps',
            color: '#3E25F5',
        },
        {
            icon: Utensils,
            title: 'Precision Nutrition Paths',
            description: 'Tailored diet strategies including Keto, Mediterranean, Paleo, Intermittent Fasting & Balanced Macros.',
            badge: 'Diet Sync',
            color: '#10B981',
        },
        {
            icon: Activity,
            title: 'Body Calculators & Analytics',
            description: 'Complete fitness suite: BMI, BMR, TDEE, Macro ratios, One-Rep Max, and Target Heart Rate zones.',
            badge: 'Full Suite',
            color: '#EF4444',
        },
    ];

    return (
        <div className="flex flex-col justify-center min-h-[60vh] text-left p-6 w-full max-w-md mx-auto">
            <div className="space-y-2 mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-lime-light/20 text-lime-light border border-lime-light/30">
                    <Sparkles className="w-3 h-3" />
                    Everything You Need
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                    Why FitGuide Workouts Standardize Fitness
                </h2>
                <p className="text-xs text-white-70">
                    Designed for peak efficiency, safety, and sustainable results.
                </p>
            </div>

            {/* Feature Grid Cards */}
            <div className="space-y-3.5 w-full mb-2">
                {features.map((feat, idx) => {
                    const Icon = feat.icon;
                    return (
                        <div
                            key={idx}
                            className="p-4 rounded-2xl bg-obsidian-wave/90 border border-white-30/15 backdrop-blur-sm transition-all hover:border-white-30/40"
                        >
                            <div className="flex items-start gap-3.5">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: `${feat.color}20`, color: feat.color, border: `1px solid ${feat.color}40` }}
                                >
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-white leading-none">{feat.title}</h3>
                                        <span
                                            className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase"
                                            style={{ backgroundColor: `${feat.color}15`, color: feat.color }}
                                        >
                                            {feat.badge}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white-70 leading-relaxed line-clamp-2">
                                        {feat.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
