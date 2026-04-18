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
                return json.success ? json.data : [];
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

export default NetworkClient;