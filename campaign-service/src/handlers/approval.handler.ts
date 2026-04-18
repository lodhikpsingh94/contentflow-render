import { Request, Response } from 'express';
import { Campaign } from '../models/campaign.model';
import { redisClient } from '../cache/redis.client';
import { logger } from '../utils/logger';

/**
 * ApprovalHandler
 * ───────────────
 * Handles the campaign approval workflow:
 *
 *   POST /:id/submit-review   — Campaign author submits for approval
 *   POST /:id/approve         — Admin approves (status → approved / active)
 *   POST /:id/reject          — Admin rejects with a reason
 *   POST /:id/recall          — Author recalls a pending submission
 *   GET  /:tenantId/pending   — List all campaigns pending review (admin queue)
 */
export class ApprovalHandler {

  // Submit campaign for review
  async submitForReview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tenantId, userId } = req.tenantContext!;

      const campaign = await Campaign.findOne({ _id: id, tenantId });
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      if (!['draft', 'rejected'].includes(campaign.status)) {
        res.status(409).json({
          success: false,
          error: `Cannot submit a campaign with status "${campaign.status}" for review`,
        });
        return;
      }

      campaign.status = 'pending_review';
      campaign.approvalStatus = 'pending_review';
      campaign.approvalHistory.push({
        action: 'submitted',
        by: userId,
        at: new Date(),
        note: req.body.note,
      });
      await campaign.save();
      await redisClient.deleteForTenant(tenantId, `campaign:${id}`);

      logger.info(`Campaign ${id} submitted for review by ${userId}`);
      res.json({
        success: true,
        data: campaign,
        metadata: { tenantId, campaignId: id, newStatus: campaign.status },
      });
    } catch (err: any) {
      logger.error('Submit for review error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Approve a campaign
  async approve(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tenantId, userId } = req.tenantContext!;
      const { activateImmediately = false, note } = req.body;

      const campaign = await Campaign.findOne({ _id: id, tenantId });
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      if (campaign.approvalStatus !== 'pending_review') {
        res.status(409).json({
          success: false,
          error: `Campaign is not pending review (current status: ${campaign.approvalStatus})`,
        });
        return;
      }

      const now = new Date();
      const newStatus = activateImmediately
        ? 'active'
        : campaign.rules?.schedule?.startTime > now ? 'scheduled' : 'approved';

      campaign.status = newStatus;
      campaign.approvalStatus = 'approved';
      campaign.approvalHistory.push({ action: 'approved', by: userId, at: now, note });
      await campaign.save();
      await redisClient.deleteForTenant(tenantId, `campaign:${id}`);
      await redisClient.clearTenantCache(tenantId);

      logger.info(`Campaign ${id} approved by ${userId} → status: ${newStatus}`);
      res.json({
        success: true,
        data: campaign,
        metadata: { tenantId, campaignId: id, newStatus },
      });
    } catch (err: any) {
      logger.error('Approve campaign error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Reject a campaign
  async reject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tenantId, userId } = req.tenantContext!;
      const { note } = req.body;

      if (!note || !note.trim()) {
        res.status(400).json({ success: false, error: 'A rejection reason (note) is required' });
        return;
      }

      const campaign = await Campaign.findOne({ _id: id, tenantId });
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      if (campaign.approvalStatus !== 'pending_review') {
        res.status(409).json({
          success: false,
          error: `Campaign is not pending review (current: ${campaign.approvalStatus})`,
        });
        return;
      }

      campaign.status = 'rejected';
      campaign.approvalStatus = 'rejected';
      campaign.approvalHistory.push({ action: 'rejected', by: userId, at: new Date(), note });
      await campaign.save();
      await redisClient.deleteForTenant(tenantId, `campaign:${id}`);

      logger.info(`Campaign ${id} rejected by ${userId}: ${note}`);
      res.json({
        success: true,
        data: campaign,
        metadata: { tenantId, campaignId: id, newStatus: 'rejected' },
      });
    } catch (err: any) {
      logger.error('Reject campaign error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Recall a submission (back to draft)
  async recall(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tenantId, userId } = req.tenantContext!;

      const campaign = await Campaign.findOne({ _id: id, tenantId });
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      if (campaign.status !== 'pending_review') {
        res.status(409).json({
          success: false,
          error: 'Can only recall campaigns that are pending review',
        });
        return;
      }

      campaign.status = 'draft';
      campaign.approvalStatus = 'not_required';
      campaign.approvalHistory.push({ action: 'recalled', by: userId, at: new Date() });
      await campaign.save();
      await redisClient.deleteForTenant(tenantId, `campaign:${id}`);

      res.json({ success: true, data: campaign, metadata: { tenantId, campaignId: id } });
    } catch (err: any) {
      logger.error('Recall campaign error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Admin review queue — campaigns pending approval
  async getPendingReview(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenantContext!;
      const page  = parseInt(req.query.page  as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const [campaigns, total] = await Promise.all([
        Campaign.find({ tenantId, approvalStatus: 'pending_review' })
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Campaign.countDocuments({ tenantId, approvalStatus: 'pending_review' }),
      ]);

      res.json({
        success: true,
        data: campaigns,
        metadata: {
          tenantId,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (err: any) {
      logger.error('Get pending review error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const approvalHandler = new ApprovalHandler();
