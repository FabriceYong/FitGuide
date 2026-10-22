'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { EQUIPMENT_KITS, LIMITATIONS, PROFILE } from '@fitguide/shared';

const MINUTE_OPTIONS = [15, 20, 30, 45, 60];
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

const chip = (selected) => `px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
    selected
        ? 'bg-lime-light text-noir-eclipse border-lime-light'
        : 'bg-white/5 text-white border-white-30/20 hover:bg-white/10'
}`;

function Group({ label, hint, children }) {
    return (
        <fieldset className="space-y-2">
            <legend className="text-[10px] font-extrabold text-white-70 uppercase tracking-widest">{label}</legend>
            {hint && <p className="text-[11px] text-white-70 -mt-1">{hint}</p>}
            <div className="flex flex-wrap gap-2">{children}</div>
        </fieldset>
    );
}

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
        <div className="flex flex-col justify-center min-h-[60vh] text-left p-6 w-full max-w-md mx-auto relative z-10">
            <div className="space-y-2 mb-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-lime-light tracking-widest uppercase bg-lime-light/10 px-3 py-1 rounded-full border border-lime-light/30">
                    <Sparkles className="w-3 h-3" /> Your Training
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                    Your training setup
                </h2>
                <p className="text-xs text-white-70">
                    So we only suggest workouts you can do. Skip anything you&apos;re not sure about.
                </p>
            </div>

            <div className="space-y-5">
                <Group label="Equipment you have" hint="A mat, a chair, stairs and running shoes count as basics.">
                    {PROFILE.EQUIPMENT_KITS.map((kit) => (
                        <button key={kit} type="button" aria-pressed={equipment.includes(kit)} onClick={() => toggleKit(kit)} className={chip(equipment.includes(kit))}>
                            {EQUIPMENT_KITS[kit].label}
                        </button>
                    ))}
                </Group>

                <Group label="Time per workout">
                    {MINUTE_OPTIONS.map((m) => (
                        <button key={m} type="button" aria-pressed={workoutMinutes === m} onClick={() => onChange({ workoutMinutes: workoutMinutes === m ? null : m })} className={chip(workoutMinutes === m)}>
                            {m === 60 ? '60+ min' : `${m} min`}
                        </button>
                    ))}
                </Group>

                <Group label="Workouts per week">
                    {DAY_OPTIONS.map((d) => (
                        <button key={d} type="button" aria-pressed={daysPerWeek === d} aria-label={`${d} per week`} onClick={() => onChange({ daysPerWeek: daysPerWeek === d ? null : d })} className={`${chip(daysPerWeek === d)} w-10 px-0 text-center`}>
                            {d}
                        </button>
                    ))}
                </Group>

                <Group label="Go easy on" hint="We'll avoid workouts that load these areas. This isn't medical advice: check with a professional if you're injured.">
                    {PROFILE.LIMITATIONS.map((id) => (
                        <button key={id} type="button" aria-pressed={limitations.includes(id)} onClick={() => toggleLimitation(id)} className={chip(limitations.includes(id))}>
                            {LIMITATIONS[id].label}
                        </button>
                    ))}
                </Group>
            </div>
        </div>
    );
};
