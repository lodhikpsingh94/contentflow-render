import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { configModuleOptions } from './config';
import { Cache } from './utils/cache';
import { AppLogger } from './utils/logger';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

// Controllers
import { ContentController } from './controllers/content.controller';
import { CampaignController } from './controllers/campaign.controller';
import { HealthController } from './controllers/health.controller';
import { SegmentController } from './controllers/segment.controller';
import { AnalyticsController } from './controllers/analytics.controller'; // <-- ADD THIS

// Services
import { OrchestrationService } from './services/orchestration.service';
import { CampaignService } from './services/campaign.service';
import { ContentService } from './services/content.service';
import { SegmentService } from './services/segment.service';
import { TenantService } from './services/tenant.service';
import { AnalyticsService } from './services/analytics.service'; // <-- ADD THIS

// Clients
import { CampaignClient } from './clients/campaign.client';
import { ContentClient } from './clients/content.client';
import { SegmentClient } from './clients/segment.client';
import { AnalyticsClient } from './clients/analytics.client'; // <-- ADD THIS

// Middleware
import { TenantMiddleware } from './middleware/tenant.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { RateLimitingMiddleware } from './middleware/rate-limiting.middleware';
import { ValidationMiddleware } from './middleware/validation.middleware';

import { AuthModule } from './auth.module';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    AuthModule,
  ],
  controllers: [
    ContentController,
    CampaignController,
    HealthController,
    SegmentController,
    AnalyticsController, // <-- ADD THIS
  ],
  providers: [
    AppLogger,
    {
      provide: Cache,
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        let parsed: { host: string; port: number; password?: string; tls: boolean } | null = null;
        if (redisUrl) {
          const u = new URL(redisUrl);
          parsed = {
            host: u.hostname,
            port: parseInt(u.port) || 6379,
            password: u.password || undefined,
            tls: u.protocol === 'rediss:',
          };
        }
        const options = {
          url: redisUrl || undefined,
          host: parsed?.host || process.env.REDIS_HOST || 'localhost',
          port: parsed?.port || parseInt(process.env.REDIS_PORT || '6379'),
          password: parsed?.password || process.env.REDIS_PASSWORD,
          tls: parsed?.tls ?? false,
          ttl: parseInt(process.env.REDIS_TTL || '300'),
          maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
          connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
        };
        return new Cache(options);
      },
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    TenantService,
    OrchestrationService,
    CampaignService,
    ContentService,
    SegmentService,
    AnalyticsService, // <-- ADD THIS
    CampaignClient,
    ContentClient,
    SegmentClient,
    AnalyticsClient, // <-- ADD THIS
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply Tenant Middleware to ALL routes
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');

    // Apply Auth & Rate Limiting to protected controllers
    consumer
      .apply(AuthMiddleware, RateLimitingMiddleware)
      .forRoutes(
        ContentController,
        CampaignController,
        SegmentController,
        AnalyticsController, // <-- ADD THIS
      );

    // Apply Validation Middleware
    consumer
      .apply(ValidationMiddleware)
      .exclude('health', 'auth/(.*)')
      .forRoutes('*');
  }
}