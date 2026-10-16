'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, ApiError, hasSession, setSession, UNAUTHORIZED_EVENT } from '../lib/api';

const USER_KEY = 'fitguide_user';
// Keys written by older builds (fake/mock tokens). Cleared on startup.
const LEGACY_KEYS = ['token', 'user'];

const AuthContext = createContext(undefined);

const readStoredUser = () => {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const storeUser = (user) => {
    try {
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
        else localStorage.removeItem(USER_KEY);
    } catch {
        // storage unavailable
    }
};

export const AuthProvider = ({ children }) => {
    // Start signed-out on both server and client so the first render matches
    // the prerendered HTML; the stored session is restored in an effect.
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);

    // Forget the session locally (used when the server says it is no longer valid).
    const clearSession = useCallback(() => {
        setSession(false);
        storeUser(null);
        setUser(null);
    }, []);

    /** Sign out: clear the httpOnly auth cookie on the server, then locally. */
    const logout = useCallback(() => {
        // Always ask the server, even if the local marker is gone: only it can
        // clear an httpOnly cookie.
        apiRequest('/auth/logout', { method: 'POST' }).catch((err) => {
            console.warn('Sign-out request failed:', err.message);
        });
        clearSession();
    }, [clearSession]);

    useEffect(() => {
        LEGACY_KEYS.forEach((key) => {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
        });

        const stored = readStoredUser();

        if (stored?.isGuest) {
            setUser(stored);
        } else if (stored && hasSession()) {
            setUser(stored);
            // Refresh the profile and confirm the session cookie is still valid.
            apiRequest('/auth/me', { auth: true })
                .then((data) => {
                    storeUser(data.user);
                    setUser(data.user);
                })
                .catch((err) => {
                    // 401 is handled by the UNAUTHORIZED_EVENT listener; keep the
                    // cached profile if the server is just unreachable.
                    if (!(err instanceof ApiError)) console.warn('Session refresh failed:', err);
                });
        } else {
            // No session marker: either signed out, or an older build that kept
            // the token in localStorage. Either way, sign in again.
            setSession(false);
            storeUser(null);
        }
        setReady(true);
    }, []);

    useEffect(() => {
        window.addEventListener(UNAUTHORIZED_EVENT, clearSession);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, clearSession);
    }, [clearSession]);

    /**
     * Sign in with an account returned by /auth/login or /auth/register.
     * The API has already set the session cookie on that response.
     */
    const login = useCallback((userData) => {
        setSession(true);
        storeUser(userData);
        setUser(userData);
    }, []);

    /** Browse without an account. Nothing is saved on the server. */
    const startGuestSession = useCallback((profile) => {
        setSession(false);
        const guest = { ...profile, id: 'guest', isGuest: true };
        storeUser(guest);
        setUser(guest);
    }, []);

    /** Merge updated profile fields into the current user. */
    const updateUser = useCallback((updates) => {
        setUser((prev) => {
            const next = { ...prev, ...updates };
            storeUser(next);
            return next;
        });
    }, []);

    const value = {
        user,
        ready,
        isAuthenticated: !!user,
        isGuest: !!user?.isGuest,
        hasAccount: !!user && !user.isGuest,
        login,
        startGuestSession,
        updateUser,
        logout,
    };
    return (<AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>);
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
