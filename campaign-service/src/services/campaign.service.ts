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
    
    // Clear cache for tenant campaigns
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
    const req = evaluationRequest as any; // allow extra SDK fields
    const { tenantId, context, placementId } = evaluationRequest;
    const segments: string[] = req.segments || [];

    // ── Normalise device: SDK sends `deviceInfo`, typed contract uses `device` ──
    const device = req.device || req.deviceInfo || {};

    // ── Normalise location: SDK sends `location: {}` or country inside attributes ──
    const rawLocation = req.location || {};
    const location = (rawLocation.country)
      ? rawLocation
      : { country: req.attributes?.country || req.context?.country || '' };

    const attributes = req.attributes || {};

    const cacheKey = `campaigns:eval:${tenantId}:${placementId || 'all'}:${segments.join(',')}`;

    const cachedResult = await redisClient.getForTenant<ICampaign[]>(tenantId, cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Fetch all non-terminal campaigns within their schedule window.
    // Include 'active', 'approved', and 'scheduled' so test campaigns that haven't
    // been fully activated yet are still reachable.
    // Project only the fields the SDK needs to render — no statistics, no approval
    // history, no targeting details (already evaluated server-side), no budget.
    const RENDER_PROJECTION = {
      _id: 1,
      name: 1,
      type: 1,
      subType: 1,
      status: 1,
      priority: 1,
      placementIds: 1,
      content: 1,       // bilingual content blocks (ar/en)
      metadata: 1,      // dashboard-created campaigns store content here
      // Minimal rules — client needs schedule for countdowns and
      // frequencyCapping for client-side impression caps; nothing else.
      'rules.schedule.startTime': 1,
      'rules.schedule.endTime': 1,
      'rules.schedule.timezone': 1,
      'rules.frequencyCapping': 1,
    };

    const activeCampaigns = await Campaign.find({
      tenantId,
      status: { $in: ['active', 'approved', 'scheduled'] },
      'rules.schedule.startTime': { $lte: new Date() },
      'rules.schedule.endTime': { $gte: new Date() },
    }, RENDER_PROJECTION).lean();

    logger.info(`[evaluate] tenant=${tenantId} placementId=${placementId} candidateCampaigns=${activeCampaigns.length} userSegments=${segments.length}`);

    const eligibleCampaigns = activeCampaigns.filter(campaign =>
      this.evaluateCampaign(campaign, { segments, attributes, device, location, context })
    );

    // Sort by priority and cache result
    const sortedCampaigns = eligibleCampaigns.sort((a, b) => b.priority - a.priority);
    await redisClient.setForTenant(tenantId, cacheKey, sortedCampaigns, 60); // Cache for 1 minute

    return sortedCampaigns;
  }

  private evaluateCampaign(
    campaign: ICampaign, 
    userContext: any
  ): boolean {
    const rules = campaign.rules;
    const cid = campaign._id; // Short alias for logging

    console.log(`[DEBUG] Evaluating Campaign: ${campaign.name} (${cid})`);

    // 1. Check segments — only enforce when we actually know the user's segments.
    //    An empty segments array means "context unknown"; we let the campaign through
    //    rather than blocking everyone whose segment membership hasn't been resolved yet.
    if (rules.segments && rules.segments.length > 0 && userContext.segments?.length > 0) {
      const hasMatchingSegment = rules.segments.some((segment: string) =>
        userContext.segments.includes(segment)
      );
      if (!hasMatchingSegment) {
        console.log(`[DEBUG] ❌ Failed Segment Check. Required: ${rules.segments}, User has: ${userContext.segments}`);
        return false;
      }
    }

    // 2. Check schedule
    if (!this.isWithinSchedule(rules.schedule)) {
        console.log(`[DEBUG] ❌ Failed Schedule Check.`);
        return false;
    }

    // 3. Check targeting rules
    if (!this.evaluateTargetingRules(rules.targeting, userContext)) {
        console.log(`[DEBUG] ❌ Failed Targeting Rules.`);
        return false;
    }

    // 4. Check constraints
    if (!this.checkConstraints(campaign)) {
        console.log(`[DEBUG] ❌ Failed Constraints.`);
        return false;
    }

    console.log(`[DEBUG] ✅ Campaign Matched!`);
    return true;
  }

  private isWithinSchedule(schedule: any): boolean {
    const now = new Date();
    return now >= schedule.startTime && now <= schedule.endTime;
  }

  private evaluateTargetingRules(targeting: any, userContext: any): boolean {
    if (!targeting) return true; // No targeting rules = pass

    // General principle: if a targeting dimension is set on the campaign but
    // the corresponding user context field is unknown/empty, we give the user
    // the benefit of the doubt and let the campaign through.  We only BLOCK
    // when we have a positive mismatch (known value that isn't in the allowed set).

    // 1. Geographic targeting
    if (targeting.geo?.countries?.length > 0) {
      const userCountry = userContext.location?.country;
      if (userCountry) {
        if (!targeting.geo.countries.includes(userCountry)) {
          console.log(`[DEBUG] -- Failed Geo. Required: ${targeting.geo.countries}, User: ${userCountry}`);
          return false;
        }
      }
      // unknown country → pass through
    }

    // 2. Device / platform targeting
    if (targeting.devices?.platforms?.length > 0) {
      const required = targeting.devices.platforms.map((p: string) => p.toLowerCase());
      // Accept both device.platform (typed contract) and deviceInfo.platform (SDK field)
      const userPlatform = (
        userContext.device?.platform ||
        userContext.deviceInfo?.platform ||
        ''
      ).toLowerCase();

      if (userPlatform) {
        if (!required.includes(userPlatform)) {
          console.log(`[DEBUG] -- Failed Platform. Required: ${required}, User: ${userPlatform}`);
          return false;
        }
      }
      // unknown platform → pass through
    }

    // 3. User-attribute segment targeting — only enforce when user segments are known
    if (targeting.userAttributes?.segments?.length > 0 && userContext.segments?.length > 0) {
      const hasMatchingSegment = targeting.userAttributes.segments.some((segment: string) =>
        userContext.segments.includes(segment)
      );
      if (!hasMatchingSegment) {
        console.log(`[DEBUG] -- Failed Attribute Segment. Required: ${targeting.userAttributes.segments}, User has: ${userContext.segments}`);
        return false;
      }
    }

    // 4. Custom rules
    if (targeting.customRules?.length > 0) {
      for (const rule of targeting.customRules) {
        if (!this.evaluateCustomRule(rule, userContext.attributes || {})) {
          console.log(`[DEBUG] -- Failed Custom Rule: ${rule.field} ${rule.operator} ${rule.value}`);
          return false;
        }
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