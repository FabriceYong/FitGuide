'use client';

import React from 'react';
import { PROFILE } from '@fitguide/shared';
import { OptionCard, Section, Segmented, StepHeading } from '../ui';

/** A slider with its label and current value above it. */
function RangeField({ id, label, value, display, min, max, onChange }) {
    return (
        <div>
            <div className="flex items-baseline justify-between mb-2">
                <label htmlFor={id} className="text-sm font-semibold text-white">{label}</label>
                <span className="text-base font-semibold text-lime-light tabular-nums">{display}</span>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                value={value}
                aria-valuetext={display}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lime-light"
            />
        </div>
    );
}

export const BiometricsStep = ({
    selectedGender,
    height,
    weight,
    onGenderSelected,
    onHeightSelected,
    onWeightSelected,
    units: unit = 'metric', // 'metric' (cm/kg) or 'imperial' (ft/lb), kept for the account
    onUnitsSelected,
}) => {

    const displayHeight = unit === 'metric' ? `${height} cm` : `${Math.floor(height / 30.48)}' ${Math.round((height % 30.48) / 2.54)}"`;
    const displayWeight = unit === 'metric' ? `${weight} kg` : `${Math.round(weight * 2.20462)} lb`;

    return (
        <div>
            <StepHeading
                title="About you"
                description="We use these to estimate your calorie burn and targets, and to suggest where to start. You can change them later in your profile."
            />

            <div className="space-y-8">
                <Section title="Gender" hint="Used for calorie estimates and the focus areas we suggest.">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PROFILE.GENDERS.map((g) => (
                            <OptionCard
                                key={g}
                                title={g}
                                selected={selectedGender === g}
                                onClick={() => onGenderSelected(g)}
                            />
                        ))}
                    </div>
                </Section>

                <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-semibold text-white">Height and weight</span>
                        <Segmented
                            label="Units"
                            options={[['metric', 'cm / kg'], ['imperial', 'ft / lb']]}
                            value={unit}
                            onChange={onUnitsSelected}
                        />
                    </div>
                    <RangeField id="height" label="Height" value={height} display={displayHeight} min={120} max={220} onChange={onHeightSelected} />
                    <RangeField id="weight" label="Current weight" value={weight} display={displayWeight} min={40} max={180} onChange={onWeightSelected} />
                </div>
            </div>
        </div>
    );
};
