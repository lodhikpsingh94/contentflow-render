import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  environment: process.env.NODE_ENV || 'development',
  name: 'campaign-service',
  version: process.env.APP_VERSION || '1.0.0',
  globalPrefix: 'api/v1',
}));

export interface AppConfig {
  port: number;
  environment: string;
  name: string;
  version: string;
  globalPrefix: string;
}