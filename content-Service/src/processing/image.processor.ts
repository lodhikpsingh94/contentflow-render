import sharp from 'sharp';
import { StorageProvider } from '../models/content.model';
import { logger } from '../utils/logger';

export interface ImageProcessingOptions {
  resize?: { width: number; height: number; fit?: keyof sharp.FitEnum };
  quality?: number;
  format?: keyof sharp.FormatEnum;
  blur?: number;
  rotate?: number;
}

export class ImageProcessor {
  constructor(private storageProvider: StorageProvider) {}

  async generateThumbnail(
    tenantId: string,
    contentId: string,
    options: ImageProcessingOptions = {}
  ): Promise<string> {
    try {
      const imageBuffer = await this.storageProvider.getContent(tenantId, contentId);
      
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(options.resize?.width || 300, options.resize?.height || 300, {
          fit: options.resize?.fit || 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: options.quality || 80 })
        .toBuffer();

      // Upload thumbnail
      const thumbnailUrl = await this.storageProvider.uploadContent({
        tenantId,
        contentId: `${contentId}-thumbnail`,
        file: thumbnailBuffer,
        originalName: `thumbnail_${contentId}.jpg`,
        mimeType: 'image/jpeg'
      });

      return thumbnailUrl.optimizedUrls.original;

    } catch (error) {
      logger.error('Thumbnail generation failed:', error);
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  async resizeImage(
    tenantId: string,
    contentId: string,
    width: number,
    height: number,
    options: Omit<ImageProcessingOptions, 'resize'> = {}
  ): Promise<string> {
    try {
      const imageBuffer = await this.storageProvider.getContent(tenantId, contentId);
      
      const resizedBuffer = await sharp(imageBuffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: options.quality || 90 })
        .toBuffer();

      const resizedUrl = await this.storageProvider.uploadContent({
        tenantId,
        contentId: `${contentId}-resized-${width}x${height}`,
        file: resizedBuffer,
        originalName: `resized_${contentId}.jpg`,
        mimeType: 'image/jpeg'
      });

      return resizedUrl.optimizedUrls.original;

    } catch (error) {
      logger.error('Image resize failed:', error);
      throw new Error(`Image resize failed: ${error.message}`);
    }
  }

  async convertFormat(
    tenantId: string,
    contentId: string,
    format: keyof sharp.FormatEnum,
    options: Omit<ImageProcessingOptions, 'format'> = {}
  ): Promise<string> {
    try {
      const imageBuffer = await this.storageProvider.getContent(tenantId, contentId);
      
      let processedBuffer: Buffer;

      switch (format) {
        case 'jpeg':
          processedBuffer = await sharp(imageBuffer)
            .jpeg({ quality: options.quality || 90 })
            .toBuffer();
          break;
        case 'png':
          processedBuffer = await sharp(imageBuffer)
            .png({ compressionLevel: 9 })
            .toBuffer();
          break;
        case 'webp':
          processedBuffer = await sharp(imageBuffer)
            .webp({ quality: options.quality || 90 })
            .toBuffer();
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const convertedUrl = await this.storageProvider.uploadContent({
        tenantId,
        contentId: `${contentId}-converted`,
        file: processedBuffer,
        originalName: `converted_${contentId}.${format}`,
        mimeType: `image/${format}`
      });

      return convertedUrl.optimizedUrls.original;

    } catch (error) {
      logger.error('Format conversion failed:', error);
      throw new Error(`Format conversion failed: ${error.message}`);
    }
  }

  async getImageMetadata(
    tenantId: string,
    contentId: string
  ): Promise<sharp.Metadata> {
    try {
      const imageBuffer = await this.storageProvider.getContent(tenantId, contentId);
      return sharp(imageBuffer).metadata();

    } catch (error) {
      logger.error('Metadata extraction failed:', error);
      throw new Error(`Metadata extraction failed: ${error.message}`);
    }
  }
}