import { createClient, RedisClientType } from 'redis';
import { getCacheConfig } from '../config/cache.config';
import { logger } from '../utils/logger';

const config = getCacheConfig();

class RedisClient {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    // Never give up — Upstash closes idle connections; always retry with backoff.
    const reconnectStrategy = (retries: number) => {
      const delay = Math.min(retries * 200, 5000);
      if (retries > 0) logger.warn(`Redis reconnecting... Attempt ${retries}`);
      return delay;
    };

    // Use full URL for cloud Redis (Upstash uses rediss:// with TLS)
    if (config.redis.url) {
      this.client = createClient({
        url: config.redis.url,
        socket: {
          tls: config.redis.tls,
          reconnectStrategy,
        },
      });
    } else {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
          reconnectStrategy,
        },
        password: config.redis.password,
      });
    }

    this.client.on('error', (error) => logger.error('Redis Client Error', error));
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully');
    });
    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
    }
  }

  public async getForTenant<T>(tenantId: string, key: string): Promise<T | null> {
    const fullKey = `tenant:${tenantId}:${key}`;
    try {
      const value = await this.client.get(fullKey);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      logger.error(`Redis GET error for key ${fullKey}`, err);
      return null;
    }
  }

  public async setForTenant(tenantId: string, key: string, value: any, ttl: number): Promise<void> {
    const fullKey = `tenant:${tenantId}:${key}`;
    try {
      await this.client.setEx(fullKey, ttl, JSON.stringify(value));
    } catch (err) {
      logger.error(`Redis SETEX error for key ${fullKey}`, err);
    }
  }

  public async deleteForTenant(tenantId: string, key: string): Promise<boolean> {
    const fullKey = `tenant:${tenantId}:${key}`;
    try {
      const result = await this.client.del(fullKey);
      return result > 0;
    } catch (err) {
      logger.error(`Redis DEL error for key ${fullKey}`, err);
      return false;
    }
  }

  public async clearTenantCache(tenantId: string): Promise<void> {
    const keys = await this.client.keys(`tenant:${tenantId}:*`);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      const reply = await this.client.ping();
      return reply === 'PONG';
    } catch {
      return false;
    }
  }
}

export const redisClient = new RedisClient();
