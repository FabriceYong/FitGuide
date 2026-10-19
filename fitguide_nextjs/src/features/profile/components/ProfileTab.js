'use client';

import React, { useState, useRef } from 'react';
import {
    User, Bell, Lock, HelpCircle, Info, ChevronRight, LogOut,
    Edit3, Scale, Ruler, Activity, Flame, Target, Utensils,
    CheckCircle2, X, Loader2, Camera, AlertCircle, ShieldCheck,
    Zap, TrendingUp, Award, Heart, Dumbbell
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

import { apiRequest, assetUrl } from '../../../lib/api';

// BMI calculation helper
function calcBMI(weight, height) {
    if (!weight || !height) return null;
    const h = height / 100;
    return (weight / (h * h)).toFixed(1);
}

function getBMILabel(bmi) {
    if (!bmi) return { label: 'N/A', color: '#6B7280' };
    const val = parseFloat(bmi);
    if (val < 18.5) return { label: 'Underweight', color: '#60A5FA' };
    if (val < 25) return { label: 'Normal', color: '#00C4B4' };
    if (val < 30) return { label: 'Overweight', color: '#FB923C' };
    return { label: 'Obese', color: '#EF4444' };
}

const GOAL_COLORS = {
    Vitality: '#00C4B4',
    Muscle: '#3E25F5',
    Weight: '#EF4444',
    Flexibility: '#10B981',
};

const FITNESS_LEVEL_CONFIG = {
    Beginner: { color: '#00C4B4', icon: Zap },
    Intermediate: { color: '#3E25F5', icon: TrendingUp },
    Advanced: { color: '#EF4444', icon: Flame },
};

const ACTIVITY_STATUS_CONFIG = {
    Active: { color: '#00C4B4', desc: 'Workout 3+ days/week' },
    Inactive: { color: '#6B7280', desc: 'Low daily movement' },
    'Moderately Active': { color: '#FB923C', desc: 'Light daily exercise' },
    'Very Active': { color: '#10B981', desc: 'Daily physical training' },
};

export const ProfileTab = ({ onLogout }) => {
    const { user, isGuest, updateUser } = useAuth();
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const fileInputRef = useRef(null);

    // Edit form state — initialized from current user data
    const [editForm, setEditForm] = useState({
        name: user?.name || '',
        gender: user?.gender || 'Prefer not to say',
        height: user?.height || 170,
        weight: user?.weight || 70,
        targetWeight: user?.targetWeight || 70,
        fitnessLevel: user?.fitnessLevel || 'Beginner',
        activityStatus: user?.activityStatus || 'Active',
        goal: user?.goal || 'Vitality',
        diet: user?.diet || 'Mediterranean Diet',
        avatarUrl: user?.avatarUrl || null,
        birthYear: user?.birthYear || '',
    });

    const bmi = calcBMI(user?.weight, user?.height);
    const bmiInfo = getBMILabel(bmi);
    const goalColor = GOAL_COLORS[user?.goal] || '#00C4B4';
    const fitnessConfig = FITNESS_LEVEL_CONFIG[user?.fitnessLevel] || FITNESS_LEVEL_CONFIG['Beginner'];
    const activityConfig = ACTIVITY_STATUS_CONFIG[user?.activityStatus] || ACTIVITY_STATUS_CONFIG['Active'];
    const FitnessIcon = fitnessConfig.icon;
    const memberSince = new Date(user?.createdAt || Date.now()).getFullYear();

    const openEditModal = () => {
        setEditForm({
            name: user?.name || '',
            gender: user?.gender || 'Prefer not to say',
            height: user?.height || 170,
            weight: user?.weight || 70,
            targetWeight: user?.targetWeight || 70,
            fitnessLevel: user?.fitnessLevel || 'Beginner',
            activityStatus: user?.activityStatus || 'Active',
            goal: user?.goal || 'Vitality',
            diet: user?.diet || 'Mediterranean Diet',
            avatarUrl: user?.avatarUrl || null,
            birthYear: user?.birthYear || '',
        });
        setSaveError(null);
        setSaveSuccess(false);
        setShowEditModal(true);
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const localPreview = URL.createObjectURL(file);
        setEditForm((prev) => ({ ...prev, avatarUrl: localPreview }));
        if (isGuest) return; // guests keep a local preview only
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const data = await apiRequest('/upload/avatar', { method: 'POST', formData, auth: true });
            setEditForm((prev) => ({ ...prev, avatarUrl: data.avatarUrl }));
        } catch (err) {
            setSaveError(err.message);
            setEditForm((prev) => ({ ...prev, avatarUrl: user?.avatarUrl || null }));
        }
    };

    const handleSaveProfile = async () => {
        setSaveError(null);
        setSaveSuccess(false);
        setIsSaving(true);
        try {
            if (isGuest) {
                // Guests have no server profile; keep the changes on this device.
                updateUser(editForm);
            } else {
                const body = { ...editForm, birthYear: editForm.birthYear === '' ? null : editForm.birthYear };
                const data = await apiRequest('/auth/profile', { method: 'PUT', body, auth: true });
                updateUser(data.user);
            }
            setSaveSuccess(true);
            setTimeout(() => setShowEditModal(false), 1200);
        } catch (err) {
            setSaveError(err.message || 'Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-5 pb-10">
            {/* ── Profile Header ── */}
            <div className="flex flex-col items-center text-center pt-4 pb-2">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-2 border-lime-light flex items-center justify-center bg-obsidian-wave overflow-hidden">
                        {user?.avatarUrl ? (
                            <img src={assetUrl(user.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 text-white-30" />
                        )}
                    </div>
                    {/* Activity Status Badge */}
                    <span
                        className="absolute -bottom-1 -right-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/10"
                        style={{ background: activityConfig.color, color: '#fff' }}
                    >
                        {user?.activityStatus || 'Active'}
                    </span>
                </div>
                <h2 className="text-2xl font-extrabold text-white mt-4">{user?.name || 'Athlete'}</h2>
                <p className="text-xs text-white-50 mt-1">{user?.email || 'user@fitguide.com'} • Member since {memberSince}</p>

                {/* Fitness Level Badge */}
                <div
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-white/10"
                    style={{ background: `${fitnessConfig.color}22`, color: fitnessConfig.color, borderColor: `${fitnessConfig.color}44` }}
                >
                    <FitnessIcon className="w-3 h-3" />
                    {user?.fitnessLevel || 'Beginner'}
                </div>

                {/* Edit Profile Button */}
                <button
                    onClick={openEditModal}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-obsidian-wave border border-white-30/20 text-white text-xs font-bold hover:border-lime-light/60 hover:text-lime-light transition-all cursor-pointer"
                >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Profile
                </button>
            </div>

            {/* ── Biometrics & Stats Grid ── */}
            <div>
                <h3 className="text-[10px] font-extrabold tracking-widest text-white-30 uppercase mb-3">Biometrics & Physical Stats</h3>
                <div className="grid grid-cols-3 gap-2">
                    {/* Height */}
                    <div className="bg-obsidian-wave rounded-2xl p-3 flex flex-col items-center text-center">
                        <Ruler className="w-4 h-4 text-cyan-400 mb-1" />
                        <span className="text-lg font-extrabold text-white">{user?.height || '—'}</span>
                        <span className="text-[9px] text-white-40 uppercase tracking-wider">cm</span>
                        <span className="text-[9px] text-white-50 mt-0.5">Height</span>
                    </div>
                    {/* Weight */}
                    <div className="bg-obsidian-wave rounded-2xl p-3 flex flex-col items-center text-center">
                        <Scale className="w-4 h-4 text-emerald-400 mb-1" />
                        <span className="text-lg font-extrabold text-white">{user?.weight || '—'}</span>
                        <span className="text-[9px] text-white-40 uppercase tracking-wider">kg</span>
                        <span className="text-[9px] text-white-50 mt-0.5">Weight</span>
                    </div>
                    {/* BMI */}
                    <div className="bg-obsidian-wave rounded-2xl p-3 flex flex-col items-center text-center">
                        <Activity className="w-4 h-4 mb-1" style={{ color: bmiInfo.color }} />
                        <span className="text-lg font-extrabold" style={{ color: bmiInfo.color }}>{bmi || '—'}</span>
                        <span className="text-[9px] text-white-40 uppercase tracking-wider">BMI</span>
                        <span className="text-[9px] mt-0.5" style={{ color: bmiInfo.color }}>{bmiInfo.label}</span>
                    </div>
                    {/* Target Weight */}
                    <div className="bg-obsidian-wave rounded-2xl p-3 flex flex-col items-center text-center">
                        <Target className="w-4 h-4 text-violet-400 mb-1" />
                        <span className="text-lg font-extrabold text-white">{user?.targetWeight || '—'}</span>
                        <span className="text-[9px] text-white-40 uppercase tracking-wider">kg</span>
                        <span className="text-[9px] text-white-50 mt-0.5">Target</span>
                    </div>
                    {/* Gender */}
                    <div className="bg-obsidian-wave rounded-2xl p-3 flex flex-col items-center text-center">
                        <User className="w-4 h-4 text-pink-400 mb-1" />
                        <span className="text-xs font-extrabold text-white leading-tight">{user?.gender || '—'}</span>
                        <span className="text-[9px] text-white-50 mt-1">Gender</span>
                    </div>
                    {/* Weight delta */}
                    <div className="bg-obsidian-wave rounded-2xl p-3 flex flex-col items-center text-center">
                        <TrendingUp className="w-4 h-4 text-amber-400 mb-1" />
                        <span className="text-lg font-extrabold text-white">
                            {user?.weight && user?.targetWeight ? Math.abs(user.weight - user.targetWeight) : '—'}
                        </span>
                        <span className="text-[9px] text-white-40 uppercase tracking-wider">kg to go</span>
                        <span className="text-[9px] text-white-50 mt-0.5">Progress</span>
                    </div>
                </div>
            </div>

            {/* ── Nutrition & Goals ── */}
            <div>
                <h3 className="text-[10px] font-extrabold tracking-widest text-white-30 uppercase mb-3">Nutrition & Goals</h3>
                <div className="bg-obsidian-wave rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${goalColor}22` }}>
                                <Target className="w-4 h-4" style={{ color: goalColor }} />
                            </div>
                            <div>
                                <p className="text-[10px] text-white-40 uppercase tracking-wider">Primary Goal</p>
                                <p className="text-sm font-bold text-white">{user?.goal || 'Vitality'}</p>
                            </div>
                        </div>
                        <span
                            className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase"
                            style={{ background: `${goalColor}22`, color: goalColor }}
                        >
                            Active
                        </span>
                    </div>
                    <div className="border-t border-white-30/10 pt-3 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-500/10">
                            <Utensils className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-white-40 uppercase tracking-wider">Diet Strategy</p>
                            <p className="text-sm font-bold text-white">{user?.diet || 'Mediterranean Diet'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Activity Level ── */}
            <div>
                <h3 className="text-[10px] font-extrabold tracking-widest text-white-30 uppercase mb-3">Activity & Training</h3>
                <div className="bg-obsidian-wave rounded-2xl p-4 flex items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${fitnessConfig.color}22` }}
                    >
                        <FitnessIcon className="w-5 h-5" style={{ color: fitnessConfig.color }} />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-extrabold text-white">{user?.fitnessLevel || 'Beginner'} Level</p>
                        <p className="text-[10px] text-white-50 mt-0.5">{activityConfig.desc}</p>
                    </div>
                    <div
                        className="text-right"
                        style={{ color: activityConfig.color }}
                    >
                        <p className="text-[10px] font-extrabold uppercase tracking-wider">{user?.activityStatus || 'Active'}</p>
                    </div>
                </div>
            </div>

            {/* ── Settings ── */}
            <div>
                <h3 className="text-[10px] font-extrabold tracking-widest text-white-30 uppercase mb-3">Account</h3>
                <div className="space-y-2">
                    {[
                        { title: 'Notifications', icon: Bell },
                        { title: 'Privacy', icon: Lock },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <button key={item.title} className="w-full flex items-center justify-between p-4 bg-obsidian-wave rounded-2xl hover:bg-obsidian-wave/85 active:scale-[0.99] transition-all cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-noir-eclipse text-white">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold text-white">{item.title}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white-30" />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <h3 className="text-[10px] font-extrabold tracking-widest text-white-30 uppercase mb-3">More</h3>
                <div className="space-y-2">
                    {[
                        { title: 'Help & Support', icon: HelpCircle },
                        { title: 'About FitGuide', icon: Info },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <button key={item.title} className="w-full flex items-center justify-between p-4 bg-obsidian-wave rounded-2xl hover:bg-obsidian-wave/85 active:scale-[0.99] transition-all cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-noir-eclipse text-white">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold text-white">{item.title}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white-30" />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Logout */}
            <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-4 bg-obsidian-wave border border-red-500/40 rounded-2xl hover:bg-red-500/5 hover:border-red-500/80 active:scale-[0.99] transition-all font-bold text-red-400 text-sm cursor-pointer"
            >
                <LogOut className="w-4 h-4" />
                Log Out
            </button>

            {/* ═══════════════ Edit Profile Modal ═══════════════ */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-noir-eclipse/80 backdrop-blur-sm"
                        onClick={() => setShowEditModal(false)}
                    />
                    {/* Sheet */}
                    <div className="relative w-full max-w-md bg-obsidian-wave border-t border-white-30/20 rounded-t-3xl p-6 space-y-5 z-10 max-h-[92vh] overflow-y-auto">
                        {/* Handle */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white-30/30 rounded-full" />

                        <div className="flex items-center justify-between pt-2">
                            <h3 className="text-lg font-extrabold text-white">Edit Profile</h3>
                            <button onClick={() => setShowEditModal(false)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white-50 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Avatar */}
                        <div className="flex justify-center">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-noir-eclipse border-2 border-lime-light overflow-hidden flex items-center justify-center">
                                    {editForm.avatarUrl ? (
                                        <img src={assetUrl(editForm.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-8 h-8 text-white-30" />
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-1.5 bg-lime-light text-noir-eclipse rounded-full cursor-pointer"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                            </div>
                        </div>

                        {/* Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-white-50 uppercase tracking-widest">Full Name</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                className="w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3.5 py-2.5 text-white text-xs font-medium focus:outline-none focus:border-lime-light transition-colors"
                            />
                        </div>

                        {/* Gender */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-white-50 uppercase tracking-widest">Gender</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map((g) => (
                                    <button
                                        key={g} type="button"
                                        onClick={() => setEditForm((p) => ({ ...p, gender: g }))}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${editForm.gender === g ? 'bg-obsidian-wave border-lime-light text-white' : 'bg-white/5 border-white-30/15 text-white-60'}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Height Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-widest">
                                <span className="text-white-50">Height</span>
                                <span className="text-lime-light">{editForm.height} cm</span>
                            </div>
                            <input
                                type="range" min="120" max="220"
                                value={editForm.height}
                                onChange={(e) => setEditForm((p) => ({ ...p, height: Number(e.target.value) }))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lime-light"
                            />
                        </div>

                        {/* Weight Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-widest">
                                <span className="text-white-50">Current Weight</span>
                                <span className="text-lime-light">{editForm.weight} kg</span>
                            </div>
                            <input
                                type="range" min="40" max="180"
                                value={editForm.weight}
                                onChange={(e) => setEditForm((p) => ({ ...p, weight: Number(e.target.value) }))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lime-light"
                            />
                        </div>

                        {/* Birth year (for calorie targets) */}
                        <div className="space-y-2">
                            <label htmlFor="profile-birth-year" className="text-[10px] font-extrabold text-white-50 uppercase tracking-widest">Birth year</label>
                            <input
                                id="profile-birth-year" type="number" inputMode="numeric" min="1900" max={new Date().getFullYear() - 13}
                                placeholder="Used for calorie targets"
                                value={editForm.birthYear}
                                onChange={(e) => setEditForm((p) => ({ ...p, birthYear: e.target.value === '' ? '' : Number(e.target.value) }))}
                                className="w-full bg-white/5 border border-white-30/15 rounded-xl px-4 py-2.5 text-sm text-white"
                            />
                        </div>

                        {/* Target Weight Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-widest">
                                <span className="text-white-50">Target Weight</span>
                                <span className="text-lime-light">{editForm.targetWeight} kg</span>
                            </div>
                            <input
                                type="range" min="40" max="180"
                                value={editForm.targetWeight}
                                onChange={(e) => setEditForm((p) => ({ ...p, targetWeight: Number(e.target.value) }))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lime-light"
                            />
                        </div>

                        {/* Fitness Level */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-white-50 uppercase tracking-widest">Fitness Level</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                                    <button
                                        key={lvl} type="button"
                                        onClick={() => setEditForm((p) => ({ ...p, fitnessLevel: lvl }))}
                                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${editForm.fitnessLevel === lvl ? 'bg-obsidian-wave border-lime-light text-white' : 'bg-white/5 border-white-30/15 text-white-60'}`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Activity Status */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-white-50 uppercase tracking-widest">Activity Status</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Active', 'Inactive', 'Moderately Active', 'Very Active'].map((st) => (
                                    <button
                                        key={st} type="button"
                                        onClick={() => setEditForm((p) => ({ ...p, activityStatus: st }))}
                                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-left ${editForm.activityStatus === st ? 'bg-obsidian-wave border-lime-light text-white' : 'bg-white/5 border-white-30/15 text-white-60'}`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Goal */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-white-50 uppercase tracking-widest">Primary Goal</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Vitality', 'Muscle', 'Weight', 'Flexibility'].map((g) => (
                                    <button
                                        key={g} type="button"
                                        onClick={() => setEditForm((p) => ({ ...p, goal: g }))}
                                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${editForm.goal === g ? 'bg-obsidian-wave border-lime-light text-white' : 'bg-white/5 border-white-30/15 text-white-60'}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Diet */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-white-50 uppercase tracking-widest">Diet Strategy</label>
                            <div className="space-y-1.5">
                                {['Keto Diet', 'Mediterranean Diet', 'Paleo Diet', 'Intermittent Fasting', 'Flexible Balanced Plan'].map((d) => (
                                    <button
                                        key={d} type="button"
                                        onClick={() => setEditForm((p) => ({ ...p, diet: d }))}
                                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border text-left ${editForm.diet === d ? 'bg-obsidian-wave border-lime-light text-white' : 'bg-white/5 border-white-30/15 text-white-60'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {saveError && (
                            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-300">{saveError}</p>
                            </div>
                        )}

                        {/* Save Button */}
                        <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="w-full bg-lime-light text-noir-eclipse font-extrabold py-4 rounded-2xl active:scale-[0.98] transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                            {saveSuccess ? (
                                <><CheckCircle2 className="w-4 h-4" /> SAVED!</>
                            ) : isSaving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> SAVING...</>
                            ) : (
                                <>SAVE CHANGES</>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
