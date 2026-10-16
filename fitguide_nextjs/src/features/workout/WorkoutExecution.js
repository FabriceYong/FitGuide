'use client';

import React, { useState, useEffect } from 'react';
import { X, Play, Pause, SkipForward, SkipBack, Clock, Dumbbell, Target, AlertCircle, CheckCircle2, Video, Image as ImageIcon, TrendingUp, Flame } from 'lucide-react';
export const WorkoutExecution = ({ workout, tintColor, onExit, onComplete, }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [totalElapsedTime, setTotalElapsedTime] = useState(0);
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [showModifications, setShowModifications] = useState(false);
    const currentSet = 1; // Can be made dynamic later
    const steps = workout.steps && workout.steps.length > 0
        ? workout.steps
        : generateDefaultSteps();
    const currentStep = steps[currentStepIndex];
    const totalSteps = steps.length;
    const progress = ((currentStepIndex + 1) / totalSteps) * 100;
    const estimatedCaloriesBurned = Math.floor((totalElapsedTime / 60) * (workout.calories / workout.duration));
    // Generate default steps if none provided
    function generateDefaultSteps() {
        return [
            {
                stepNumber: 1,
                instruction: `Warm up and prepare for your ${workout.category} workout. Make sure you have all necessary equipment ready.`,
                duration: 180,
                imageUrl: undefined,
            },
            {
                stepNumber: 2,
                instruction: `Begin your ${workout.title} routine. Focus on proper form and breathing throughout the exercise.`,
                duration: (workout.duration * 60) - 180 - 120,
                imageUrl: undefined,
            },
            {
                stepNumber: 3,
                instruction: 'Cool down with light stretching. Take deep breaths and allow your heart rate to gradually return to normal.',
                duration: 120,
                imageUrl: undefined,
            },
        ];
    }
    // Timer logic
    useEffect(() => {
        let interval;
        if (isPlaying && timeRemaining > 0) {
            interval = window.setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        // Auto-advance to next step
                        if (currentStepIndex < totalSteps - 1) {
                            handleNextStep();
                        }
                        else {
                            setIsPlaying(false);
                            handleWorkoutComplete();
                        }
                        return 0;
                    }
                    return prev - 1;
                });
                setTotalElapsedTime((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, timeRemaining, currentStepIndex]);
    // Initialize timer for current step
    useEffect(() => {
        if (currentStep?.duration) {
            setTimeRemaining(currentStep.duration);
        }
        else {
            // If no duration, set to 60 seconds by default
            setTimeRemaining(60);
        }
        setIsPlaying(false);
    }, [currentStepIndex]);
    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };
    const handleNextStep = () => {
        if (currentStepIndex < totalSteps - 1) {
            setCompletedSteps([...completedSteps, currentStepIndex]);
            setCurrentStepIndex(currentStepIndex + 1);
        }
    };
    const handlePreviousStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
            setCompletedSteps(completedSteps.filter(step => step !== currentStepIndex - 1));
        }
    };
    const handleStepComplete = () => {
        if (currentStepIndex === totalSteps - 1) {
            handleWorkoutComplete();
        }
        else {
            handleNextStep();
        }
    };
    const handleWorkoutComplete = () => {
        // Here you could save workout completion to backend
        onComplete();
    };
    const handleExit = () => {
        if (totalElapsedTime > 30) {
            setShowExitDialog(true);
        }
        else {
            onExit();
        }
    };
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    const formatTotalTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0)
            return `${secs}s`;
        return `${mins}m ${secs}s`;
    };
    return (<div className="min-h-screen bg-noir-eclipse text-white w-full max-w-2xl mx-auto border-x border-white-30/10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-noir-eclipse/95 backdrop-blur-md border-b border-white-30/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={handleExit} className="w-10 h-10 rounded-full bg-obsidian-wave hover:bg-white-30/20 flex items-center justify-center transition-colors">
            <X className="w-6 h-6"/>
          </button>
          <div className="text-center">
            <div className="text-xs font-bold text-white-70 uppercase tracking-wider">
              Step {currentStepIndex + 1} of {totalSteps}
            </div>
          </div>
          <div className="w-10 h-10 flex items-center justify-center">
            {workout.sets && workout.sets > 1 && (<div className="text-xs font-bold text-lime-light">
                Set {currentSet}/{workout.sets}
              </div>)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-obsidian-wave rounded-full h-2 overflow-hidden">
          <div className="h-full bg-lime-light transition-all duration-300 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Workout Title & Category */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-white">{workout.title}</h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-royal-nebula">
              {workout.category}
            </span>
            <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-purple-500">
              {workout.difficulty}
            </span>
          </div>
        </div>

        {/* Timer Display */}
        <div className="bg-obsidian-wave rounded-3xl p-8 border border-white-30/10 text-center space-y-4">
          <div className="text-6xl font-extrabold tracking-tight" style={{ color: tintColor }}>
            {formatTime(timeRemaining)}
          </div>
          <div className="text-sm text-white-70 font-semibold">
            Time Remaining in Step
          </div>

          {/* Play/Pause Controls */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button onClick={handlePreviousStep} disabled={currentStepIndex === 0} className="w-12 h-12 rounded-full bg-white-30/10 hover:bg-white-30/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
              <SkipBack className="w-5 h-5"/>
            </button>

            <button onClick={handlePlayPause} className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: tintColor, color: '#0E0E0E' }}>
              {isPlaying ? (<Pause className="w-7 h-7 fill-current"/>) : (<Play className="w-7 h-7 fill-current ml-1"/>)}
            </button>

            <button onClick={handleNextStep} disabled={currentStepIndex === totalSteps - 1} className="w-12 h-12 rounded-full bg-white-30/10 hover:bg-white-30/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
              <SkipForward className="w-5 h-5"/>
            </button>
          </div>
        </div>

        {/* Current Step Instructions */}
        <div className="bg-obsidian-wave rounded-2xl p-6 border border-white-30/10 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-lime-light/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-lime-light"/>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Current Step</h3>
          </div>

          <p className="text-base text-white leading-relaxed">
            {currentStep?.instruction || 'Follow the workout routine.'}
          </p>

          {/* Step Image (if available) */}
          {currentStep && 'imageUrl' in currentStep && currentStep.imageUrl && (<div className="rounded-xl overflow-hidden bg-white-30/5 border border-white-30/10">
              <img src={currentStep.imageUrl} alt={`Step ${currentStepIndex + 1}`} className="w-full h-48 object-cover"/>
            </div>)}

          {/* Reps Info */}
          {workout.reps && (<div className="flex items-center gap-2 text-sm text-white-70 bg-white-30/5 rounded-lg p-3">
              <Target className="w-4 h-4 text-lime-light"/>
              <span>Target: <strong className="text-white">{workout.reps}</strong> repetitions</span>
            </div>)}

          <button onClick={handleStepComplete} className="w-full bg-lime-light/20 border-2 border-lime-light text-lime-light font-bold py-3 rounded-xl hover:bg-lime-light hover:text-noir-eclipse transition-all uppercase tracking-wider text-sm">
            {currentStepIndex === totalSteps - 1 ? 'Complete Workout' : 'Next Step'}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Clock} label="Elapsed" value={formatTotalTime(totalElapsedTime)} iconColor="text-blue-400"/>
          <StatCard icon={Flame} label="Calories" value={`${estimatedCaloriesBurned}`} iconColor="text-orange-400"/>
          <StatCard icon={TrendingUp} label="Intensity" value={workout.intensity} iconColor="text-lime-light"/>
        </div>

        {/* Equipment Section */}
        {workout.equipment && workout.equipment.length > 0 && (<div className="bg-obsidian-wave rounded-2xl p-5 border border-white-30/10 space-y-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-lime-light"/>
              <h3 className="text-sm font-bold uppercase tracking-wider">Equipment</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {workout.equipment.map((item, index) => (<span key={index} className="px-3 py-1.5 bg-white-30/10 border border-white-30/20 rounded-full text-xs text-white-70">
                  {item}
                </span>))}
            </div>
          </div>)}

        {/* Video Section */}
        {workout.videoUrl && (<div className="bg-obsidian-wave rounded-2xl p-5 border border-white-30/10 space-y-3">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-lime-light"/>
              <h3 className="text-sm font-bold uppercase tracking-wider">Video Guide</h3>
            </div>
            <div className="aspect-video bg-white-30/5 rounded-xl overflow-hidden border border-white-30/10 flex items-center justify-center">
              <a href={workout.videoUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-white-70 hover:text-lime-light transition-colors">
                <Video className="w-12 h-12"/>
                <span className="text-sm font-semibold">Watch Video Tutorial</span>
              </a>
            </div>
          </div>)}

        {/* Image Gallery */}
        {workout.imageGallery && workout.imageGallery.length > 0 && (<div className="bg-obsidian-wave rounded-2xl p-5 border border-white-30/10 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-lime-light"/>
              <h3 className="text-sm font-bold uppercase tracking-wider">Reference Images</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {workout.imageGallery.map((imageUrl, index) => (<div key={index} className="aspect-square bg-white-30/5 rounded-xl overflow-hidden border border-white-30/10">
                  <img src={imageUrl} alt={`Reference ${index + 1}`} className="w-full h-full object-cover"/>
                </div>))}
            </div>
          </div>)}

        {/* Modifications */}
        {workout.modifications && workout.modifications.length > 0 && (<div className="bg-obsidian-wave rounded-2xl p-5 border border-white-30/10 space-y-3">
            <button onClick={() => setShowModifications(!showModifications)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-lime-light"/>
                <h3 className="text-sm font-bold uppercase tracking-wider">Modifications</h3>
              </div>
              <span className="text-white-70 text-sm">
                {showModifications ? '−' : '+'}
              </span>
            </button>

            {showModifications && (<div className="space-y-2 pt-2">
                {workout.modifications.map((mod, index) => (<div key={index} className="bg-white-30/5 rounded-lg p-3">
                    <div className="text-xs font-bold text-lime-light uppercase mb-1">
                      {mod.level}
                    </div>
                    <p className="text-sm text-white-70">{mod.description}</p>
                  </div>))}
              </div>)}
          </div>)}

        {/* Cautions */}
        {workout.cautions && workout.cautions.length > 0 && (<div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400"/>
              <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400">Safety Notes</h3>
            </div>
            <ul className="space-y-2">
              {workout.cautions.map((caution, index) => (<li key={index} className="flex items-start gap-2 text-sm text-orange-200">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span>{caution}</span>
                </li>))}
            </ul>
          </div>)}

        {/* All Steps Preview */}
        <div className="bg-obsidian-wave rounded-2xl p-5 border border-white-30/10 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider">All Steps</h3>
          <div className="space-y-2">
            {steps.map((step, index) => (<button key={index} onClick={() => setCurrentStepIndex(index)} className={`w-full text-left p-3 rounded-lg transition-all ${index === currentStepIndex
                ? 'bg-lime-light/20 border border-lime-light'
                : completedSteps.includes(index)
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-white-30/5 border border-white-30/10 hover:bg-white-30/10'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === currentStepIndex
                ? 'bg-lime-light text-noir-eclipse'
                : completedSteps.includes(index)
                    ? 'bg-green-500 text-white'
                    : 'bg-white-30/20 text-white-70'}`}>
                      {completedSteps.includes(index) ? '✓' : step.stepNumber}
                    </div>
                    <p className="text-sm text-white flex-1 line-clamp-1">
                      {step.instruction}
                    </p>
                  </div>
                  {step.duration && (<span className="text-xs text-white-70 font-semibold">
                      {formatTime(step.duration)}
                    </span>)}
                </div>
              </button>))}
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitDialog && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-obsidian-wave rounded-3xl p-6 max-w-md w-full border border-white-30/20 space-y-4">
            <h3 className="text-xl font-bold text-white">Exit Workout?</h3>
            <p className="text-white-70">
              Are you sure you want to exit? Your progress will not be saved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitDialog(false)} className="flex-1 bg-white-30/10 text-white font-bold py-3 rounded-xl hover:bg-white-30/20 transition-all">
                Continue Workout
              </button>
              <button onClick={onExit} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-all">
                Exit
              </button>
            </div>
          </div>
        </div>)}
    </div>);
};
const StatCard = ({ icon: Icon, label, value, iconColor = 'text-white' }) => {
    return (<div className="bg-obsidian-wave rounded-xl p-3 border border-white-30/10 text-center space-y-1">
      <Icon className={`w-5 h-5 mx-auto ${iconColor}`}/>
      <div className="text-[10px] font-bold text-white-30 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>);
};
