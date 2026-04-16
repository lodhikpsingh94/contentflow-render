import { Campaign, ICampaign } from '../models/campaign.model';
import { Rule, IRule } from '../models/rule.model';

export class ValidationService {
  async validateCampaignCreation(tenantId: string, campaignData: Partial<ICampaign>): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if campaign name is unique for tenant
    const existingCampaign = await Campaign.findOne({
      tenantId,
      name: campaignData.name,
    });

    if (existingCampaign) {
      errors.push('Campaign name must be unique within the tenant');
    }

    // Validate schedule
    if (campaignData.rules?.schedule) {
      const scheduleErrors = this.validateSchedule(campaignData.rules.schedule);
      errors.push(...scheduleErrors);
    }

    // Validate budget
    if (campaignData.budget) {
      const budgetErrors = this.validateBudget(campaignData.budget);
      errors.push(...budgetErrors);
    }

    // Validate content IDs (would need to check with content service)
    if (!campaignData.contentIds || campaignData.contentIds.length === 0) {
      errors.push('Campaign must have at least one content ID');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateSchedule(schedule: any): string[] {
    const errors: string[] = [];
    const now = new Date();

    if (schedule.startTime >= schedule.endTime) {
      errors.push('Start time must be before end time');
    }

    if (schedule.endTime <= now) {
      errors.push('End time must be in the future');
    }

    if (schedule.recurrence) {
      const recurrenceErrors = this.validateRecurrence(schedule.recurrence);
      errors.push(...recurrenceErrors);
    }

    return errors;
  }

  private validateRecurrence(recurrence: any): string[] {
    const errors: string[] = [];

    if (recurrence.interval < 1) {
      errors.push('Recurrence interval must be at least 1');
    }

    if (recurrence.type === 'weekly' && (!recurrence.daysOfWeek || recurrence.daysOfWeek.length === 0)) {
      errors.push('Weekly recurrence must specify days of week');
    }

    if (recurrence.type === 'monthly' && (!recurrence.daysOfMonth || recurrence.daysOfMonth.length === 0)) {
      errors.push('Monthly recurrence must specify days of month');
    }

    return errors;
  }

  private validateBudget(budget: any): string[] {
    const errors: string[] = [];

    if (budget.total < 0) {
      errors.push('Total budget cannot be negative');
    }

    if (budget.dailyLimit < 0) {
      errors.push('Daily limit cannot be negative');
    }

    if (budget.spent < 0) {
      errors.push('Spent amount cannot be negative');
    }

    if (budget.spent > budget.total) {
      errors.push('Spent amount cannot exceed total budget');
    }

    return errors;
  }

  async validateRuleCreation(tenantId: string, ruleData: Partial<IRule>): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if rule name is unique for tenant
    const existingRule = await Rule.findOne({
      tenantId,
      name: ruleData.name,
    });

    if (existingRule) {
      errors.push('Rule name must be unique within the tenant');
    }

    // Validate conditions
    if (ruleData.conditions && ruleData.conditions.length > 0) {
      const conditionErrors = this.validateConditions(ruleData.conditions);
      errors.push(...conditionErrors);
    } else {
      errors.push('Rule must have at least one condition');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateConditions(conditions: any[]): string[] {
    const errors: string[] = [];

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      
      if (!condition.field || typeof condition.field !== 'string') {
        errors.push(`Condition ${i + 1}: Field is required and must be a string`);
      }

      if (!condition.operator) {
        errors.push(`Condition ${i + 1}: Operator is required`);
      }

      // For some operators, value might be optional (e.g., exists)
      if (condition.operator !== 'exists' && condition.value === undefined) {
        errors.push(`Condition ${i + 1}: Value is required for operator '${condition.operator}'`);
      }

      if (i > 0 && !condition.logicalOperator) {
        errors.push(`Condition ${i + 1}: Logical operator is required for subsequent conditions`);
      }
    }

    return errors;
  }

  async checkTenantLimits(tenantId: string): Promise<{ canCreateCampaign: boolean; reason?: string }> {
    // In a real implementation, this would check against tenant subscription limits
    const activeCampaignsCount = await Campaign.countDocuments({
      tenantId,
      status: 'active',
    });

    // Example limit: 100 active campaigns per tenant
    if (activeCampaignsCount >= 100) {
      return {
        canCreateCampaign: false,
        reason: 'Maximum number of active campaigns reached',
      };
    }

    return { canCreateCampaign: true };
  }
}

export const validationService = new ValidationService();