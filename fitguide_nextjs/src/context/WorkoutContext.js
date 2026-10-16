'use client';

/**
 * Workout Context
 * Global state management for workouts across the application
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchWorkouts } from '../services/workoutService';
const WorkoutContext = createContext(undefined);
export const WorkoutProvider = ({ children }) => {
    const [workouts, setWorkouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [initialized, setInitialized] = useState(false);
    // Initialize workouts on mount
    useEffect(() => {
        loadWorkouts();
    }, []);
    /**
     * Load workouts from the database
     */
    const loadWorkouts = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetchWorkouts();
            if (response.success && Array.isArray(response.workouts)) {
                setWorkouts(response.workouts);
                console.log(`✅ Loaded ${response.workouts.length} workouts`);
            }
            else {
                setError(response.message || 'Failed to load workouts');
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            console.warn('⚠️ WorkoutContext load error:', errorMessage);
        }
        finally {
            setLoading(false);
            setInitialized(true);
        }
    };
    /**
     * Refresh workouts from the database
     */
    const refreshWorkouts = async () => {
        await loadWorkouts();
    };
    /**
     * Filter workouts based on provided filters
     */
    const filterWorkouts = (filters) => {
        let filtered = [...workouts];
        if (filters.category) {
            filtered = filtered.filter(w => w.category === filters.category);
        }
        if (filters.difficulty) {
            filtered = filtered.filter(w => w.difficulty === filters.difficulty);
        }
        if (filters.intensity) {
            filtered = filtered.filter(w => w.intensity === filters.intensity);
        }
        if (filters.minDuration) {
            filtered = filtered.filter(w => w.duration >= filters.minDuration);
        }
        if (filters.maxDuration) {
            filtered = filtered.filter(w => w.duration <= filters.maxDuration);
        }
        if (filters.equipment) {
            filtered = filtered.filter(w => w.equipment.includes(filters.equipment));
        }
        if (filters.search) {
            const query = filters.search.toLowerCase();
            filtered = filtered.filter(w => w.title.toLowerCase().includes(query) ||
                w.description.toLowerCase().includes(query) ||
                w.shortDescription?.toLowerCase().includes(query) ||
                w.tags?.some(tag => tag.toLowerCase().includes(query)));
        }
        return filtered;
    };
    /**
     * Get a workout by its slug
     */
    const getWorkoutBySlug = (slug) => {
        return workouts.find(w => w.slug === slug);
    };
    /**
     * Get workouts by category
     */
    const getWorkoutsByCategory = (category) => {
        return workouts.filter(w => w.category === category);
    };
    /**
     * Get featured workouts (those with detailed steps)
     */
    const getFeaturedWorkouts = () => {
        return workouts.filter(w => w.steps && w.steps.length > 0);
    };
    /**
     * Get unique categories from loaded workouts
     */
    const categories = React.useMemo(() => {
        const uniqueCategories = new Set(workouts.map(w => w.category));
        return Array.from(uniqueCategories).sort();
    }, [workouts]);
    const value = {
        workouts,
        loading,
        error,
        categories,
        refreshWorkouts,
        filterWorkouts,
        getWorkoutBySlug,
        getWorkoutsByCategory,
        getFeaturedWorkouts,
        initialized,
    };
    return (<WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>);
};
/**
 * Custom hook to use the Workout Context
 */
export const useWorkouts = () => {
    const context = useContext(WorkoutContext);
    if (context === undefined) {
        throw new Error('useWorkouts must be used within a WorkoutProvider');
    }
    return context;
};
/**
 * Optional: Hook to get a single workout by slug
 */
export const useWorkout = (slug) => {
    const { getWorkoutBySlug } = useWorkouts();
    return getWorkoutBySlug(slug);
};
/**
 * Optional: Hook to get workouts by category
 */
export const useWorkoutsByCategory = (category) => {
    const { getWorkoutsByCategory } = useWorkouts();
    return getWorkoutsByCategory(category);
};
