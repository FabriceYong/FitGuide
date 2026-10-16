'use client';

/**
 * Hero Carousel Service
 * Manages hero slides with Unsplash images and localStorage caching
 */
const CACHE_KEY = 'hero_carousel_slides';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
/**
 * Default slides configuration
 */
const defaultSlides = [
    {
        id: 'slide-1',
        title: 'Ready to Transform Your Fitness Journey?',
        subtitle: 'Personalized workouts, expert guidance, and real results. Start your transformation today.',
        searchQuery: 'fitness transformation motivation',
        dominantColor: '#00C4B4',
        ctaPrimary: { text: 'Start Workout', action: 'start-workout' },
        ctaSecondary: { text: 'Explore Library', action: 'explore' },
    },
    {
        id: 'slide-2',
        title: 'Build Strength, Gain Confidence',
        subtitle: 'Progressive strength training programs designed for all fitness levels.',
        searchQuery: 'strength training gym workout',
        dominantColor: '#3E25F5',
        ctaPrimary: { text: 'View Programs', action: 'explore' },
        ctaSecondary: { text: 'Learn More', action: 'about' },
    },
    {
        id: 'slide-3',
        title: 'Achieve Your Wellness Goals',
        subtitle: 'Track progress, set goals, and celebrate your fitness milestones.',
        searchQuery: 'yoga wellness meditation peaceful',
        dominantColor: '#10B981',
        ctaPrimary: { text: 'Track Progress', action: 'progress' },
        ctaSecondary: { text: 'Set Goals', action: 'profile' },
    },
    {
        id: 'slide-4',
        title: 'Join Our Fitness Community',
        subtitle: 'Connect with thousands of members on their fitness journey.',
        searchQuery: 'group fitness community together',
        dominantColor: '#EF4444',
        ctaPrimary: { text: 'Join Now', action: 'community' },
        ctaSecondary: { text: 'Success Stories', action: 'testimonials' },
    },
];
/**
 * Extract dominant color from image URL (simplified - uses predefined)
 * In production, this would analyze the actual image
 */
const extractDominantColor = (_imageUrl, defaultColor) => {
    // For now, return the predefined color
    // In production, you'd use a library like vibrant.js or color-thief
    return defaultColor;
};
/**
 * Fetch image from Unsplash
 */
const fetchUnsplashImage = async (query) => {
    if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'demo') {
        console.warn('Unsplash API key not configured for hero carousel');
        return null;
    }
    try {
        const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`;
        const response = await fetch(url);
        if (!response.ok)
            return null;
        const photo = await response.json();
        // Trigger download event
        if (photo.links) {
            fetch(`${photo.links.html}/download?client_id=${UNSPLASH_ACCESS_KEY}`, {
                method: 'GET',
            }).catch(() => { });
        }
        return photo;
    }
    catch (error) {
        console.error('Error fetching Unsplash image:', error);
        return null;
    }
};
/**
 * Check if cache is valid
 */
const isCacheValid = () => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached)
            return false;
        const data = JSON.parse(cached);
        return Date.now() - data.timestamp < CACHE_DURATION;
    }
    catch {
        return false;
    }
};
/**
 * Get cached slides
 */
const getCachedSlides = () => {
    try {
        if (!isCacheValid())
            return null;
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached)
            return null;
        const data = JSON.parse(cached);
        console.log('[Hero Carousel] Using cached slides');
        return data.slides;
    }
    catch {
        return null;
    }
};
/**
 * Cache slides
 */
const cacheSlides = (slides) => {
    try {
        const data = {
            slides,
            timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        console.log('[Hero Carousel] Slides cached successfully');
    }
    catch (error) {
        console.warn('[Hero Carousel] Failed to cache slides:', error);
    }
};
/**
 * Fetch and build all hero slides
 */
export const getHeroSlides = async () => {
    // Check cache first
    const cached = getCachedSlides();
    if (cached)
        return cached;
    console.log('[Hero Carousel] Fetching fresh slides from Unsplash');
    // Fetch images for each slide
    const slidesPromises = defaultSlides.map(async (config) => {
        const photo = await fetchUnsplashImage(config.searchQuery);
        const slide = {
            id: config.id,
            title: config.title,
            subtitle: config.subtitle,
            imageUrl: photo
                ? photo.urls.regular
                : `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80`, // Fallback
            dominantColor: photo
                ? extractDominantColor(photo.urls.regular, config.dominantColor)
                : config.dominantColor,
            photographer: photo?.user.name,
            photographerUrl: photo?.user.links.html,
            ctaPrimary: config.ctaPrimary,
            ctaSecondary: config.ctaSecondary,
        };
        return slide;
    });
    const slides = await Promise.all(slidesPromises);
    // Cache the results
    cacheSlides(slides);
    return slides;
};
/**
 * Clear carousel cache
 */
export const clearCarouselCache = () => {
    localStorage.removeItem(CACHE_KEY);
    console.log('[Hero Carousel] Cache cleared');
};
/**
 * Preload images in the background
 */
export const preloadSlideImages = (slides) => {
    slides.forEach((slide) => {
        const img = new Image();
        img.src = slide.imageUrl;
    });
    console.log('[Hero Carousel] Images preloading in background');
};
