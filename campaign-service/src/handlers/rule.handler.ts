import { Request, Response } from 'express';
import { ruleEngineService } from '../services/rule-engine.service';
import { validationService } from '../services/validation.service';
import { TenantContext } from '../models/types';
import { validateRule, validatePagination } from '../utils/validators';
import { logger } from '../utils/logger';

export class RuleHandler {
  async createRule(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId, userId } = tenantContext;

      // Validate request body
      const { error } = validateRule(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        });
        return;
      }

      // Validate rule data
      const validation = await validationService.validateRuleCreation(tenantId, req.body);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        });
        return;
      }

      const rule = await ruleEngineService.createRule(tenantId, req.body, userId);

      res.status(201).json({
        success: true,
        data: rule,
        metadata: {
          tenantId,
          ruleId: rule._id,
        },
      });
    } catch (error) {
      logger.error('Create rule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create rule',
      });
    }
  }

  async evaluateRules(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId } = tenantContext;

      const context = req.body;

      const matchedRules = await ruleEngineService.evaluateRules(tenantId, context);

      res.json({
        success: true,
        data: matchedRules,
        metadata: {
          tenantId,
          ruleCount: matchedRules.length,
        },
      });
    } catch (error) {
      logger.error('Evaluate rules error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to evaluate rules',
      });
    }
  }

  async getRulesByType(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId } = tenantContext;
      const { type } = req.params;

      if (!['segment', 'targeting', 'behavioral'].includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid rule type. Must be one of: segment, targeting, behavioral',
        });
        return;
      }

      const rules = await ruleEngineService.getRulesByType(tenantId, type);

      res.json({
        success: true,
        data: rules,
        metadata: {
          tenantId,
          type,
          ruleCount: rules.length,
        },
      });
    } catch (error) {
      logger.error('Get rules by type error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get rules',
      });
    }
  }

  async updateRule(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId, userId } = tenantContext;
      const { id } = req.params;

      // Validate request body
      const { error } = validateRule(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        });
        return;
      }

      const rule = await ruleEngineService.updateRule(id, tenantId, req.body, userId);

      if (!rule) {
        res.status(404).json({
          success: false,
          error: 'Rule not found',
        });
        return;
      }

      res.json({
        success: true,
        data: rule,
        metadata: {
          tenantId,
          ruleId: rule._id,
        },
      });
    } catch (error) {
      logger.error('Update rule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update rule',
      });
    }
  }

  async deleteRule(req: Request, res: Response): Promise<void> {
    try {
      const tenantContext: TenantContext = req['tenantContext'];
      const { tenantId, userId } = tenantContext;
      const { id } = req.params;

      const deleted = await ruleEngineService.deleteRule(id, tenantId, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Rule not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { deleted: true },
        metadata: { tenantId, ruleId: id },
      });
    } catch (error) {
      logger.error('Delete rule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete rule',
      });
    }
  }
}

export const ruleHandler = new RuleHandler();