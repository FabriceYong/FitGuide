'use client';

import React from 'react';
import { Heart, Dumbbell, Scale, Activity, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';

export const GoalStep = ({ selectedGoal, onGoalSelected }) => {
    const goals = [
        {
            id: 'Vitality',
            title: 'Vitality & Longevity',
            subtitle: 'Boost daily energy, reduce posture fatigue, and maintain lifelong stamina.',
            icon: Heart,
            color: '#00C4B4',
            badge: 'Health & Balance',
        },
        {
            id: 'Muscle',
            title: 'Muscle & Hypertrophy',
            subtitle: 'Build lean muscular strength, raw physical power, and density.',
            icon: Dumbbell,
            color: '#3E25F5',
            badge: 'Strength & Mass',
        },
        {
            id: 'Weight',
            title: 'Fat Loss & Conditioning',
            subtitle: 'Maximize calorie expenditure, burn stubborn fat & improve cardio capacity.',
            icon: Scale,
            color: '#EF4444',
            badge: 'Metabolic & Lean',
        },
        {
            id: 'Flexibility',
            title: 'Mobility & Joint Flow',
            subtitle: 'Enhance joint range of motion, core stability, and active recovery.',
            icon: Activity,
            color: '#10B981',
            badge: 'Flow & Agility',
        },
    ];

    return (
        <div className="flex flex-col justify-center min-h-[60vh] text-left p-6 w-full max-w-md mx-auto relative z-10">
            <div className="space-y-2 mb-6">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-lime-light tracking-widest uppercase bg-lime-light/10 px-3 py-1 rounded-full border border-lime-light/30">
                    <Sparkles className="w-3 h-3" /> Step 1 of Personalization
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                    What Is Your Primary Fitness Goal?
                </h2>
                <p className="text-xs text-white-70">
                    Your workout recommendations and program structure will adapt to this goal.
                </p>
            </div>

            <div className="space-y-3 w-full">
                {goals.map((goal) => {
                    const isSelected = selectedGoal === goal.id;
                    const Icon = goal.icon;
                    return (
                        <button
                            key={goal.id}
                            type="button"
                            onClick={() => onGoalSelected(goal.id)}
                            className={`w-full flex items-center p-4 rounded-2xl transition-all duration-200 border text-left cursor-pointer relative overflow-hidden ${
                                isSelected
                                    ? 'bg-obsidian-wave border-lime-light border-2 shadow-[0_0_25px_rgba(0,196,180,0.25)] scale-[1.01]'
                                    : 'bg-white/5 border-white-30/15 hover:border-white-30/40 hover:bg-white/10'
                            }`}
                        >
                            {/* Accent indicator strip */}
                            {isSelected && (
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-lime-light" />
                            )}

                            {/* Icon Container */}
                            <div
                                className={`w-11 h-11 rounded-xl flex items-center justify-center mr-3.5 flex-shrink-0 transition-all ${
                                    isSelected
                                        ? 'bg-lime-light text-noir-eclipse font-black shadow-md'
                                        : 'bg-white/10 text-white'
                                }`}
                                style={{
                                    backgroundColor: isSelected ? undefined : `${goal.color}20`,
                                    color: isSelected ? undefined : goal.color,
                                    border: isSelected ? undefined : `1px solid ${goal.color}40`,
                                }}
                            >
                                <Icon className="w-5 h-5" />
                            </div>

                            {/* Text & Subtitle */}
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center justify-between gap-1 mb-1">
                                    <h3 className="text-sm font-extrabold text-white leading-none">{goal.title}</h3>
                                    <span
                                        className="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase"
                                        style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                                    >
                                        {goal.badge}
                                    </span>
                                </div>
                                <p className="text-xs text-white-70 leading-snug">{goal.subtitle}</p>
                            </div>

                            {/* Checkbox Indicator */}
                            <div className="flex-shrink-0 ml-1">
                                {isSelected ? (
                                    <CheckCircle2 className="w-6 h-6 text-lime-light" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-white-30" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
