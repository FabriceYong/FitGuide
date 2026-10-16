'use client';

import React, { useState } from 'react';
import { WelcomeStep } from './components/WelcomeStep';
import { InteractiveConceptStep } from './components/InteractiveConceptStep';
import { BiometricsStep } from './components/BiometricsStep';
import { ActivityLevelStep } from './components/ActivityLevelStep';
import { GoalStep } from './components/GoalStep';
import { WeightStep } from './components/WeightStep';
import { DietStep } from './components/DietStep';
import { ProfileStep } from './components/ProfileStep';
import { ArrowRight, FastForward } from 'lucide-react';

export const OnboardingWizard = ({ onFinish, onBackToLogin }) => {
    const [step, setStep] = useState(0);

    // Accumulated onboarding data — all biometric + preference fields
    const [onboardingData, setOnboardingData] = useState({
        gender: 'Prefer not to say',
        height: 170,
        weight: 70,
        targetWeight: 70,
        fitnessLevel: 'Beginner',
        activityStatus: 'Active',
        goal: 'Vitality',
        diet: 'Mediterranean Diet',
    });

    // Step 0: Welcome
    // Step 1: Interactive Concept Showcase
    // Step 2: Biometrics (gender, height, weight)
    // Step 3: Activity Level (fitnessLevel, activityStatus)
    // Step 4: Goal
    // Step 5: Target Weight
    // Step 6: Diet
    // Step 7: Profile / Register
    const totalSteps = 8;

    const handleNext = () => {
        if (step < totalSteps - 1) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    // Direct Skip to Profile creation step or finish immediately as guest
    const handleSkip = () => {
        if (step < totalSteps - 1) {
            setStep(totalSteps - 1);
        } else {
            // No account: continue as a guest (no token, nothing saved server-side)
            onFinish({
                name: 'Fitness Enthusiast',
                email: null,
                ...onboardingData,
            });
        }
    };

    const handleGenderSelected = (gender) => {
        setOnboardingData((prev) => ({ ...prev, gender }));
    };

    const handleHeightSelected = (height) => {
        setOnboardingData((prev) => ({ ...prev, height }));
    };

    const handleWeightSelected = (weight) => {
        setOnboardingData((prev) => ({ ...prev, weight }));
    };

    const handleFitnessLevelSelected = (fitnessLevel) => {
        setOnboardingData((prev) => ({ ...prev, fitnessLevel }));
    };

    const handleActivityStatusSelected = (activityStatus) => {
        setOnboardingData((prev) => ({ ...prev, activityStatus }));
    };

    const handleGoalSelected = (goal) => {
        setOnboardingData((prev) => ({ ...prev, goal }));
    };

    const handleTargetWeightSelected = (targetWeight) => {
        setOnboardingData((prev) => ({ ...prev, targetWeight }));
    };

    const handleDietSelected = (diet) => {
        setOnboardingData((prev) => ({ ...prev, diet }));
    };

    const stepLabel = () => {
        if (step === 0) return 'GET STARTED';
        if (step === 1) return 'CONTINUE TO PERSONALIZATION';
        if (step === totalSteps - 2) return 'CHOOSE MY DIET';
        return 'CONTINUE';
    };

    return (
        <div className="relative min-h-screen bg-noir-eclipse overflow-hidden flex flex-col justify-between select-none">
            {/* Background Radial Glow */}
            <div
                className="absolute -top-[120px] -left-[120px] w-[600px] h-[600px] rounded-full pointer-events-none opacity-25 blur-[120px]"
                style={{ background: 'radial-gradient(circle, #3E25F5 0%, #00C4B4 55%, transparent 75%)' }}
            />
            <div
                className="absolute -bottom-[120px] -right-[120px] w-[500px] h-[500px] rounded-full pointer-events-none opacity-20 blur-[100px]"
                style={{ background: 'radial-gradient(circle, #00C4B4 0%, #10B981 50%, transparent 70%)' }}
            />

            {/* Header Navigation Bar */}
            <div className="w-full max-w-md mx-auto px-6 pt-6 flex justify-between items-center z-20">
                {/* Back Button */}
                {step > 0 ? (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="text-xs font-extrabold text-white-70 hover:text-white uppercase tracking-wider transition-colors py-2 cursor-pointer flex items-center gap-1"
                    >
                        ← Back
                    </button>
                ) : (
                    <div className="w-12" />
                )}

                {/* Progress Indicators */}
                <div className="flex space-x-1 items-center">
                    {Array.from({ length: totalSteps }).map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                idx === step
                                    ? 'w-5 bg-lime-light shadow-[0_0_10px_rgba(0,196,180,0.5)]'
                                    : idx < step
                                        ? 'w-1.5 bg-royal-nebula'
                                        : 'w-1.5 bg-white-30/40'
                            }`}
                        />
                    ))}
                </div>

                {/* Prominent SKIP Button */}
                {step < totalSteps - 1 ? (
                    <button
                        type="button"
                        onClick={handleSkip}
                        className="px-3 py-1 rounded-full bg-white/10 hover:bg-lime-light hover:text-noir-eclipse text-white-70 text-xs font-extrabold uppercase tracking-wider transition-all border border-white-30/20 flex items-center gap-1 cursor-pointer"
                    >
                        <span>Skip</span>
                        <FastForward className="w-3 h-3" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleSkip}
                        className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white-50 text-xs font-bold uppercase tracking-wider transition-all border border-white-30/20 cursor-pointer"
                    >
                        Guest Mode
                    </button>
                )}
            </div>

            {/* Steps Content Area */}
            <div className="flex-1 flex items-center justify-center max-w-md w-full mx-auto z-10 pb-28 pt-4">
                {step === 0 && <WelcomeStep onContinue={handleNext} onBackToLogin={onBackToLogin} />}
                {step === 1 && <InteractiveConceptStep onContinue={handleNext} />}
                {step === 2 && (
                    <BiometricsStep
                        selectedGender={onboardingData.gender}
                        height={onboardingData.height}
                        weight={onboardingData.weight}
                        onGenderSelected={handleGenderSelected}
                        onHeightSelected={handleHeightSelected}
                        onWeightSelected={handleWeightSelected}
                    />
                )}
                {step === 3 && (
                    <ActivityLevelStep
                        selectedFitnessLevel={onboardingData.fitnessLevel}
                        selectedActivityStatus={onboardingData.activityStatus}
                        onFitnessLevelSelected={handleFitnessLevelSelected}
                        onActivityStatusSelected={handleActivityStatusSelected}
                    />
                )}
                {step === 4 && <GoalStep selectedGoal={onboardingData.goal} onGoalSelected={handleGoalSelected} />}
                {step === 5 && <WeightStep onWeightSelected={handleTargetWeightSelected} />}
                {step === 6 && <DietStep selectedDiet={onboardingData.diet} onDietSelected={handleDietSelected} />}
                {step === 7 && <ProfileStep onboardingData={onboardingData} onComplete={onFinish} />}
            </div>

            {/* Bottom Sticky Action Bar (Steps 0 - 6) */}
            {step < totalSteps - 1 && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-noir-eclipse via-noir-eclipse/95 to-transparent max-w-md mx-auto z-30">
                    <button
                        type="button"
                        onClick={handleNext}
                        className="w-full bg-royal-nebula hover:bg-royal-nebula/90 text-white font-extrabold py-4 rounded-2xl active:scale-[0.98] transition-all uppercase tracking-wider text-xs select-none flex items-center justify-center gap-2 cursor-pointer border border-white-30/20"
                    >
                        <span>{stepLabel()}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};
