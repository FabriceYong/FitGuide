'use client';

import React, { useState } from 'react';
import { LoginPage } from './LoginPage';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';
import { track } from '../../lib/analytics';
/** Where to go after signing in: ?next=/path set by src/proxy.js (same-site paths only). */
const nextPath = () => {
    if (typeof window === 'undefined') return null;
    const next = new URLSearchParams(window.location.search).get('next');
    return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
};

export const AuthWrapper = ({ children }) => {
    const { ready, isAuthenticated, login: signIn, startGuestSession } = useAuth();
    const [showRegister, setShowRegister] = useState(false);

    const login = (user) => {
        signIn(user);
        const next = nextPath();
        if (next) window.location.assign(next);
    };
    if (!ready) {
        return <LoadingScreen message="Loading..."/>;
    }
    if (isAuthenticated) {
        return <>{children}</>;
    }
    if (showRegister) {
        return (<OnboardingWizard onFinish={(user, options) => {
                if (user && options?.registered) {
                    // Registered account: the API already set the session cookie
                    track('signup');
                    login(user);
                }
                else if (user) {
                    // Skipped account creation: browse as a guest
                    startGuestSession(user);
                }
                else {
                    setShowRegister(false);
                }
            }} onBackToLogin={() => setShowRegister(false)}/>);
    }
    return (<LoginPage onLoginSuccess={login} onSwitchToRegister={() => setShowRegister(true)}/>);
};
