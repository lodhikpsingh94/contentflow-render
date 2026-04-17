import { ContentAsset } from '../models/content.model';
import { ImageProcessor } from './image.processor';
import { VideoProcessor } from './video.processor';
import { StorageProvider } from '../storage/index';
import { logger } from '../utils/logger';

export interface OptimizationOptions {
  generateThumbnails: boolean;
  resizeForWeb: boolean;
  resizeForMobile: boolean;
  compress: boolean;
  formatConversion?: boolean;
  targetFormat?: 'webp' | 'avif' | 'original';
}

export class MediaOptimizer {
  private imageProcessor: ImageProcessor;
  private videoProcessor: VideoProcessor;

  constructor(private storageProvider: StorageProvider) {
    this.imageProcessor = new ImageProcessor(storageProvider);
    this.videoProcessor = new VideoProcessor(storageProvider);
  }

  async optimizeContent(
    asset: ContentAsset,
    options: OptimizationOptions
  ): Promise<ContentAsset> {
    try {
      const optimizedUrls = { ...asset.optimizedUrls };

      if (asset.mimeType.startsWith('image/')) {
        optimizedUrls.original = await this.optimizeImage(asset, options);
        
        if (options.generateThumbnails) {
          optimizedUrls.thumbnail = await this.imageProcessor.generateThumbnail(
            asset.tenantId,
            asset.id
          );
        }

        if (options.resizeForWeb) {
          optimizedUrls.web = await this.imageProcessor.resizeImage(
            asset.tenantId,
            asset.id,
            1200,
            1200
          );
        }

        if (options.resizeForMobile) {
          optimizedUrls.mobile = await this.imageProcessor.resizeImage(
            asset.tenantId,
            asset.id,
            800,
            800
          );
        }

      } else if (asset.mimeType.startsWith('video/')) {
        optimizedUrls.thumbnail = await this.videoProcessor.generateThumbnail(
          asset.tenantId,
          asset.id
        );

        if (options.compress) {
          optimizedUrls.original = await this.videoProcessor.transcodeVideo(
            asset.tenantId,
            asset.id,
            { preset: 'medium', crf: 23 }
          );
        }
      }

      return { ...asset, optimizedUrls };

    } catch (error) {
      logger.error('Content optimization failed:', error);
      // Return original asset if optimization fails
      return asset;
    }
  }

  private async optimizeImage(
    asset: ContentAsset,
    options: OptimizationOptions
  ): Promise<string> {
    try {
      if (options.compress || options.formatConversion) {
        const targetFormat = options.targetFormat === 'original' 
          ? undefined 
          : options.targetFormat;

        if (targetFormat) {
          return await this.imageProcessor.convertFormat(
            asset.tenantId,
            asset.id,
            targetFormat,
            { quality: options.compress ? 85 : 100 }
          );
        } else if (options.compress) {
          return await this.imageProcessor.resizeImage(
            asset.tenantId,
            asset.id,
            1920,
            1080, // Resize to max 1080p for compression
            { quality: 85 }
          );
        }
      }

      return asset.optimizedUrls.original;

    } catch (error) {
      logger.warn('Image optimization failed, using original:', error);
      return asset.optimizedUrls.original;
    }
  }

  async getOptimizationRecommendations(asset: ContentAsset): Promise<string[]> {
    const recommendations: string[] = [];
    const metadata = await this.getMediaMetadata(asset);

    if (asset.mimeType.startsWith('image/')) {
      if (metadata.width > 2000 || metadata.height > 2000) {
        recommendations.push('Resize to max 2000px for web delivery');
      }

      if (asset.size > 1024 * 1024) { // 1MB
        recommendations.push('Compress image to reduce file size');
      }

      if (asset.mimeType !== 'image/webp') {
        recommendations.push('Convert to WebP for better compression');
      }
    }

    if (asset.mimeType.startsWith('video/')) {
      if (asset.size > 10 * 1024 * 1024) { // 10MB
        recommendations.push('Transcode video to lower bitrate');
      }

      if (metadata.duration > 60) { // 60 seconds
        recommendations.push('Consider trimming long video');
      }
    }

    return recommendations;
  }

  private async getMediaMetadata(asset: ContentAsset): Promise<any> {
    try {
      if (asset.mimeType.startsWith('image/')) {
        return await this.imageProcessor.getImageMetadata(asset.tenantId, asset.id);
      } else if (asset.mimeType.startsWith('video/')) {
        return await this.videoProcessor.getVideoMetadata(asset.tenantId, asset.id);
      }
      return {};
    } catch (error) {
      logger.warn('Metadata extraction failed:', error);
      return {};
    }
  }
}