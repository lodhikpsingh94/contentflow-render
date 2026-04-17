import BannerSDK from './BannerSDK';
import BannerCache from './BannerCache';
import EventTracker from './EventTracker';
import NetworkClient from './NetworkClient';
import NotificationManager from './NotificationManager';

// Models
import AnalyticsEvent from './models/AnalyticsEvent';
import Banner from './models/Banner';
import PushNotification from './models/Notification';

// Managers & Utils
import DeepLinkHandler from './managers/DeepLinkHandler';
import UserManager from './managers/UserManager';
import DateUtils from './utils/DateUtils';
import DeviceInfoCollector from './utils/DeviceInfoCollector';
import SessionManager from './utils/SessionManager';
import SecureStorage from './utils/SecureStorage';

// React Hook
import { useBannerSDK, useBannerAnalytics } from './react/hooks';

export {
    BannerSDK,
    BannerCache,
    EventTracker,
    NetworkClient,
    NotificationManager,
    AnalyticsEvent,
    Banner,
    PushNotification,
    DeepLinkHandler,
    UserManager,
    DateUtils,
    DeviceInfoCollector,
    SessionManager,
    SecureStorage,
    useBannerSDK,
    useBannerAnalytics
};

export default BannerSDK;

export const CachePolicy = {
    AGGRESSIVE: 'AGGRESSIVE',
    MODERATE: 'MODERATE',
    NONE: 'NONE'
};

export const EventType = AnalyticsEvent.EventType;

// Version info
export const VERSION = '1.0.0';
export const VERSION_CODE = 1;

// Global Window Object
if (typeof window !== 'undefined') {
    window.BannerSDK = {
        initialize: BannerSDK.initialize,
        getInstance: BannerSDK.getInstance,
        VERSION,
        VERSION_CODE
    };
}