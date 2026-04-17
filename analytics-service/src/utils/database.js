const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async (retries = 5, delayMs = 3000) => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    logger.warn('MONGODB_URI not set — analytics service starting without database.');
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });
      logger.info(`Analytics Service MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }

  // All retries exhausted — log and continue without crashing
  logger.warn('MongoDB unavailable after all retries. Analytics service running without database.');
};

module.exports = connectDB;
