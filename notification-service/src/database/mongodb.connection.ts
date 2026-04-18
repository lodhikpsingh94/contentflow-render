// C:\...\src\database\mongodb.connection.ts

import mongoose from 'mongoose';
import { getDatabaseConfig } from '../config/database.config';
import { logger } from '../utils/logger';

const config = getDatabaseConfig();

class MongoDBConnection {
  private static instance: MongoDBConnection;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('MongoDB already connected');
      return;
    }

    try {
      const options = {
        ...config.mongodb.options,
        dbName: config.mongodb.database,
      };

      await mongoose.connect(config.mongodb.uri, options);
      
      this.isConnected = true;
      logger.info('MongoDB connected successfully');

      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected');
    }
  }

  public async healthCheck(): Promise<boolean> {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export const mongodbConnection = MongoDBConnection.getInstance();