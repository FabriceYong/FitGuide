'use client';

import React from 'react';
import { Dumbbell, Zap, Target, Award } from 'lucide-react';
import { StepHeading } from '../ui';

const FEATURES = [
    { text: 'Workouts and programs matched to your level, from beginner to advanced', icon: Dumbbell, color: '#00C4B4' },
    { text: 'A guided player that times each step and logs your sets', icon: Zap, color: '#7C6CFF' },
    { text: 'Calorie and macro targets for your goal and diet', icon: Target, color: '#10B981' },
    { text: 'Progress tracking, streaks, personal records and health calculators', icon: Award, color: '#F87171' },
];

export const WelcomeStep = () => (
    <div>
        <StepHeading
            as="h1"
            title="Create your FitGuide account"
            description="Answer a few questions so we can suggest the right workouts and targets for you. It takes about two minutes, and you can change everything later."
        />
        <ul className="space-y-3">
            {FEATURES.map(({ text, icon: Icon, color }) => (
                <li key={text} className="flex items-center gap-3.5 p-4 rounded-xl border border-white-30/20 bg-white/[0.03]">
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}22`, color }} aria-hidden="true">
                        <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-base text-white leading-snug">{text}</span>
                </li>
            ))}
        </ul>
    </div>
);
