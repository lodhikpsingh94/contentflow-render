import AWS from 'aws-sdk';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ContentAsset, ContentUploadRequest, StorageProvider } from '../models/content.model';

export class S3Provider implements StorageProvider {
  private s3: AWS.S3;
  private bucketName: string;

  constructor() {
    this.s3 = new AWS.S3({
      endpoint: config.MINIO_ENDPOINT,
      accessKeyId: config.MINIO_ACCESS_KEY,
      secretAccessKey: config.MINIO_SECRET_KEY,
      region: 'auto',           // R2 requires region 'auto' in credential scope
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });

    this.bucketName = config.S3_BUCKET || 'content-assets';
    // Note: bucket must be created manually in Cloudflare R2 dashboard
    // ensureBucketExists is not called here — R2 does not support putBucketPolicy
  }

  /**
   * Generates a temporary, secure URL that the client can use to upload a file directly to storage.
   * @param tenantId The ID of the tenant uploading the file.
   * @param contentId A unique ID for the content being uploaded.
   * @param fileName The original name of the file.
   * @param mimeType The MIME type of the file.
   * @returns A promise resolving to an object with the pre-signed URL and the final storage key.
   */
  async generateSignedUploadUrl(
    tenantId: string,
    contentId: string,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; storageKey: string; }> {
    const extension = fileName.split('.').pop() || '';
    const storageKey = `${tenantId}/${contentId}.${extension}`;

    const params = {
      Bucket: this.bucketName,
      Key: storageKey,
      Expires: 300, // The URL will be valid for 5 minutes (300 seconds)
      ContentType: mimeType,
      // ACL removed — Cloudflare R2 does not support ACLs
    };

    try {
      const url = await this.s3.getSignedUrlPromise('putObject', params);
      return { url, storageKey };
    } catch (error: any) {
      logger.error('Failed to generate S3 pre-signed URL:', error);
      throw new Error('Could not generate upload URL.');
    }
  }

  /**
   * Constructs the permanent, publicly accessible URL for a file in storage.
   * @param storageKey The full path/key of the file in the bucket (e.g., 'tenant1/asset123.jpg').
   * @returns The public URL string.
   */
  getPublicUrl(storageKey: string): string {
    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    if (r2PublicUrl) {
      // R2 public URLs are already scoped to the bucket — do NOT include bucket name.
      // Correct: https://pub-xxx.r2.dev/tenant1/uuid.png
      return `${r2PublicUrl.replace(/\/$/, '')}/${storageKey}`;
    }
    // MinIO / self-hosted fallback: endpoint/bucket/key
    const endpoint = (process.env.MINIO_ENDPOINT || '').replace(/\/$/, '');
    return `${endpoint}/${this.bucketName}/${storageKey}`;
  }

  /**
   * Permanently deletes a file from the storage bucket.
   * @param storageKey The full path/key of the file to delete.
   */
  async deleteFile(storageKey: string): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: storageKey,
    };
    try {
      await this.s3.deleteObject(params).promise();
      logger.info(`Successfully deleted file from storage: ${storageKey}`);
    } catch (error: any) {
      // Don't throw an error if deletion fails, just log it.
      // This prevents a user's action from failing if a file cleanup goes wrong.
      logger.error(`Failed to delete file ${storageKey} from storage:`, error);
    }
  }

  // --- StorageProvider interface implementation ---

  async uploadContent(request: ContentUploadRequest & { contentId: string }): Promise<ContentAsset> {
    const { tenantId, contentId, file, originalName, mimeType, metadata } = request;
    const ext = originalName.split('.').pop() || 'bin';
    const storageKey = `${tenantId}/${contentId}.${ext}`;

    await this.s3.putObject({
      Bucket: this.bucketName,
      Key: storageKey,
      Body: file,
      ContentType: mimeType,
      // ACL omitted — R2 does not support ACLs
    }).promise();

    const url = this.getPublicUrl(storageKey);
    return {
      id: contentId,
      tenantId,
      originalName,
      storageKey,
      mimeType,
      size: file.length,
      optimizedUrls: { original: url },
      metadata: metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getContent(tenantId: string, contentId: string): Promise<Buffer | null> {
    try {
      // List objects to find the actual key (extension unknown)
      const list = await this.s3.listObjectsV2({
        Bucket: this.bucketName,
        Prefix: `${tenantId}/${contentId}`,
        MaxKeys: 1,
      }).promise();

      const key = list.Contents?.[0]?.Key;
      if (!key) return null;

      const result = await this.s3.getObject({ Bucket: this.bucketName, Key: key }).promise();
      return result.Body as Buffer;
    } catch {
      return null;
    }
  }

  async getContentUrl(tenantId: string, contentId: string): Promise<string> {
    const list = await this.s3.listObjectsV2({
      Bucket: this.bucketName,
      Prefix: `${tenantId}/${contentId}`,
      MaxKeys: 1,
    }).promise();
    const key = list.Contents?.[0]?.Key || `${tenantId}/${contentId}`;
    return this.getPublicUrl(key);
  }

  async deleteContent(tenantId: string, contentId: string): Promise<void> {
    const list = await this.s3.listObjectsV2({
      Bucket: this.bucketName,
      Prefix: `${tenantId}/${contentId}`,
      MaxKeys: 1,
    }).promise();
    const key = list.Contents?.[0]?.Key;
    if (key) await this.deleteFile(key);
  }

  async listContent(tenantId: string, prefix?: string): Promise<any[]> {
    const result = await this.s3.listObjectsV2({
      Bucket: this.bucketName,
      Prefix: prefix ? `${tenantId}/${prefix}` : `${tenantId}/`,
    }).promise();
    return result.Contents || [];
  }

  // --- private helpers ---

  /**
   * Checks if the bucket exists and creates it if it does not.
   * Also sets a public read policy for the bucket.
   */
  private async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      await this.s3.headBucket({ Bucket: bucketName }).promise();
    } catch (error: any) {
      if (error.code === 'NotFound' || error.code === 'NoSuchBucket') {
        try {
          logger.info(`Bucket '${bucketName}' not found. Creating...`);
          await this.s3.createBucket({ Bucket: bucketName }).promise();
          logger.info(`Bucket '${bucketName}' created successfully.`);

          // After creating, set a public read policy
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicReadGetObject',
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucketName}/*`],
              },
            ],
          };
          await this.s3.putBucketPolicy({
            Bucket: bucketName,
            Policy: JSON.stringify(policy),
          }).promise();
          logger.info(`Public read policy set for bucket '${bucketName}'.`);

        } catch (createError: any) {
          logger.error(`Failed to create or set policy for bucket '${bucketName}':`, createError);
          throw createError;
        }
      } else {
        // For other errors, re-throw
        throw error;
      }
    }
  }
}