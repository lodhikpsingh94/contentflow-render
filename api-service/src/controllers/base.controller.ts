import { Request } from 'express';
import { TenantContext } from '../models/shared/tenant.types';
import { SuccessResponse, ErrorResponse } from '../models/shared/common.types';

export abstract class BaseController {
  protected getTenantContext(req: Request): TenantContext {
    const context = req['tenantContext'];
    if (!context) {
      throw new Error('Tenant context not found in request');
    }
    return context;
  }

  protected getUserId(req: Request): string {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      throw new Error('User ID not found in request headers');
    }
    return userId;
  }

  protected successResponse<T>(data: T, metadata?: any): SuccessResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date(),
        ...metadata
      }
    };
  }

  protected errorResponse(message: string, code: string, details?: any): ErrorResponse {
    return {
      success: false,
      error: {
        message,
        code,
        timestamp: new Date(),
        details
      }
    };
  }

  protected getPaginationParams(req: Request): { page: number; limit: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    return { page, limit };
  }
}