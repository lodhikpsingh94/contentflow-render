import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { StorageProvider } from '../models/content.model';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface VideoProcessingOptions {
  resolution?: string;
  bitrate?: string;
  format?: 'mp4' | 'webm' | 'mov';
  crf?: number;
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';
}

export class VideoProcessor {
  constructor(private storageProvider: StorageProvider) {}

  async generateThumbnail(
    tenantId: string,
    contentId: string,
    timestamp: string = '00:00:01'
  ): Promise<string> {
    try {
      const videoBuffer = await this.storageProvider.getContent(tenantId, contentId);
      const tempInputPath = await this.createTempFile(videoBuffer, 'input');
      const tempOutputPath = path.join('/tmp', `thumb_${contentId}.jpg`);

      // Generate thumbnail using ffmpeg
      await execAsync(
        `ffmpeg -i ${tempInputPath} -ss ${timestamp} -vframes 1 -q:v 2 ${tempOutputPath}`
      );

      const thumbnailBuffer = await fs.readFile(tempOutputPath);

      // Upload thumbnail
      const thumbnailUrl = await this.storageProvider.uploadContent({
        tenantId,
        contentId: `${contentId}-thumbnail`,
        file: thumbnailBuffer,
        originalName: `thumbnail_${contentId}.jpg`,
        mimeType: 'image/jpeg'
      });

      // Cleanup temp files
      await this.cleanupTempFiles([tempInputPath, tempOutputPath]);

      return thumbnailUrl.optimizedUrls.original;

    } catch (error) {
      logger.error('Video thumbnail generation failed:', error);
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  async transcodeVideo(
    tenantId: string,
    contentId: string,
    options: VideoProcessingOptions = {}
  ): Promise<string> {
    try {
      const videoBuffer = await this.storageProvider.getContent(tenantId, contentId);
      const tempInputPath = await this.createTempFile(videoBuffer, 'input');
      const tempOutputPath = path.join('/tmp', `transcoded_${contentId}.mp4`);

      const ffmpegCommand = this.buildFfmpegCommand(tempInputPath, tempOutputPath, options);
      
      await execAsync(ffmpegCommand);
      const transcodedBuffer = await fs.readFile(tempOutputPath);

      const transcodedUrl = await this.storageProvider.uploadContent({
        tenantId,
        contentId: `${contentId}-transcoded`,
        file: transcodedBuffer,
        originalName: `transcoded_${contentId}.mp4`,
        mimeType: 'video/mp4'
      });

      await this.cleanupTempFiles([tempInputPath, tempOutputPath]);

      return transcodedUrl.optimizedUrls.original;

    } catch (error) {
      logger.error('Video transcoding failed:', error);
      throw new Error(`Video transcoding failed: ${error.message}`);
    }
  }

  async getVideoMetadata(
    tenantId: string,
    contentId: string
  ): Promise<any> {
    try {
      const videoBuffer = await this.storageProvider.getContent(tenantId, contentId);
      const tempInputPath = await this.createTempFile(videoBuffer, 'input');

      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams ${tempInputPath}`
      );

      await this.cleanupTempFiles([tempInputPath]);
      return JSON.parse(stdout);

    } catch (error) {
      logger.error('Video metadata extraction failed:', error);
      throw new Error(`Metadata extraction failed: ${error.message}`);
    }
  }

  private buildFfmpegCommand(
    inputPath: string,
    outputPath: string,
    options: VideoProcessingOptions
  ): string {
    const args = ['-i', inputPath];

    // Video codec options
    args.push('-c:v', 'libx264');
    if (options.preset) args.push('-preset', options.preset);
    if (options.crf) args.push('-crf', options.crf.toString());
    if (options.bitrate) args.push('-b:v', options.bitrate);
    if (options.resolution) args.push('-s', options.resolution);

    // Audio codec options
    args.push('-c:a', 'aac', '-b:a', '128k');

    // Additional options
    args.push('-movflags', '+faststart'); // For web optimization
    args.push('-y'); // Overwrite output file

    args.push(outputPath);
    return `ffmpeg ${args.join(' ')}`;
  }

  private async createTempFile(buffer: Buffer, prefix: string): Promise<string> {
    const tempPath = path.join('/tmp', `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    await fs.writeFile(tempPath, buffer);
    return tempPath;
  }

  private async cleanupTempFiles(paths: string[]): Promise<void> {
    await Promise.allSettled(
      paths.map(async (filePath) => {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          logger.warn('Failed to cleanup temp file:', filePath, error);
        }
      })
    );
  }
}