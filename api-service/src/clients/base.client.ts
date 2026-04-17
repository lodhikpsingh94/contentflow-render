import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios';
import { ServiceResponse } from '../models/shared/common.types';

@Injectable()
export abstract class BaseClient {
  protected readonly client: AxiosInstance;
  protected readonly logger: Logger;
  protected readonly serviceName: string;

  /** Ensures a URL has a protocol — Render's fromService gives bare hostnames */
  private static normalizeUrl(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  }

  constructor(baseURL: string, serviceName: string, timeout: number = 5000) {
    this.serviceName = serviceName;
    this.logger = new Logger(serviceName);
    const normalizedURL = BaseClient.normalizeUrl(baseURL);

    this.client = axios.create({
      baseURL: normalizedURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `API-Service/${process.env.APP_VERSION || '1.0.0'}`,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // ... (interceptor code is fine, no changes needed here) ...
    this.client.interceptors.request.use(
        (config) => {
            this.logger.debug(`→ ${config.method?.toUpperCase()} ${config.url}`);
            config.headers['X-Request-ID'] = this.generateRequestId();
            return config;
        },
        (error) => {
            this.logger.error(`Request setup error: ${error.message}`);
            return Promise.reject(error);
        }
    );

    this.client.interceptors.response.use(
        (response) => {
            this.logger.debug(`← ${response.status} ${response.config.url} - ${response.data?.success ? 'OK' : 'FAILED'}`);
            return response;
        },
        (error) => {
            const url = error.config?.url;
            const method = error.config?.method;
            const status = error.response?.status;
            
            this.logger.error(`✗ ${method?.toUpperCase()} ${url} - ${status}: ${error.message}`);
            
            if (error.response?.data) {
            this.logger.error(`Error details: ${JSON.stringify(error.response.data)}`);
            }
            
            return Promise.reject(error);
        }
    );
  }

  protected async request<T>(
    config: AxiosRequestConfig, 
    tenantId?: string,
    forwardedHeaders?: Record<string, string> // <-- ADD THIS
  ): Promise<ServiceResponse<T>> {
    const startTime = Date.now();
    
    if (tenantId) {
      config.headers = { ...config.headers, 'X-Tenant-Id': tenantId, ...forwardedHeaders }; // <-- MODIFY THIS
    }

    try {
      const response: AxiosResponse<T> = await this.client(config);
      return {
        data: response.data,
        success: true,
        metadata: {
          responseTime: Date.now() - startTime,
          service: this.serviceName,
          tenantId,
        },
      };
    } catch (error) {
      // --- THIS IS THE CORRECTED BLOCK ---
      let errorMessage = 'An unexpected error occurred';
      if (isAxiosError(error)) {
         errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      } else if (error instanceof Error) {
         errorMessage = error.message;
      }
      
      this.logger.error(`Request failed for tenant ${tenantId}: ${errorMessage}`);
      
      return {
        error: errorMessage,
        success: false,
        metadata: {
          responseTime: Date.now() - startTime,
          service: this.serviceName,
          tenantId,
        },
      };
    }
  }

  protected buildTenantSpecificUrl(baseUrl: string, tenantId?: string): string {
    if (!tenantId) return baseUrl;
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}tenantId=${tenantId}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
       // --- THIS IS THE CORRECTED BLOCK ---
       if (error instanceof Error) {
           this.logger.error(`Health check failed: ${error.message}`);
       } else {
           this.logger.error('Health check failed with an unknown error.');
       }
      return false;
    }
  }
}