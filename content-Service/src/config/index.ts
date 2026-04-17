import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  NODE_ENV: string;
  PORT: number;
  STORAGE_TYPE: 's3' | 'local' | 'minio';
  S3_ENDPOINT?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
  S3_REGION?: string;
  MINIO_ENDPOINT?: string;
  MINIO_ACCESS_KEY?: string;
  MINIO_SECRET_KEY?: string;
  LOCAL_STORAGE_PATH: string;
  MAX_FILE_SIZE: number;
  ALLOWED_MIME_TYPES: string[];
  REDIS_URL?: string;
  KAFKA_BROKERS?: string[];
  JWT_SECRET: string; // <-- ADD THIS
  S3_BUCKET?: string; // <-- ADD THIS
  MONGODB_URI?: string; // Add this
}

export const config: Config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3002'),
  STORAGE_TYPE: (process.env.STORAGE_TYPE as 's3' | 'local' | 'minio') || 'local',
  // Standard AWS / Cloudflare R2 env vars (AWS_* take priority, fall back to S3_* / MINIO_*)
  S3_ENDPOINT: process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT,
  S3_ACCESS_KEY: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY,
  S3_REGION: process.env.AWS_REGION || process.env.S3_REGION || 'auto',
  MINIO_ENDPOINT: process.env.AWS_S3_ENDPOINT || process.env.MINIO_ENDPOINT,
  MINIO_ACCESS_KEY: process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY: process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY,
  LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH || './storage',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm'
  ],
  REDIS_URL: process.env.REDIS_URL,
  KAFKA_BROKERS: process.env.KAFKA_BROKERS?.split(','),
  JWT_SECRET: process.env.JWT_SECRET || 'a-very-hard-to-guess-secret-key-321',
  S3_BUCKET: process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || 'contentflow-media',
  MONGODB_URI: process.env.MONGODB_URI // And add this
};