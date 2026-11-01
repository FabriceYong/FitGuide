'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { LoginPage } from './LoginPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { CheckEmailPage } from './CheckEmailPage';
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
 * the "forgot password" page for signed-out visitors. A new account first
 * confirms its email: "Check your inbox" until the emailed link is used.
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

  // The address waiting to be confirmed, while "Check your inbox" shows.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

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
        onFinish={(user: AuthUser | null, options?: { registered?: boolean; email?: string }) => {
          if (options?.registered) {
            // Registered: the account works once its email is confirmed.
            track('signup');
            setPendingEmail(options.email ?? '');
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
  if (pendingEmail !== null) return <CheckEmailPage email={pendingEmail} onBackToLogin={() => setPendingEmail(null)} />;
  if (forgotEmail !== null) return <ForgotPasswordPage initialEmail={forgotEmail} onBackToLogin={closeForgot} />;
  return <LoginPage onLoginSuccess={login} onSwitchToRegister={() => setShowRegister(true)} onForgotPassword={setForgotEmail} onEmailNotConfirmed={setPendingEmail} />;
}
