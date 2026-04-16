// C:\...\Content-Service\src\database\mongodb.connection.ts

import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

export const connectDB = async () => {
  try {
    if (!config.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    await mongoose.connect(config.MONGODB_URI);
    logger.info('MongoDB connected successfully.');
  } catch (error: any) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1); // Exit process with failure
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });
};