import AWS from 'aws-sdk';
import { S3Provider } from '../storage/s3.provider';
import { config } from '../config';
import { logger } from '../utils/logger';

export class StorageService {
  // We specify the provider directly, as this pattern relies on an S3-compatible store.
  private provider: S3Provider;

  constructor() {
    // We are committing to the S3/MinIO provider for this production pattern.
    // If you needed to support local storage, you would need a different service architecture.
    if (config.STORAGE_TYPE !== 'minio' && config.STORAGE_TYPE !== 's3') {
        logger.warn(`StorageService is optimized for MinIO/S3, but STORAGE_TYPE is set to '${config.STORAGE_TYPE}'.`);
    }
    this.provider = new S3Provider();
  }

  /**
   * Asks the provider to generate a temporary, secure URL for uploading a file.
   * @returns A promise that resolves to the pre-signed URL and the unique key for the file in storage.
   */
  generateSignedUploadUrl(
    tenantId: string,
    contentId: string,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; storageKey: string; }> {
    return this.provider.generateSignedUploadUrl(tenantId, contentId, fileName, mimeType);
  }

  /**
   * Constructs the permanent, publicly accessible URL for a file that is already in storage.
   * @param storageKey The full path/key of the file in the storage bucket (e.g., 'tenant1/asset123.jpg').
   * @returns The public URL as a string.
   */
  getPublicUrl(storageKey: string): string {
    return this.provider.getPublicUrl(storageKey);
  }

  /**
   * Asks the provider to permanently delete a file from storage.
   * @param storageKey The full path/key of the file to delete.
   */
  deleteFile(storageKey: string): Promise<void> {
    return this.provider.deleteFile(storageKey);
  }

  /**
   * Downloads a file from storage and returns it as a Buffer.
   * Used by processing pipelines (image/video processing).
   */
  async getContent(tenantId: string, contentId: string): Promise<Buffer> {
    const s3 = new AWS.S3({
      endpoint: config.MINIO_ENDPOINT,
      accessKeyId: config.MINIO_ACCESS_KEY,
      secretAccessKey: config.MINIO_SECRET_KEY,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });

    const storageKey = `${tenantId}/${contentId}`;
    const bucketName = config.S3_BUCKET || 'contentflow-media';

    const response = await s3.getObject({ Bucket: bucketName, Key: storageKey }).promise();
    return response.Body as Buffer;
  }

  /**
   * Uploads a raw Buffer directly to storage and returns the public URL.
   * Used by processing pipelines to store processed/optimised files.
   */
  async uploadBuffer(
    tenantId: string,
    buffer: Buffer,
    mimeType: string,
    contentId: string
  ): Promise<string> {
    const s3 = new AWS.S3({
      endpoint: config.MINIO_ENDPOINT,
      accessKeyId: config.MINIO_ACCESS_KEY,
      secretAccessKey: config.MINIO_SECRET_KEY,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });

    const bucketName = config.S3_BUCKET || 'contentflow-media';
    const storageKey = `${tenantId}/${contentId}`;

    await s3.putObject({
      Bucket: bucketName,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
    }).promise();

    return this.provider.getPublicUrl(storageKey);
  }
}