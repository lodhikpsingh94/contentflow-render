import { Request, Response } from 'express';
import { campaignService } from '../services/campaign.service';
import { validationService } from '../services/validation.service';
import { TenantContext } from '../models/types';
import { validateCampaign, validatePagination } from '../utils/validators';
import { logger } from '../utils/logger';

export class CampaignHandler {
  async createCampaign(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId, userId } = tenantContext;

      // Validate request body
      const { error } = validateCampaign(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        });
        return;
      }

      // Check tenant limits
      const limitCheck = await validationService.checkTenantLimits(tenantId);
      if (!limitCheck.canCreateCampaign) {
        res.status(403).json({
          success: false,
          error: limitCheck.reason,
        });
        return;
      }

      // Validate campaign data
      const validation = await validationService.validateCampaignCreation(tenantId, req.body);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        });
        return;
      }

      const campaign = await campaignService.createCampaign(tenantId, req.body, userId);

      res.status(201).json({
        success: true,
        data: campaign,
        metadata: {
          tenantId,
          campaignId: campaign._id,
        },
      });
    } catch (error: any) {
      logger.error('Create campaign error:', error);
      // Surface the actual error message so callers can diagnose the problem
      const message = error?.message || 'Failed to create campaign';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  async getCampaign(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId } = tenantContext;
      const { id } = req.params;

      const campaign = await campaignService.getCampaignById(id, tenantId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
        metadata: { tenantId },
      });
    } catch (error) {
      logger.error('Get campaign error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get campaign',
      });
    }
  }

  async getCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId } = tenantContext;

      // Validate query parameters
      const { error, value } = validatePagination(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: `Invalid query parameters: ${error.details.map(d => d.message).join(', ')}`,
        });
        return;
      }

      const campaigns = await campaignService.getCampaigns(tenantId, value);

      res.json({
        success: true,
        data: campaigns.data,
        metadata: {
          tenantId,
          pagination: campaigns.pagination,
        },
      });
    } catch (error) {
      logger.error('Get campaigns error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get campaigns',
      });
    }
  }

  async updateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId, userId } = tenantContext;
      const { id } = req.params;

      // Validate request body
      const { error } = validateCampaign(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        });
        return;
      }

      const campaign = await campaignService.updateCampaign(id, tenantId, req.body, userId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
        metadata: {
          tenantId,
          campaignId: campaign._id,
        },
      });
    } catch (error) {
      logger.error('Update campaign error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update campaign',
      });
    }
  }

    // --- ADD THIS NEW HANDLER FOR THE PATCH REQUEST ---
  async updateCampaignPartial(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId, userId } = tenantContext;
      const { id } = req.params;

      // This handler does not use the strict `validateCampaign` middleware.
      // It trusts that the fields provided are correct (e.g., { status: '...' }).
      const campaign = await campaignService.updateCampaignPartial(id, tenantId, req.body, userId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
        metadata: {
          tenantId,
          campaignId: campaign._id,
        },
      });
    } catch (error) {
      logger.error('Partial update campaign error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update campaign',
      });
    }
  }

  async deleteCampaign(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId, userId } = tenantContext;
      const { id } = req.params;

      const deleted = await campaignService.deleteCampaign(id, tenantId, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { deleted: true },
        metadata: { tenantId, campaignId: id },
      });
    } catch (error) {
      logger.error('Delete campaign error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete campaign',
      });
    }
  }

  async evaluateCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId } = tenantContext;

      const evaluationRequest = {
        tenantId,
        ...req.body,
        timestamp: new Date(),
      };

      const campaigns = await campaignService.evaluateCampaigns(evaluationRequest);

      res.json({
        success: true,
        data: campaigns,
        metadata: {
          tenantId,
          userId: evaluationRequest.userId,
          campaignCount: campaigns.length,
        },
      });
    } catch (error) {
      logger.error('Evaluate campaigns error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to evaluate campaigns',
      });
    }
  }

  async validateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId } = tenantContext;
      const { id } = req.params;

      const isValid = await campaignService.validateCampaign(id, tenantId);

      res.json({
        success: true,
        data: { valid: isValid },
        metadata: { tenantId, campaignId: id },
      });
    } catch (error) {
      logger.error('Validate campaign error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate campaign',
      });
    }
  }

  async updateStatistics(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId } = tenantContext;
      const { id } = req.params;
      const updates = req.body;

      const campaign = await campaignService.updateCampaignStatistics(id, tenantId, updates);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign.statistics,
        metadata: {
          tenantId,
          campaignId: campaign._id,
        },
      });
    } catch (error) {
      logger.error('Update statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update campaign statistics',
      });
    }
  }
}

export const campaignHandler = new CampaignHandler();