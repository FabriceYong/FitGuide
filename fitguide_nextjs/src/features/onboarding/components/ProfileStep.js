'use client';

import React, { useState, useRef } from 'react';
import { User, Loader2, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

import { apiRequest, setSession } from '../../../lib/api';
import { Field, StepHeading, inputClass, primaryButton, secondaryButton } from '../ui';

const GOAL_LABELS = { Vitality: 'Overall health', Muscle: 'Build muscle', Weight: 'Lose fat', Flexibility: 'Mobility' };

export const ProfileStep = ({ onboardingData, onComplete, onBack }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const isUploadingAvatar = isLoading && Boolean(avatarFile);
    const fileInputRef = useRef(null);
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

            // Registering set the session cookie; the account is signed in.
            setSession(true);
            let user = data.user;
            if (avatarFile) {
                // Uploads require an account, so the avatar is sent after registering.
                try {
                    const formData = new FormData();
                    formData.append('avatar', avatarFile);
                    const upload = await apiRequest('/upload/avatar', { method: 'POST', formData, auth: true });
                    const updated = await apiRequest('/auth/profile', { method: 'PUT', body: { avatarUrl: upload.avatarUrl }, auth: true });
                    user = updated.user;
                } catch (uploadErr) {
                    console.warn('Account created, but the avatar upload failed:', uploadErr.message);
                }
            }
            onComplete(user, { registered: true });
        } catch (err) {
            setError(err.message || 'Registration failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            setError('Only image files are allowed (JPEG, PNG, WebP, GIF).');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be under 5 MB.');
            return;
        }

        setAvatarPreview(URL.createObjectURL(file));
        setAvatarFile(file);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const summary = [
        ['Goal', GOAL_LABELS[onboardingData.goal] || onboardingData.goal],
        ['Level', onboardingData.fitnessLevel],
        ['Height', `${onboardingData.height} cm`],
        ['Weight', `${onboardingData.weight} kg (target ${onboardingData.targetWeight} kg)`],
        ['Diet', onboardingData.diet],
        ...(onboardingData.focusAreas?.length ? [['Focus', onboardingData.focusAreas.join(', ')]] : []),
    ];

    return (
        <div>
            <StepHeading
                title="Create your account"
                description="Save your answers, workouts and progress, and pick up on any device."
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
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleAvatarChange}
                    className="hidden"
                />

                {/* Optional profile photo */}
                <div className="flex items-center gap-4">
                    <span className="relative w-14 h-14 rounded-full bg-noir-eclipse border border-white-30/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {avatarPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarPreview} alt="Your new profile photo" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-6 h-6 text-white-70" aria-hidden="true" />
                        )}
                        {isUploadingAvatar && (
                            <span className="absolute inset-0 bg-noir-eclipse/60 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-lime-light animate-spin" aria-hidden="true" />
                            </span>
                        )}
                    </span>
                    <div>
                        <button type="button" onClick={handleAvatarClick} disabled={isLoading} className={`${secondaryButton} h-10 px-4 text-sm`}>
                            {avatarPreview ? 'Change photo' : 'Add a photo'}
                        </button>
                        <p className="mt-1 text-sm text-white-70">Optional. JPEG, PNG, WebP or GIF, up to 5 MB.</p>
                    </div>
                </div>

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
