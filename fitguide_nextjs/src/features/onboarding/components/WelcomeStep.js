'use client';

import React from 'react';
import { Sparkles, Dumbbell, Shield, Zap, Target, ArrowRight, CheckCircle2, Award } from 'lucide-react';

export const WelcomeStep = ({ onContinue, onBackToLogin }) => {
    return (
        <div className="flex flex-col justify-between min-h-[60vh] text-left p-6 w-full max-w-md mx-auto relative z-10">
            <div className="space-y-6">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase bg-lime-light/15 text-lime-light border border-lime-light/30 shadow-[0_0_15px_rgba(0,196,180,0.2)]">
                    <Sparkles className="w-4 h-4 text-lime-light animate-pulse" />
                    <span>Next-Gen Fitness Intelligence</span>
                </div>

                {/* Hero Title */}
                <div className="space-y-3">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.12] text-white">
                        Master Your<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-light via-emerald-300 to-cyan-400 drop-shadow-sm">
                            Body & Mind
                        </span>
                    </h1>
                    <p className="text-xs md:text-sm text-white-70 leading-relaxed">
                        Welcome to FitGuide — your personalized command center for intelligent workouts, tailored nutrition strategies, and real-time progress analytics.
                    </p>
                </div>

                {/* Core Pillars List */}
                <div className="space-y-2.5 pt-2">
                    {[
                        { text: 'Customized Training Paths (Beginner to Pro)', icon: Dumbbell, color: '#00C4B4' },
                        { text: 'Duration-Driven Smart Step Workout Engine', icon: Zap, color: '#3E25F5' },
                        { text: 'Tailored Nutrition & Precision Macro Strategies', icon: Target, color: '#10B981' },
                        { text: 'Comprehensive Health Calculators & Analytics', icon: Award, color: '#EF4444' },
                    ].map((pillar, idx) => {
                        const Icon = pillar.icon;
                        return (
                            <div
                                key={idx}
                                className="flex items-center gap-3 bg-obsidian-wave/80 p-3 rounded-2xl border border-white-30/10 backdrop-blur-sm hover:border-lime-light/40 transition-all group"
                            >
                                <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: `${pillar.color}20`, color: pillar.color, border: `1px solid ${pillar.color}40` }}
                                >
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-semibold text-white-90 leading-snug">{pillar.text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Back to Login Link */}
            {onBackToLogin && (
                <div className="pt-6 text-center">
                    <p className="text-xs text-white-70">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={onBackToLogin}
                            className="text-lime-light font-extrabold hover:underline focus:outline-none cursor-pointer ml-1"
                        >
                            Sign In Here →
                        </button>
                    </p>
                </div>
            )}
        </div>
    );
};
