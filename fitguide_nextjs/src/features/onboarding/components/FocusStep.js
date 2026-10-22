'use client';

import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { PROFILE } from '@fitguide/shared';

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
        <div className="flex flex-col justify-center min-h-[60vh] text-left p-6 w-full max-w-md mx-auto relative z-10">
            <div className="space-y-2 mb-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-lime-light tracking-widest uppercase bg-lime-light/10 px-3 py-1 rounded-full border border-lime-light/30">
                    <Sparkles className="w-3 h-3" /> Your Training
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                    What do you want to work on?
                </h2>
                <p className="text-xs text-white-70">
                    {isSuggestion
                        ? 'We picked a starting point from your answers so far. Tap to change anything.'
                        : 'Pick as many as you like. Recommended workouts will lean toward these.'}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full" role="group" aria-label="Focus areas">
                {PROFILE.FOCUS_AREAS.map((area) => {
                    const isSelected = selected.includes(area);
                    return (
                        <button
                            key={area}
                            type="button"
                            onClick={() => toggle(area)}
                            aria-pressed={isSelected}
                            className={`relative text-left p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                                isSelected
                                    ? 'bg-obsidian-wave border-lime-light border-2 shadow-[0_0_20px_rgba(0,196,180,0.2)]'
                                    : 'bg-white/5 border-white-30/15 hover:border-white-30/40 hover:bg-white/10'
                            }`}
                        >
                            <span className="flex items-center justify-between gap-1">
                                <span className="text-sm font-extrabold text-white">{area}</span>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-lime-light flex-shrink-0" aria-hidden="true" />}
                            </span>
                            <span className="block text-[11px] text-white-70 leading-tight mt-1">{DESCRIPTIONS[area]}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
