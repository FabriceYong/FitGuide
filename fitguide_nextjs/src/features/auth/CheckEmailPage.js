'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, MailCheck } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { AuthPage, StepHeading, linkButton, primaryButton, secondaryButton } from '../onboarding/ui';

// The API sends at most one link a minute.
const RESEND_WAIT_SEC = 60;

/**
 * After signing up (or signing in before confirming): the link to confirm
 * the email is on its way. The link signs the user in on the website.
 */
export const CheckEmailPage = ({ email, onBackToLogin }) => {
    const [wait, setWait] = useState(RESEND_WAIT_SEC);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (wait <= 0) return undefined;
        const timer = window.setTimeout(() => setWait((w) => w - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [wait]);

    const resend = async () => {
        setSending(true);
        setError(null);
        setStatus(null);
        try {
            await apiRequest('/auth/resend-verification', { method: 'POST', body: { email } });
            setStatus('A new link is on its way.');
            setWait(RESEND_WAIT_SEC);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <AuthPage width="max-w-[480px]" header={<button type="button" onClick={onBackToLogin} className={linkButton}>Back to sign in</button>}>
            <div className="w-12 h-12 rounded-full bg-lime-light/15 text-lime-light flex items-center justify-center mb-5" aria-hidden="true">
                <MailCheck className="w-6 h-6" />
            </div>
            <StepHeading
                as="h1"
                title="Confirm your email"
                description={`We've sent a link to ${email}. Click the button in that email to confirm it's yours, and you're in.`}
            />
            <p className="text-sm text-white-70 mb-6">
                The link expires in 24 hours. Nothing there after a few minutes? Check your spam folder, or send it again.
            </p>

            {error && (
                <div role="alert" className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3.5 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-red-200 leading-snug">{error}</p>
                </div>
            )}
            <p role="status" className="text-sm text-lime-light min-h-5 mb-4">{status}</p>

            <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={resend} disabled={sending || wait > 0} className={`${secondaryButton} sm:flex-1`}>
                    {sending ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Sending…</> : wait > 0 ? `Resend email (${wait} s)` : 'Resend email'}
                </button>
                <button type="button" onClick={onBackToLogin} className={`${primaryButton} sm:flex-1`}>Back to sign in</button>
            </div>
        </AuthPage>
    );
};
