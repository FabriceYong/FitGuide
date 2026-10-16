'use client';

import React, { useState, useEffect } from 'react';
import { Heart, PlayCircle, Loader, Lock } from 'lucide-react';
import { getFavorites } from '../../../services/favoriteService';
import { useAuth } from '../../../contexts/AuthContext';
import { useWorkoutImage } from '../../../hooks/useWorkoutImage';

export const FavoritesTab = ({ onSelectWorkout }) => {
    const [favoriteWorkouts, setFavoriteWorkouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { hasAccount: isLoggedIn } = useAuth();

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            setLoading(true);
            setError(null);
            const favorites = await getFavorites();
            setFavoriteWorkouts(favorites);
        } catch (err) {
            console.error('Error loading favorites:', err);
            setError(err.message || 'Failed to load favorite workouts');
        } finally {
            setLoading(false);
        }
    };

    const getCategoryColor = (category) => {
        const colorMap = {
            Yoga: '#3E25F5',
            Strength: '#A855F7',
            Cardio: '#EF4444',
            HIIT: '#F59E0B',
            Stretching: '#10B981',
            Pilates: '#EC4899',
            Core: '#8B5CF6',
            'Full Body': '#06B6D4',
            'Upper Body': '#F97316',
            'Lower Body': '#84CC16',
        };
        return colorMap[category] || '#00C4B4';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 text-lime-light animate-spin" />
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="text-center py-20 space-y-4">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                    <Lock className="w-10 h-10 text-white-50" />
                </div>
                <h3 className="text-xl font-bold text-white">Log In to See Your Favorites</h3>
                <p className="text-white-70 max-w-xs mx-auto text-sm">
                    Sign in to your account to save and view your favorite workouts here.
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <Heart className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-white-70">{error}</p>
            </div>
        );
    }

    if (favoriteWorkouts.length === 0) {
        return (
            <div className="text-center py-12">
                <Heart className="w-16 h-16 text-white-30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Favorites Yet</h3>
                <p className="text-white-70 mb-6">
                    Start adding workouts to your favorites by clicking the heart icon
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="text-left">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
                    Favorite Workouts
                </h1>
                <p className="text-sm text-white-70">
                    {favoriteWorkouts.length} workout{favoriteWorkouts.length !== 1 ? 's' : ''} saved
                </p>
            </div>

            {/* Favorites Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteWorkouts.map((workout) => {
                    const color = getCategoryColor(workout.category);
                    return (
                        <FavoriteWorkoutCard
                            key={workout.slug}
                            workout={workout}
                            color={color}
                            onSelect={() => onSelectWorkout(workout.slug, color)}
                        />
                    );
                })}
            </div>
        </div>
    );
};

const FavoriteWorkoutCard = ({ workout, color, onSelect }) => {
    const { imageUrl, isLoading, photographer, photographerUrl } = useWorkoutImage({
        workoutId: workout._id || workout.id,
        category: workout.category,
        title: workout.title,
        size: 'small',
        useDynamicImages: true,
    });

    return (
        <div
            onClick={onSelect}
            className="rounded-2xl overflow-hidden cursor-pointer transition-all border-2"
            style={{
                backgroundColor: `${color}15`,
                borderColor: `${color}30`,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 8px 32px ${color}60`;
                e.currentTarget.style.borderColor = `${color}60`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = `${color}30`;
            }}
        >
            {/* Workout Image/Banner */}
            <div
                className="h-32 flex items-center justify-center relative bg-cover bg-center transition-opacity duration-500"
                style={{
                    backgroundImage: `url(${imageUrl})`,
                    opacity: isLoading ? 0.5 : 1,
                }}
            >
                <div className="absolute inset-0" style={{ backgroundColor: `${color}70` }}></div>

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-5">
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Photographer Attribution */}
                {photographer && photographerUrl && (
                    <a
                        href={photographerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-1 left-1 z-10 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[8px] text-white/80 hover:text-white transition-colors"
                    >
                        {photographer}
                    </a>
                )}

                <div className="absolute top-3 right-3 z-10">
                    <div className="w-8 h-8 rounded-full bg-red-500/90 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white fill-white" />
                    </div>
                </div>
            </div>

            {/* Workout Info */}
            <div className="p-4 bg-obsidian-wave/80 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                        <h3 className="font-bold text-white leading-tight mb-1 line-clamp-2">
                            {workout.title}
                        </h3>
                        <p className="text-xs text-white-70">{workout.category}</p>
                    </div>
                    <PlayCircle className="w-6 h-6 text-lime-light opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-white-50 mt-3">
                    <span>{workout.duration} min</span>
                    <span>•</span>
                    <span>{workout.difficulty}</span>
                    <span>•</span>
                    <span>{workout.calories} cal</span>
                </div>
            </div>
        </div>
    );
};
