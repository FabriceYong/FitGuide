/**
 * Image Caching Utility
 * Manages image preloading and caching for better performance
 */
class ImageCache {
    cache = new Map();
    CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    /**
     * Preload an image and cache it
     */
    async preload(url) {
        // Check if already cached and not expired
        const cached = this.cache.get(url);
        if (cached && cached.loaded && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.cache.set(url, {
                    url,
                    loaded: true,
                    timestamp: Date.now(),
                });
                resolve();
            };
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${url}`));
            };
            img.src = url;
        });
    }
    /**
     * Preload multiple images
     */
    async preloadBatch(urls) {
        await Promise.allSettled(urls.map(url => this.preload(url)));
    }
    /**
     * Check if an image is cached
     */
    isCached(url) {
        const cached = this.cache.get(url);
        if (!cached)
            return false;
        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
            this.cache.delete(url);
            return false;
        }
        return cached.loaded;
    }
    /**
     * Clear expired cache entries
     */
    clearExpired() {
        const now = Date.now();
        for (const [url, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.CACHE_DURATION) {
                this.cache.delete(url);
            }
        }
    }
    /**
     * Clear all cache
     */
    clearAll() {
        this.cache.clear();
    }
    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }
}
// Singleton instance
export const imageCache = new ImageCache();
// Clear expired cache every hour
setInterval(() => {
    imageCache.clearExpired();
}, 60 * 60 * 1000);
