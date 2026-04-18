import { Rule, IRule, RuleCondition } from '../models/rule.model';
import { redisClient } from '../cache/redis.client';
import { logger } from '../utils/logger';
import { validateRule } from '../utils/validators';

export class RuleEngineService {
  async createRule(tenantId: string, ruleData: Partial<IRule>, userId: string): Promise<IRule> {
    const { error } = validateRule(ruleData);
    if (error) {
      throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }

    const rule = new Rule({
      ...ruleData,
      tenantId,
      createdBy: userId,
      updatedBy: userId,
    });

    await rule.save();
    await redisClient.clearTenantCache(tenantId);
    
    logger.info('Rule created', { ruleId: rule._id, tenantId, userId });
    return rule;
  }

  async evaluateRules(tenantId: string, context: any): Promise<string[]> {
    const cacheKey = `rules:evaluation:${tenantId}:${JSON.stringify(context)}`;
    
    const cachedResult = await redisClient.getForTenant<string[]>(tenantId, cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const activeRules = await Rule.find({
      tenantId,
      isActive: true,
    }).sort({ priority: -1 }).lean();

    const matchedRules: string[] = [];

    for (const rule of activeRules) {
      if (this.evaluateRule(rule, context)) {
        matchedRules.push(rule._id);
      }
    }

    await redisClient.setForTenant(tenantId, cacheKey, matchedRules, 60);
    return matchedRules;
  }

  private evaluateRule(rule: IRule, context: any): boolean {
    let result = true;
    let logicalOperator: 'and' | 'or' = 'and';

    for (let i = 0; i < rule.conditions.length; i++) {
      const condition = rule.conditions[i];
      const conditionResult = this.evaluateCondition(condition, context);

      if (i === 0) {
        result = conditionResult;
      } else {
        if (logicalOperator === 'and') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }

      logicalOperator = condition.logicalOperator || 'and';
    }

    return result;
  }

  private evaluateCondition(condition: RuleCondition, context: any): boolean {
    const value = this.getValueFromContext(condition.field, context);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return value && value.includes && value.includes(condition.value);
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'exists':
        return condition.value ? value !== undefined : value === undefined;
      case 'regex':
        if (typeof value !== 'string') return false;
        try {
          const regex = new RegExp(condition.value);
          return regex.test(value);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private getValueFromContext(field: string, context: any): any {
    const parts = field.split('.');
    let value = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  async getRulesByType(tenantId: string, type: string): Promise<IRule[]> {
    const cacheKey = `rules:${type}`;
    
    const cachedRules = await redisClient.getForTenant<IRule[]>(tenantId, cacheKey);
    if (cachedRules) {
      return cachedRules;
    }

    const rules = await Rule.find({
      tenantId,
      type,
      isActive: true,
    }).sort({ priority: -1 }).lean();

    await redisClient.setForTenant(tenantId, cacheKey, rules, 300);
    return rules;
  }

  async updateRule(
    ruleId: string, 
    tenantId: string, 
    updateData: Partial<IRule>, 
    userId: string
  ): Promise<IRule | null> {
    const { error } = validateRule(updateData);
    if (error) {
      throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }

    const rule = await Rule.findOneAndUpdate(
      { _id: ruleId, tenantId },
      { 
        ...updateData, 
        updatedBy: userId,
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    );

    if (rule) {
      await redisClient.clearTenantCache(tenantId);
      logger.info('Rule updated', { ruleId, tenantId, userId });
    }

    return rule;
  }

  async deleteRule(ruleId: string, tenantId: string, userId: string): Promise<boolean> {
    const result = await Rule.findOneAndDelete({ _id: ruleId, tenantId });
    
    if (result) {
      await redisClient.clearTenantCache(tenantId);
      logger.info('Rule deleted', { ruleId, tenantId, userId });
      return true;
    }

    return false;
  }
}

export const ruleEngineService = new RuleEngineService();