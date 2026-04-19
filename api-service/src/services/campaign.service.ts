import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { CampaignClient } from '../clients/campaign.client';
import { UserProfileClient, UserEvalContext, DEFAULT_CONSENT } from '../clients/user-profile.client';
import { Cache } from '../utils/cache';

/**
 * TTLs (seconds)
 *  USER_EVAL_CTX  — how long we cache a user's segments + consent.
 *                   Segment refresh runs in the background (hourly/daily), so 5 min is safe.
 *  EVAL_RESULT    — how long we cache the final evaluated campaign list for a given
 *                   profile combination (placementId × country × platform × segHash).
 *                   30 s batches traffic from identical-profile users without staleness risk.
 */
const USER_EVAL_CTX_TTL = 300;  // 5 minutes
const EVAL_RESULT_TTL   = 30;   // 30 seconds

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly campaignClient: CampaignClient,
    private readonly userProfileClient: UserProfileClient,
    private readonly cache: Cache,
  ) {}

  // ─── internal helpers ────────────────────────────────────────────────────────

  private async validateCampaignById(campaignId: string, tenantId: string): Promise<boolean> {
    try {
      const response = await this.campaignClient.validateCampaign(campaignId, tenantId);
      return response.success && response.data === true;
    } catch (error: any) {
      this.logger.error(`Campaign validation failed: ${error.message}`);
      return false;
    }
  }

  // ─── public API ──────────────────────────────────────────────────────────────

  async validateCampaign(campaignId: string, tenantId: string): Promise<boolean> {
    return this.validateCampaignById(campaignId, tenantId);
  }

  async getCampaignDetails(campaignId: string, tenantId: string): Promise<any> {
    try {
      const response = await this.campaignClient.getCampaignById(campaignId, tenantId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get campaign details: ${error.message}`);
      throw error;
    }
  }

  async getCampaigns(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<any> {
    try {
      const response = await this.campaignClient.getCampaignsByTenant(tenantId, page, limit, status);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get campaigns from downstream service.');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get campaigns: ${error.message}`);
      throw error;
    }
  }

  async createCampaign(campaignData: any, tenantId: string): Promise<any> {
    try {
      const response = await this.campaignClient.createCampaign(campaignData, tenantId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Campaign creation failed in downstream service.');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to create campaign: ${error.message}`);
      throw error;
    }
  }

  async updateCampaignStatus(campaignId: string, status: string, tenantId: string): Promise<any> {
    try {
      const response = await this.campaignClient.updateCampaignStatus(campaignId, status, tenantId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update campaign status.');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to update status for campaign ${campaignId}: ${error.message}`);
      throw error;
    }
  }

  async updateCampaign(campaignId: string, campaignData: any, tenantId: string): Promise<any> {
    try {
      const response = await this.campaignClient.updateCampaign(campaignId, campaignData, tenantId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update campaign.');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to update campaign ${campaignId}: ${error.message}`);
      throw error;
    }
  }

  async deleteCampaign(campaignId: string, tenantId: string): Promise<void> {
    try {
      const response = await this.campaignClient.updateCampaignStatus(campaignId, 'archived', tenantId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete campaign.');
      }
    } catch (error: any) {
      this.logger.error(`Failed to delete campaign ${campaignId}: ${error.message}`);
      throw error;
    }
  }

  // ─── evaluate pipeline ───────────────────────────────────────────────────────

  /**
   * Full evaluate pipeline optimised for millions of users:
   *
   *  1. Fetch user eval context (segments + consent) from user-segmentation-service.
   *     Cached in Redis for USER_EVAL_CTX_TTL seconds per user.
   *     On lookup failure → degrade gracefully (empty segments, default consent).
   *
   *  2. PDPL hard gate — if the user has opted out, return [] immediately.
   *     No campaign evaluation happens for opted-out users.
   *
   *  3. Build enriched context merging server-side segments with SDK-provided
   *     device and location signals (SDK has fresher real-time device state).
   *
   *  4. Check evaluated-result cache keyed by:
   *       placementId × country × platform × segHash
   *     Users sharing identical profile dimensions share one cache entry (30 s TTL).
   *     10 000 Saudi Android premium users → 1 evaluation per 30 s, not 10 000.
   *
   *  5. Call campaign-service which applies the compound-indexed MongoDB query
   *     (placementId filter + schedule window) then in-memory targeting rules.
   *
   *  6. Write result to cache, return.
   */
  async evaluateCampaigns(userContext: any, tenantId: string): Promise<any[]> {
    const userId: string = userContext.userId || '';
    const placementId: string = userContext.placementId || '';

    // ── Step 1: Fetch user eval context ───────────────────────────────────────
    let userProfile: UserEvalContext | null = null;

    if (userId) {
      const profileCacheKey = `user:eval:${userId}`;
      userProfile = await this.cache.getForTenant<UserEvalContext>(tenantId, profileCacheKey);

      if (!userProfile) {
        try {
          const response = await this.userProfileClient.getEvalContext(userId, tenantId);
          if (response.success && response.data) {
            const body = response.data as any;
            const profileData = body?.data ?? body;

            if (profileData?.userId) {
              userProfile = {
                userId:    profileData.userId,
                segments:  Array.isArray(profileData.segments) ? profileData.segments : [],
                consent:   profileData.consent ?? DEFAULT_CONSENT,
                demographic: {
                  country:   profileData.demographic?.country  ?? '',
                  language:  profileData.demographic?.language ?? 'en',
                  nationality: profileData.demographic?.nationality,
                },
                device: {
                  platform: profileData.device?.platform,
                },
              };
              await this.cache.setForTenant(tenantId, profileCacheKey, userProfile, USER_EVAL_CTX_TTL);
            }
          }
        } catch (err: any) {
          this.logger.warn(`[evaluate] Profile lookup failed for user ${userId}: ${err.message} — proceeding without segments`);
        }
      }
    }

    // ── Step 2: PDPL hard gate ────────────────────────────────────────────────
    if (userProfile?.consent?.pdplOptOut === true) {
      this.logger.debug(`[evaluate] user ${userId} has pdplOptOut=true — returning []`);
      return [];
    }

    // ── Step 3: Build enriched context ────────────────────────────────────────
    const segments = userProfile?.segments ?? [];

    const country = (
      userContext.location?.country ||
      userProfile?.demographic?.country ||
      ''
    ).toUpperCase();

    const platform = (
      userContext.device?.platform ||
      userContext.deviceInfo?.platform ||
      userProfile?.device?.platform ||
      ''
    ).toLowerCase();

    const language = (
      userContext.attributes?.language ||
      userProfile?.demographic?.language ||
      'en'
    );

    const enrichedContext = {
      ...userContext,
      tenantId,
      segments,
      consent: userProfile?.consent ?? DEFAULT_CONSENT,
      device:    { platform, ...(userContext.device ?? {}) },
      deviceInfo: userContext.deviceInfo,
      location:  country ? { country } : {},
      attributes: { language, ...(userContext.attributes ?? {}) },
    };

    // ── Step 4: Evaluated-result cache ────────────────────────────────────────
    const segHash = segments.length === 0
      ? 'none'
      : createHash('md5').update([...segments].sort().join(',')).digest('hex').slice(0, 8);
    const resultCacheKey = `eval:${placementId}:${country}:${platform}:${segHash}`;

    const cachedResult = await this.cache.getForTenant<any[]>(tenantId, resultCacheKey);
    if (cachedResult) {
      this.logger.debug(`[evaluate] result cache HIT — key=${resultCacheKey} count=${cachedResult.length}`);
      return cachedResult;
    }

    // ── Step 5: Call campaign-service ─────────────────────────────────────────
    try {
      const response = await this.campaignClient.getActiveCampaigns(enrichedContext, tenantId);
      if (!response.success) {
        throw new Error(response.error || 'Campaign evaluation failed.');
      }

      const inner = response.data as any;
      const raw: any[] = Array.isArray(inner)
        ? inner
        : Array.isArray(inner?.data) ? inner.data : [];

      const result = raw.map((c: any) => ({
        id:             c._id,
        name:           c.name,
        type:           c.type,
        subType:        c.subType,
        status:         c.status,
        priority:       c.priority ?? 5,
        placementIds:   c.placementIds ?? [],
        content:        c.content  ?? null,
        metadata:       c.metadata ?? null,
        schedule:       c.rules?.schedule
          ? {
              startTime: c.rules.schedule.startTime,
              endTime:   c.rules.schedule.endTime,
              timezone:  c.rules.schedule.timezone,
            }
          : null,
        frequencyCapping: c.rules?.frequencyCapping ?? null,
      }));

      // ── Step 6: Write result cache ──────────────────────────────────────────
      await this.cache.setForTenant(tenantId, resultCacheKey, result, EVAL_RESULT_TTL);

      this.logger.debug(`[evaluate] evaluated ${result.length} campaigns — key=${resultCacheKey}`);
      return result;

    } catch (error: any) {
      this.logger.error(`Campaign evaluation failed: ${error.message}`);
      throw error;
    }
  }
}
