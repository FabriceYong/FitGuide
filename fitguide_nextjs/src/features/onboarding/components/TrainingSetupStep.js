'use client';

import React from 'react';
import { EQUIPMENT_KITS, LIMITATIONS, PROFILE } from '@fitguide/shared';
import { Chip, Section, StepHeading } from '../ui';

const MINUTE_OPTIONS = [15, 20, 30, 45, 60];
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Equipment, time, frequency and limitations. Everything is optional:
 * anything left unanswered just isn't used to filter recommendations.
 */
export const TrainingSetupStep = ({ equipment, workoutMinutes, daysPerWeek, limitations, onChange }) => {
    // "No equipment" and the kits exclude each other.
    const toggleKit = (kit) => {
        if (kit === 'none') return onChange({ equipment: equipment.includes('none') ? [] : ['none'] });
        const kits = equipment.filter((k) => k !== 'none');
        return onChange({ equipment: kits.includes(kit) ? kits.filter((k) => k !== kit) : [...kits, kit] });
    };
    const toggleLimitation = (id) => onChange({ limitations: limitations.includes(id) ? limitations.filter((l) => l !== id) : [...limitations, id] });

    return (
        <div>
            <StepHeading
                title="Your training setup"
                description="So we only suggest workouts you can do. Skip anything you're not sure about."
            />

            <div className="space-y-8">
                <Section title="Equipment you have" hint="A mat, a chair, stairs and running shoes count as basics.">
                    <div className="flex flex-wrap gap-2">
                        {PROFILE.EQUIPMENT_KITS.map((kit) => (
                            <Chip key={kit} selected={equipment.includes(kit)} onClick={() => toggleKit(kit)}>
                                {EQUIPMENT_KITS[kit].label}
                            </Chip>
                        ))}
                    </div>
                </Section>

                <Section title="Time per workout">
                    <div className="flex flex-wrap gap-2">
                        {MINUTE_OPTIONS.map((m) => (
                            <Chip key={m} selected={workoutMinutes === m} onClick={() => onChange({ workoutMinutes: workoutMinutes === m ? null : m })}>
                                {m === 60 ? '60+ min' : `${m} min`}
                            </Chip>
                        ))}
                    </div>
                </Section>

                <Section title="Workouts per week">
                    <div className="flex flex-wrap gap-2">
                        {DAY_OPTIONS.map((d) => (
                            <Chip
                                key={d}
                                selected={daysPerWeek === d}
                                onClick={() => onChange({ daysPerWeek: daysPerWeek === d ? null : d })}
                                aria-label={`${d} per week`}
                                className="w-11 px-0"
                            >
                                {d}
                            </Chip>
                        ))}
                    </div>
                </Section>

                <Section title="Go easy on" hint="We'll avoid workouts that load these areas. This isn't medical advice: check with a professional if you're injured.">
                    <div className="flex flex-wrap gap-2">
                        {PROFILE.LIMITATIONS.map((id) => (
                            <Chip key={id} selected={limitations.includes(id)} onClick={() => toggleLimitation(id)}>
                                {LIMITATIONS[id].label}
                            </Chip>
                        ))}
                    </div>
                </Section>
            </div>
        </div>
    );
};
