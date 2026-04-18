import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const tenantId = req.headers['x-tenant-id'] as string || 'unknown';

  logger.info('Incoming request', {
    tenantId,
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      tenantId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    });
  });

  next();
};

export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  const tenantId = req.headers['x-tenant-id'] as string || 'unknown';
  
  logger.error('Request error', {
    tenantId,
    method: req.method,
    url: req.url,
    error: error.message,
    stack: error.stack,
  });

  next(error);
};