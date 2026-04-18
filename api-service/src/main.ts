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

    // ── CORS must be first — before helmet and all other middleware ──────────
    // With credentials:true the origin must be explicit (not *).
    // We reflect the incoming origin if it is in the allowlist, so subdomains
    // and Render preview URLs all work without hardcoding every one.
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      // Include all typical dev ports: WebApp3.1 (3009), WebAppTest (3010), api-service itself (3000)
      // Add known Render deployment URLs here as a fallback; in production set ALLOWED_ORIGINS env var.
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3009',
          'http://localhost:3010',
          'http://localhost:5173', // Vite default port
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3009',
          'http://127.0.0.1:3010',
          'http://127.0.0.1:5173',
          'https://contentflow-demoapp.onrender.com',
          'https://contentflow-webapp.onrender.com',
        ];

    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow server-to-server requests (no origin) and allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`CORS blocked origin: ${origin}`);
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Tenant-Id',
        'X-User-Id',
        'X-API-Key',
        'X-Request-ID',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-RateLimit-Retry-After',
      ],
      credentials: true,
      maxAge: 86400,
    });

    // Root path handler for Render/uptime health probes
    app.use((req: any, res: any, next: any) => {
      if ((req.method === 'GET' || req.method === 'HEAD') && req.path === '/') {
        return res.status(200).send('OK');
      }
      next();
    });

    // Helmet — disable crossOriginResourcePolicy so cross-origin fetches work
    app.use(helmet({
      crossOriginResourcePolicy: false,
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
      transformOptions: { enableImplicitConversion: true },
    }));

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Swagger (dev only)
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Content Delivery API')
        .setDescription('Multi-tenant content delivery system API')
        .setVersion('1.0')
        .addBearerAuth()
        .addServer(process.env.API_BASE_URL || 'http://localhost:3000')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
    }

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 Application started on port ${port}`);
    logger.log(`🏥 Health checks available at http://localhost:${port}/api/v1/health`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);

  } catch (error) {
    logger.error('❌ Application failed to start:', error);
    process.exit(1);
  }
}

bootstrap();
