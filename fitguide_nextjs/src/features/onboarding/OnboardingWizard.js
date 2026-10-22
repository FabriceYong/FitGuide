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
import { FocusStep } from './components/FocusStep';
import { TrainingSetupStep } from './components/TrainingSetupStep';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { suggestedFocusAreas } from '@fitguide/shared';
import { AuthPage, linkButton, primaryButton, secondaryButton } from './ui';

export const OnboardingWizard = ({ onFinish, onBackToLogin }) => {
    const [step, setStep] = useState(0);

    // Accumulated onboarding data — all biometric + preference fields
    const [answers, setAnswers] = useState({
        gender: 'Prefer not to say',
        height: 170,
        weight: 70,
        targetWeight: 70,
        fitnessLevel: 'Beginner',
        activityStatus: 'Active',
        goal: 'Vitality',
        diet: 'Mediterranean Diet',
        // null until the user changes them: until then they follow the
        // suggestions for the goal and gender chosen above.
        focusAreas: null,
        equipment: [],
        workoutMinutes: null,
        daysPerWeek: null,
        limitations: [],
    });
    const suggestedFocus = suggestedFocusAreas(answers);
    const onboardingData = { ...answers, focusAreas: answers.focusAreas ?? suggestedFocus };

    // Step 0: Welcome
    // Step 1: Interactive Concept Showcase
    // Step 2: Biometrics (gender, height, weight)
    // Step 3: Activity Level (fitnessLevel, activityStatus)
    // Step 4: Goal
    // Step 5: Target Weight
    // Step 6: Diet
    // Step 7: Focus areas
    // Step 8: Equipment, time, frequency, limitations
    // Step 9: Profile / Register
    const totalSteps = 10;
    const isLastStep = step === totalSteps - 1;

    // Each step starts at the top of the page, like moving to a new page.
    const goTo = (next) => {
        setStep(next);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    };

    const handleNext = () => {
        if (step < totalSteps - 1) goTo(step + 1);
    };

    const handleBack = () => {
        if (step > 0) goTo(step - 1);
    };

    // Direct Skip to Profile creation step or finish immediately as guest
    const handleSkip = () => {
        if (!isLastStep) {
            goTo(totalSteps - 1);
        } else {
            // No account: continue as a guest (no token, nothing saved server-side)
            onFinish({
                name: 'Fitness Enthusiast',
                email: null,
                ...onboardingData,
            });
        }
    };

    const update = (changes) => {
        setAnswers((prev) => ({ ...prev, ...changes }));
    };

    return (
        <AuthPage
            header={(
                <>
                    <span className="hidden sm:inline">Already have an account? </span>
                    <button type="button" onClick={onBackToLogin} className={linkButton}>Sign in</button>
                </>
            )}
        >
            {/* Progress */}
            <div className="mb-8">
                <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-white-70" aria-live="polite">Step {step + 1} of {totalSteps}</span>
                    <button type="button" onClick={handleSkip} className="text-white-70 hover:text-white underline-offset-2 hover:underline cursor-pointer">
                        {isLastStep ? 'Continue as a guest' : 'Skip the questions'}
                    </button>
                </div>
                <div
                    className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden"
                    role="progressbar"
                    aria-label="Sign-up progress"
                    aria-valuemin={1}
                    aria-valuemax={totalSteps}
                    aria-valuenow={step + 1}
                >
                    <div className="h-full rounded-full bg-lime-light transition-all duration-300" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
                </div>
            </div>

            {step === 0 && <WelcomeStep />}
            {step === 1 && <InteractiveConceptStep />}
            {step === 2 && (
                <BiometricsStep
                    selectedGender={onboardingData.gender}
                    height={onboardingData.height}
                    weight={onboardingData.weight}
                    onGenderSelected={(gender) => update({ gender })}
                    onHeightSelected={(height) => update({ height })}
                    onWeightSelected={(weight) => update({ weight })}
                />
            )}
            {step === 3 && (
                <ActivityLevelStep
                    selectedFitnessLevel={onboardingData.fitnessLevel}
                    selectedActivityStatus={onboardingData.activityStatus}
                    onFitnessLevelSelected={(fitnessLevel) => update({ fitnessLevel })}
                    onActivityStatusSelected={(activityStatus) => update({ activityStatus })}
                />
            )}
            {step === 4 && <GoalStep selectedGoal={onboardingData.goal} onGoalSelected={(goal) => update({ goal })} />}
            {step === 5 && <WeightStep targetWeight={onboardingData.targetWeight} onWeightSelected={(targetWeight) => update({ targetWeight })} />}
            {step === 6 && <DietStep selectedDiet={onboardingData.diet} onDietSelected={(diet) => update({ diet })} />}
            {step === 7 && (
                <FocusStep
                    selected={onboardingData.focusAreas}
                    suggested={suggestedFocus}
                    onChange={(focusAreas) => update({ focusAreas })}
                />
            )}
            {step === 8 && (
                <TrainingSetupStep
                    equipment={onboardingData.equipment}
                    workoutMinutes={onboardingData.workoutMinutes}
                    daysPerWeek={onboardingData.daysPerWeek}
                    limitations={onboardingData.limitations}
                    onChange={update}
                />
            )}
            {isLastStep && <ProfileStep onboardingData={onboardingData} onComplete={onFinish} onBack={handleBack} />}

            {/* Back / Continue (the last step has its own submit button) */}
            {!isLastStep && (
                <div className="mt-10 pt-6 border-t border-white-30/15 flex items-center justify-between gap-3">
                    {step > 0 ? (
                        <button type="button" onClick={handleBack} className={secondaryButton}>
                            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
                        </button>
                    ) : <span />}
                    <button type="button" onClick={handleNext} className={primaryButton}>
                        {step === 0 ? 'Get started' : 'Continue'} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
            )}
        </AuthPage>
    );
};
