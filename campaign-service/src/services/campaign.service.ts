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
    const { tenantId, segments, attributes, device, location, context, placementId } = evaluationRequest;
    
    const cacheKey = `campaigns:eval:${tenantId}:${placementId || 'all'}:${segments.join(',')}`;
    
    const cachedResult = await redisClient.getForTenant<ICampaign[]>(tenantId, cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // --- UPDATED QUERY LOGIC ---
    const query: FilterQuery<ICampaign> = {
      tenantId,
      status: 'active',
      'rules.schedule.startTime': { $lte: new Date() },
      'rules.schedule.endTime': { $gte: new Date() },
    };
    // Add placementId to the query if it was provided

    // Optimization: If placementId is provided, only fetch campaigns 
    // that specifically target this placement (stored in metadata)
    // OR campaigns that have no specific placement set (global campaigns).
    if (placementId) {
      query.$or = [
        { 'metadata.placementId': placementId },
        { 'metadata.placementId': { $exists: false } },
        { 'metadata.placementId': null },
        { 'metadata.placementId': '' }
      ];
    }
    // ---------------------------
    // Get active campaigns for tenant
    const activeCampaigns = await Campaign.find({
      tenantId,
      status: 'active',
      'rules.schedule.startTime': { $lte: new Date() },
      'rules.schedule.endTime': { $gte: new Date() },
    }).lean();

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

    // 1. Check segments
    if (rules.segments && rules.segments.length > 0) {
      const hasMatchingSegment = rules.segments.some(segment =>
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

  // Also add logging to evaluateTargetingRules for deeper insight
  private evaluateTargetingRules(targeting: any, userContext: any): boolean {
      if (!targeting) return true; // No targeting rules = pass

      // 1. Check geographic targeting (Safe access)
      if (targeting.geo?.countries?.length > 0) {
        if (!targeting.geo.countries.includes(userContext.location?.country)) {
          console.log(`[DEBUG] -- Failed Geo. Required: ${targeting.geo.countries}, User: ${userContext.location?.country}`);
          return false;
        }
      }

      // 2. Check device targeting (Safe access)
      if (targeting.devices?.platforms?.length > 0) {
        // Normalize to lowercase for comparison
        const required = targeting.devices.platforms.map((p: string) => p.toLowerCase());
        const userPlatform = (userContext.device?.platform || '').toLowerCase();
        
        if (!required.includes(userPlatform)) {
          console.log(`[DEBUG] -- Failed Platform. Required: ${required}, User: ${userPlatform}`);
          return false;
        }
      }

      // 3. Check user attributes (Safe access - FIX FOR YOUR ERROR)
      if (targeting.userAttributes?.segments?.length > 0) {
        const hasMatchingSegment = targeting.userAttributes.segments.some((segment: string) =>
          userContext.segments?.includes(segment)
        );
        if (!hasMatchingSegment) {
          console.log(`[DEBUG] -- Failed Attribute Segment. Required: ${targeting.userAttributes.segments}, User has: ${userContext.segments}`);
          return false;
        }
      }

      // 4. Check custom rules (Safe access)
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