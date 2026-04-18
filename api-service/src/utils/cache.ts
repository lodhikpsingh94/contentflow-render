import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

export interface CacheOptions {
  url?: string;
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
  ttl: number;
  maxRetries?: number;
  connectTimeout?: number;
}

@Injectable()
export class Cache implements OnModuleDestroy {
  private client!: RedisClientType;
  private readonly logger = new Logger(Cache.name);
  private isConnected = false;

  constructor(private options: CacheOptions) {
    if (options.url || (options.host && options.host !== 'localhost')) {
      // Kick off connection; failures are handled gracefully by isConnected guard
      this.initialize().catch(err =>
        this.logger.warn('Redis init failed — cache degraded:', err?.message)
      );
    } else {
      this.logger.warn('Redis not configured (no REDIS_URL / REDIS_HOST). Cache will be skipped.');
    }
  }

  private async initialize() {
    const reconnectStrategy = (retries: number) => {
      const delay = Math.min(retries * 200, 5000);
      if (retries > 0) {
        this.logger.warn(`Reconnecting to Redis... Attempt ${retries}`);
      }
      return delay; // never return false or Error — keep retrying forever
    };

    const socketOptions: any = {
      connectTimeout: this.options.connectTimeout || 10000,
      reconnectStrategy,
    };

    if (this.options.tls) {
      socketOptions.tls = true;
    }

    try {
      if (this.options.url) {
        this.client = createClient({
          url: this.options.url,
          socket: socketOptions,
        }) as RedisClientType;
      } else {
        this.client = createClient({
          socket: {
            host: this.options.host,
            port: this.options.port,
            ...socketOptions,
          },
          password: this.options.password,
        }) as RedisClientType;
      }

      this.client.on('error', (error) => {
        this.logger.error('Redis connection error:', { code: error.code });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.log('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        this.logger.warn('Redis reconnecting...');
      });

      this.client.on('end', () => {
        this.logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error: any) {
      this.logger.warn('Redis initial connect failed — will retry automatically:', error?.message);
      this.isConnected = false;
      // Do NOT call process.exit — reconnectStrategy handles retries
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error: any) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const actualTtl = ttl || this.options.ttl;
      const stringValue = JSON.stringify(value);

      if (actualTtl > 0) {
        await this.client.setEx(key, actualTtl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }

      return true;
    } catch (error: any) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error: any) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async getWithFallback<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const freshData = await fallback();
    await this.set(key, freshData, ttl);
    return freshData;
  }

  // Tenant-aware cache methods
  async getForTenant<T>(tenantId: string, key: string): Promise<T | null> {
    return this.get<T>(`tenant:${tenantId}:${key}`);
  }

  async setForTenant(tenantId: string, key: string, value: any, ttl?: number): Promise<boolean> {
    return this.set(`tenant:${tenantId}:${key}`, value, ttl);
  }

  async deleteForTenant(tenantId: string, key: string): Promise<boolean> {
    return this.delete(`tenant:${tenantId}:${key}`);
  }

  async clearTenantCache(tenantId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const pattern = `tenant:${tenantId}:*`;
      let cursor = 0;
      let keysDeleted = 0;

      do {
        const result = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor;
        if (result.keys.length > 0) {
          await this.client.del(result.keys);
          keysDeleted += result.keys.length;
        }
      } while (cursor !== 0);

      this.logger.log(`Cleared ${keysDeleted} keys for tenant: ${tenantId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Clear tenant cache error for ${tenantId}:`, error);
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConnected) return false;
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<any> {
    if (!this.isConnected) return { connected: false };

    try {
      const info = await this.client.info();
      return {
        connected: true,
        version: info.split('\r\n')[0].split(':')[1],
        used_memory: info.split('\r\n').find(line => line.startsWith('used_memory:'))?.split(':')[1],
        connected_clients: info.split('\r\n').find(line => line.startsWith('connected_clients:'))?.split(':')[1],
      };
    } catch (error: any) {
      return { connected: false, error: error.message };
    }
  }
}
