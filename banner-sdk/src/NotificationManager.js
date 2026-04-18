import AnalyticsEvent from './models/AnalyticsEvent';
import SessionManager from './utils/SessionManager';
import UserManager from './managers/UserManager';
import DeviceInfoCollector from './utils/DeviceInfoCollector';

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

export default NotificationManager;