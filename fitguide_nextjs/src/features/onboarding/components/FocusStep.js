'use client';

import React from 'react';
import { PROFILE } from '@fitguide/shared';
import { OptionCard, StepHeading } from '../ui';

const DESCRIPTIONS = {
    'Full Body': 'Balanced sessions that train everything',
    Core: 'Abs, obliques and lower back',
    Glutes: 'Hips and the posterior chain',
    Legs: 'Quads, hamstrings and calves',
    Back: 'Upper and lower back, posture',
    Chest: 'Pressing strength',
    Shoulders: 'Shoulder strength and stability',
    Arms: 'Biceps, triceps and forearms',
};

/**
 * Body areas to emphasise. Arrives pre-filled with suggestions from the
 * user's goal and gender; every one can be changed.
 */
export const FocusStep = ({ selected, suggested, onChange }) => {
    const toggle = (area) => onChange(selected.includes(area) ? selected.filter((a) => a !== area) : [...selected, area]);
    const isSuggestion = selected.length === suggested.length && selected.every((a) => suggested.includes(a));

    return (
        <div>
            <StepHeading
                title="What do you want to work on?"
                description={isSuggestion
                    ? 'We picked a starting point from your answers so far. Tap to change anything.'
                    : 'Pick as many as you like. Recommended workouts will lean toward these.'}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Focus areas">
                {PROFILE.FOCUS_AREAS.map((area) => (
                    <OptionCard
                        key={area}
                        title={area}
                        description={DESCRIPTIONS[area]}
                        selected={selected.includes(area)}
                        onClick={() => toggle(area)}
                    />
                ))}
            </div>
        </div>
    );
};
