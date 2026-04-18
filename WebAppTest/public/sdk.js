(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react')) :
    typeof define === 'function' && define.amd ? define(['exports', 'react'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.BannerSDKLibrary = {}, global.react));
})(this, (function (exports, react) { 'use strict';

    class SecureStorage {
        constructor(namespace) {
            this.namespace = namespace;
        }
        
        setItem(key, value) {
            const storageKey = `${this.namespace}_${key}`;
            try {
                localStorage.setItem(storageKey, value);
            } catch (e) {
                console.warn('LocalStorage not available, using memory storage');
                this.memoryStorage = this.memoryStorage || {};
                this.memoryStorage[storageKey] = value;
            }
        }
        
        getItem(key) {
            const storageKey = `${this.namespace}_${key}`;
            try {
                return localStorage.getItem(storageKey);
            } catch (e) {
                return this.memoryStorage ? this.memoryStorage[storageKey] : null;
            }
        }
        
        clear() {
            try {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(this.namespace)) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (e) {
                if (this.memoryStorage) {
                    Object.keys(this.memoryStorage).forEach(key => {
                        if (key.startsWith(this.namespace)) {
                            delete this.memoryStorage[key];
                        }
                    });
                }
            }
        }
    }

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

    class SessionManager {
        // 1. Initialize with null/primitive values to avoid startup errors
        static sessionId = null;
        static lastActivityTime = 0;
        
        // 2. Define the generator method
        static generateSessionId() {
            return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        }
        
        // 3. Lazy initialization logic
        static getSessionId() {
            const now = Date.now();

            // If no session exists, or it expired (30 mins), create a new one
            if (!this.sessionId || (now - this.lastActivityTime > 30 * 60 * 1000)) {
                this.sessionId = this.generateSessionId();
                
                // Optional: Persist to sessionStorage so it survives page reloads
                try { 
                    if (typeof sessionStorage !== 'undefined') {
                        sessionStorage.setItem('banner_session_id', this.sessionId);
                    }
                } catch(e) {
                    // Ignore storage errors (private mode, etc.)
                }
            }
            
            this.lastActivityTime = now;
            return this.sessionId;
        }
    }

    class NetworkClient {
        constructor(config) {
            this.config = config;
        }
        
        /**
         * Fetches banners from the API Service Orchestrator
         * Endpoint: POST /api/v1/content/deliver
         */
        async fetchBanners(placementId, userContext) {
            try {
                // Match the API Service route
                const url = `${this.config.endpoint}/api/v1/content/deliver`;
                
                // Construct payload matching api-service/src/models/request/get-content.request.ts
                const payload = {
                    placementId: placementId,
                    userId: userContext.userId,
                    deviceInfo: userContext.deviceInfo,
                    // Optional context fields
                    location: userContext.location || {},
                    context: userContext.customContext || {},
                    contentTypes: ['banner', 'video', 'popup'] 
                };

                // Headers required by api-service middlewares (TenantMiddleware, AuthMiddleware)
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Tenant-Id': this.config.tenantId,
                    'X-User-Id': userContext.userId,
                    'X-Request-ID': SessionManager.generateSessionId()
                };

                // Auth: Prefer Bearer token if provided, otherwise API Key
                if (this.config.authToken) {
                    headers['Authorization'] = `Bearer ${this.config.authToken}`;
                } else if (this.config.apiKey) {
                    headers['X-API-Key'] = this.config.apiKey;
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });
                
                if (response.ok) {
                    const json = await response.json();
                    // API Service returns { success: true, data: [...] }
                    // We return the inner data array
                    return json.success ? json.data : [];
                }
                
                console.warn(`Fetch banners failed with status: ${response.status}`);
                return null;
            } catch (error) {
                console.error('Network request failed:', error);
                return null;
            }
        }
        
        /**
         * Evaluates campaigns for a user context.
         * Endpoint: POST /api/v1/campaigns/evaluate
         */
        async fetchCampaigns(placementId, userContext) {
            try {
                const url = `${this.config.endpoint}/api/v1/campaigns/evaluate`;

                const deviceInfo = userContext.deviceInfo || {};
                const payload = {
                    userId: userContext.userId,
                    placementId: placementId,
                    // Send under both names so the evaluator can find it regardless
                    // of which field name it reads (device vs deviceInfo)
                    device: {
                        platform: deviceInfo.platform || 'web',
                        osVersion: deviceInfo.osVersion || '',
                        appVersion: deviceInfo.appVersion || '',
                        deviceModel: deviceInfo.deviceModel || '',
                    },
                    deviceInfo: deviceInfo,
                    // Only set location.country when we have a concrete value.
                    // An absent/empty country means "unknown" → the evaluator's
                    // tolerant geo check will pass the campaign through rather
                    // than blocking it for missing context.
                    location: (() => {
                        const country = userContext.location?.country
                            || userContext.attributes?.country
                            || '';
                        return country ? { country } : {};
                    })(),
                    context: userContext.customContext || {},
                    segments: userContext.segments || [],
                    attributes: {
                        ...(userContext.attributes || {}),
                        platform: deviceInfo.platform || 'web',
                        country: userContext.attributes?.country || userContext.location?.country || '',
                    },
                    timestamp: new Date().toISOString(),
                };

                const headers = {
                    'Content-Type': 'application/json',
                    'X-Tenant-Id': this.config.tenantId,
                    'X-User-Id': userContext.userId,
                };

                if (this.config.authToken) {
                    headers['Authorization'] = `Bearer ${this.config.authToken}`;
                } else if (this.config.apiKey) {
                    headers['X-API-Key'] = this.config.apiKey;
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    const json = await response.json();
                    if (!json.success) return [];
                    const payload = json.data;
                    // Handle flat array (fixed path) or residual double-wrap { success, data: [] }
                    if (Array.isArray(payload)) return payload;
                    if (payload && Array.isArray(payload.data)) return payload.data;
                    return [];
                }

                console.warn(`Fetch campaigns failed with status: ${response.status}`);
                return [];
            } catch (error) {
                console.error('fetchCampaigns network request failed:', error);
                return [];
            }
        }

        /**
         * Sends analytics events.
         * Endpoint: POST /api/v1/analytics/track/impression (or click)
         * OR batch endpoint if available. 
         * For now, we will assume we hit the batch endpoint on the Analytics Service via Gateway.
         */
        async sendAnalytics(events) {
            try {
                // Ideally your API Gateway should expose a batch endpoint. 
                // If strictly using the controllers provided:
                // You might need to loop here or ask the backend team to expose /analytics/events in api-service.
                // Assuming /api/v1/analytics/events is exposed:
                const url = `${this.config.endpoint}/api/v1/analytics/events`;
                
                const payload = {
                    events: events,
                    sdk_version: '1.0.0',
                    sent_at: Date.now()
                };

                const headers = {
                    'Content-Type': 'application/json',
                    'X-Tenant-Id': this.config.tenantId
                };

                if (this.config.authToken) {
                    headers['Authorization'] = `Bearer ${this.config.authToken}`;
                } else if (this.config.apiKey) {
                    headers['X-API-Key'] = this.config.apiKey;
                }
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });
                
                return response.ok;
            } catch (error) {
                console.error('Failed to send analytics:', error);
                return false;
            }
        }
    }

    class EventTracker {
        constructor(config) {
            this.config = config;
            this.networkClient = new NetworkClient(config);
            this.storage = new SecureStorage('analytics_queue');
            this.eventQueue = this.loadPendingEvents();
            this.flushTimeout = null;
        }
        
        trackEvent(event) {
            const fullEvent = {
                ...event,
                eventId: this.generateEventId(),
                timestamp: Date.now()
            };
            
            this.eventQueue.push(fullEvent);
            this.savePendingEvents();
            
            // --- USE CONFIGURABLE BATCH SIZE ---
            if (this.eventQueue.length >= this.config.batchSize) {
                console.log(`[SDK] Batch limit (${this.config.batchSize}) reached. Flushing...`);
                this.flushEvents();
            } else {
                this.scheduleFlush();
            }
        }
        
        async flushEvents() {
            if (this.eventQueue.length === 0) return;
            
            const eventsToSend = this.eventQueue.splice(0, 20);
            this.savePendingEvents();
            
            try {
                const success = await this.networkClient.sendAnalytics(eventsToSend);
                if (!success) {
                    // Requeue failed events
                    this.eventQueue.unshift(...eventsToSend);
                    this.savePendingEvents();
                }
            } catch (error) {
                console.error('Failed to send analytics:', error);
                this.eventQueue.unshift(...eventsToSend);
                this.savePendingEvents();
            }
        }
        
        scheduleFlush() {
            if (this.flushTimeout) {
                clearTimeout(this.flushTimeout);
            }
            // --- USE CONFIGURABLE INTERVAL ---
            this.flushTimeout = setTimeout(() => {
                console.log(`[SDK] Time limit (${this.config.flushInterval}ms) reached. Flushing...`);
                this.flushEvents();
            }, this.config.flushInterval);
        }
        
        loadPendingEvents() {
            try {
                const events = this.storage.getItem('pending_events');
                return events ? JSON.parse(events) : [];
            } catch (e) {
                return [];
            }
        }
        
        savePendingEvents() {
            this.storage.setItem('pending_events', JSON.stringify(this.eventQueue));
        }
        
        generateEventId() {
            return Math.random().toString(36).substring(2) + Date.now().toString(36);
        }
    }

    class DeviceInfoCollector {
        static getDeviceInfo() {
            return {
                platform: 'Web',
                osVersion: navigator.platform,
                deviceModel: navigator.userAgent,
                sdkVersion: '1.0.0',
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                networkType: this.getNetworkType(),
                locale: navigator.language
            };
        }
        
        static getNetworkType() {
            if ('connection' in navigator) {
                return navigator.connection.effectiveType || 'unknown';
            }
            return 'unknown';
        }
    }

    class UserManager {
        static prefs = new SecureStorage('user_prefs');
        static USER_ID_KEY = 'user_id';

        static initialize() {
            // Auto-initialize with default values if needed
            if (!this.getUserId()) {
                this.setUserId(this.generateUserId());
            }
        }

        static getUserId() {
            return this.prefs.getItem(this.USER_ID_KEY);
        }

        static setUserId(userId) {
            this.prefs.setItem(this.USER_ID_KEY, userId);
        }

        static generateUserId() {
            return 'user_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        }

        static clear() {
            this.prefs.clear();
        }

        static setUserProperties(properties) {
            this.prefs.setItem('user_properties', JSON.stringify(properties));
        }

        static getUserProperties() {
            try {
                const properties = this.prefs.getItem('user_properties');
                return properties ? JSON.parse(properties) : {};
            } catch {
                return {};
            }
        }

        static updateUserProperty(key, value) {
            const properties = this.getUserProperties();
            properties[key] = value;
            this.setUserProperties(properties);
        }
    }

    // Auto-initialize
    UserManager.initialize();

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

    class AnalyticsEvent {
        constructor({
            eventId = this.generateEventId(),
            eventType,
            timestamp = Date.now(),
            sessionId,
            userId = null,
            contentId = null,
            deviceInfo,
            eventData = {}
        }) {
            this.eventId = eventId;
            this.eventType = eventType;
            this.timestamp = timestamp;
            this.sessionId = sessionId;
            this.userId = userId;
            this.contentId = contentId;
            this.deviceInfo = deviceInfo;
            this.eventData = eventData;
        }

        generateEventId() {
            return Math.random().toString(36).substring(2) + Date.now().toString(36);
        }

        static get EventType() {
            return {
                BANNER_IMPRESSION: 'BANNER_IMPRESSION',
                BANNER_CLICK: 'BANNER_CLICK',
                VIDEO_PLAY: 'VIDEO_PLAY',
                VIDEO_COMPLETE: 'VIDEO_COMPLETE',
                POPUP_SHOWN: 'POPUP_SHOWN',
                POPUP_DISMISSED: 'POPUP_DISMISSED',
                PUSH_RECEIVED: 'PUSH_RECEIVED',
                PUSH_OPENED: 'PUSH_OPENED'
            };
        }

        static createDeviceInfo(platform, osVersion, deviceModel, sdkVersion, screenResolution, networkType, locale) {
            return {
                platform,
                osVersion,
                deviceModel,
                sdkVersion,
                screenResolution,
                networkType,
                locale
            };
        }
    }

    class NotificationManager {
        constructor(eventTracker) {
            this.eventTracker = eventTracker;
            this.notificationPermission = null;
            this.checkNotificationPermission();
        }

        async checkNotificationPermission() {
            if ('Notification' in window) {
                this.notificationPermission = Notification.permission;
                
                if (this.notificationPermission === 'default') {
                    this.notificationPermission = await Notification.requestPermission();
                }
            }
        }

        showPopup(popup) {
            // Track popup shown event
            this.eventTracker.trackEvent(
                new AnalyticsEvent({
                    eventType: AnalyticsEvent.EventType.POPUP_SHOWN,
                    sessionId: SessionManager.getSessionId(),
                    userId: UserManager.getUserId(),
                    contentId: popup.id,
                    deviceInfo: DeviceInfoCollector.getDeviceInfo()
                })
            );

            // Create and show popup UI
            this.createPopupUI(popup);
        }

        createPopupUI(popup) {
            // This would typically create a modal/dialog component
            // For now, we'll use a simple alert for demonstration
            const message = `${popup.title}\n\n${popup.message}`;
            
            if (popup.actions && popup.actions.length > 0) {
                // For multiple actions, we'd create a custom modal
                console.log('Popup message:', message);
                console.log('Actions:', popup.actions);
            } else {
                alert(message);
            }
        }

        async showPushNotification(title, message, bannerId = null, deepLink = null) {
            if (!('Notification' in window) || this.notificationPermission !== 'granted') {
                return false;
            }

            const notificationId = Math.random().toString(36).substring(2);

            try {
                const notification = new Notification(title, {
                    body: message,
                    icon: '/icon-192x192.png', // Default icon path
                    tag: bannerId || notificationId,
                    data: { deepLink, bannerId }
                });

                notification.onclick = () => {
                    this.handleNotificationClick(notification, bannerId);
                    notification.close();
                };

                // Track notification sent
                this.eventTracker.trackEvent(
                    new AnalyticsEvent({
                        eventType: AnalyticsEvent.EventType.PUSH_RECEIVED,
                        sessionId: SessionManager.getSessionId(),
                        userId: UserManager.getUserId(),
                        contentId: bannerId,
                        deviceInfo: DeviceInfoCollector.getDeviceInfo(),
                        eventData: {
                            notification_id: notificationId,
                            deep_link: deepLink
                        }
                    })
                );

                return true;
            } catch (error) {
                console.error('Failed to show notification:', error);
                return false;
            }
        }

        handleNotificationClick(notification, bannerId) {
            const { data } = notification;
            
            if (data.deepLink) {
                window.open(data.deepLink, '_blank');
            }

            // Track notification opened
            this.eventTracker.trackEvent(
                new AnalyticsEvent({
                    eventType: AnalyticsEvent.EventType.PUSH_OPENED,
                    sessionId: SessionManager.getSessionId(),
                    userId: UserManager.getUserId(),
                    contentId: bannerId,
                    deviceInfo: DeviceInfoCollector.getDeviceInfo(),
                    eventData: {
                        notification_id: notification.tag,
                        deep_link: data.deepLink
                    }
                })
            );
        }

        async requestNotificationPermission() {
            if (!('Notification' in window)) {
                return 'unsupported';
            }

            try {
                this.notificationPermission = await Notification.requestPermission();
                return this.notificationPermission;
            } catch (error) {
                console.error('Failed to request notification permission:', error);
                return 'denied';
            }
        }

        canShowNotifications() {
            return 'Notification' in window && this.notificationPermission === 'granted';
        }
    }

    class Banner {
        constructor({ id, campaignId, priority, startDate, endDate }) {
            this.id = id;
            this.campaignId = campaignId;
            this.priority = priority;
            this.startDate = new Date(startDate);
            this.endDate = new Date(endDate);
        }

        static createImageBanner({
            id,
            campaignId,
            priority,
            startDate,
            endDate,
            imageUrl,
            actionUrl = null,
            aspectRatio,
            title = '',
            description = '',
            openInNewTab = true
        }) {
            return {
                id,
                campaignId,
                priority,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                imageUrl,
                actionUrl,
                aspectRatio,
                title,
                description,
                openInNewTab,
                type: 'IMAGE_BANNER'
            };
        }

        static createVideoBanner({
            id,
            campaignId,
            priority,
            startDate,
            endDate,
            videoUrl,
            thumbnailUrl,
            autoPlay = false,
            muted = true,
            title = '',
            description = ''
        }) {
            return {
                id,
                campaignId,
                priority,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                videoUrl,
                thumbnailUrl,
                autoPlay,
                muted,
                title,
                description,
                type: 'VIDEO_BANNER'
            };
        }

        static createPopupMessage({
            id,
            campaignId,
            priority,
            startDate,
            endDate,
            title,
            message,
            imageUrl = null,
            actions = []
        }) {
            return {
                id,
                campaignId,
                priority,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                title,
                message,
                imageUrl,
                actions,
                type: 'POPUP_MESSAGE'
            };
        }

        static get ButtonStyle() {
            return {
                PRIMARY: 'PRIMARY',
                SECONDARY: 'SECONDARY',
                DESTRUCTIVE: 'DESTRUCTIVE'
            };
        }

        static createActionButton(text, actionUrl, style = 'PRIMARY') {
            return {
                text,
                actionUrl,
                style
            };
        }

        static isActive(banner) {
            const now = new Date();
            return now >= new Date(banner.startDate) && now <= new Date(banner.endDate);
        }

        static sortByPriority(banners) {
            return [...banners].sort((a, b) => b.priority - a.priority);
        }
    }

    class PushNotification {
        constructor({
            id,
            title,
            message,
            bannerId = null,
            deepLink = null,
            receivedAt = new Date(),
            read = false
        }) {
            this.id = id;
            this.title = title;
            this.message = message;
            this.bannerId = bannerId;
            this.deepLink = deepLink;
            this.receivedAt = new Date(receivedAt);
            this.read = read;
        }

        markAsRead() {
            this.read = true;
            return this;
        }

        static fromJSON(json) {
            return new PushNotification({
                ...json,
                receivedAt: new Date(json.receivedAt)
            });
        }

        toJSON() {
            return {
                id: this.id,
                title: this.title,
                message: this.message,
                bannerId: this.bannerId,
                deepLink: this.deepLink,
                receivedAt: this.receivedAt.toISOString(),
                read: this.read
            };
        }
    }

    class DeepLinkHandler {
        static open(url, target = '_blank') {
            try {
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    window.open(url, target);
                } else if (url.startsWith('mailto:')) {
                    window.location.href = url;
                } else if (url.startsWith('tel:')) {
                    window.location.href = url;
                } else {
                    console.warn('Unsupported URL scheme:', url);
                }
            } catch (error) {
                console.error('Failed to open deep link:', url, error);
            }
        }

        static isSupported(url) {
            const supportedSchemes = ['http:', 'https:', 'mailto:', 'tel:'];
            try {
                const parsedUrl = new URL(url);
                return supportedSchemes.includes(parsedUrl.protocol);
            } catch {
                return false;
            }
        }

        static getDomain(url) {
            try {
                const parsedUrl = new URL(url);
                return parsedUrl.hostname;
            } catch {
                return null;
            }
        }
    }

    class DateUtils {
        static SERVER_FORMAT = "yyyy-MM-dd'T'HH:mm:ss'Z'";

        static parseServerDate(dateString) {
            try {
                // Handle ISO format with timezone
                if (dateString.includes('Z')) {
                    return new Date(dateString);
                }
                // Handle without timezone (assume UTC)
                return new Date(dateString + 'Z');
            } catch (error) {
                console.error('Failed to parse date:', dateString, error);
                return null;
            }
        }

        static formatToServerDate(date) {
            try {
                return date.toISOString().split('.')[0] + 'Z';
            } catch (error) {
                console.error('Failed to format date:', date, error);
                return null;
            }
        }

        static isDateInRange(date, startDate, endDate) {
            const checkDate = new Date(date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return checkDate >= start && checkDate <= end;
        }

        static getDaysDifference(date1, date2) {
            const d1 = new Date(date1);
            const d2 = new Date(date2);
            const diffTime = Math.abs(d2 - d1);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        static formatRelativeTime(date) {
            const now = new Date();
            const diffMs = now - new Date(date);
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffSecs < 60) return 'just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            
            return new Date(date).toLocaleDateString();
        }
    }

    const useBannerSDK = (placementId, options = {}) => {
        const [banners, setBanners] = react.useState([]);
        const [loading, setLoading] = react.useState(false);
        const [error, setError] = react.useState(null);
        
        const { forceRefresh = false, autoRefresh = true, onBannersLoaded } = options;
        
        const loadBanners = react.useCallback(async (refresh = false) => {
            if (!BannerSDK.instance) {
                setError('BannerSDK not initialized');
                return;
            }
            
            setLoading(true);
            setError(null);
            
            try {
                const bannerList = await BannerSDK.getInstance().getActiveBanners(placementId, refresh);
                setBanners(bannerList);
                
                if (onBannersLoaded) {
                    onBannersLoaded(bannerList);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }, [placementId, onBannersLoaded]);
        
        const handleBannerClick = react.useCallback((banner) => {
            if (BannerSDK.instance) {
                BannerSDK.getInstance().handleBannerClick(banner);
            }
        }, []);
        
        react.useEffect(() => {
            loadBanners(forceRefresh);
        }, [loadBanners, forceRefresh]);
        
        react.useEffect(() => {
            if (!autoRefresh) return;
            
            const interval = setInterval(() => {
                loadBanners(true);
            }, 3600000);
            
            return () => clearInterval(interval);
        }, [autoRefresh, loadBanners]);
        
        return {
            banners,
            loading,
            error,
            refresh: () => loadBanners(true),
            handleBannerClick
        };
    };

    const useBannerAnalytics = () => {
        const trackEvent = react.useCallback((eventType, contentId, eventData = {}) => {
            if (BannerSDK.instance) {
                const sdk = BannerSDK.getInstance();
                const deviceInfo = sdk.deviceInfoCollector.getDeviceInfo();
                
                sdk.eventTracker.trackEvent({
                    eventType,
                    sessionId: sdk.sessionManager.getSessionId(),
                    userId: sdk.userManager.getUserId(),
                    contentId,
                    deviceInfo,
                    eventData
                });
            }
        }, []);
        
        return { trackEvent };
    };

    const CachePolicy = {
        AGGRESSIVE: 'AGGRESSIVE',
        MODERATE: 'MODERATE',
        NONE: 'NONE'
    };

    const EventType = AnalyticsEvent.EventType;

    // Version info
    const VERSION = '1.0.0';
    const VERSION_CODE = 1;

    // Global Window Object
    if (typeof window !== 'undefined') {
        window.BannerSDK = {
            initialize: BannerSDK.initialize,
            getInstance: BannerSDK.getInstance,
            VERSION,
            VERSION_CODE
        };
    }

    exports.AnalyticsEvent = AnalyticsEvent;
    exports.Banner = Banner;
    exports.BannerCache = BannerCache;
    exports.BannerSDK = BannerSDK;
    exports.CachePolicy = CachePolicy;
    exports.DateUtils = DateUtils;
    exports.DeepLinkHandler = DeepLinkHandler;
    exports.DeviceInfoCollector = DeviceInfoCollector;
    exports.EventTracker = EventTracker;
    exports.EventType = EventType;
    exports.NetworkClient = NetworkClient;
    exports.NotificationManager = NotificationManager;
    exports.PushNotification = PushNotification;
    exports.SecureStorage = SecureStorage;
    exports.SessionManager = SessionManager;
    exports.UserManager = UserManager;
    exports.VERSION = VERSION;
    exports.VERSION_CODE = VERSION_CODE;
    exports["default"] = BannerSDK;
    exports.useBannerAnalytics = useBannerAnalytics;
    exports.useBannerSDK = useBannerSDK;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=sdk.js.map
