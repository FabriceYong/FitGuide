'use client';

/**
 * Unsplash API Service
 * Fetches images from Unsplash API with intelligent caching
 */
import { imageCache } from '../utils/imageCache';
const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_BASE = 'https://api.unsplash.com';
// Local storage keys
const CACHE_KEY_PREFIX = 'unsplash_workout_';
const CACHE_TIMESTAMP_PREFIX = 'unsplash_timestamp_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
/**
 * Get search query from workout title
 * Extracts key terms from workout titles to create specific search queries
 */
const getSearchQuery = (category, title) => {
    // Words to remove (filler words)
    const fillerWords = [
        'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'to', 'in', 'on', 'at',
        'workout', 'training', 'session', 'routine', 'circuit', 'program', 'challenge',
        'beginner', 'intermediate', 'advanced', 'full', 'complete', 'total', 'ultimate',
        'minute', 'minutes', 'min', 'hour', 'hours', 'day', 'week'
    ];
    // Extract keywords from title
    const titleWords = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .split(/[\s-]+/) // Split by spaces and hyphens
        .filter(word => word.length > 2) // Remove very short words
        .filter(word => !fillerWords.includes(word)) // Remove filler words
        .filter(word => !/^\d+$/.test(word)); // Remove pure numbers (like "30", "20")
    // If we have meaningful keywords from the title, use them
    if (titleWords.length > 0) {
        // Take first 2-3 most relevant words and add fitness context
        const keywords = titleWords.slice(0, 3).join(' ');
        return `${keywords} fitness exercise`;
    }
    // Fallback to category-based queries if title parsing fails
    const categoryQueries = {
        'HIIT': 'hiit workout high intensity',
        'Yoga': 'yoga practice meditation zen',
        'Strength': 'strength training gym equipment',
        'Cardio': 'cardio exercise running',
        'Pilates': 'pilates reformer fitness',
        'Core': 'core abs workout',
        'Stretching': 'stretching flexibility yoga',
        'Full Body': 'full body workout fitness',
        'Upper Body': 'upper body workout gym',
        'Lower Body': 'leg workout squat',
        'CrossFit': 'crossfit functional fitness',
        'Dance': 'dance fitness aerobics',
        'Martial Arts': 'martial arts training',
        'Swimming': 'swimming pool exercise',
    };
    return categoryQueries[category] || 'fitness workout exercise';
};
/**
 * Check if cached image is still valid
 */
const isCacheValid = (cacheKey) => {
    const timestampKey = CACHE_TIMESTAMP_PREFIX + cacheKey;
    const timestamp = localStorage.getItem(timestampKey);
    if (!timestamp)
        return false;
    const cacheTime = parseInt(timestamp, 10);
    return Date.now() - cacheTime < CACHE_DURATION;
};
/**
 * Get cached image data
 */
const getCachedImage = (cacheKey) => {
    if (!isCacheValid(cacheKey)) {
        // Clean up expired cache
        localStorage.removeItem(CACHE_KEY_PREFIX + cacheKey);
        localStorage.removeItem(CACHE_TIMESTAMP_PREFIX + cacheKey);
        return null;
    }
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + cacheKey);
    if (!cached)
        return null;
    try {
        return JSON.parse(cached);
    }
    catch {
        return null;
    }
};
/**
 * Cache image data
 */
const cacheImageData = (cacheKey, data) => {
    try {
        localStorage.setItem(CACHE_KEY_PREFIX + cacheKey, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_PREFIX + cacheKey, Date.now().toString());
    }
    catch (error) {
        console.warn('Failed to cache image data:', error);
    }
};
/**
 * Fetch image from Unsplash API
 */
const fetchFromUnsplash = async (query, orientation = 'landscape') => {
    if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'demo') {
        console.warn('Unsplash API key not configured');
        return null;
    }
    try {
        const url = `${UNSPLASH_API_BASE}/photos/random?query=${encodeURIComponent(query)}&orientation=${orientation}&client_id=${UNSPLASH_ACCESS_KEY}`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Unsplash API error:', response.status, response.statusText);
            return null;
        }
        const photo = await response.json();
        // Trigger a download event (Unsplash API guidelines)
        if (photo.links) {
            fetch(`${photo.links.html}/download?client_id=${UNSPLASH_ACCESS_KEY}`, { method: 'GET' }).catch(() => { });
        }
        return photo;
    }
    catch (error) {
        console.error('Error fetching from Unsplash:', error);
        return null;
    }
};
/**
 * Get workout image from Unsplash with caching
 */
export const getUnsplashWorkoutImage = async (workoutId, category, title, size = 'medium') => {
    const cacheKey = `${category}_${workoutId}`;
    // Check cache first
    const cached = getCachedImage(cacheKey);
    if (cached) {
        console.log(`[Unsplash] Using cached image for: "${title}"`);
        // Preload the image
        imageCache.preload(cached.imageUrl);
        return cached;
    }
    // Fetch from API
    const query = getSearchQuery(category, title);
    console.log(`[Unsplash] Fetching image for: "${title}" | Query: "${query}"`);
    const photo = await fetchFromUnsplash(query, 'landscape');
    if (!photo) {
        // Silently return null - fallback images will be used
        return null;
    }
    // Determine image URL based on size
    const sizeMap = {
        small: photo.urls.small,
        medium: photo.urls.regular,
        large: photo.urls.full,
    };
    const imageData = {
        imageUrl: sizeMap[size],
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        photoUrl: photo.links.html,
        timestamp: Date.now(),
    };
    // Cache the result
    cacheImageData(cacheKey, imageData);
    // Preload the image
    imageCache.preload(imageData.imageUrl);
    console.log(`[Unsplash] Successfully fetched image by ${photo.user.name} for: "${title}"`);
    return imageData;
};
/**
 * Preload multiple workout images
 */
export const preloadWorkoutImages = async (workouts) => {
    const promises = workouts.map(workout => getUnsplashWorkoutImage(workout.id, workout.category, workout.title, 'small'));
    await Promise.allSettled(promises);
};
/**
 * Clear all cached Unsplash images
 */
export const clearUnsplashCache = () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX) || key.startsWith(CACHE_TIMESTAMP_PREFIX)) {
            localStorage.removeItem(key);
        }
    });
    console.log('Unsplash cache cleared');
};
/**
 * Get cache statistics
 */
export const getCacheStats = () => {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
    let expired = 0;
    let valid = 0;
    cacheKeys.forEach(key => {
        const cacheKey = key.replace(CACHE_KEY_PREFIX, '');
        if (isCacheValid(cacheKey)) {
            valid++;
        }
        else {
            expired++;
        }
    });
    return { total: cacheKeys.length, expired, valid };
};
