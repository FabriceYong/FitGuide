'use client';

import React, { useState } from 'react';
import { LoginPage } from './LoginPage';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';
export const AuthWrapper = ({ children }) => {
    const { ready, isAuthenticated, login, startGuestSession } = useAuth();
    const [showRegister, setShowRegister] = useState(false);
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
