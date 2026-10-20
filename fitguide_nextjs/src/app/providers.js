'use client';

import { AuthProvider } from '../contexts/AuthContext';
import { I18nProvider } from '../i18n/client';
import { OfflineSupport } from '../components/OfflineSupport';
import { PageViews } from '../components/PageViews';

/** Client-side context shared by every route. */
export function Providers({ locale, children }) {
  return (
    <I18nProvider locale={locale}>
      <AuthProvider>
        {children}
        <OfflineSupport />
        <PageViews />
      </AuthProvider>
    </I18nProvider>
  );
}
