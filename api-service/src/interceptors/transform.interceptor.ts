import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessResponse } from '../models/shared/common.types';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // If data is already formatted as a response, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Transform successful responses
        if (data && typeof data === 'object') {
          return {
            success: true,
            data: data.data || data,
            metadata: {
              timestamp: new Date(),
              ...data.metadata
            }
          } as SuccessResponse<any>;
        }

        // Fallback for primitive data
        return {
          success: true,
          data,
          metadata: {
            timestamp: new Date()
          }
        } as SuccessResponse<any>;
      })
    );
  }
}