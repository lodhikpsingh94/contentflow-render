import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

// Extend Request with tenant/user info
export interface AuthenticatedRequest extends Request {
  tenantId?: string;
  userId?: string;
  userRoles?: string[];
}

/**
 * Auth middleware
 */
export const authMiddleware: RequestHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header missing or invalid' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as {
        tenantId: string;
        userId: string;
        roles: string[];
        iat: number;
        exp: number;
      };

      if (decoded.exp < Date.now() / 1000) {
        res.status(401).json({ error: 'Token expired' });
        return;
      }

      req.tenantId = decoded.tenantId;
      req.userId = decoded.userId;
      req.userRoles = decoded.roles;

      logger.debug(`Authenticated request from tenant: ${decoded.tenantId}, user: ${decoded.userId}`);
      next();

    } catch (jwtError) {
      logger.warn('JWT verification failed:', jwtError);
      res.status(401).json({ error: 'Invalid token' });
    }

  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Internal authentication error' });
  }
};

/**
 * Role-based access middleware
 */
export const requireRole = (roles: string | string[]): RequestHandler => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRoles) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    const hasRole = requiredRoles.some(role => req.userRoles?.includes(role));

    if (!hasRole) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware
 */
export const optionalAuth: RequestHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as {
        tenantId: string;
        userId: string;
        roles: string[];
      };

      req.tenantId = decoded.tenantId;
      req.userId = decoded.userId;
      req.userRoles = decoded.roles;

    } catch (error) {
      logger.debug('Optional auth failed, continuing unauthenticated');
    }
  }

  next();
};
