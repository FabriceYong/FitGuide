'use client';

/**
 * useWorkoutImage Hook
 * Manages dynamic workout image loading with caching
 */
import { useState, useEffect } from 'react';
import { getUnsplashWorkoutImage } from '../services/unsplashService';
import { getWorkoutSpecificImage } from '../utils/unsplashImages';
/**
 * Hook to get workout image with dynamic loading and caching
 */
export const useWorkoutImage = ({ workoutId, category, title, size = 'medium', customImageUrl = null, useDynamicImages = true, }) => {
    const [imageData, setImageData] = useState({
        imageUrl: getWorkoutSpecificImage(title, category, size, customImageUrl),
        isLoading: false,
        error: false,
    });
    useEffect(() => {
        // If custom image provided, use it
        if (customImageUrl) {
            setImageData({
                imageUrl: customImageUrl,
                isLoading: false,
                error: false,
            });
            return;
        }
        // If dynamic images disabled, use fallback
        if (!useDynamicImages) {
            setImageData({
                imageUrl: getWorkoutSpecificImage(title, category, size),
                isLoading: false,
                error: false,
            });
            return;
        }
        // Fetch dynamic image from Unsplash
        let isMounted = true;
        const loadImage = async () => {
            setImageData(prev => ({ ...prev, isLoading: true }));
            try {
                const result = await getUnsplashWorkoutImage(workoutId, category, title, size);
                if (!isMounted)
                    return;
                if (result) {
                    setImageData({
                        imageUrl: result.imageUrl,
                        photographer: result.photographer,
                        photographerUrl: result.photographerUrl,
                        photoUrl: result.photoUrl,
                        isLoading: false,
                        error: false,
                    });
                }
                else {
                    // Fallback to static image
                    setImageData({
                        imageUrl: getWorkoutSpecificImage(title, category, size),
                        isLoading: false,
                        error: false,
                    });
                }
            }
            catch (error) {
                console.error('Error loading workout image:', error);
                if (!isMounted)
                    return;
                // Fallback to static image
                setImageData({
                    imageUrl: getWorkoutSpecificImage(title, category, size),
                    isLoading: false,
                    error: true,
                });
            }
        };
        loadImage();
        return () => {
            isMounted = false;
        };
    }, [workoutId, category, title, size, customImageUrl, useDynamicImages]);
    return imageData;
};
