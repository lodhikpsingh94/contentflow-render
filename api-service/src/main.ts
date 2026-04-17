import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AppLogger } from './utils/logger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: new AppLogger(),
      bufferLogs: true,
    });

    // Root path handler for Render/uptime health probes (hits GET / or HEAD /)
    app.use((req: any, res: any, next: any) => {
      if ((req.method === 'GET' || req.method === 'HEAD') && req.path === '/') {
        return res.status(200).send('OK');
      }
      next();
    });

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
        },
      },
    }));
    
    app.use(compression());

    // Global validation
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }));

    // CORS configuration
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3009'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Tenant-Id', 
        'X-User-Id', 
        'X-API-Key',
        'X-Request-ID'
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-RateLimit-Retry-After'
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
    });

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Swagger documentation
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Content Delivery API')
        .setDescription('Multi-tenant content delivery system API')
        .setVersion('1.0')
        .addTag('Content Delivery', 'Content delivery operations')
        .addTag('Campaigns', 'Campaign management operations')
        .addTag('Health', 'Health check endpoints')
        .addApiKey({
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'Tenant API Key'
        }, 'ApiKeyAuth')
        .addBearerAuth({
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token for user authentication'
        }, 'BearerAuth')
        .addServer(process.env.API_BASE_URL || 'http://localhost:3000')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
        },
        customSiteTitle: 'Content Delivery API Docs',
      });
    }

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 Application started on port ${port}`);
    logger.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
    logger.log(`🏥 Health checks available at http://localhost:${port}/api/v1/health`);
    
    // Log environment info
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`📊 Log level: ${process.env.LOG_LEVEL || 'info'}`);

  } catch (error) {
    logger.error('❌ Application failed to start:', error);
    process.exit(1);
  }
}

bootstrap();