import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

export class AppLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const format = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      defaultMeta: { 
        service: 'api-service',
        version: process.env.APP_VERSION || '1.0.0'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error',
          format 
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log',
          format 
        })
      ],
    });

    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    );
  }

  log(message: string, context?: string, meta?: any) {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: any) {
    this.logger.error(message, { trace, context, ...meta });
  }

  warn(message: string, context?: string, meta?: any) {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: any) {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: any) {
    this.logger.verbose(message, { context, ...meta });
  }

  // Tenant-aware logging methods
  tenantLog(tenantId: string, message: string, context?: string, meta?: any) {
    this.logger.info(message, { tenantId, context, ...meta });
  }

  tenantError(tenantId: string, message: string, trace?: string, context?: string, meta?: any) {
    this.logger.error(message, { tenantId, trace, context, ...meta });
  }

  tenantWarn(tenantId: string, message: string, context?: string, meta?: any) {
    this.logger.warn(message, { tenantId, context, ...meta });
  }

  // Request logging
  requestLog(req: any, message: string, meta?: any) {
    const tenantId = req?.tenantContext?.tenantId;
    const userId = req.headers?.['x-user-id'];
    
    this.logger.info(message, {
      tenantId,
      userId,
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      ...meta
    });
  }
}