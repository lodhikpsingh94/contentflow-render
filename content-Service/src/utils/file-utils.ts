import { createHash } from 'crypto';
import mime from 'mime-types';
import path from 'path';
import { config } from '../config';
import { logger } from './logger';

// File utility functions
export const generateFileName = (
  originalName: string,
  suffix?: string
): string => {
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension);
  const timestamp = Date.now();
  
  let fileName = `${baseName}_${timestamp}`;
  if (suffix) {
    fileName += `_${suffix}`;
  }
  fileName += extension;
  
  return fileName;
};

export const getFileExtension = (mimeType: string): string => {
  const extension = mime.extension(mimeType);
  return extension ? `.${extension}` : '.bin';
};

export const getMimeType = (fileName: string): string => {
  const mimeType = mime.lookup(fileName);
  return mimeType || 'application/octet-stream';
};

export const calculateFileHash = (buffer: Buffer): string => {
  return createHash('md5').update(buffer).digest('hex');
};

export const validateFileType = (buffer: Buffer, expectedMimeType: string): boolean => {
  try {
    // Basic magic number validation
    const magicNumbers: Record<string, string[]> = {
      'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
      'image/png': ['89504e47'],
      'image/gif': ['47494638'],
      'image/webp': ['52494646'],
      'video/mp4': ['66747970', '00000020']
    };

    const hexStart = buffer.subarray(0, 8).toString('hex');
    const validMagicNumbers = magicNumbers[expectedMimeType];

    if (validMagicNumbers) {
      return validMagicNumbers.some(magic => hexStart.startsWith(magic));
    }

    return true; // Skip validation for unsupported types

  } catch (error) {
    logger.warn('File type validation failed:', error);
    return false;
  }
};

export const getFileDimensions = async (buffer: Buffer, mimeType: string): Promise<{ width?: number; height?: number }> => {
  try {
    if (mimeType.startsWith('image/')) {
      // For images, you'd typically use a library like sharp
      // This is a simplified version
      return { width: 0, height: 0 };
    }
    
    if (mimeType.startsWith('video/')) {
      // For videos, you'd use ffprobe or similar
      return { width: 0, height: 0 };
    }
    
    return {};
  } catch (error) {
    logger.warn('Failed to get file dimensions:', error);
    return {};
  }
};

export const chunkBuffer = (buffer: Buffer, chunkSize: number): Buffer[] => {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.subarray(i, i + chunkSize));
  }
  return chunks;
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const generatePresignedUrl = async (
  fileName: string,
  mimeType: string,
  expiresIn: number = 3600
): Promise<string> => {
  // Implementation would depend on your storage provider
  // This is a placeholder for S3/MinIO presigned URL generation
  return `https://storage.example.com/presigned/${fileName}?expires=${expiresIn}`;
};