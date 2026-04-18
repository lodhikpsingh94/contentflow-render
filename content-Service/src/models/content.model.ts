export interface ContentAsset {
  id: string;
  tenantId: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  optimizedUrls: {
    original: string;
    thumbnail?: string;
    mobile?: string;
    web?: string;
  };
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentUploadRequest {
  tenantId: string;
  file: Buffer;
  originalName: string;
  mimeType: string;
  metadata?: Record<string, any>;
}

export interface ContentOptimizationOptions {
  generateThumbnail: boolean;
  resizeForWeb: boolean;
  resizeForMobile: boolean;
  compress: boolean;
}

// --- ADD THE FOLLOWING NEW INTERFACES ---

export interface ContentListResponse {
    data: ContentAsset[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface ContentUpdateRequest {
    metadata?: Record<string, any>;
    tags?: string[];
}

export interface StorageProvider {
  uploadContent(request: ContentUploadRequest & { contentId: string }): Promise<ContentAsset>;
  getContent(tenantId: string, contentId: string): Promise<Buffer | null>;
  getContentUrl(tenantId: string, contentId: string): Promise<string>;
  deleteContent(tenantId: string, contentId: string): Promise<void>;
  listContent(tenantId: string, prefix?: string): Promise<any[]>; // Return type can be more specific
}