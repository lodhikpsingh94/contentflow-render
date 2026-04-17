import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

export const connectDB = async (retries = 5, delayMs = 3000): Promise<void> => {
  if (!config.MONGODB_URI) {
    logger.warn('MONGODB_URI not set — content-service starting without database.');
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(config.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      });
      logger.info('MongoDB connected successfully.');

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      return;
    } catch (error: any) {
      logger.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }

  // All retries exhausted — keep running without DB (uploads to S3 still work)
  logger.warn('MongoDB unavailable after all retries. Content-service running without database.');
};
