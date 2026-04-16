import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';
import { generateFileName, getFileExtension } from '../utils/file-utils';

// Configure multer storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
): void => {
  try {
    const allowedMimeTypes = config.ALLOWED_MIME_TYPES;

    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error(`Invalid file type: ${file.mimetype}`));
    }
  } catch (error) {
    callback(error as Error);
  }
};

// Create multer instance
export const multipartMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
    files: 10, // Maximum number of files
    fields: 20, // Maximum number of non-file fields
  }
});

// Error handling wrapper
export const handleMultipartErrors = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(400).json({ error: 'File too large' });
        return;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({ error: 'Too many files' });
        return;
      case 'LIMIT_FIELD_KEY':
        res.status(400).json({ error: 'Field name too long' });
        return;
      case 'LIMIT_FIELD_VALUE':
        res.status(400).json({ error: 'Field value too long' });
        return;
      case 'LIMIT_FIELD_COUNT':
        res.status(400).json({ error: 'Too many fields' });
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({ error: 'Unexpected file field' });
        return;
      default:
        logger.error('Multer error:', error);
        res.status(400).json({ error: 'File upload error' });
        return;
    }
  }

  if (error) {
    logger.error('Multipart middleware error:', error);
    res.status(400).json({ error: error.message });
    return;
  }

  next();
};

// Middleware to process metadata fields
export const processMetadata = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Parse metadata field if present
    if (req.body.metadata) {
      try {
        req.body.metadata = JSON.parse(req.body.metadata);
      } catch (parseError) {
        res.status(400).json({ error: 'Invalid metadata format. Must be valid JSON' });
        return;
      }
    }

    // Parse tags field if present
    if (req.body.tags) {
      try {
        req.body.tags = Array.isArray(req.body.tags) 
          ? req.body.tags 
          : JSON.parse(req.body.tags);
      } catch (parseError) {
        res.status(400).json({ error: 'Invalid tags format. Must be array or JSON array' });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Metadata processing error:', error);
    res.status(500).json({ error: 'Internal metadata processing error' });
  }
};