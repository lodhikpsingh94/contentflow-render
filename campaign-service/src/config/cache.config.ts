export interface CacheConfig {
  redis: {
    url?: string;       // full connection URL (Upstash / cloud Redis)
    host: string;       // fallback for local / self-hosted
    port: number;
    password?: string;
    tls: boolean;
    ttl: number;
    maxRetries: number;
  };
}

const parseRedisUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      tls: parsed.protocol === 'rediss:',
    };
  } catch {
    return null;
  }
};

export const getCacheConfig = (): CacheConfig => {
  const redisUrl = process.env.REDIS_URL;
  const parsed = redisUrl ? parseRedisUrl(redisUrl) : null;

  return {
    redis: {
      url: redisUrl,
      host: parsed?.host || process.env.REDIS_HOST || 'localhost',
      port: parsed?.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: parsed?.password || process.env.REDIS_PASSWORD,
      tls: parsed?.tls ?? false,
      ttl: parseInt(process.env.REDIS_TTL || '300'),
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    },
  };
};