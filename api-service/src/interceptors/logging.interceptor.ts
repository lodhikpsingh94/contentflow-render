import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    
    const tenantContext = request['tenantContext'];
    const tenantId = tenantContext?.tenantId || 'unknown';
    const userId = request.headers['x-user-id'] as string || 'unknown';
    const startTime = Date.now();

    // Log request details
    this.logger.log({
      message: `Incoming request`,
      tenantId,
      userId,
      method: request.method,
      url: request.url,
      userAgent: request.get('user-agent'),
      ip: request.ip,
      query: request.query,
      body: this.sanitizeBody(request.body)
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          this.logger.log({
            message: `Request completed`,
            tenantId,
            userId,
            method: request.method,
            url: request.url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            success: data?.success !== false,
            contentCount: data?.data?.length || 0
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error({
            message: `Request failed`,
            tenantId,
            userId,
            method: request.method,
            url: request.url,
            statusCode: error.status || 500,
            duration: `${duration}ms`,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        }
      })
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });

    return sanitized;
  }
}