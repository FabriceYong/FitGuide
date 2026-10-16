'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, PlayCircle, Clock, TrendingUp, Dumbbell, Target, AlertCircle, CheckCircle } from 'lucide-react';
import { WorkoutReviews } from '../reviews/components/WorkoutReviews';
import { fetchWorkoutBySlug } from '../../services/workoutService';
import { addToFavorites, removeFromFavorites, checkIsFavorite } from '../../services/favoriteService';
import { useWorkoutImage } from '../../hooks/useWorkoutImage';
import { useAuth } from '../../contexts/AuthContext';
export const WorkoutDetails = ({ workoutSlug, tintColor, onBack, onBegin, }) => {
    const [workout, setWorkout] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const { hasAccount } = useAuth();
    // Use dynamic image hook for workout details
    const { imageUrl, isLoading: imageLoading, photographer, photographerUrl } = useWorkoutImage({
        workoutId: workout?.id || '',
        category: workout?.category || '',
        title: workout?.title || '',
        size: 'large',
        useDynamicImages: true,
    });
    useEffect(() => {
        fetchWorkoutDetails();
    }, [workoutSlug]);
    const fetchWorkoutDetails = async () => {
        try {
            setLoading(true);
            const response = await fetchWorkoutBySlug(workoutSlug);
            if (response.success) {
                setWorkout(response.workout);
                // Check if workout is in favorites
                if (response.workout.slug) {
                    const favoriteStatus = await checkIsFavorite(response.workout.slug);
                    setIsFavorite(favoriteStatus);
                }
            }
            else {
                setError('Workout not found');
            }
        }
        catch (error) {
            setError('Failed to load workout');
            console.error('Error fetching workout:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleToggleFavorite = async () => {
        if (!workout?.slug || favoriteLoading || !hasAccount)
            return;
        try {
            setFavoriteLoading(true);
            if (isFavorite) {
                await removeFromFavorites(workout.slug);
                setIsFavorite(false);
            }
            else {
                await addToFavorites(workout.slug);
                setIsFavorite(true);
            }
        }
        catch (error) {
            console.error('Error toggling favorite:', error);
        }
        finally {
            setFavoriteLoading(false);
        }
    };
    if (loading) {
        return (<div className="min-h-screen bg-noir-eclipse flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-lime-light border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading workout...</p>
        </div>
      </div>);
    }
    if (error || !workout) {
        return (<div className="min-h-screen bg-noir-eclipse flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-white-70 mb-4">{error || 'Workout not found'}</p>
          <button onClick={onBack} className="px-6 py-3 bg-lime-light text-noir-eclipse rounded-xl font-bold">
            Go Back
          </button>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-noir-eclipse text-left pb-12 w-full mx-auto">
      {/* Hero Image/Video Area */}
      <div className="relative h-96 w-full flex items-center justify-center overflow-hidden bg-cover bg-center transition-opacity duration-500" style={{
            backgroundImage: `url(${imageUrl})`,
            opacity: imageLoading ? 0.7 : 1,
        }}>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute inset-0" style={{
            background: `radial-gradient(circle, ${tintColor}55 0%, transparent 80%)`,
        }}></div>

        {/* Loading Indicator for Image */}
        {imageLoading && (<div className="absolute inset-0 flex items-center justify-center z-5">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>)}

        {/* Photographer Attribution */}
        {photographer && photographerUrl && (<a href={photographerUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 z-10 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-[10px] text-white/80 hover:text-white transition-colors">
            Photo by {photographer}
          </a>)}

        {/* Back and Favorite Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors backdrop-blur-sm">
            <ArrowLeft className="w-6 h-6"/>
          </button>
          <button onClick={handleToggleFavorite} disabled={favoriteLoading || !hasAccount} title={hasAccount ? (isFavorite ? 'Remove from favorites' : 'Add to favorites') : 'Create an account to save favorites'} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${isFavorite
            ? 'bg-red-500/90 hover:bg-red-600'
            : 'bg-black/30 hover:bg-black/50'} ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Heart className={`w-6 h-6 transition-all ${isFavorite ? 'fill-white text-white' : 'text-white'}`}/>
          </button>
        </div>

        {/* Play Icon */}
        <button className="z-10 text-white/50 hover:text-white hover:scale-105 active:scale-95 transition-all">
          <PlayCircle className="w-20 h-20"/>
        </button>

        {/* Title and Category */}
        <div className="absolute bottom-6 left-6 right-6 text-left z-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3 drop-shadow-md">
            {workout.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-royal-nebula text-white">
              {workout.category}
            </span>
            <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-purple-500 text-white">
              {workout.difficulty}
            </span>
            <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-lime-light text-noir-eclipse">
              {workout.intensity}
            </span>
          </div>
        </div>
      </div>

      {/* Content Details */}
      <div className="px-6 md:px-12 lg:px-20 py-8 space-y-8 max-w-[1800px] mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 bg-obsidian-wave p-4 rounded-2xl border border-white-30/5">
          <DetailStat label="DURATION" value={`${workout.duration} MIN`} icon={Clock}/>
          <DetailStat label="DIFFICULTY" value={workout.difficulty} icon={TrendingUp}/>
          <DetailStat label="CALORIES" value={`${workout.calories}`} icon={Target} colorClass="text-lime-light"/>
        </div>

        {/* Description */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-1 h-10 bg-lime-light rounded-full"></div>
            <h3 className="text-base font-extrabold tracking-wider text-white">ABOUT THIS WORKOUT</h3>
          </div>
          <p className="text-sm md:text-base text-white-70 leading-relaxed font-medium">
            {workout.description}
          </p>
        </div>

        {/* Equipment */}
        {workout.equipment && workout.equipment.length > 0 && (<div className="space-y-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-lime-light"/>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Equipment Needed</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {workout.equipment.map((item, index) => (<span key={index} className="px-3 py-1.5 bg-obsidian-wave border border-white-30/20 rounded-full text-xs text-white-70">
                  {item}
                </span>))}
            </div>
          </div>)}

        {/* Target Muscles */}
        {workout.targetMuscles && workout.targetMuscles.length > 0 && (<div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-lime-light"/>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Target Muscles</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {workout.targetMuscles.map((muscle, index) => (<span key={index} className="px-3 py-1.5 bg-obsidian-wave border border-white-30/20 rounded-full text-xs text-white-70">
                  {muscle}
                </span>))}
            </div>
          </div>)}

        {/* Benefits */}
        {workout.benefits && workout.benefits.length > 0 && (<div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-lime-light"/>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Benefits</h3>
            </div>
            <ul className="space-y-2">
              {workout.benefits.map((benefit, index) => (<li key={index} className="flex items-start gap-2 text-sm text-white-70">
                  <span className="text-lime-light mt-0.5">•</span>
                  <span>{benefit}</span>
                </li>))}
            </ul>
          </div>)}

        {/* Cautions */}
        {workout.cautions && workout.cautions.length > 0 && (<div className="space-y-3 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400"/>
              <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider">Important Notes</h3>
            </div>
            <ul className="space-y-2">
              {workout.cautions.map((caution, index) => (<li key={index} className="flex items-start gap-2 text-sm text-orange-200">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span>{caution}</span>
                </li>))}
            </ul>
          </div>)}

        {/* Action Button */}
        <button onClick={() => onBegin(workout)} className="w-full bg-lime-light text-noir-eclipse font-extrabold py-5 rounded-2xl hover:bg-lime-light/90 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-wider text-sm select-none cursor-pointer border border-lime-light/30">
          LET'S BEGIN
        </button>

        {/* Reviews Section */}
        <div className="pt-8 border-t border-white-30/10">
          <WorkoutReviews workoutId={workout.slug} workoutTitle={workout.title}/>
        </div>
      </div>
    </div>);
};
const DetailStat = ({ label, value, icon: Icon, colorClass = "text-white" }) => {
    return (<div className="flex flex-col items-center text-center space-y-2">
      <Icon className={`w-5 h-5 ${colorClass}`}/>
      <span className="text-[10px] font-bold text-white-30 tracking-widest uppercase">
        {label}
      </span>
      <span className={`text-sm font-bold ${colorClass}`}>
        {value}
      </span>
    </div>);
};
