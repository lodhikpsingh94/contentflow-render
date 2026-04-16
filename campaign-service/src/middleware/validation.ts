import { Request, Response, NextFunction } from 'express';
import { validateCampaign, validateRule, validatePagination, validateCampaignUpdate } from '../utils/validators';
import { logger } from '../utils/logger';

// This is for POST (Create)
export const validateCampaignData = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST') { // Only for POST
    const { error } = validateCampaign(req.body);
    if (error) {
      res.status(400).json({ success: false, error: `Validation failed: ${error.details.map(d => d.message).join(', ')}` });
      return;
    }
  }
  next();
};

// --- ADD THIS NEW MIDDLEWARE ---
// This is for PUT/PATCH (Update)
export const validateCampaignUpdateData = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { error } = validateCampaignUpdate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: `Validation failed: ${error.details.map(d => d.message).join(', ')}` });
      return;
    }
  }
  next();
};

export const validateRuleData = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const { error } = validateRule(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
      });
      return;
    }
  }
  next();
};

export const validateQueryParams = (req: Request, res: Response, next: NextFunction): void => {
  if (Object.keys(req.query).length > 0) {
    const { error } = validatePagination(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        error: `Invalid query parameters: ${error.details.map(d => d.message).join(', ')}`,
      });
      return;
    }
  }
  next();
};

export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Unhandled error:', error);

  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.message,
    });
    return;
  }

  if (error.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: 'Invalid ID format',
    });
    return;
  }

  if (error.name === 'MongoError' && (error as any).code === 11000) {
    res.status(409).json({
      success: false,
      error: 'Duplicate entry',
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
};