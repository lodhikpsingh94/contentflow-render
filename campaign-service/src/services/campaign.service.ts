import { FilterQuery, Types } from 'mongoose';
import { Campaign, ICampaign, CampaignRules } from '../models/campaign.model';
import { CampaignEvaluationRequest, CampaignEvaluationResult, PaginationParams, PaginatedResponse } from '../models/types';
import { redisClient } from '../cache/redis.client';
import { logger } from '../utils/logger';
import { validateCampaign } from '../utils/validators';

export class CampaignService {
  async createCampaign(tenantId: string, campaignData: Partial<ICampaign>, userId: string): Promise<ICampaign> {
    const { error } = validateCampaign(campaignData);
    if (error) {
      throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }

    const campaign = new Campaign({
      ...campaignData,
      tenantId,
      createdBy: userId,
      updatedBy: userId,
    });

    await campaign.save();

    // Invalidate tenant campaign caches so next evaluate picks up the new campaign
    await redisClient.clearTenantCache(tenantId);
    
    logger.info('Campaign created', { campaignId: campaign._id, tenantId, userId });
    return campaign;
  }

  async getCampaignById(campaignId: string, tenantId: string): Promise<ICampaign | null> {
    const cacheKey = `campaign:${campaignId}`;
    
    const cachedCampaign = await redisClient.getForTenant<ICampaign>(tenantId, cacheKey);
    if (cachedCampaign) {
      return cachedCampaign;
    }

    const campaign = await Campaign.findOne({ _id: campaignId, tenantId });
    if (campaign) {
      await redisClient.setForTenant(tenantId, cacheKey, campaign, 300); // Cache for 5 minutes
    }

    return campaign;
  }

  async getCampaigns(
    tenantId: string, 
    params: PaginationParams & { status?: string; type?: string }
  ): Promise<PaginatedResponse<ICampaign>> {
    const { page, limit, status, type } = params;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<ICampaign> = { tenantId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter)
        .sort({ createdAt: -1})
        .skip(skip)
        .limit(limit)
        .lean(),
      Campaign.countDocuments(filter)
    ]);

    return {
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async updateCampaign(
      campaignId: string, 
      tenantId: string, 
      updateData: Partial<ICampaign>, // It accepts a Partial<ICampaign> which is perfect for PATCH
      userId: string
      ): Promise<ICampaign | null> {
      // ...
      const campaign = await Campaign.findOneAndUpdate(
        { _id: campaignId, tenantId },
        { 
          ...updateData, // Spreads the partial data
          updatedBy: userId,
          updatedAt: new Date() 
        },
        { new: true, runValidators: true }
      );

    if (campaign) {
      // Clear cache
      await redisClient.deleteForTenant(tenantId, `campaign:${campaignId}`);
      await redisClient.clearTenantCache(tenantId);
      
      logger.info('Campaign updated', { campaignId, tenantId, userId });
    }

    return campaign;
  }

    // --- ADD THIS NEW METHOD FOR PARTIAL UPDATES ---
  async updateCampaignPartial(
    campaignId: string,
    tenantId: string,
    updateData: Partial<ICampaign>, // Accepts partial data like { status: 'paused' }
    userId: string
  ): Promise<ICampaign | null> {
    // This method intentionally skips the strict Joi validation for full objects.
    // It's designed for PATCH requests.

    const campaign = await Campaign.findOneAndUpdate(
      { _id: campaignId, tenantId },
      { 
        $set: {
          ...updateData, // Use $set to apply partial updates
          updatedBy: userId,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true } // runValidators is still good practice
    );

    if (campaign) {
      // Clear relevant caches
      await redisClient.deleteForTenant(tenantId, `campaign:${campaignId}`);
      await redisClient.clearTenantCache(tenantId);
      
      logger.info('Campaign partially updated', { campaignId, tenantId, userId, fields: Object.keys(updateData) });
    }

    return campaign;
  }

  async deleteCampaign(campaignId: string, tenantId: string, userId: string): Promise<boolean> {
    const result = await Campaign.findOneAndDelete({ _id: campaignId, tenantId });
    
    if (result) {
      // Clear cache
      await redisClient.deleteForTenant(tenantId, `campaign:${campaignId}`);
      await redisClient.clearTenantCache(tenantId);
      
      logger.info('Campaign deleted', { campaignId, tenantId, userId });
      return true;
    }

    return false;
  }

  async evaluateCampaigns(evaluationRequest: CampaignEvaluationRequest): Promise<ICampaign[]> {
    const req = evaluationRequest as any;
    const { tenantId, context, placementId } = evaluationRequest;

    // Segments are now server-computed and injected by api-service.
    const segments: string[] = req.segments || [];

    // Normalise device — SDK may send `deviceInfo`, typed contract uses `device`
    const device = req.device || req.deviceInfo || {};

    // Normalise location
    const rawLocation = req.location || {};
    const location = rawLocation.country
      ? rawLocation
      : { country: req.attributes?.country || req.context?.country || '' };

    const attributes = req.attributes || {};

    // ── Campaign catalogue cache (per tenant × placement, 2 min TTL) ──────────
    // api-service owns the per-user result cache (30 s).
    // campaign-service owns the candidate catalogue per placement (2 min).
    const catalogueCacheKey = `campaigns:catalogue:${tenantId}:${placementId || 'all'}`;
    let activeCampaigns = await redisClient.getForTenant<ICampaign[]>(tenantId, catalogueCacheKey);

    if (!activeCampaigns) {
      // Project only fields needed for rendering — no statistics, budget, or approval history.
      const RENDER_PROJECTION = {
        _id: 1, name: 1, type: 1, subType: 1, status: 1, priority: 1,
        placementIds: 1,
        content: 1,    // bilingual content blocks (ar / en)
        metadata: 1,   // dashboard-created campaigns store imageUrl / ctaText here
        'rules.segments': 1,
        'rules.targeting': 1,
        'rules.schedule.startTime': 1,
        'rules.schedule.endTime': 1,
        'rules.schedule.timezone': 1,
        'rules.frequencyCapping': 1,
      };

      const query: any = {
        tenantId,
        status: { $in: ['active', 'approved', 'scheduled'] },
        'rules.schedule.startTime': { $lte: new Date() },
        'rules.schedule.endTime':   { $gte: new Date() },
      };

      // Push placement filter into MongoDB — uses the compound index so only
      // campaigns relevant to this placement slot are returned.
      if (placementId) {
        query.placementIds = placementId;
      }

      activeCampaigns = await Campaign.find(query, RENDER_PROJECTION).lean() as ICampaign[];

      // Cache catalogue for 2 minutes — invalidated on campaign mutations.
      await redisClient.setForTenant(tenantId, catalogueCacheKey, activeCampaigns, 120);
    }

    logger.info(
      `[evaluate] tenant=${tenantId} placement=${placementId} ` +
      `candidates=${activeCampaigns.length} segments=${segments.length}`
    );

    const eligibleCampaigns = activeCampaigns.filter(campaign =>
      this.evaluateCampaign(campaign, { segments, attributes, device, location, context })
    );

    return eligibleCampaigns.sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));
  }

  private evaluateCampaign(
    campaign: ICampaign,
    userContext: any
  ): boolean {
    const rules = campaign.rules;
    const DEBUG = process.env.CAMPAIGN_EVAL_DEBUG === 'true';
    if (DEBUG) logger.debug(`[evaluate] checking campaign "${campaign.name}" (${campaign._id})`);

    // ── 1. PDPL / channel consent gate ────────────────────────────────────────
    // This is a hard block based on campaign TYPE, applied before any targeting.
    // The user's consent state is pre-loaded by api-service from UserProfile and
    // forwarded in the enriched context.  If consent is absent (new user, unknown)
    // we pass through — tolerant evaluation.
    if (userContext.consent) {
      if (this.isBlockedByChannelConsent(campaign.type, userContext.consent)) {
        if (DEBUG) logger.debug(`[evaluate] ❌ blocked by channel consent — type: ${campaign.type}`);
        return false;
      }
    }

    // ── 2. Segment check ──────────────────────────────────────────────────────
    // Segments are pre-computed server-side (background segment refresh) and
    // forwarded by api-service.  Empty segments = membership unknown → pass.
    if (rules.segments?.length > 0 && userContext.segments?.length > 0) {
      const matched = rules.segments.some((s: string) => userContext.segments.includes(s));
      if (!matched) {
        if (DEBUG) logger.debug(`[evaluate] ❌ segment mismatch — required: ${rules.segments}`);
        return false;
      }
    }

    // ── 3. Schedule window ────────────────────────────────────────────────────
    // Redundant with DB query but cheap; guards against clock skew on cache hits.
    if (!this.isWithinSchedule(rules.schedule)) {
      if (DEBUG) logger.debug(`[evaluate] ❌ outside schedule window`);
      return false;
    }

    // ── 4. Targeting rules (geo, device, user attributes, custom) ─────────────
    if (!this.evaluateTargetingRules(rules.targeting, userContext)) {
      if (DEBUG) logger.debug(`[evaluate] ❌ targeting rules failed`);
      return false;
    }

    // ── 5. Budget / impression constraints ────────────────────────────────────
    if (!this.checkConstraints(campaign)) {
      if (DEBUG) logger.debug(`[evaluate] ❌ constraints failed`);
      return false;
    }

    if (DEBUG) logger.debug(`[evaluate] ✅ matched "${campaign.name}"`);
    return true;
  }

  /**
   * Returns true if the user has NOT consented to the channel required by
   * this campaign type.  When consent state is unknown (undefined / null)
   * we return false (do NOT block) — tolerant evaluation.
   */
  private isBlockedByChannelConsent(campaignType: string, consent: any): boolean {
    switch (campaignType) {
      case 'push_notification':
        return consent.push === false;
      case 'sms':
        return consent.sms === false;
      case 'whatsapp':
        return consent.whatsapp === false;
      case 'banner':
      case 'video':
      case 'popup':
      case 'inapp_notification':
        return consent.marketing === false;
      default:
        return false;
    }
  }

  private isWithinSchedule(schedule: any): boolean {
    const now = new Date();
    return now >= schedule.startTime && now <= schedule.endTime;
  }

  private evaluateTargetingRules(targeting: any, userContext: any): boolean {
    if (!targeting) return true;

    // Tolerant evaluation: if the campaign targets a dimension but the user's
    // value for that dimension is unknown/empty, pass through rather than block.
    // We only reject on a positive mismatch (known value not in the allowed set).

    // 1. Geographic targeting
    if (targeting.geo?.countries?.length > 0) {
      const userCountry = userContext.location?.country;
      if (userCountry && !targeting.geo.countries.includes(userCountry)) return false;
    }

    // 2. Device / platform targeting
    if (targeting.devices?.platforms?.length > 0) {
      const required = targeting.devices.platforms.map((p: string) => p.toLowerCase());
      const userPlatform = (
        userContext.device?.platform ||
        userContext.deviceInfo?.platform ||
        ''
      ).toLowerCase();
      if (userPlatform && !required.includes(userPlatform)) return false;
    }

    // 3. User-attribute segment targeting
    if (targeting.userAttributes?.segments?.length > 0 && userContext.segments?.length > 0) {
      const matched = targeting.userAttributes.segments.some((s: string) =>
        userContext.segments.includes(s)
      );
      if (!matched) return false;
    }

    // 4. PDPL consent gate (campaign-level channel consent)
    if (targeting.userAttributes?.requireMarketingConsent && userContext.consent?.marketing === false) {
      return false;
    }

    // 5. Custom attribute rules
    if (targeting.customRules?.length > 0) {
      for (const rule of targeting.customRules) {
        if (!this.evaluateCustomRule(rule, userContext.attributes || {})) return false;
      }
    }

    return true;
  }

  private evaluateCustomRule(rule: any, attributes: any): boolean {
    const value = attributes[rule.field];
    
    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'not_equals':
        return value !== rule.value;
      case 'contains':
        return value && value.includes(rule.value);
      case 'greater_than':
        return value > rule.value;
      case 'less_than':
        return value < rule.value;
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(value);
      case 'exists':
        return rule.value ? value !== undefined : value === undefined;
      default:
        return false;
    }
  }

  private checkConstraints(campaign: ICampaign): boolean {
    // Check budget constraints
    if (campaign.budget) {
      if (campaign.budget.total > 0 && campaign.budget.spent >= campaign.budget.total) {
        return false;
      }
      if (campaign.budget.dailyLimit > 0) {
        // Would need to check daily spend from analytics
        // For now, assume it's within limit
      }
    }

    // Check impression constraints
    if (campaign.rules.constraints?.maxImpressions) {
      if (campaign.statistics.impressions >= campaign.rules.constraints.maxImpressions) {
        return false;
      }
    }

    return true;
  }

  async updateCampaignStatistics(
    campaignId: string,
    tenantId: string,
    updates: {
      impressions?: number;
      clicks?: number;
      conversions?: number;
      spend?: number;
    }
  ): Promise<ICampaign | null> {
    const updateFields: any = {};
    
    if (updates.impressions !== undefined) {
      updateFields.$inc = { ...updateFields.$inc, 'statistics.impressions': updates.impressions };
    }
    if (updates.clicks !== undefined) {
      updateFields.$inc = { ...updateFields.$inc, 'statistics.clicks': updates.clicks };
    }
    if (updates.conversions !== undefined) {
      updateFields.$inc = { ...updateFields.$inc, 'statistics.conversions': updates.conversions };
    }
    if (updates.spend !== undefined) {
      updateFields.$inc = { 
        ...updateFields.$inc, 
        'statistics.spend': updates.spend,
        'budget.spent': updates.spend 
      };
    }

    updateFields.$set = { 'statistics.lastUpdated': new Date() };

    // Recalculate derived metrics
    const campaign = await Campaign.findOne({ _id: campaignId, tenantId });
    if (campaign) {
      const stats = campaign.statistics;
      stats.ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
      stats.cpc = stats.clicks > 0 ? stats.spend / stats.clicks : 0;
      
      updateFields.$set = {
        ...updateFields.$set,
        'statistics.ctr': stats.ctr,
        'statistics.cpc': stats.cpc,
      };
    }

    const updatedCampaign = await Campaign.findOneAndUpdate(
      { _id: campaignId, tenantId },
      updateFields,
      { new: true }
    );

    if (updatedCampaign) {
      await redisClient.deleteForTenant(tenantId, `campaign:${campaignId}`);
    }

    return updatedCampaign;
  }

  async validateCampaign(campaignId: string, tenantId: string): Promise<boolean> {
    const campaign = await this.getCampaignById(campaignId, tenantId);
    return !!campaign && campaign.status === 'active';
  }
}

export const campaignService = new CampaignService();