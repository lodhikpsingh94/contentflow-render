import { v4 as uuidv4 } from 'uuid';
import { StorageService } from './storage.service';
import { Asset, IAsset } from '../models/asset.model';
import { logger } from '../utils/logger';

export class ContentService {
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  /**
   * STEP 1 (for upload): Generate a pre-signed URL for the client.
   * The client will use this to upload the file directly to MinIO.
   */
  async generateSignedUrl(
    tenantId: string,
    fileName: string,
    mimeType: string
  ): Promise<{ uploadUrl: string; contentId: string; storageKey: string; }> {
    try {
      const contentId = uuidv4();
      const { url, storageKey } = await this.storageService.generateSignedUploadUrl(
        tenantId,
        contentId,
        fileName,
        mimeType
      );

      // We return the contentId and storageKey so the client can use them
      // in the finalizeUpload step.
      return {
        uploadUrl: url,
        contentId,
        storageKey,
      };
    } catch (error: any) {
        logger.error('Failed to generate signed URL:', error);
        throw error;
    }
  }

  /**
   * STEP 2 (for upload): After the client uploads the file, it calls this method
   * to tell us the upload was successful, so we can save the metadata to MongoDB.
   */
  async finalizeUpload(
    tenantId: string,
    contentId: string,
    name: string,
    mimeType: string,
    size: number,
    storageKey: string
  ): Promise<IAsset> {
    try {
      // Get the permanent public URL for the newly uploaded file
      const publicUrl = this.storageService.getPublicUrl(storageKey);

      const asset = new Asset({
        _id: contentId,
        tenantId,
        name,
        mimeType,
        size,
        storageKey,
        publicUrl,
        // You can add more metadata here from the request, like uploadedBy, tags, folder, etc.
      });

      await asset.save();
      logger.info(`Finalized upload and saved metadata for ${contentId}`);
      return asset;
    } catch (error: any) {
      logger.error('Failed to finalize upload:', error);
      // In a real scenario, you might want to add logic here to delete the orphaned file from MinIO
      // if the database save fails, to prevent clutter.
      throw new Error('Failed to save asset metadata.');
    }
  }

  /**
   * READ: List content assets for a tenant by querying MongoDB.
   */
  async listContent(tenantId: string, page: number = 1, limit: number = 50) {
    try {
      const skip = (page - 1) * limit;

      const [assets, total] = await Promise.all([
        Asset.find({ tenantId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(), // .lean() returns plain JS objects, which is faster for reads
        Asset.countDocuments({ tenantId }),
      ]);

      return {
        data: assets,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (error: any) {
        logger.error(`Failed to list content for tenant ${tenantId}:`, error);
        throw new Error('Failed to retrieve content list.');
    }
  }
  
  /**
   * READ: Get a single asset by its ID from MongoDB.
   */
  async getContent(contentId: string, tenantId: string): Promise<IAsset | null> {
    try {
        return await Asset.findOne({ _id: contentId, tenantId }).lean();
    } catch (error: any) {
        logger.error(`Failed to get content ${contentId}:`, error);
        throw new Error('Failed to retrieve content.');
    }
  }

  /**
   * DELETE: Delete from both MongoDB and MinIO.
   */
  async deleteContent(contentId: string, tenantId: string): Promise<void> {
    try {
      // Find the document in MongoDB first to get the storageKey
      const asset = await Asset.findOneAndDelete({ _id: contentId, tenantId });

      if (asset) {
        // If the document was found and deleted, delete the associated file from MinIO
        await this.storageService.deleteFile(asset.storageKey);
        logger.info(`Deleted asset ${contentId} and its file ${asset.storageKey}`);
      } else {
        logger.warn(`Asset ${contentId} not found in database for deletion. No file was removed.`);
      }
    } catch (error: any) {
        logger.error(`Failed to delete asset ${contentId}:`, error);
        throw new Error('Failed to delete asset.');
    }
  }
}