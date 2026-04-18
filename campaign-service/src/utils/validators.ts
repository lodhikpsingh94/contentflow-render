import Joi from 'joi';
import { CampaignRules, Schedule, FrequencyCapping, TargetingRules } from '../models/campaign.model';

export const campaignValidationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).optional(),
  status: Joi.string().valid('active', 'paused', 'ended', 'draft').default('draft'),
  type: Joi.string().valid('banner', 'video', 'popup', 'notification').required(),
  subType: Joi.string().valid('image', 'video','gif','custom').required(),
  rules: Joi.object({
    segments: Joi.array().items(Joi.string()).min(1).required(),
    schedule: Joi.object({
      startTime: Joi.date().iso().required(),
      endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
      timezone: Joi.string().default('UTC'),
      recurrence: Joi.object({
        type: Joi.string().valid('daily', 'weekly', 'monthly').required(),
        daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)),
        daysOfMonth: Joi.array().items(Joi.number().min(1).max(31)),
        interval: Joi.number().min(1).default(1),
      }).optional(),
    }).required(),
    frequencyCapping: Joi.object({
      maxImpressions: Joi.number().min(1).max(1000).default(5),
      period: Joi.string().valid('hour', 'day', 'week').default('day'),
      perUser: Joi.boolean().default(true),
      maxClicks: Joi.number().min(1).max(1000).optional(),
    }).default(),
    targeting: Joi.object({
      geo: Joi.object({
        countries: Joi.array().items(Joi.string().length(2)).min(1).required(),
        regions: Joi.array().items(Joi.string()).optional(),
        cities: Joi.array().items(Joi.string()).optional(),
        radius: Joi.number().min(1).max(1000).optional(),
        coordinates: Joi.object({
          lat: Joi.number().min(-90).max(90).required(),
          lng: Joi.number().min(-180).max(180).required(),
        }).optional(),
      }).required(),
      devices: Joi.object({
        platforms: Joi.array().items(Joi.string().valid('ios', 'android', 'web')).min(1).required(),
        osVersions: Joi.array().items(Joi.string()).optional(),
        appVersions: Joi.array().items(Joi.string()).optional(),
        deviceModels: Joi.array().items(Joi.string()).optional(),
        connectionTypes: Joi.array().items(Joi.string()).optional(),
      }).required(),
      userAttributes: Joi.object({
        segments: Joi.array().items(Joi.string()).min(1).required(),
        customAttributes: Joi.object().optional(),
        ageRange: Joi.object({
          min: Joi.number().min(0).max(120).required(),
          max: Joi.number().min(0).max(120).required(),
        }).optional(),
        genders: Joi.array().items(Joi.string()).optional(),
        languages: Joi.array().items(Joi.string()).optional(),
        subscriptionTiers: Joi.array().items(Joi.string()).optional(),
      }).required(),
      behavior: Joi.object({
        minSessions: Joi.number().min(0).optional(),
        hasPurchased: Joi.boolean().optional(),
        lastActiveWithinDays: Joi.number().min(1).max(365).optional(),
        favoriteCategories: Joi.array().items(Joi.string()).optional(),
        engagementScore: Joi.object({
          min: Joi.number().min(0).max(100).required(),
          max: Joi.number().min(0).max(100).required(),
        }).optional(),
      }).optional(),
      customRules: Joi.array().items(
        Joi.object({
          field: Joi.string().required(),
          operator: Joi.string().valid(
            'equals', 'not_equals', 'contains', 'greater_than', 
            'less_than', 'in', 'not_in', 'exists', 'regex'
          ).required(),
          value: Joi.any().required(),
        })
      ).optional(),
    }).required(),
    constraints: Joi.object({
      dailyBudget: Joi.number().min(0).optional(),
      totalBudget: Joi.number().min(0).optional(),
      maxImpressions: Joi.number().min(1).optional(),
      maxClicks: Joi.number().min(1).optional(),
      maxConversions: Joi.number().min(1).optional(),
    }).optional(),
  }).required(),
  contentIds: Joi.array().items(Joi.string()).min(1).required(),
  priority: Joi.number().min(1).max(10).default(1),
  budget: Joi.object({
    total: Joi.number().min(0).required(),
    spent: Joi.number().min(0).default(0),
    dailyLimit: Joi.number().min(0).required(),
    type: Joi.string().valid('cpc', 'cpm', 'cpa').required(),
    currency: Joi.string().length(3).default('USD'),
  }).optional(),
});

// --- THIS IS THE NEW SCHEMA ---
// This schema is for UPDATING a campaign (all fields are optional)
export const campaignUpdateValidationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  description: Joi.string().trim().max(500),
  status: Joi.string().valid('active', 'paused', 'ended', 'draft', 'scheduled', 'completed', 'expired'),
  type: Joi.string().valid('banner', 'video', 'popup', 'notification'),
  subType: Joi.string().valid('image', 'video', 'gif','custom'),
  rules: Joi.object(), // Allow partial updates to rules
  contentIds: Joi.array().items(Joi.string()),
  priority: Joi.number().min(1).max(10),
  budget: Joi.object(),
  metadata: Joi.object().optional() // Allow metadata updates
});
// --- END OF NEW SCHEMA ---


export const ruleValidationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).optional(),
  type: Joi.string().valid('segment', 'targeting', 'behavioral').required(),
  conditions: Joi.array().items(
    Joi.object({
      field: Joi.string().required(),
      operator: Joi.string().valid(
        'equals', 'not_equals', 'contains', 'greater_than', 
        'less_than', 'in', 'not_in', 'exists', 'regex'
      ).required(),
      value: Joi.any().required(),
      logicalOperator: Joi.string().valid('and', 'or').optional(),
    })
  ).min(1).required(),
  isActive: Joi.boolean().default(true),
  priority: Joi.number().min(1).max(10).default(1),
});

export const validateCampaign = (campaign: any): Joi.ValidationResult => {
  return campaignValidationSchema.validate(campaign, {
    abortEarly: false,
    stripUnknown: true,
  });
};

export const validateRule = (rule: any): Joi.ValidationResult => {
  return ruleValidationSchema.validate(rule, {
    abortEarly: false,
    stripUnknown: true,
  });
};

export const validatePagination = (params: any): Joi.ValidationResult => {
  const schema = Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    status: Joi.string().valid('active', 'paused', 'ended', 'draft').optional(),
    type: Joi.string().valid('banner', 'video', 'popup', 'notification').optional(),
  });

  return schema.validate(params, {
    abortEarly: false,
    stripUnknown: true,
  });
};

// --- ADD THIS NEW VALIDATION FUNCTION ---
export const validateCampaignUpdate = (campaign: any): Joi.ValidationResult => {
  return campaignUpdateValidationSchema.validate(campaign, {
    abortEarly: false,
    stripUnknown: true,
  });
};