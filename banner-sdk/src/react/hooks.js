import { useState, useEffect, useCallback } from 'react';
import BannerSDK from '../BannerSDK';

export const useBannerSDK = (placementId, options = {}) => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const { forceRefresh = false, autoRefresh = true, onBannersLoaded } = options;
    
    const loadBanners = useCallback(async (refresh = false) => {
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
    
    const handleBannerClick = useCallback((banner) => {
        if (BannerSDK.instance) {
            BannerSDK.getInstance().handleBannerClick(banner);
        }
    }, []);
    
    useEffect(() => {
        loadBanners(forceRefresh);
    }, [loadBanners, forceRefresh]);
    
    useEffect(() => {
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

export const useBannerAnalytics = () => {
    const trackEvent = useCallback((eventType, contentId, eventData = {}) => {
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