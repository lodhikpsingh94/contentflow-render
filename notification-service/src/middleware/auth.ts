// C:\...\src\middleware\auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface TenantContext {
  tenantId: string;
  userId: string;
  userRoles: string[];
}

// This uses declaration merging to add our custom property to the Express Request type
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
    res.status(400).json({
      success: false,
      error: 'X-Tenant-Id header is required',
    });
    return;
  }

  // Skip auth for health checks which are on a different root path
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

  let isValid = false;
  let userId = 'system';
  let userRoles = ['guest'];

  try {
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const secret = process.env.JWT_SECRET || 'a-very-hard-to-guess-secret-key-321';
        const decoded = jwt.verify(token, secret) as any;
        if (decoded && decoded.tenantId === tenantId) {
            isValid = true;
            userId = decoded.userId || 'system';
            userRoles = decoded.roles || ['user'];
        }
    } else if (apiKey) {
        // API key format: tenantId_secretKey
        const parts = apiKey.split('_');
        if (parts.length === 2 && parts[0] === tenantId) {
            isValid = true;
            userRoles = ['admin']; // API keys are typically for admin/system access
        }
    }
  } catch (error: any) {
    logger.error('Authentication check failed', { error: error.message });
    isValid = false;
  }


  if (!isValid) {
    res.status(401).json({
      success: false,
      error: 'Invalid authentication credentials',
    });
    return;
  }

  // Attach the context to the request object for later use
  req.tenantContext = {
    tenantId,
    userId,
    userRoles,
  };

  next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantContext = req.tenantContext;
    
    if (!tenantContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication context required',
      });
      return;
    }

    const hasRole = tenantContext.userRoles.some(role => 
      allowedRoles.includes(role)
    );

    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};