import { createClient, RedisClientType } from 'redis';
import { getCacheConfig } from '../config/cache.config';
import { logger } from '../utils/logger';

const config = getCacheConfig();

export class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected = false;

  constructor() {
    if (config.redis.url && config.redis.url !== 'redis://localhost:6379') {
      this.initialize();
    } else {
      logger.warn('Redis not configured. Cache will be skipped.');
    }
  }

  private initialize(): void {
    const reconnectStrategy = (retries: number) => {
      const delay = Math.min(retries * 200, 5000);
      if (retries > 0) logger.warn(`Redis reconnecting... Attempt ${retries}`);
      return delay;
    };

    this.client = createClient({
      url: config.redis.url,
      socket: {
        connectTimeout: 10000,
        tls: config.redis.tls,
        reconnectStrategy,
      },
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
    });
    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
      this.isConnected = true;
    });
    this.client.on('disconnect', () => {
      logger.warn('Redis disconnected');
      this.isConnected = false;
    });

    this.client.connect().catch((err) => {
      logger.warn('Redis initial connect failed — will retry automatically:', err?.message);
    });
  }

  public async connect(): Promise<void> { /* handled in constructor */ }

  public async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit().catch(() => {});
      this.isConnected = false;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch { return null; }
  }

  public async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;
    try {
      const actualTtl = ttl || config.redis.ttl;
      const stringValue = JSON.stringify(value);
      if (actualTtl > 0) {
        await this.client.setEx(key, actualTtl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
      return true;
    } catch { return false; }
  }

  public async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch { return false; }
  }

  public async getWithFallback<T>(key: string, fallback: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const freshData = await fallback();
    await this.set(key, freshData, ttl);
    return freshData;
  }

  public async getForTenant<T>(tenantId: string, key: string): Promise<T | null> {
    return this.get<T>(`tenant:${tenantId}:${key}`);
  }

  public async setForTenant(tenantId: string, key: string, value: any, ttl?: number): Promise<boolean> {
    return this.set(`tenant:${tenantId}:${key}`, value, ttl);
  }

  public async deleteForTenant(tenantId: string, key: string): Promise<boolean> {
    return this.delete(`tenant:${tenantId}:${key}`);
  }

  public async clearTenantCache(tenantId: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;
    try {
      const pattern = `tenant:${tenantId}:*`;
      let cursor = 0;
      do {
        const result = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor;
        if (result.keys.length > 0) await this.client.del(result.keys);
      } while (cursor !== 0);
      return true;
    } catch { return false; }
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;
    try { await this.client.ping(); return true; } catch { return false; }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const redisClient = new RedisClient();
