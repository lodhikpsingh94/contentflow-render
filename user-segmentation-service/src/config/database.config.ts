// C:\...\src\config\database.config.ts

export const getDatabaseConfig = () => ({
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'user_segmentation_service',
    options: {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT || '30000'),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000'),
    },
  },
});