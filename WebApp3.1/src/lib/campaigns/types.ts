// src/lib/campaigns/types.ts

export interface SegmentInfo {
    _id: string;
    name: string;
}

// NOTE: The concept of multiple variants is removed for now to align with the backend.
// A campaign now has one set of content/metadata fields.

// This interface now mirrors the Mongoose schema in campaign.model.ts
export interface Campaign {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'ended' | 'draft' | 'scheduled' | 'completed' | 'expired';
  type: 'banner' | 'video' | 'popup' | 'notification';
  
  rules: {
    segments: string[];
    schedule: {
      startTime: string; // ISO Date string
      endTime: string;   // ISO Date string
    };
    // These are on the backend model, so we add them here for type safety
    frequencyCapping?: any;
    targeting?: any;
  };

  // The backend stores a single set of metadata, not per-variant
  metadata: {
      imageUrl?: string;
      actionUrl?: string;
      ctaText?: string;
      placementId?: string;
      bannerColor?: string;
      bannerIcon?: string;
      ctaBackgroundColor?: string;
      ctaTextColor?: string;
      // The backend expects a 'contentText' field inside metadata
      contentText?: string;
  };
  
  // The backend aggregates statistics at the top level
  statistics: {
    impressions: number;
    clicks: number;
    conversions: number;
  };
  
  priority: number;
  createdBy: string;
  updatedAt: string;
  segmentDetails?: SegmentInfo[];
}

// This DTO must match what the api-service's createCampaign endpoint builds
export interface NewCampaignData {
  name: string;
  type: string;
  // This is a temporary field required by the api-service's DTO
  content: string; 
  segments: string[];
  schedule: {
    startTime: string;
    endTime: string;
  };
  priority: number;
  // We send a single metadata object
  metadata: Campaign['metadata'];
}