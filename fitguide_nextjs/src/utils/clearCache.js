'use client';

/**
 * Utility to clear Unsplash image cache
 * This removes all cached images so fresh images can be fetched with new queries
 */
const CACHE_KEY_PREFIX = 'unsplash_workout_';
const CACHE_TIMESTAMP_PREFIX = 'unsplash_timestamp_';
/**
 * Clear all cached Unsplash images from localStorage
 */
export const clearUnsplashCache = () => {
    try {
        const keys = Object.keys(localStorage);
        let clearedCount = 0;
        keys.forEach(key => {
            if (key.startsWith(CACHE_KEY_PREFIX) || key.startsWith(CACHE_TIMESTAMP_PREFIX)) {
                localStorage.removeItem(key);
                clearedCount++;
            }
        });
        console.log(`[Cache Cleared] Removed ${clearedCount} cached entries`);
        alert(`✅ Cache cleared! ${clearedCount} cached images removed.\n\nRefresh the page to fetch new images.`);
    }
    catch (error) {
        console.error('[Cache Clear Error]', error);
        alert('❌ Error clearing cache. Please check console.');
    }
};
/**
 * Get cache statistics
 */
export const getCacheInfo = () => {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
    let totalSize = 0;
    cacheKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
            totalSize += value.length;
        }
    });
    // Convert bytes to KB
    const sizeKB = (totalSize / 1024).toFixed(2);
    return {
        total: cacheKeys.length,
        size: `${sizeKB} KB`
    };
};
// Make it available globally for easy access from browser console
if (typeof window !== 'undefined') {
    window.clearUnsplashCache = clearUnsplashCache;
    window.getCacheInfo = getCacheInfo;
    console.log('[Cache Utils] Type clearUnsplashCache() in console to clear image cache');
}
