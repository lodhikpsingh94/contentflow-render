import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import contentRouter from './api/content.controller';
import healthRouter from './api/health.controller';
import { connectDB } from './database/mongodb.connection'; // <-- ADD THIS
import { config } from './config';
import { logger } from './utils/logger';

const app = express();
connectDB(); // <-- ADD THIS LINE to initialize the DB connection
// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/v1/content', contentRouter);
app.use('/health', healthRouter);

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.PORT, () => {
  logger.info(`
    Content Service Started
    Environment: ${config.NODE_ENV}
    Port: ${config.PORT}
    Storage: ${config.STORAGE_TYPE}
  `);
});