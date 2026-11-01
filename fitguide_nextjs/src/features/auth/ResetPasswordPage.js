'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { PROFILE } from '@fitguide/shared';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { AuthPage, Field, StepHeading, inputClass, linkButton, primaryButton } from '../onboarding/ui';

// A full page load, so the sign-in screen reads ?forgot=1 when it starts.
const ASK_AGAIN = '/?forgot=1';

/** Choose a new password from an emailed reset link, then go to the app signed in. */
export const ResetPasswordPage = ({ token }) => {
    const router = useRouter();
    const { login } = useAuth();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // The link is unusable (expired, used, or cut short): only asking again helps.
    const [linkDead, setLinkDead] = useState(!token);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const data = await apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } });
            login(data.user);
            router.replace('/');
        } catch (err) {
            if (err.data?.code === 'RESET_LINK_INVALID') setLinkDead(true);
            else setError(err.message || 'Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

    const header = <Link href="/" className={linkButton}>Back to sign in</Link>;

    if (linkDead) {
        return (
            <AuthPage width="max-w-[440px]" header={header}>
                <StepHeading
                    as="h1"
                    title="This link has expired"
                    description="Reset links work once and expire after an hour. Ask for a new one and use the newest email we send."
                />
                <a href={ASK_AGAIN} className={`${primaryButton} w-full`}>Send a new link</a>
            </AuthPage>
        );
    }

    return (
        <AuthPage width="max-w-[440px]" header={header}>
            <StepHeading as="h1" title="Choose a new password" description="You'll be signed out on your other devices." />

            {error && (
                <div role="alert" className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3.5 mb-6">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-red-200 leading-snug">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <Field label="New password" htmlFor="new-password" hint={`At least ${PROFILE.PASSWORD_MIN} characters.`}>
                    <div className="relative">
                        <input
                            id="new-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={PROFILE.PASSWORD_MIN}
                            required
                            autoFocus
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
                <button type="submit" disabled={isLoading || password.length < PROFILE.PASSWORD_MIN} className={`${primaryButton} w-full`}>
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Saving…</> : 'Set new password'}
                </button>
            </form>
        </AuthPage>
    );
};
