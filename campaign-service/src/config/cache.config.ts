export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    ttl: number;
    maxRetries: number;
  };
}

export const getCacheConfig = (): CacheConfig => ({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.REDIS_TTL) || 300,
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
  },
});