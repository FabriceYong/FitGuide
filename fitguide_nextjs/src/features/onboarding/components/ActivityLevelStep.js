'use client';

import React from 'react';
import { Zap, TrendingUp, Flame } from 'lucide-react';
import { OptionCard, Section, StepHeading } from '../ui';

const FITNESS_LEVELS = [
    { id: 'Beginner', title: 'Beginner', desc: 'New to training, or coming back after a break.', icon: Zap, color: '#00C4B4' },
    { id: 'Intermediate', title: 'Intermediate', desc: 'You train 2–4 times a week and know the main lifts and moves.', icon: TrendingUp, color: '#7C6CFF' },
    { id: 'Advanced', title: 'Advanced', desc: 'You train hard most days and want challenging sessions.', icon: Flame, color: '#F87171' },
];

const ACTIVITY_STATUSES = [
    { id: 'Inactive', label: 'Mostly sitting', desc: 'Desk job, little daily movement' },
    { id: 'Moderately Active', label: 'Lightly active', desc: 'Some walking and light exercise' },
    { id: 'Active', label: 'Active', desc: 'Exercise 3 or more days a week' },
    { id: 'Very Active', label: 'Very active', desc: 'Daily training or a physical job' },
];

export const ActivityLevelStep = ({
    selectedFitnessLevel,
    selectedActivityStatus,
    onFitnessLevelSelected,
    onActivityStatusSelected,
}) => (
    <div>
        <StepHeading
            title="Your fitness and activity"
            description="This sets how hard your suggested workouts are and how many calories you need each day."
        />

        <div className="space-y-8">
            <Section title="Fitness level">
                <div className="space-y-3">
                    {FITNESS_LEVELS.map((lvl) => (
                        <OptionCard
                            key={lvl.id}
                            title={lvl.title}
                            description={lvl.desc}
                            icon={lvl.icon}
                            color={lvl.color}
                            selected={selectedFitnessLevel === lvl.id}
                            onClick={() => onFitnessLevelSelected(lvl.id)}
                        />
                    ))}
                </div>
            </Section>

            <Section title="How active are you day to day?">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ACTIVITY_STATUSES.map((st) => (
                        <OptionCard
                            key={st.id}
                            title={st.label}
                            description={st.desc}
                            selected={selectedActivityStatus === st.id}
                            onClick={() => onActivityStatusSelected(st.id)}
                        />
                    ))}
                </div>
            </Section>
        </div>
    </div>
);
