import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ContentAsset, ContentUploadRequest, StorageProvider } from '../models/content.model';

// Define a type that mimics the AWS S3.Object structure for consistency
interface LocalFileObject {
    Key: string;
    Size: number;
    LastModified: Date;
}

export class LocalProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath = config.LOCAL_STORAGE_PATH;
    this.ensureBasePathExists();
  }
  
  private async ensureBasePathExists() {
    try {
        await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
        logger.error(`Failed to create local storage base path at ${this.basePath}`, error);
    }
  }

  async uploadContent(request: ContentUploadRequest & { contentId: string }): Promise<ContentAsset> {
    try {
      const { tenantId, contentId, file, originalName, mimeType, metadata } = request;
      const storageKey = this.generateFilePath(tenantId, contentId, originalName);
      const tenantDir = path.dirname(storageKey);
      
      await fs.mkdir(tenantDir, { recursive: true });
      await fs.writeFile(storageKey, file);

      const url = this.getPublicUrl(storageKey);

      return {
        id: contentId,
        tenantId,
        originalName,
        storageKey: storageKey,
        mimeType,
        size: file.length,
        optimizedUrls: { original: url },
        metadata: metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error: any) {
      logger.error('Local storage upload failed:', error);
      throw new Error(`Local upload failed: ${error.message}`);
    }
  }

  async getContent(tenantId: string, contentId: string): Promise<Buffer | null> {
    try {
      const filePath = await this.findFilePath(tenantId, contentId);
      if (!filePath) return null;
      return await fs.readFile(filePath);
    } catch (error: any) {
       if (error.code === 'ENOENT') return null; // File not found
      logger.error('Local content retrieval failed:', error);
      throw new Error(`Content retrieval failed: ${error.message}`);
    }
  }

  async getContentUrl(tenantId: string, contentId: string): Promise<string> {
    try {
      const filePath = await this.findFilePath(tenantId, contentId);
      if (!filePath) {
        throw new Error('Content not found in local storage');
      }
      return this.getPublicUrl(filePath);
    } catch (error: any) {
      logger.error('Local URL generation failed:', error);
      throw new Error(`URL generation failed: ${error.message}`);
    }
  }

  async deleteContent(tenantId: string, contentId: string): Promise<void> {
    try {
      const filePath = await this.findFilePath(tenantId, contentId);
      if (filePath) {
        await fs.unlink(filePath);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
         logger.warn(`File not found for deletion, assuming already deleted: ${contentId}`);
         return;
      }
      logger.error('Local deletion failed:', error);
      throw new Error(`Content deletion failed: ${error.message}`);
    }
  }

  async listContent(tenantId: string): Promise<LocalFileObject[]> {
    const tenantDir = path.join(this.basePath, tenantId);
    try {
        await fs.access(tenantDir);
    } catch {
        return []; // Directory doesn't exist
    }

    const allFiles: LocalFileObject[] = [];
    const filesInDir = await fs.readdir(tenantDir);

    for (const file of filesInDir) {
        const filePath = path.join(tenantDir, file);
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
            allFiles.push({
                Key: filePath,
                Size: stat.size,
                LastModified: stat.mtime
            });
        }
    }
    return allFiles;
  }

  private generateFilePath(tenantId: string, contentId: string, originalName: string): string {
    const extension = path.extname(originalName);
    const fileName = `${contentId}${extension}`;
    return path.join(this.basePath, tenantId, fileName);
  }

  private getPublicUrl(filePath: string): string {
    // This creates a URL relative to the storage base path
    const relativePath = path.relative(this.basePath, filePath);
    // Use forward slashes for URL compatibility
    return `/storage/${relativePath.replace(/\\/g, '/')}`;
  }

  private async findFilePath(tenantId: string, contentId: string): Promise<string | null> {
    const tenantDir = path.join(this.basePath, tenantId);
    try {
      const files = await fs.readdir(tenantDir);
      const matchingFile = files.find(file => file.startsWith(contentId));
      return matchingFile ? path.join(tenantDir, matchingFile) : null;
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }
}