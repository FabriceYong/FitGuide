'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { AuthPage, Field, StepHeading, inputClass, linkButton, primaryButton } from '../onboarding/ui';

/**
 * Opened from the link in the "confirm your email" message: confirms the
 * email, signs in and goes to the app. A used or expired link offers a new one.
 */
export const VerifyEmailPage = ({ token }) => {
    const router = useRouter();
    const { login } = useAuth();
    const [failed, setFailed] = useState(!token);
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);
    // A link works once: confirm it once, even if the effect runs twice.
    const started = useRef(false);

    useEffect(() => {
        if (!token || started.current) return;
        started.current = true;
        apiRequest('/auth/verify-email', { method: 'POST', body: { token } })
            .then((data) => {
                login(data.user);
                router.replace('/');
            })
            .catch(() => setFailed(true));
    }, [token, login, router]);

    const resend = async (e) => {
        e.preventDefault();
        setSending(true);
        setStatus(null);
        try {
            const data = await apiRequest('/auth/resend-verification', { method: 'POST', body: { email } });
            setStatus(data.message);
        } catch (err) {
            setStatus(err.message || 'Something went wrong. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const header = <Link href="/" className={linkButton}>Back to sign in</Link>;

    if (!failed) {
        return (
            <AuthPage width="max-w-[440px]" header={header}>
                <p role="status" className="flex items-center gap-3 text-white-70">
                    <Loader2 className="w-5 h-5 animate-spin text-lime-light" aria-hidden="true" /> Confirming your email…
                </p>
            </AuthPage>
        );
    }

    return (
        <AuthPage width="max-w-[440px]" header={header}>
            <StepHeading
                as="h1"
                title="This link has expired"
                description="Confirmation links work once and expire after 24 hours. If you've already confirmed, just sign in. Otherwise, get a new link."
            />
            <form onSubmit={resend} className="space-y-5">
                <Field label="Email" htmlFor="verify-email">
                    <input
                        id="verify-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        disabled={sending}
                        className={inputClass}
                    />
                </Field>
                <button type="submit" disabled={sending || !email} className={`${primaryButton} w-full`}>
                    {sending ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Sending…</> : 'Send a new link'}
                </button>
            </form>
            <p role="status" className="mt-4 text-sm text-lime-light min-h-5">{status}</p>
        </AuthPage>
    );
};
