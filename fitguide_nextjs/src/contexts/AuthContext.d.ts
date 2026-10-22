// Types for AuthContext.js, used by TypeScript components.
import type { ReactElement, ReactNode } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  gender?: string;
  height?: number;
  weight?: number;
  targetWeight?: number;
  fitnessLevel?: string;
  activityStatus?: string;
  goal?: string;
  diet?: string;
  avatarUrl?: string | null;
  birthYear?: number | null;
  showOnLeaderboards?: boolean;
  createdAt?: string;
  role?: 'user' | 'creator' | 'admin';
  plan?: 'free' | 'plus';
  isGuest?: boolean;
  [key: string]: unknown;
}

export interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasAccount: boolean;
  login: (user: AuthUser) => void;
  startGuestSession: (profile: Partial<AuthUser>) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  logout: () => void;
}

export declare function AuthProvider(props: { children: ReactNode }): ReactElement;
export declare function useAuth(): AuthContextValue;
