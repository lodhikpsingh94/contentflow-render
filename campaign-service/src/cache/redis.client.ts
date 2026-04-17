import { createClient, RedisClientType } from 'redis';
import { getCacheConfig } from '../config/cache.config';
import { logger } from '../utils/logger';

const config = getCacheConfig();

export class RedisClient {
  private client: RedisClientType;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;

  constructor() {
    this.maxReconnectAttempts = config.redis.maxRetries;
    this.initialize();
  }

  private initialize(): void {
    const reconnectStrategy = (retries: number) => {
      if (retries > this.maxReconnectAttempts) {
        logger.error('Max Redis reconnection attempts reached');
        return false;
      }
      logger.warn(`Redis reconnecting... Attempt ${retries}`);
      return Math.min(retries * 100, 3000);
    };

    // Prefer full URL (Upstash / cloud Redis with TLS) over host+port
    if (config.redis.url) {
      this.client = createClient({
        url: config.redis.url,
        socket: {
          connectTimeout: 10000,
          tls: config.redis.tls,
          reconnectStrategy,
        },
      });
    } else {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
          connectTimeout: 10000,
          reconnectStrategy,
        },
        password: config.redis.password,
      });
    }

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.on('error', (error) => {
      logger.error('Redis error:', error);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  public async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const actualTtl = ttl || config.redis.ttl;
      const stringValue = JSON.stringify(value);

      if (actualTtl > 0) {
        await this.client.setEx(key, actualTtl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }

      return true;
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  public async delete(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  }

  public async getWithFallback<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await fallback();
    await this.set(key, freshData, ttl);
    return freshData;
  }

  // Tenant-aware cache methods
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
    if (!this.isConnected) {
      return false;
    }

    try {
      const pattern = `tenant:${tenantId}:*`;
      let cursor = 0;
      let keysDeleted = 0;

      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        const keys = result.keys;

        if (keys.length > 0) {
          await this.client.del(keys);
          keysDeleted += keys.length;
        }
      } while (cursor !== 0);

      logger.info(`Cleared ${keysDeleted} Redis keys for tenant: ${tenantId}`);
      return true;
    } catch (error) {
      logger.error(`Clear tenant cache error for ${tenantId}:`, error);
      return false;
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const redisClient = new RedisClient();