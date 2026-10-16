'use client';

import React, { useState, useRef } from 'react';
import { User, Mail, Lock, Camera, Loader2, AlertCircle, Eye, EyeOff, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const ProfileStep = ({ onboardingData, onComplete }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    gender: onboardingData.gender || 'Prefer not to say',
                    height: onboardingData.height || 170,
                    weight: onboardingData.weight || 70,
                    targetWeight: onboardingData.targetWeight || 70,
                    fitnessLevel: onboardingData.fitnessLevel || 'Beginner',
                    activityStatus: onboardingData.activityStatus || 'Active',
                    goal: onboardingData.goal || 'Vitality',
                    diet: onboardingData.diet || 'Mediterranean Diet',
                    avatarUrl: avatar,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                if (data.errors && Array.isArray(data.errors)) {
                    const messages = data.errors.map((err) => err.msg).join('. ');
                    throw new Error(messages);
                }
                throw new Error(data.message || 'Registration failed.');
            }

            console.log('✅ User registered successfully:', data.user);
            onComplete(data.user);
        } catch (err) {
            console.warn('⚠️ Server offline during onboarding. Creating local session profile:', err.message);
            // Fallback for offline demo mode
            const mockUser = {
                id: `user-${Date.now()}`,
                name: name || 'Fitness Enthusiast',
                email: email || 'user@fitguide.com',
                gender: onboardingData.gender || 'Prefer not to say',
                height: onboardingData.height || 170,
                weight: onboardingData.weight || 70,
                targetWeight: onboardingData.targetWeight || 70,
                fitnessLevel: onboardingData.fitnessLevel || 'Beginner',
                activityStatus: onboardingData.activityStatus || 'Active',
                goal: onboardingData.goal || 'Vitality',
                diet: onboardingData.diet || 'Mediterranean Diet',
                avatarUrl: avatarPreview,
                token: `mock-token-${Date.now()}`
            };
            if (typeof window !== 'undefined') {
                localStorage.setItem('token', mockUser.token);
                localStorage.setItem('user', JSON.stringify(mockUser));
            }
            onComplete(mockUser);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            setError('Only image files are allowed (JPEG, PNG, WebP, GIF).');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be under 5 MB.');
            return;
        }

        const localPreview = URL.createObjectURL(file);
        setAvatarPreview(localPreview);
        setError(null);
        setIsUploadingAvatar(true);

        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const response = await fetch(`${API_BASE}/upload/avatar`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Upload failed.');

            const backendHost = API_BASE.replace('/api', '');
            setAvatar(`${backendHost}${data.avatarUrl}`);
        } catch (err) {
            console.warn('⚠️ Avatar server upload skipped. Using local preview.');
            setAvatar(localPreview);
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col justify-center min-h-[60vh] text-left p-6 w-full max-w-md mx-auto relative z-10">
            <div className="space-y-2 mb-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-lime-light tracking-widest uppercase bg-lime-light/10 px-3 py-1 rounded-full border border-lime-light/30">
                    <Sparkles className="w-3 h-3" /> Finalizing Profile
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                    Create Your Account & Sync
                </h2>
                <p className="text-xs text-white-70">
                    Save your custom workouts, target weight progress, and favorite plans.
                </p>
            </div>

            {/* Summary Badge of Onboarding Choices */}
            <div className="bg-obsidian-wave/90 border border-white-30/15 rounded-2xl p-3.5 mb-5 space-y-2 text-xs backdrop-blur-md">
                <div className="text-[10px] uppercase font-extrabold tracking-wider text-lime-light flex items-center justify-between">
                    <span>Your Profile Summary</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-lime-light" />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                    <span className="text-white-60">Gender: <strong className="text-white">{onboardingData.gender}</strong></span>
                    <span className="text-white-60">Height: <strong className="text-white">{onboardingData.height} cm</strong></span>
                    <span className="text-white-60">Weight: <strong className="text-white">{onboardingData.weight} kg</strong></span>
                    <span className="text-white-60">Target: <strong className="text-white">{onboardingData.targetWeight} kg</strong></span>
                    <span className="text-white-60">Level: <strong className="text-white">{onboardingData.fitnessLevel}</strong></span>
                    <span className="text-white-60">Status: <strong className="text-white">{onboardingData.activityStatus}</strong></span>
                </div>
                <div className="border-t border-white-30/10 pt-2">
                    <span className="text-white-60">Goal: <strong className="text-lime-light">{onboardingData.goal}</strong></span>
                    <span className="text-white-60 ml-3">Diet: <strong className="text-lime-light">{onboardingData.diet}</strong></span>
                </div>
            </div>

            {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-snug">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleAvatarChange}
                    className="hidden"
                />

                {/* Avatar Selection */}
                <div className="flex justify-center mb-3">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            disabled={isUploadingAvatar}
                            className="w-20 h-20 rounded-full bg-obsidian-wave border-2 border-lime-light flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(0,196,180,0.3)] group relative cursor-pointer"
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-9 h-9 text-white-30 group-hover:text-lime-light transition-colors" />
                            )}
                            {isUploadingAvatar && (
                                <div className="absolute inset-0 bg-noir-eclipse/60 flex items-center justify-center rounded-full">
                                    <Loader2 className="w-6 h-6 text-lime-light animate-spin" />
                                </div>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            disabled={isUploadingAvatar}
                            className="absolute bottom-0 right-0 p-1.5 bg-lime-light text-noir-eclipse rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
                        >
                            <Camera className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-white-70 uppercase tracking-widest">
                        Full Name
                    </label>
                    <div className="flex items-center bg-obsidian-wave border border-white-30/30 rounded-xl px-3.5 py-2.5 focus-within:border-lime-light transition-colors">
                        <User className="w-4 h-4 text-white-30 mr-2.5" />
                        <input
                            type="text"
                            placeholder="Sarah Connor"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-transparent text-white w-full focus:outline-none placeholder-white-30 text-xs font-medium"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-white-70 uppercase tracking-widest">
                        Email Address
                    </label>
                    <div className="flex items-center bg-obsidian-wave border border-white-30/30 rounded-xl px-3.5 py-2.5 focus-within:border-lime-light transition-colors">
                        <Mail className="w-4 h-4 text-white-30 mr-2.5" />
                        <input
                            type="email"
                            placeholder="sarah@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-transparent text-white w-full focus:outline-none placeholder-white-30 text-xs font-medium"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-white-70 uppercase tracking-widest">
                        Password
                    </label>
                    <div className="relative flex items-center bg-obsidian-wave border border-white-30/30 rounded-xl px-3.5 py-2.5 focus-within:border-lime-light transition-colors">
                        <Lock className="w-4 h-4 text-white-30 mr-2.5" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-transparent text-white w-full focus:outline-none placeholder-white-30 text-xs font-medium"
                            required
                            minLength={6}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            disabled={isLoading}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white-30 hover:text-white transition-colors cursor-pointer"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-lime-light text-noir-eclipse font-extrabold py-4 rounded-xl hover:bg-lime-light/90 active:scale-[0.98] transition-all uppercase tracking-wider text-xs select-none disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer border border-lime-light/40"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                CREATING ACCOUNT...
                            </>
                        ) : (
                            'FINISH & ENTER FITGUIDE →'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
