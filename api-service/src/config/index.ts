import { ConfigModuleOptions } from '@nestjs/config';
import appConfig from './app.config';
import cacheConfig from './cache.config';
import databaseConfig from './database.config';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [appConfig, cacheConfig, databaseConfig],
  envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
  validationOptions: {
    allowUnknown: true,
    abortEarly: true,
  },
};