import 'dotenv/config';
import App from './app';
import { logger } from './utils/logger';

try {
  const app = new App();
  app.listen();
} catch (error) {
  logger.error('Failed to start application:', error);
  process.exit(1);
}