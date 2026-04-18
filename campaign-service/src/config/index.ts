import { AppConfig } from './app.config';
import { DatabaseConfig } from './database.config';
import { CacheConfig } from './cache.config';

export interface Config {
  app: AppConfig;
  database: DatabaseConfig;
  cache: CacheConfig;
}

export const getConfig = (): Config => ({
  app: {
    port: parseInt(process.env.PORT, 10) || 3001,
    environment: process.env.NODE_ENV || 'development',
    name: 'campaign-service',
    version: process.env.APP_VERSION || '1.0.0',
    globalPrefix: 'api/v1',
  },
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      database: process.env.MONGODB_DATABASE || 'campaign_service',
      options: {
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT) || 30000,
        socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000,
      },
    },
  },
  cache: {
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      tls: (process.env.REDIS_URL || '').startsWith('rediss://'),
      ttl: parseInt(process.env.REDIS_TTL || '300'),
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    },
  },
});