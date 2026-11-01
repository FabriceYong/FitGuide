'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

import { apiRequest } from '../../../lib/api';
import { heightText, weightText } from '../../../lib/units';
import { Field, StepHeading, inputClass, primaryButton, secondaryButton } from '../ui';

const GOAL_LABELS = { Vitality: 'Overall health', Muscle: 'Build muscle', Weight: 'Lose fat', Flexibility: 'Mobility' };

export const ProfileStep = ({ onboardingData, onComplete, onBack }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const data = await apiRequest('/auth/register', {
                method: 'POST',
                body: {
                    name,
                    email,
                    password,
                    gender: onboardingData.gender || 'Prefer not to say',
                    height: onboardingData.height || 170,
                    weight: onboardingData.weight || 70,
                    targetWeight: onboardingData.targetWeight || 70,
                    units: onboardingData.units || 'metric',
                    fitnessLevel: onboardingData.fitnessLevel || 'Beginner',
                    activityStatus: onboardingData.activityStatus || 'Active',
                    goal: onboardingData.goal || 'Vitality',
                    diet: onboardingData.diet || 'Mediterranean Diet',
                    focusAreas: onboardingData.focusAreas || [],
                    equipment: onboardingData.equipment || [],
                    limitations: onboardingData.limitations || [],
                    workoutMinutes: onboardingData.workoutMinutes ?? null,
                    daysPerWeek: onboardingData.daysPerWeek ?? null,
                },
            });

            // No session yet: the account works once the emailed link confirms the address.
            onComplete(null, { registered: true, email: data.email });
        } catch (err) {
            setError(err.message || 'Registration failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const units = onboardingData.units === 'imperial' ? 'imperial' : 'metric';
    const summary = [
        ['Goal', GOAL_LABELS[onboardingData.goal] || onboardingData.goal],
        ['Level', onboardingData.fitnessLevel],
        ['Height', heightText(onboardingData.height, units)],
        ['Weight', `${weightText(onboardingData.weight, units)} (target ${weightText(onboardingData.targetWeight, units)})`],
        ['Diet', onboardingData.diet],
        ...(onboardingData.focusAreas?.length ? [['Focus', onboardingData.focusAreas.join(', ')]] : []),
    ];

    return (
        <div>
            <StepHeading
                title="Create your account"
                description="Save your answers, workouts and progress, and pick up on any device. We'll email you a link to confirm your address."
            />

            <dl className="rounded-xl border border-white-30/20 bg-white/[0.03] p-4 mb-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                {summary.map(([label, value]) => (
                    <React.Fragment key={label}>
                        <dt className="text-white-70">{label}</dt>
                        <dd className="text-white font-medium">{value}</dd>
                    </React.Fragment>
                ))}
            </dl>

            {error && (
                <div role="alert" className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3.5 mb-6">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-red-200 leading-snug">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <Field label="Full name" htmlFor="signup-name">
                    <input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                        required
                        disabled={isLoading}
                    />
                </Field>

                <Field label="Email" htmlFor="signup-email">
                    <input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                        required
                        disabled={isLoading}
                    />
                </Field>

                <Field label="Password" htmlFor="signup-password" hint="At least 6 characters.">
                    <div className="relative">
                        <input
                            id="signup-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${inputClass} pr-11`}
                            required
                            minLength={6}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            disabled={isLoading}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showPassword}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md flex items-center justify-center text-white-70 hover:text-white cursor-pointer"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                        </button>
                    </div>
                </Field>

                <div className="mt-10 pt-6 border-t border-white-30/15 flex items-center justify-between gap-3">
                    <button type="button" onClick={onBack} disabled={isLoading} className={secondaryButton}>
                        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
                    </button>
                    <button type="submit" disabled={isLoading} className={primaryButton}>
                        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Creating account…</> : 'Create account'}
                    </button>
                </div>
            </form>
        </div>
    );
};
