import { registerAs } from '@nestjs/config';

const parseRedisUrl = (url: string) => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 6379,
    password: parsed.password || undefined,
    tls: parsed.protocol === 'rediss:',
  };
};

export default registerAs('cache', () => {
  const redisUrl = process.env.REDIS_URL;
  const parsed = redisUrl ? parseRedisUrl(redisUrl) : null;

  return {
    redis: {
      url: redisUrl || undefined,
      host: parsed?.host || process.env.REDIS_HOST || 'localhost',
      port: parsed?.port || parseInt(process.env.REDIS_PORT || '6379', 10),
      password: parsed?.password || process.env.REDIS_PASSWORD,
      tls: parsed?.tls ?? false,
      ttl: parseInt(process.env.REDIS_TTL || '300', 10),
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    },
  };
});

export interface CacheConfig {
  redis: {
    url?: string;
    host: string;
    port: number;
    password?: string;
    tls: boolean;
    ttl: number;
    maxRetries: number;
  };
}
