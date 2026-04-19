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
  if (req.path === '/health' || req.path.startsWith('/health/')) {
    return next();
  }

  // --- STRATEGY 1: INTERNAL SERVICE TOKEN (api-service → this service) ---
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (authHeader && internalToken && authHeader === `Bearer ${internalToken}`) {
    req.tenantContext = { tenantId, userId: 'api-service', userRoles: ['admin'] };
    return next();
  }

  let isValid = false;
  let userId = 'system';

  // --- STRATEGY 2: API KEY VALIDATION ---
  if (apiKey) {
    isValid = validateApiKey(apiKey, tenantId);
  }

  // --- STRATEGY 3: JWT VALIDATION ---
  if (!isValid && authHeader) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('[AUTH] JWT_SECRET env var is not set');
      res.status(500).json({ success: false, error: 'Server configuration error' });
      return;
    }
    try {
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, secret) as any;
      if (decoded && decoded.tenantId === tenantId) {
        isValid = true;
        userId = decoded.userId || 'system';
      }
    } catch (error) {
      logger.error('JWT validation error:', error);
    }
  }

  if (!isValid) {
    logger.warn(`Authentication failed for tenant ${tenantId}`);
    res.status(401).json({
      success: false,
      error: 'Authentication required. Provide Authorization header or X-API-Key',
    });
    return;
  }

  req.tenantContext = { tenantId, userId, userRoles: ['admin'] };
  next();
};

const validateApiKey = (apiKey: string, tenantId: string): boolean => {
  // Standard format: tenantId_<anything>
  const parts = apiKey.split('_');
  return parts.length >= 2 && parts[0] === tenantId;
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantContext = req.tenantContext;

    if (!tenantContext) {
      res.status(401).json({ success: false, error: 'Authentication required' });
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
