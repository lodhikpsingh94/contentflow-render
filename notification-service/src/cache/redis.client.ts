// C:\...\src\cache\redis.client.ts

import { createClient, RedisClientType } from 'redis';
import { getCacheConfig } from '../config/cache.config';
import { logger } from '../utils/logger';

const config = getCacheConfig();

class RedisClient {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        reconnectStrategy: (retries) => {
          if (retries > (config.redis.maxRetries || 3)) {
            logger.error('Max Redis reconnection attempts reached');
            return new Error('Redis max reconnection attempts reached');
          }
          return Math.min(retries * 50, 2000); // reconnect after
        },
      },
      password: config.redis.password,
    });

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
    } catch(err) {
        logger.error(`Redis GET error for key ${fullKey}`, err);
        return null;
    }
  }

  public async setForTenant(tenantId: string, key: string, value: any, ttl: number): Promise<void> {
    const fullKey = `tenant:${tenantId}:${key}`;
    try {
        await this.client.setEx(fullKey, ttl, JSON.stringify(value));
    } catch(err) {
        logger.error(`Redis SETEX error for key ${fullKey}`, err);
    }
  }

  public async deleteForTenant(tenantId: string, key: string): Promise<boolean> {
    const fullKey = `tenant:${tenantId}:${key}`;
    try {
        const result = await this.client.del(fullKey);
        return result > 0;
    } catch(err) {
        logger.error(`Redis DEL error for key ${fullKey}`, err);
        return false;
    }
  }

  public async clearTenantCache(tenantId: string): Promise<void> {
    // This is a simplified clear. In production, use SCAN + DEL for non-blocking deletes.
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
