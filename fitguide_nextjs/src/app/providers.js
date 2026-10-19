'use client';

import { AuthProvider } from '../contexts/AuthContext';

/** Client-side context shared by every route. */
export function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
