'use client';

import axios from 'axios';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const getAuthHeader = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Check if user has a valid auth token
 */
export const isAuthenticated = () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
};

/**
 * Get user's favorite workouts — returns [] if not authenticated
 */
export const getFavorites = async () => {
    if (!isAuthenticated()) return [];
    try {
        const response = await axios.get(`${API_URL}/favorites`, {
            headers: getAuthHeader(),
        });
        return response.data.favorites || [];
    } catch (error) {
        if (error.response?.status === 401) return [];
        console.error('Error fetching favorites:', error.response?.data || error.message);
        return [];
    }
};

/**
 * Add a workout to favorites
 */
export const addToFavorites = async (workoutId) => {
    try {
        const response = await axios.post(`${API_URL}/favorites/${workoutId}`, {}, {
            headers: getAuthHeader(),
        });
        return response.data.favorites || [];
    } catch (error) {
        if (error.response?.status === 401) return [];
        console.error('Error adding to favorites:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Remove a workout from favorites
 */
export const removeFromFavorites = async (workoutId) => {
    try {
        const response = await axios.delete(`${API_URL}/favorites/${workoutId}`, {
            headers: getAuthHeader(),
        });
        return response.data.favorites || [];
    } catch (error) {
        if (error.response?.status === 401) return [];
        console.error('Error removing from favorites:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Check if a workout is in favorites
 */
export const checkIsFavorite = async (workoutId) => {
    if (!isAuthenticated()) return false;
    try {
        const response = await axios.get(`${API_URL}/favorites/check/${workoutId}`, {
            headers: getAuthHeader(),
        });
        return response.data.isFavorite || false;
    } catch (error) {
        return false;
    }
};
