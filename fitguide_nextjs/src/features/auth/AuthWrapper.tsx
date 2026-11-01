'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { LoginPage } from './LoginPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth, type AuthUser } from '../../contexts/AuthContext';
import { track } from '../../lib/analytics';

/** Where to go after signing in: ?next=/path set by src/proxy.js (same-site paths only). */
const nextPath = () => {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
};

/** Opens the sign-up wizard (for guests who decide to create an account). */
const SignUpContext = createContext<() => void>(() => {});
export const useStartSignUp = () => useContext(SignUpContext);

/**
 * Shows the sign-in page, the sign-up wizard or the app. Linking to
 * /?signup=1 opens the wizard straight away, guests included, and /?forgot=1
 * the "forgot password" page for signed-out visitors.
 */
export function AuthWrapper({ children }: { children: ReactNode }) {
  const { ready, isAuthenticated, login: signIn, startGuestSession } = useAuth();
  const [showRegister, setShowRegister] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('signup'),
  );

  // The email typed on the sign-in page, carried over; null while not showing. /?forgot=1 opens it.
  const [forgotEmail, setForgotEmail] = useState<string | null>(
    () => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('forgot') ? '' : null),
  );

  const closeForgot = () => {
    setForgotEmail(null);
    if (new URLSearchParams(window.location.search).has('forgot')) window.history.replaceState(null, '', '/');
  };
  const closeRegister = () => {
    setShowRegister(false);
    if (new URLSearchParams(window.location.search).has('signup')) window.history.replaceState(null, '', '/');
  };
  const login = (user: AuthUser) => {
    signIn(user);
    const next = nextPath();
    if (next) window.location.assign(next);
  };

  if (!ready) return <LoadingScreen message="Loading…" />;
  if (showRegister) {
    return (
      <OnboardingWizard
        onFinish={(user: AuthUser | null, options?: { registered?: boolean }) => {
          if (user && options?.registered) {
            // Registered account: the API already set the session cookie
            track('signup');
            login(user);
          } else if (user) {
            // Skipped account creation: browse as a guest
            startGuestSession(user);
          }
          closeRegister();
        }}
        onBackToLogin={closeRegister}
      />
    );
  }
  if (isAuthenticated) {
    return <SignUpContext.Provider value={() => setShowRegister(true)}>{children}</SignUpContext.Provider>;
  }
  if (forgotEmail !== null) return <ForgotPasswordPage initialEmail={forgotEmail} onBackToLogin={closeForgot} />;
  return <LoginPage onLoginSuccess={login} onSwitchToRegister={() => setShowRegister(true)} onForgotPassword={setForgotEmail} />;
}
