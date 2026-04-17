import SessionManager from './utils/SessionManager';

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

export default NetworkClient;