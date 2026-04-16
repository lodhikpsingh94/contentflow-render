import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ContentAsset, ContentOptimizationOptions } from '../models/content.model';
import { StorageService } from './storage.service';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export class ProcessingService {
  constructor(private storageService: StorageService) {}

  async optimizeContent(
    asset: ContentAsset,
    options: ContentOptimizationOptions
  ): Promise<ContentAsset> {
    const optimizedUrls = { ...asset.optimizedUrls };

    if (asset.mimeType.startsWith('image/')) {
      optimizedUrls.thumbnail = await this.generateImageThumbnail(asset);
      if (options.resizeForWeb) {
        optimizedUrls.web = await this.resizeImage(asset, 1200, 1200);
      }
      if (options.resizeForMobile) {
        optimizedUrls.mobile = await this.resizeImage(asset, 800, 800);
      }
    } else if (asset.mimeType.startsWith('video/')) {
      optimizedUrls.thumbnail = await this.generateVideoThumbnail(asset);
    }

    return { ...asset, optimizedUrls };
  }

  private async generateImageThumbnail(asset: ContentAsset): Promise<string> {
    try {
      const imageBuffer = await this.storageService.getContent(asset.tenantId, asset.id);
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      return this.storageService.uploadBuffer(
        asset.tenantId,
        thumbnailBuffer,
        'image/jpeg',
        `${asset.id}-thumbnail`
      );
    } catch (error) {
      logger.error('Failed to generate thumbnail:', error);
      return asset.optimizedUrls.original;
    }
  }

  private async generateVideoThumbnail(asset: ContentAsset): Promise<string> {
    // Implementation for video thumbnails
    return asset.optimizedUrls.original;
  }

  private async resizeImage(asset: ContentAsset, width: number, height: number): Promise<string> {
    // Implementation for image resizing
    return asset.optimizedUrls.original;
  }
}