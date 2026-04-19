import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface TenantContext {
  tenantId: string;
  userId: string;
  userRoles: string[];
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'] as string;
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    res.status(400).json({ success: false, error: 'X-Tenant-Id header is required' });
    return;
  }

  // Skip auth for health checks
  if (req.baseUrl.includes('/health')) {
    return next();
  }

  if (!authHeader && !apiKey) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Provide Authorization header or X-API-Key',
    });
    return;
  }

  // --- STRATEGY 1: INTERNAL SERVICE TOKEN (api-service → this service) ---
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (authHeader && internalToken && authHeader === `Bearer ${internalToken}`) {
    req.tenantContext = { tenantId, userId: 'api-service', userRoles: ['admin'] };
    return next();
  }

  let isValid = false;
  let userId = 'system';
  let userRoles = ['guest'];

  try {
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        logger.error('[AUTH] JWT_SECRET env var is not set');
        res.status(500).json({ success: false, error: 'Server configuration error' });
        return;
      }
      const decoded = jwt.verify(token, secret) as any;
      if (decoded && decoded.tenantId === tenantId) {
        isValid = true;
        userId = decoded.userId || 'system';
        userRoles = decoded.roles || ['user'];
      }
    } else if (apiKey) {
      // API key format: tenantId_<anything>
      const parts = apiKey.split('_');
      if (parts.length >= 2 && parts[0] === tenantId) {
        isValid = true;
        userRoles = ['admin'];
      }
    }
  } catch (error: any) {
    logger.error('Authentication check failed', { error: error.message });
    isValid = false;
  }

  if (!isValid) {
    res.status(401).json({ success: false, error: 'Invalid authentication credentials' });
    return;
  }

  req.tenantContext = { tenantId, userId, userRoles };
  next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantContext = req.tenantContext;

    if (!tenantContext) {
      res.status(401).json({ success: false, error: 'Authentication context required' });
      return;
    }

    const hasRole = tenantContext.userRoles.some(role => allowedRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
