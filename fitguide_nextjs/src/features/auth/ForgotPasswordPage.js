'use client';

import React, { useState } from 'react';
import { AlertCircle, Loader2, MailCheck } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { AuthPage, Field, StepHeading, inputClass, linkButton, primaryButton, secondaryButton } from '../onboarding/ui';

/** Ask for a password reset link by email. */
export const ForgotPasswordPage = ({ onBackToLogin, initialEmail = '' }) => {
    const [email, setEmail] = useState(initialEmail);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sentTo, setSentTo] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });
            setSentTo(email.trim());
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const backLink = (
        <button type="button" onClick={onBackToLogin} className={linkButton}>
            Back to sign in
        </button>
    );

    if (sentTo) {
        return (
            <AuthPage width="max-w-[440px]" header={backLink}>
                <div className="w-12 h-12 rounded-full bg-lime-light/15 text-lime-light flex items-center justify-center mb-5" aria-hidden="true">
                    <MailCheck className="w-6 h-6" />
                </div>
                <StepHeading
                    as="h1"
                    title="Check your email"
                    description={`If an account uses ${sentTo}, we've sent it a link to choose a new password. The link expires in 1 hour.`}
                />
                <p className="text-sm text-white-70 mb-6">
                    Nothing there after a few minutes? Check your spam folder, or try again.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button type="button" onClick={onBackToLogin} className={`${primaryButton} sm:flex-1`}>Back to sign in</button>
                    <button type="button" onClick={() => setSentTo(null)} className={`${secondaryButton} sm:flex-1`}>Try again</button>
                </div>
            </AuthPage>
        );
    }

    return (
        <AuthPage width="max-w-[440px]" header={backLink}>
            <StepHeading
                as="h1"
                title="Forgot your password?"
                description="Enter the email you signed up with and we'll send you a link to choose a new one."
            />

            {error && (
                <div role="alert" className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3.5 mb-6">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-red-200 leading-snug">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <Field label="Email" htmlFor="reset-email">
                    <input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                        disabled={isLoading}
                        className={inputClass}
                    />
                </Field>
                <button type="submit" disabled={isLoading || !email} className={`${primaryButton} w-full`}>
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Sending…</> : 'Send reset link'}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-white-70">
                Remembered it? {backLink}
            </p>
        </AuthPage>
    );
};
