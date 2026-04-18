import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError, ZodIssue } from 'zod';
import { logger } from '../utils/logger';

/**
 * Validate request middleware
 * Wraps schema validation in a RequestHandler
 */
export const validateRequest = (schema: z.ZodSchema): RequestHandler => {
  return ((req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      });

      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((err: ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
        return;
      }

      // Type assertion for validated data
      const validatedData = validationResult.data as any;
      req.body = validatedData.body || req.body;
      req.query = validatedData.query || req.query;
      req.params = validatedData.params || req.params;

      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Internal validation error' });
    }
  }) as RequestHandler;
};

/**
 * File upload validation middleware
 */
export const validateFileUpload = (options: {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  maxFiles?: number;
} = {}): RequestHandler => {
  return ((req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      const files = Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat();

      // Check file count
      if (options.maxFiles && files.length > options.maxFiles) {
        res.status(400).json({
          error: `Too many files. Maximum allowed: ${options.maxFiles}`,
        });
        return;
      }

      // Validate each file
      for (const file of files as Express.Multer.File[]) {
        if (options.maxFileSize && file.size > options.maxFileSize) {
          res.status(400).json({
            error: `File ${file.originalname} exceeds maximum size limit`,
          });
          return;
        }

        if (
          options.allowedMimeTypes &&
          !options.allowedMimeTypes.includes(file.mimetype)
        ) {
          res.status(400).json({
            error: `File type not allowed: ${file.mimetype}`,
          });
          return;
        }
      }

      next();
    } catch (error) {
      logger.error('File validation error:', error);
      res.status(500).json({ error: 'Internal file validation error' });
    }
  }) as RequestHandler;
};

/**
 * Handle Zod validation errors
 */
export const handleValidationError = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof ZodError) {
    const errors = error.issues.map((err: ZodIssue) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    res.status(400).json({
      error: 'Validation failed',
      details: errors,
    });
    return;
  }

  next(error);
};