'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Loader2, CalendarDays, PlayCircle, Sparkles, Utensils } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { AuthPage, BrandPanel, Field, StepHeading, inputClass, linkButton, primaryButton } from '../onboarding/ui';

const POINTS = [
    { icon: PlayCircle, text: 'Guided workouts with a demonstration for every move' },
    { icon: CalendarDays, text: 'A weekly plan built around your goal' },
    { icon: Utensils, text: 'Calorie and macro targets with a simple food log' },
    { icon: Sparkles, text: 'An AI coach that adjusts your plan as you go' },
];

export const LoginPage = ({ onLoginSuccess, onSwitchToRegister, onForgotPassword, onEmailNotConfirmed }) => {
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
            const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
            onLoginSuccess(data.user);
        } catch (error) {
            // The right password, but the email isn't confirmed yet: a new link is on its way.
            if (error.data?.code === 'EMAIL_NOT_VERIFIED') onEmailNotConfirmed(error.data.email);
            else setError(error.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthPage
            width="max-w-[440px]"
            aside={<BrandPanel title="Your training, planned and tracked" photo="1517836357463-d25dfeac3438" points={POINTS} />}
            header={(
                <>
                    <span className="hidden sm:inline">New to FitGuide? </span>
                    <button type="button" onClick={onSwitchToRegister} disabled={isLoading} className={linkButton}>
                        Create an account
                    </button>
                </>
            )}
        >
            <StepHeading as="h1" title="Sign in" description="Welcome back. Sign in to continue your training." />

            {error && (
                <div role="alert" className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3.5 mb-6">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-red-200 leading-snug">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <Field label="Email" htmlFor="email">
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        disabled={isLoading}
                        className={inputClass}
                    />
                </Field>

                <Field label="Password" htmlFor="password">
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className={`${inputClass} pr-11`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showPassword}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md flex items-center justify-center text-white-70 hover:text-white cursor-pointer"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                        </button>
                    </div>
                </Field>

                <div className="-mt-2 text-right text-sm">
                    <button type="button" onClick={() => onForgotPassword(email)} disabled={isLoading} className={linkButton}>
                        Forgot password?
                    </button>
                </div>

                <button type="submit" disabled={isLoading || !email || !password} className={`${primaryButton} w-full`}>
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Signing in…</> : 'Sign in'}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-white-70">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={onSwitchToRegister} disabled={isLoading} className={linkButton}>
                    Create an account
                </button>
            </p>

            {/* The seeded demo login, for local development only: never shown on the live site. */}
            {process.env.NODE_ENV !== 'production' && (
                <div className="mt-8 p-4 rounded-lg border border-white-30/20 bg-white/[0.03] text-sm">
                    <p className="font-semibold text-white mb-1">Demo account (development only)</p>
                    <p className="text-white-70">Email: demo@fitguide.com</p>
                    <p className="text-white-70">Password: demo123</p>
                </div>
            )}

            <p className="mt-8 text-center text-xs text-white-70">
                © {new Date().getFullYear()} FitGuide
            </p>
        </AuthPage>
    );
};
