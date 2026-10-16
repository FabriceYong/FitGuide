'use client';

import React from 'react';
import { Zap, Activity, CheckCircle2, Sparkles, TrendingUp, Flame } from 'lucide-react';

export const ActivityLevelStep = ({
    selectedFitnessLevel,
    selectedActivityStatus,
    onFitnessLevelSelected,
    onActivityStatusSelected,
}) => {
    const fitnessLevels = [
        { id: 'Beginner', title: 'Beginner', desc: 'New or returning to workouts. Focus on core form & mobility.', icon: Zap, color: '#00C4B4' },
        { id: 'Intermediate', title: 'Intermediate', desc: 'Train 2–4 times a week. Seeking higher volume & progressive strength.', icon: TrendingUp, color: '#3E25F5' },
        { id: 'Advanced', title: 'Advanced Pro', desc: 'Consistent intense athlete. Ready for heavy hypertrophy & peak performance.', icon: Flame, color: '#EF4444' },
    ];

    const activityStatuses = [
        { id: 'Active', label: 'Active', desc: 'Workout 3+ days / week' },
        { id: 'Inactive', label: 'Inactive / Desk Job', desc: 'Low daily movement' },
        { id: 'Moderately Active', label: 'Moderately Active', desc: 'Light daily exercise & steps' },
        { id: 'Very Active', label: 'Very Active', desc: 'Daily physical training or job' },
    ];

    return (
        <div className="flex flex-col justify-center min-h-[60vh] text-left p-6 w-full max-w-md mx-auto relative z-10">
            <div className="space-y-2 mb-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-lime-light tracking-widest uppercase bg-lime-light/10 px-3 py-1 rounded-full border border-lime-light/30">
                    <Sparkles className="w-3 h-3" /> Step 3 of Personalization
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                    Fitness & Activity Status
                </h2>
                <p className="text-xs text-white-70">
                    Helps us calibrate workout complexity, rest intervals, and daily TDEE energy burn.
                </p>
            </div>

            {/* Fitness Level Selection */}
            <div className="space-y-2 mb-5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-lime-light flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Your Current Fitness Level
                </label>
                <div className="space-y-2">
                    {fitnessLevels.map((lvl) => {
                        const isSelected = selectedFitnessLevel === lvl.id;
                        const Icon = lvl.icon;
                        return (
                            <button
                                key={lvl.id}
                                type="button"
                                onClick={() => onFitnessLevelSelected(lvl.id)}
                                className={`w-full flex items-center p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                                    isSelected
                                        ? 'bg-obsidian-wave border-lime-light border-2 text-white shadow-sm'
                                        : 'bg-white/5 border-white-30/15 text-white-70 hover:text-white hover:border-white-30/30'
                                }`}
                            >
                                <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 ${
                                        isSelected ? 'bg-lime-light text-noir-eclipse font-extrabold' : 'bg-white/10 text-white'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                    <h4 className="text-xs font-extrabold text-white leading-tight">{lvl.title}</h4>
                                    <p className="text-[10px] text-white-70 leading-snug">{lvl.desc}</p>
                                </div>
                                {isSelected && <CheckCircle2 className="w-5 h-5 text-lime-light flex-shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Activity Status Grid */}
            <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-lime-light flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> Daily Activity Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {activityStatuses.map((st) => {
                        const isSelected = selectedActivityStatus === st.id;
                        return (
                            <button
                                key={st.id}
                                type="button"
                                onClick={() => onActivityStatusSelected(st.id)}
                                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                    isSelected
                                        ? 'bg-obsidian-wave border-lime-light border-2 text-white'
                                        : 'bg-white/5 border-white-30/15 text-white-70 hover:text-white'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-white truncate">{st.label}</span>
                                    {isSelected && <span className="w-2 h-2 rounded-full bg-lime-light" />}
                                </div>
                                <p className="text-[9px] text-white-50 leading-tight mt-0.5">{st.desc}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
