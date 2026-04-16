export interface ContentAsset {
  _id: string;
  tenantId: string;
  name: string;
  mimeType: string;
  size: number;
  folder?: string;
  tags?: string[];
  uploadedBy?: string;
  storageKey: string;
  publicUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedContentResponse {
    data: ContentAsset[];
    metadata: {
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        }
    }
}