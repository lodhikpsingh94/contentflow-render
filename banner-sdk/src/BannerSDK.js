import BannerCache from './BannerCache';
import NetworkClient from './NetworkClient';
import EventTracker from './EventTracker';
import DeviceInfoCollector from './utils/DeviceInfoCollector';
import UserManager from './managers/UserManager';
import SessionManager from './utils/SessionManager'; // <--- ADDED THIS IMPORT

class BannerSDK {
    static instance = null;

    static initialize(config) {
        if (BannerSDK.instance) {
            console.warn("BannerSDK already initialized.");
            return BannerSDK.instance;
        }
        BannerSDK.instance = new BannerSDK(config);
        return BannerSDK.instance;
    }

    static getInstance() {
        if (!BannerSDK.instance) {
            throw new Error("BannerSDK not initialized. Call initialize() first.");
        }
        return BannerSDK.instance;
    }

    constructor(config) {
        if (!config.tenantId) throw new Error("BannerSDK: tenantId is required");

        this.config = {
            tenantId: config.tenantId,
            apiKey: config.apiKey,
            authToken: config.authToken,
            endpoint: config.endpoint || 'http://localhost:3000',
            cachePolicy: config.cachePolicy || 'AGGRESSIVE',
            cacheTTL: config.cacheTTL || 3600000,
            analyticsSamplingRate: config.analyticsSamplingRate || 1.0,
            flushInterval: config.flushInterval || 30000,
            batchSize: config.batchSize || 10
        };
        
        // Initialize Helpers
        this.persistentCache = new BannerCache();
        this.networkClient = new NetworkClient(this.config);
        this.eventTracker = new EventTracker(this.config);
        this.memoryCache = new Map();
        
        this.deviceInfoCollector = DeviceInfoCollector;
        this.userManager = UserManager;
        this.sessionManager = SessionManager; // Attach for easy debugging
    }

    identify(userId, userToken = null) {
        UserManager.setUserId(userId);
        if (userToken) {
            this.config.authToken = userToken;
        }
        this.persistentCache.clear();
        this.memoryCache.clear();
    }

    async getActiveBanners(placementId, forceRefresh = false) {
        const cacheKey = `banners_${placementId}`;

        // 1. Memory Cache
        const memoryCached = this.memoryCache.get(cacheKey);
        if (!forceRefresh && memoryCached && (Date.now() - memoryCached.timestamp < this.config.cacheTTL)) {
            return memoryCached.data;
        }

        // 2. Persistent Cache
        if (!forceRefresh) {
            const persistentCached = this.persistentCache.getBanners(placementId, this.config.cacheTTL);
            if (persistentCached) {
                this.memoryCache.set(cacheKey, { data: persistentCached, timestamp: Date.now() });
                return persistentCached;
            }
        }

        // 3. Network
        return await this.fetchAndCacheBanners(placementId);
    }

    async fetchAndCacheBanners(placementId) {
        const userContext = {
            userId: UserManager.getUserId(),
            deviceInfo: DeviceInfoCollector.getDeviceInfo(),
            location: {}, 
            customContext: {} 
        };

        const banners = await this.networkClient.fetchBanners(placementId, userContext);

        if (banners) {
            const cacheData = { data: banners, timestamp: Date.now() };
            this.memoryCache.set(`banners_${placementId}`, cacheData);
            this.persistentCache.storeBanners(placementId, banners);
            return banners;
        }
        
        return this.getStaleCache(placementId);
    }

    getStaleCache(placementId) {
        if (this.config.cachePolicy === 'AGGRESSIVE') {
            const stale = this.persistentCache.getBanners(placementId, Infinity);
            return stale || [];
        }
        return [];
    }

    /**
     * Evaluates and returns matching campaigns for the given placement and user context.
     * @param {string} placementId - e.g. 'dashboard_top', 'home_fullscreen'
     * @param {object} options - { segments, attributes, forceRefresh }
     */
    async getActiveCampaigns(placementId, options = {}) {
        const cacheKey = `campaigns_${placementId}`;

        if (!options.forceRefresh) {
            const memoryCached = this.memoryCache.get(cacheKey);
            if (memoryCached && (Date.now() - memoryCached.timestamp < 60000)) { // 1-min TTL for campaigns
                return memoryCached.data;
            }
        }

        const userContext = {
            userId: UserManager.getUserId(),
            deviceInfo: DeviceInfoCollector.getDeviceInfo(),
            location: options.location || {},
            customContext: options.customContext || {},
            segments: options.segments || [],
            attributes: options.attributes || {},
        };

        const campaigns = await this.networkClient.fetchCampaigns(placementId, userContext);

        if (campaigns && campaigns.length >= 0) {
            this.memoryCache.set(cacheKey, { data: campaigns, timestamp: Date.now() });
        }

        return campaigns || [];
    }

    /**
     * Requests Web Push notification permission from the browser.
     * Returns 'granted', 'denied', or 'default'.
     */
    async requestPushPermission() {
        if (!('Notification' in window)) {
            console.warn('BannerSDK: This browser does not support desktop notifications.');
            return 'unsupported';
        }

        if (Notification.permission === 'granted') {
            return 'granted';
        }

        if (Notification.permission === 'denied') {
            return 'denied';
        }

        try {
            const permission = await Notification.requestPermission();
            return permission;
        } catch (err) {
            console.error('BannerSDK: Failed to request push permission:', err);
            return 'error';
        }
    }

    /**
     * Shows a browser push notification.
     * @param {object} opts - { title, body, icon, campaignId }
     */
    showPushNotification(opts = {}) {
        if (Notification.permission !== 'granted') {
            console.warn('BannerSDK: Push permission not granted.');
            return null;
        }

        const { title = 'Notification', body = '', icon = '', campaignId } = opts;
        const notification = new Notification(title, { body, icon });

        notification.onclick = () => {
            if (campaignId) {
                this.trackEvent('click', campaignId, { source: 'push_notification' });
            }
            window.focus();
            notification.close();
        };

        if (campaignId) {
            this.trackEvent('impression', campaignId, { source: 'push_notification' });
        }

        return notification;
    }

    async trackEvent(eventType, bannerId, additionalData = {}) {
        return this.eventTracker.trackEvent({
            eventType,
            contentId: bannerId,
            userId: UserManager.getUserId(),
            deviceInfo: DeviceInfoCollector.getDeviceInfo(),
            
            // This line was causing the error because SessionManager wasn't imported
            sessionId: SessionManager.getSessionId(), 
            
            ...additionalData
        });
    }
}

export default BannerSDK;