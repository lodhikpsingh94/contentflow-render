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

  logger.debug('[AUTH] Incoming request', {
    tenantId,
    hasAuthHeader: !!authHeader,
    hasApiKey: !!apiKey,
    path: req.originalUrl,
  });

  if (!tenantId) {
    res.status(400).json({ success: false, error: 'X-Tenant-Id header is required' });
    return;
  }

  if (req.path.startsWith('/health')) {
    return next();
  }

  // --- STRATEGY 1: INTERNAL SERVICE TOKEN (api-service → this service) ---
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (authHeader && internalToken && authHeader === `Bearer ${internalToken}`) {
    req.tenantContext = { tenantId, userId: 'api-service', userRoles: ['admin'] };
    return next();
  }

  // --- STRATEGY 2: API KEY VALIDATION (SDK / external clients) ---
  if (apiKey) {
    if (validateApiKey(apiKey, tenantId)) {
      req.tenantContext = { tenantId, userId: 'api-key-client', userRoles: ['editor'] };
      return next();
    }
  }

  // --- STRATEGY 3: JWT VALIDATION (Admin Panel / user sessions) ---
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        logger.error('[AUTH] JWT_SECRET env var is not set');
        res.status(500).json({ success: false, error: 'Server configuration error' });
        return;
      }
      const decoded = jwt.verify(token, secret) as any;
      if (decoded.tenantId !== tenantId) {
        throw new Error('Token tenantId does not match X-Tenant-Id header');
      }
      req.tenantContext = {
        tenantId: decoded.tenantId,
        userId: decoded.userId,
        userRoles: decoded.roles || [],
      };
      return next();
    } catch (error: any) {
      logger.error('[AUTH] JWT validation failed', { error: error.message });
    }
  }

  res.status(401).json({
    success: false,
    error: 'Authentication required. Provide valid Authorization header or X-API-Key',
  });
};

const validateApiKey = (key: string, tenantId: string): boolean => {
  // Standard format: tenantId_<anything>
  const parts = key.split('_');
  return parts.length >= 2 && parts[0] === tenantId;
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
