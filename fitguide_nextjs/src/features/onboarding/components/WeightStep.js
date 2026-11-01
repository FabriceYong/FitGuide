'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { PROFILE } from '@fitguide/shared';
import { Segmented, StepHeading } from '../ui';

const [MIN_KG, MAX_KG] = PROFILE.WEIGHT_KG;
const KG_TO_LB = 2.20462;

const stepButton = 'w-11 h-11 rounded-lg border border-white-30/40 text-white flex items-center justify-center hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors';

export const WeightStep = ({ targetWeight = 70, units = 'metric', onUnitsSelected, onWeightSelected }) => {
    const unit = units === 'imperial' ? 'lb' : 'kg';
    const display = unit === 'kg' ? targetWeight : Math.round(targetWeight * KG_TO_LB);

    const adjust = (deltaKg) => onWeightSelected(Math.max(MIN_KG, Math.min(MAX_KG, targetWeight + deltaKg)));

    return (
        <div>
            <StepHeading
                title="What's your target weight?"
                description="Used to set your daily calorie target. If you don't have one, leave it at your current weight."
            />

            <div className="flex justify-end mb-4">
                <Segmented label="Units" options={[['kg', 'kg'], ['lb', 'lb']]} value={unit} onChange={(u) => onUnitsSelected(u === 'lb' ? 'imperial' : 'metric')} />
            </div>

            <div className="rounded-xl border border-white-30/30 bg-white/[0.03] p-6">
                <div className="flex items-center justify-center gap-6">
                    <button type="button" onClick={() => adjust(-1)} disabled={targetWeight <= MIN_KG} aria-label="1 kg less" className={stepButton}>
                        <Minus className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <p className="min-w-[8rem] text-center" aria-live="polite">
                        <span className="text-4xl font-bold text-white tabular-nums">{display}</span>
                        <span className="ml-1.5 text-lg font-semibold text-lime-light">{unit}</span>
                    </p>
                    <button type="button" onClick={() => adjust(1)} disabled={targetWeight >= MAX_KG} aria-label="1 kg more" className={stepButton}>
                        <Plus className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="flex justify-center gap-2 mt-5">
                    {[-5, 5].map((delta) => (
                        <button
                            key={delta}
                            type="button"
                            onClick={() => adjust(delta)}
                            className="h-9 px-3.5 rounded-lg text-sm font-medium border border-white-30/30 text-white-70 hover:text-white hover:border-white-30/60 cursor-pointer transition-colors"
                        >
                            {/* 5 kg is about 11 lb. */}
                            {delta > 0 ? '+' : '−'}{unit === 'kg' ? '5 kg' : '11 lb'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
