import { Injectable } from '@nestjs/common';
import { BaseClient } from './base.client';
import { ServiceResponse } from '../models/shared/common.types';

export interface ContentItem {
  id: string;
  type: 'banner' | 'video' | 'popup';
  title: string;
  content: string;
  status: 'active' | 'inactive' | 'archived';
  metadata: ContentMetadata;
  assets: ContentAssets;
  campaignId: string;
  priority: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentMetadata {
  width?: number;
  height?: number;
  duration?: number; // for videos
  fileSize?: number;
  mimeType?: string;
  altText?: string;
  callToAction?: string;
  tags: string[];
  categories: string[];
}

export interface ContentAssets {
  images: ImageAsset[];
  videos: VideoAsset[];
  tracking: TrackingAssets;
  styles?: ContentStyles;
}

export interface ImageAsset {
  url: string;
  width: number;
  height: number;
  format: string;
  quality: number;
}

export interface VideoAsset {
  url: string;
  duration: number;
  format: string;
  thumbnail: string;
  fileSize: number;
}

export interface TrackingAssets {
  impressionUrl: string;
  clickUrl: string;
  closeUrl?: string;
  conversionUrl?: string;
}

export interface ContentStyles {
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  borderRadius?: number;
  animation?: string;
}

@Injectable()
export class ContentClient extends BaseClient {
  constructor() {
    super(
      `${process.env.CONTENT_SERVICE_URL || 'http://localhost:3002'}/api/v1`, // Correct base URL with prefix
      'ContentClient',
      parseInt(process.env.CONTENT_SERVICE_TIMEOUT || '8000')
    );
  }
  // --- ADD THESE TWO NEW METHODS ---

  /**
   * Calls the content-service to get a pre-signed URL for uploading.
   */
  async generateSignedUploadUrl(
    tenantId: string, 
    fileName: string, 
    mimeType: string, 
    authToken?: string
  ): Promise<ServiceResponse<any>> {
    const forwardedHeaders = authToken ? { Authorization: authToken } : undefined;
    return this.request<any>({
      method: 'POST',
      url: '/content/generate-upload-url',
      data: { fileName, mimeType },
    }, tenantId, forwardedHeaders);
  }

  /**
   * Calls the content-service to confirm an upload is complete and save metadata.
   */
  async finalizeUpload(
    payload: any, 
    tenantId: string, 
    authToken?: string
  ): Promise<ServiceResponse<any>> {
    const forwardedHeaders = authToken ? { Authorization: authToken } : undefined;
    return this.request<any>({
      method: 'POST',
      url: '/content/finalize-upload',
      data: payload,
    }, tenantId, forwardedHeaders);
  }
  
  async getContentByIds(ids: string[], tenantId: string): Promise<ServiceResponse<ContentItem[]>> {
    return this.request<ContentItem[]>({
      method: 'POST',
      url: '/content/batch',
      data: { 
        ids,
        tenantId,
      },
    }, tenantId);
  }

  async listContent(
    tenantId: string,
    page: number = 1,
    limit: number = 50,
    authToken?: string
  ): Promise<ServiceResponse<any>> {
    // Create the headers object to forward
    const forwardedHeaders = authToken ? { Authorization: authToken } : undefined;

    return this.request<any>({
      method: 'GET',
      url: '/content',
      params: { page, limit },
    }, tenantId, forwardedHeaders); // Pass headers as the third argument
  }

  async validateContent(contentId: string, tenantId: string): Promise<ServiceResponse<boolean>> {
    return this.request<boolean>({
      method: 'GET',
      url: `/content/${contentId}/validate`,
    }, tenantId);
  }

  async getContentByCampaign(campaignId: string, tenantId: string): Promise<ServiceResponse<ContentItem[]>> {
    return this.request<ContentItem[]>({
      method: 'GET',
      url: `/content/campaign/${campaignId}`,
    }, tenantId);
  }

  async uploadContent(content: Partial<ContentItem>, tenantId: string): Promise<ServiceResponse<ContentItem>> {
    return this.request<ContentItem>({
      method: 'POST',
      url: '/content',
      data: {
        ...content,
        tenantId,
      },
    }, tenantId);
  }
}