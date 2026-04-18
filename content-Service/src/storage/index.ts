import { config } from '../config';
import { S3Provider } from './s3.provider';
import { LocalProvider } from './local.provider';
import { StorageProvider } from '../models/content.model';

export class StorageProviderFactory {
  static createProvider(): StorageProvider {
    switch (config.STORAGE_TYPE) {
      case 's3':
      case 'minio':
        return new S3Provider();
      case 'local':
        return new LocalProvider();
      default:
        throw new Error(`Unsupported storage type: ${config.STORAGE_TYPE}`);
    }
  }
}

export { StorageProvider };