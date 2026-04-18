import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../utils/logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new AppLogger();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    const tenantContext = request['tenantContext'];
    const tenantId = tenantContext?.tenantId || 'unknown';

    // Log the error
    this.logger.error(
      `Unhandled exception: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
      'GlobalExceptionFilter',
      {
        tenantId,
        url: request.url,
        method: request.method,
        statusCode: status,
        userAgent: request.get('user-agent'),
        ip: request.ip
      }
    );

    response.status(status).json({
      success: false,
      error: {
        message: this.formatMessage(message),
        code: this.getErrorCode(exception),
        timestamp: new Date(),
        path: request.url,
        ...(process.env.NODE_ENV === 'development' && {
          stack: exception instanceof Error ? exception.stack : undefined,
          details: message
        })
      }
    });
  }

  private formatMessage(message: any): string {
    if (typeof message === 'string') return message;
    if (message && typeof message === 'object' && message.message) {
      return message.message;
    }
    return 'An unexpected error occurred';
  }

  private getErrorCode(exception: any): string {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const codes: { [key: number]: string } = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        429: 'RATE_LIMIT_EXCEEDED',
        500: 'INTERNAL_SERVER_ERROR',
        503: 'SERVICE_UNAVAILABLE'
      };
      return codes[status] || 'UNKNOWN_ERROR';
    }
    return 'INTERNAL_SERVER_ERROR';
  }
}