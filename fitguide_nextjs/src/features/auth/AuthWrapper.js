'use client';

import React, { useState } from 'react';
import { LoginPage } from './LoginPage';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { useAuth } from '../../contexts/AuthContext';
export const AuthWrapper = ({ children }) => {
    const { isAuthenticated, login } = useAuth();
    const [showRegister, setShowRegister] = useState(false);
    if (isAuthenticated) {
        return <>{children}</>;
    }
    if (showRegister) {
        return (<OnboardingWizard onFinish={(user) => {
                if (user) {
                    // User completed registration and we have user data - log them in
                    login(user);
                }
                else {
                    // User just completed onboarding without registration - switch back to login
                    setShowRegister(false);
                }
            }} onBackToLogin={() => setShowRegister(false)}/>);
    }
    return (<LoginPage onLoginSuccess={login} onSwitchToRegister={() => setShowRegister(true)}/>);
};
