import NetworkClient from './NetworkClient';
import SecureStorage from './utils/SecureStorage';

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

export default EventTracker;