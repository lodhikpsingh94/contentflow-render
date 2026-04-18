import SecureStorage from './utils/SecureStorage';

class BannerCache {
    constructor() {
        this.storage = new SecureStorage('banner_cache');
    }
    
    storeBanners(placementId, banners) {
        const cacheKey = `banners_${placementId}`;
        this.storage.setItem(cacheKey, JSON.stringify(banners));
        this.storage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    }
    
    getBanners(placementId, cacheTTL = 360) { // Default to 1 hour
        const cacheKey = `banners_${placementId}`;
        const serialized = this.storage.getItem(cacheKey);
        if (!serialized) return null;
        
        // Check if cache is stale based on the provided TTL
        const lastUpdated = parseInt(this.storage.getItem(`${cacheKey}_timestamp`) || '0');
        if (Date.now() - lastUpdated > cacheTTL) {
            console.log(`Cache for ${placementId} is stale.`);
            return null;
        }
        
        try {
            return JSON.parse(serialized);
        } catch (e) {
            console.error("Failed to parse cached banners.", e);
            return null;
        }
    }
    
    clear() {
        this.storage.clear();
    }
}

export default BannerCache;