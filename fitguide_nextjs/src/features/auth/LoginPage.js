'use client';

import React, { useState } from 'react';
import { Dumbbell, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const LoginPage = ({ onLoginSuccess, onSwitchToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
            onLoginSuccess(data.user, data.token);
        } catch (error) {
            setError(error.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-noir-eclipse text-white flex flex-col font-poppins">
            {/* Header */}
            <div className="flex items-center justify-center pt-12 pb-8">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-lime-light flex items-center justify-center text-noir-eclipse border border-lime-light/40">
                        <Dumbbell className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                        <span className="font-extrabold text-2xl tracking-tight text-white">FitGuide</span>
                        <span className="text-xs block font-bold text-lime-light tracking-widest leading-none mt-1">PLUS</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
                <div className="space-y-2 mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
                        Welcome Back
                    </h1>
                    <p className="text-sm text-white-70">
                        Sign in to continue your fitness journey
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6 animate-[fadeIn_0.2s_ease-out]">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-300 leading-snug">{error}</p>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email Field */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-bold text-white block">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                            disabled={isLoading}
                            className="w-full px-4 py-4 bg-obsidian-wave border border-white-30/20 rounded-2xl text-white placeholder:text-white-30 focus:outline-none focus:ring-2 focus:ring-lime-light focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-bold text-white block">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                disabled={isLoading}
                                className="w-full px-4 py-4 pr-12 bg-obsidian-wave border border-white-30/20 rounded-2xl text-white placeholder:text-white-30 focus:outline-none focus:ring-2 focus:ring-lime-light focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white-30 hover:text-white transition-colors disabled:cursor-not-allowed"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        className="w-full bg-lime-light text-noir-eclipse font-bold py-4 rounded-2xl hover:bg-lime-light/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer border border-lime-light/30"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-noir-eclipse/20 border-t-noir-eclipse rounded-full animate-spin" />
                                Signing In...
                            </>
                        ) : (
                            <>
                                Sign In
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                {/* Register Link */}
                <div className="mt-8 text-center">
                    <p className="text-white-70 text-sm">
                        Don't have an account?{' '}
                        <button
                            onClick={onSwitchToRegister}
                            disabled={isLoading}
                            className="text-lime-light font-bold hover:underline focus:outline-none focus:underline disabled:cursor-not-allowed cursor-pointer"
                        >
                            Create Account
                        </button>
                    </p>
                </div>

                {/* Demo Credentials */}
                <div className="mt-6 p-4 bg-obsidian-wave/50 rounded-2xl border border-white-30/10">
                    <p className="text-xs text-white-30 text-center mb-2 font-bold uppercase tracking-wide">
                        Demo Credentials
                    </p>
                    <div className="text-xs text-white-70 space-y-1">
                        <p><strong>Email:</strong> demo@fitguide.com</p>
                        <p><strong>Password:</strong> demo123</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="pb-8 px-6">
                <p className="text-center text-xs text-white-30">
                    © 2024 FitGuide. Your fitness journey starts here.
                </p>
            </div>
        </div>
    );
};
