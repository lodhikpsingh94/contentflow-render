export interface ServiceResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
  metadata?: {
    responseTime: number;
    service: string;
    tenantId?: string;
  };
}

export interface Cacheable {
  cacheKey: string;
  ttl: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    timestamp: Date;
    details?: any;
  };
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  metadata: {
    timestamp: Date;
    requestId?: string;
    tenantId?: string;
    [key: string]: any;
  };
}
