import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const HARDCODED_JWT_SECRET = process.env.JWT_SECRET || 'a-very-hard-to-guess-secret-key-321';

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
  const apiKey = req.headers['x-api-key'] as string; // Check for API Key
  const tenantId = req.headers['x-tenant-id'] as string;

  // Log for debugging
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

  // --- STRATEGY 1: API KEY VALIDATION (Service-to-Service / SDK) ---
  if (apiKey) {
    // In a real app, validate against DB. For now, allow the test key.
    if (validateApiKey(apiKey, tenantId)) {
        req.tenantContext = {
            tenantId,
            userId: 'api-service', // Generic ID for API key calls
            userRoles: ['editor'], // Grant basic roles
        };
        return next();
    }
  }

  // --- STRATEGY 2: JWT VALIDATION (Admin Panel) ---
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, HARDCODED_JWT_SECRET) as any;

        if (decoded.tenantId !== tenantId) {
            throw new Error('Token tenantId does not match header X-Tenant-Id');
        }

        req.tenantContext = {
            tenantId: decoded.tenantId,
            userId: decoded.userId,
            userRoles: decoded.roles || [],
        };
        return next();
    } catch (error: any) {
        logger.error('[AUTH] JWT validation failed', { error: error.message });
        // Don't return yet, fall through to 401
    }
  }

  // If neither strategy worked:
  res.status(401).json({ 
      success: false, 
      error: 'Authentication required. Provide valid Authorization header or X-API-Key' 
  });
};

// Helper function for API Key validation
const validateApiKey = (key: string, tenantId: string): boolean => {
    // 1. Bypass for our test key
    if (key === 'tenant1_key_123' && tenantId === 'tenant1') {
        return true;
    }

    // 2. Standard format check (tenantId_secret)
    const parts = key.split('_');
    if (parts.length >= 2 && parts[0] === tenantId) {
        return true; 
    }
    
    return false;
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