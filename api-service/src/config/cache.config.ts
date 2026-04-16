import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    ttl: parseInt(process.env.REDIS_TTL || '300', 10),
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  },
}));

export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    ttl: number;
    maxRetries: number;
  };
}