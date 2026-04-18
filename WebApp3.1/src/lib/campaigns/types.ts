// src/lib/campaigns/types.ts

export interface SegmentInfo {
    _id: string;
    name: string;
}

// ─── Content block (bilingual) ────────────────────────────────────────────────
export interface ContentBlock {
  headline?: string;
  body?: string;
  ctaText?: string;
  ctaUrl?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'gif';
  direction?: 'rtl' | 'ltr';
  // SMS / WhatsApp
  whatsappTemplateId?: string;
  smsFrom?: string;
}

export interface BilingualContent {
  ar?: ContentBlock;
  en?: ContentBlock;
}

// ─── A/B variant ──────────────────────────────────────────────────────────────
export interface CampaignVariant {
  id: string;
  name: string;
  weight: number;           // 0–100, all variants must sum to 100
  content: BilingualContent;
  statistics?: {
    impressions: number;
    clicks: number;
    conversions: number;
  };
}

// ─── Approval history entry ───────────────────────────────────────────────────
export interface ApprovalHistoryEntry {
  action: 'submitted' | 'approved' | 'rejected' | 'recalled';
  by: string;
  at: string; // ISO date string
  note?: string;
}

// ─── Hijri date ───────────────────────────────────────────────────────────────
export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

// ─── Main campaign interface ──────────────────────────────────────────────────
export interface Campaign {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'ended' | 'scheduled' | 'completed' | 'expired' | 'pending_review' | 'approved' | 'rejected';
  type: 'banner' | 'video' | 'popup' | 'inapp_notification' | 'push_notification' | 'sms' | 'whatsapp';

  // Bilingual content (new model)
  content?: BilingualContent;

  // Placement IDs this campaign should appear in
  placementIds?: string[];

  // A/B variants (if present, content is per-variant)
  variants?: CampaignVariant[];
  abTestWinnerVariantId?: string;
  abTestEndCondition?: 'date' | 'impressions' | 'confidence';

  rules: {
    segments: string[];
    schedule: {
      startTime: string;
      endTime: string;
      timezone?: string;                    // default 'Asia/Riyadh'
      prayerTimeBlackout?: boolean;
      prayerTimeCity?: string;
      seasonalTag?: 'ramadan' | 'eid_fitr' | 'eid_adha' | 'national_day' | 'founding_day' | 'hajj_season' | 'custom' | null;
      hijriStart?: HijriDate;
      hijriEnd?: HijriDate;
    };
    targeting?: {
      countries?: string[];
      cities?: string[];
      platforms?: string[];
      networkOperators?: string[];
      nationalities?: string[];
      preferredLanguages?: string[];
    };
    frequencyCapping?: any;
  };

  // Legacy metadata (kept for backward compat)
  metadata?: {
    imageUrl?: string;
    actionUrl?: string;
    ctaText?: string;
    placementId?: string;       // deprecated — use placementIds[]
    bannerColor?: string;
    bannerIcon?: string;
    ctaBackgroundColor?: string;
    ctaTextColor?: string;
    contentText?: string;
  };

  budget?: {
    total?: number;
    spent?: number;
    currency?: string;          // default 'SAR'
    dailyCap?: number;
  };

  // Approval workflow
  reviewRequired?: boolean;
  approvalStatus?: 'not_required' | 'pending_review' | 'approved' | 'rejected';
  approvalHistory?: ApprovalHistoryEntry[];

  statistics: {
    impressions: number;
    clicks: number;
    conversions: number;
  };

  priority: number;
  createdBy?: string;
  updatedAt: string;
  createdAt?: string;
  segmentDetails?: SegmentInfo[];
}

// ─── DTO sent to the API on create / update ───────────────────────────────────
export interface NewCampaignData {
  name: string;
  description?: string;
  type: string;
  status?: 'draft' | 'active' | 'approved' | 'scheduled';
  content?: BilingualContent;
  placementIds?: string[];
  variants?: Omit<CampaignVariant, 'statistics'>[];
  segments: string[];
  schedule: {
    startTime: string;
    endTime: string;
    timezone?: string;
    prayerTimeBlackout?: boolean;
    prayerTimeCity?: string;
    seasonalTag?: string | null;
    hijriStart?: HijriDate;
    hijriEnd?: HijriDate;
  };
  priority: number;
  budget?: {
    total?: number;
    currency?: string;
    dailyCap?: number;
  };
  metadata?: Campaign['metadata'];
  // Legacy single-language content fields (for backward compat)
  content_legacy?: string;
}
