'use client';

import { AuthProvider } from '../contexts/AuthContext';
import { OfflineSupport } from '../components/OfflineSupport';
import { PageViews } from '../components/PageViews';

/** Client-side context shared by every route. */
export function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
      <OfflineSupport />
      <PageViews />
    </AuthProvider>
  );
}
