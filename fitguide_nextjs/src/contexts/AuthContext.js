'use client';

import React, { createContext, useContext, useState } from 'react';
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        // Try to restore user from localStorage on app start
        const savedUser = typeof window !== 'undefined' ? localStorage.getItem('fitguide_user') : null;
        if (savedUser) {
            try {
                return JSON.parse(savedUser);
            }
            catch {
                typeof window !== 'undefined' && localStorage.removeItem('fitguide_user');
                return null;
            }
        }
        return null;
    });
    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('fitguide_user', JSON.stringify(userData));
    };
    const logout = () => {
        setUser(null);
        localStorage.removeItem('fitguide_user');
    };
    const value = {
        user,
        isAuthenticated: !!user,
        login,
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
