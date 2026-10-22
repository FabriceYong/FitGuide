'use client';

import React from 'react';
import { Flame, Waves, Sprout, Timer, Apple } from 'lucide-react';
import { OptionCard, StepHeading } from '../ui';

const DIETS = [
    { id: 'Keto Diet', title: 'Keto', subtitle: 'Very low carb, high fat. About 70% fat, 25% protein, 5% carbs.', icon: Flame, color: '#F59E0B' },
    { id: 'Mediterranean Diet', title: 'Mediterranean', subtitle: 'Whole foods, olive oil, fish, vegetables and whole grains.', icon: Waves, color: '#06B6D4' },
    { id: 'Paleo Diet', title: 'Paleo', subtitle: 'Lean meat, fish, vegetables, nuts and fruit; no grains or refined foods.', icon: Sprout, color: '#10B981' },
    { id: 'Intermittent Fasting', title: 'Intermittent fasting (16:8)', subtitle: 'Eat within an 8-hour window each day, with balanced macros.', icon: Timer, color: '#8B5CF6' },
    { id: 'Flexible Balanced Plan', title: 'Flexible and balanced', subtitle: 'No foods off limits. About 40% carbs, 30% protein, 30% fat.', icon: Apple, color: '#00C4B4' },
];

export const DietStep = ({ selectedDiet, onDietSelected }) => (
    <div>
        <StepHeading
            title="How do you like to eat?"
            description="Your calorie and macro targets and sample meal plans follow this."
        />
        <div className="space-y-3">
            {DIETS.map((diet) => (
                <OptionCard
                    key={diet.id}
                    title={diet.title}
                    description={diet.subtitle}
                    icon={diet.icon}
                    color={diet.color}
                    selected={selectedDiet === diet.id}
                    onClick={() => onDietSelected(diet.id)}
                />
            ))}
        </div>
    </div>
);
