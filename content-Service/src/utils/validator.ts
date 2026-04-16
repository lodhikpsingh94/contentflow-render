import { z } from 'zod';
import { config } from '../config';

// Common validation schemas
export const tenantIdSchema = z.string().uuid().or(z.string().min(1).max(50));
export const contentIdSchema = z.string().uuid().or(z.string().min(1).max(100));
export const userIdSchema = z.string().uuid();

// File validation schemas
export const fileSchema = z.object({
  originalname: z.string().min(1).max(255),
  mimetype: z.string().min(1),
  size: z.number().positive().max(config.MAX_FILE_SIZE),
  buffer: z.instanceof(Buffer)
});

// Content metadata schema
export const metadataSchema = z.record(z.any()).optional();

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50)
});

// Content upload schema
export const contentUploadSchema = z.object({
  body: z.object({
    metadata: metadataSchema,
    tags: z.array(z.string()).optional()
  }),
  file: fileSchema.optional() // Handled separately in middleware
});

// Content update schema
export const contentUpdateSchema = z.object({
  params: z.object({
    contentId: contentIdSchema
  }),
  body: z.object({
    metadata: metadataSchema,
    tags: z.array(z.string()).optional()
  })
});

// Content list schema
export const contentListSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
    mimeType: z.string().optional(),
    tags: z.string().optional().transform(val => 
      val ? val.split(',').map(tag => tag.trim()) : undefined
    )
  })
});

// Search schema
export const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1).max(100),
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('50')
  })
});

// Validation functions
export const validateMimeType = (mimeType: string): boolean => {
  return config.ALLOWED_MIME_TYPES.includes(mimeType);
};

export const validateFileSize = (size: number): boolean => {
  return size <= config.MAX_FILE_SIZE;
};

export const validateFileName = (fileName: string): boolean => {
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
  const reservedNames = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
  
  return !invalidChars.test(fileName) && !reservedNames.test(fileName);
};

// Sanitization functions
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255);
};

export const sanitizeMetadata = (metadata: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' && value.length > 1000) {
      sanitized[key] = value.substring(0, 1000);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};