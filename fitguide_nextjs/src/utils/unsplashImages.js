/**
 * Unsplash Image Utility
 * Provides workout category-specific background images from Unsplash
 */
// Unsplash API configuration
// Sign up at https://unsplash.com/developers to get your API key
export const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || 'demo';
// Workout category to search query mapping
export const CATEGORY_IMAGE_QUERIES = {
    'HIIT': 'hiit workout high intensity',
    'Yoga': 'yoga practice meditation',
    'Strength': 'strength training weightlifting gym',
    'Cardio': 'cardio running fitness',
    'Pilates': 'pilates reformer exercise',
    'Core': 'core workout abs fitness',
    'Stretching': 'stretching flexibility yoga',
    'Full Body': 'full body workout fitness',
    'Upper Body': 'upper body workout gym',
    'Lower Body': 'leg workout squat fitness',
    'CrossFit': 'crossfit functional fitness',
    'Dance': 'dance fitness zumba',
    'Martial Arts': 'martial arts training',
    'Swimming': 'swimming pool exercise',
};
// Fallback images for each category (in case API fails or no key provided)
const FALLBACK_IMAGES = {
    'HIIT': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop',
    'Yoga': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop',
    'Strength': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop',
    'Cardio': 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&h=600&fit=crop',
    'Pilates': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop',
    'Core': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
    'Stretching': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop',
    'Full Body': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&h=600&fit=crop',
    'Upper Body': 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&h=600&fit=crop',
    'Lower Body': 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=800&h=600&fit=crop',
    'CrossFit': 'https://images.unsplash.com/photo-1517836477839-7072aaa8b121?w=800&h=600&fit=crop',
    'Dance': 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&h=600&fit=crop',
    'Martial Arts': 'https://images.unsplash.com/photo-1555597408-26bc8e548a46?w=800&h=600&fit=crop',
    'Swimming': 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800&h=600&fit=crop',
};
/**
 * Get a workout background image URL for a given category
 * @param category - Workout category (e.g., 'HIIT', 'Yoga', 'Strength')
 * @param size - Image size: 'small' (400x300), 'medium' (800x600), 'large' (1200x900)
 * @returns Image URL
 */
export const getWorkoutImageUrl = (category, size = 'medium') => {
    // Use fallback images for reliable, fast loading
    const dimensions = {
        small: 'w=400&h=300',
        medium: 'w=800&h=600',
        large: 'w=1200&h=900',
    };
    const fallbackUrl = FALLBACK_IMAGES[category] || FALLBACK_IMAGES['HIIT'];
    // Replace the existing size parameters with the requested size
    return fallbackUrl.replace(/w=\d+&h=\d+/, dimensions[size]);
};
/**
 * Get multiple random images for a category (for variety)
 * @param category - Workout category
 * @param count - Number of images to return
 * @returns Array of image URLs
 */
export const getWorkoutImageVariations = (category, count = 3) => {
    const baseUrl = getWorkoutImageUrl(category);
    // Add random seed to get variations
    return Array.from({ length: count }, (_, i) => `${baseUrl}&sig=${category}-${i}`);
};
/**
 * Preload an image for better UX
 * @param url - Image URL to preload
 */
export const preloadImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
    });
};
/**
 * Get attribution text for Unsplash
 */
export const getUnsplashAttribution = () => {
    return 'Photos from Unsplash';
};
/**
 * Get workout-specific image based on title and category
 * Provides more specific images when possible
 * @param title - Workout title
 * @param category - Workout category
 * @param size - Image size
 * @param customImageUrl - Optional custom image URL from user
 */
export const getWorkoutSpecificImage = (title, category, size = 'medium', customImageUrl) => {
    // Use custom image if provided
    if (customImageUrl) {
        return customImageUrl;
    }
    const lowerTitle = title.toLowerCase();
    // Specific workout type detection
    if (lowerTitle.includes('tabata') || lowerTitle.includes('hiit')) {
        return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&h=600&fit=crop';
    }
    if (lowerTitle.includes('yoga') || lowerTitle.includes('sun salutation')) {
        return 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop';
    }
    if (lowerTitle.includes('core') || lowerTitle.includes('abs')) {
        return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop';
    }
    if (lowerTitle.includes('pilates')) {
        return 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop';
    }
    if (lowerTitle.includes('strength') || lowerTitle.includes('weight')) {
        return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop';
    }
    if (lowerTitle.includes('cardio') || lowerTitle.includes('running')) {
        return 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&h=600&fit=crop';
    }
    // Fall back to category-based image
    return getWorkoutImageUrl(category, size);
};
