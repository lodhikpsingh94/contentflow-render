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

export default AnalyticsEvent;