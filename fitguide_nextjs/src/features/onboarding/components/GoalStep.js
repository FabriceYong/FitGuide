'use client';

import React from 'react';
import { Heart, Dumbbell, Scale, Activity } from 'lucide-react';
import { OptionCard, StepHeading } from '../ui';

const GOALS = [
    { id: 'Vitality', title: 'Overall health and energy', subtitle: 'Feel fitter day to day with a balanced mix of cardio, strength and mobility.', icon: Heart, color: '#00C4B4' },
    { id: 'Muscle', title: 'Build muscle and strength', subtitle: 'Mostly strength training, with some conditioning and mobility.', icon: Dumbbell, color: '#7C6CFF' },
    { id: 'Weight', title: 'Lose fat and improve fitness', subtitle: 'More calorie-burning cardio and conditioning, plus strength work.', icon: Scale, color: '#F87171' },
    { id: 'Flexibility', title: 'Mobility and flexibility', subtitle: 'Yoga, stretching and Pilates for range of motion and core stability.', icon: Activity, color: '#10B981' },
];

export const GoalStep = ({ selectedGoal, onGoalSelected }) => (
    <div>
        <StepHeading
            title="What's your main goal?"
            description="Your recommended workouts and plans lean toward this. You can change it at any time."
        />
        <div className="space-y-3">
            {GOALS.map((goal) => (
                <OptionCard
                    key={goal.id}
                    title={goal.title}
                    description={goal.subtitle}
                    icon={goal.icon}
                    color={goal.color}
                    selected={selectedGoal === goal.id}
                    onClick={() => onGoalSelected(goal.id)}
                />
            ))}
        </div>
    </div>
);
