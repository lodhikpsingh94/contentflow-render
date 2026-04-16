import { IUserProfile } from '../models/user.model';
import { ISegment, SegmentRule } from '../models/segment.model';
import { DemographicEngine } from '../engines/demographic.engine';
import { BehavioralEngine } from '../engines/behavioral.engine';
import { CustomEngine } from '../engines/custom.engine';
import { redisClient } from '../cache/redis.client';
import { logger } from '../utils/logger';

export class SegmentEngineService {
  private demographicEngine: DemographicEngine;
  private behavioralEngine: BehavioralEngine;
  private customEngine: CustomEngine;

  constructor() {
    this.demographicEngine = new DemographicEngine();
    this.behavioralEngine = new BehavioralEngine();
    this.customEngine = new CustomEngine();
  }

  async evaluateUserSegments(
    user: IUserProfile, 
    segments: ISegment[]
  ): Promise<string[]> {
    const cacheKey = `user:segments:${user.tenantId}:${user.userId}`;
    
    // Try cache first
    const cachedSegments = await redisClient.getForTenant<string[]>(user.tenantId, cacheKey);
    if (cachedSegments) {
      return cachedSegments;
    }

    const matchedSegments: string[] = [];

    for (const segment of segments) {
      if (!segment.isActive) continue;

      try {
        const isMatch = await this.evaluateSegment(user, segment);
        if (isMatch) {
          matchedSegments.push(segment._id);
        }
      } catch (error) {
        logger.error(`Error evaluating segment ${segment._id} for user ${user.userId}:`, error);
      }
    }

    // Cache result for 5 minutes
    await redisClient.setForTenant(user.tenantId, cacheKey, matchedSegments, 300);

    return matchedSegments;
  }

  private async evaluateSegment(user: IUserProfile, segment: ISegment): Promise<boolean> {
    if (segment.rules.length === 0) return false;

    // Evaluate all rules with AND logic by default
    for (const rule of segment.rules) {
      if (!await this.evaluateRule(user, rule)) {
        return false;
      }
    }

    return true;
  }

  private async evaluateRule(user: IUserProfile, rule: SegmentRule): Promise<boolean> {
    const fieldCategory = this.getFieldCategory(rule.field);
    
    switch (fieldCategory) {
      case 'demographic':
        return this.demographicEngine.evaluate(user, rule);
      case 'behavioral':
        return this.behavioralEngine.evaluate(user, rule);
      case 'custom':
        return this.customEngine.evaluate(user, rule);
      default:
        logger.warn(`Unknown field category for rule: ${rule.field}`);
        return false;
    }
  }

  private getFieldCategory(field: string): string {
    if (field.startsWith('demographic.')) return 'demographic';
    if (field.startsWith('behavioral.')) return 'behavioral';
    if (field.startsWith('metadata.')) return 'demographic'; // Metadata treated as demographic
    if (field.startsWith('customAttributes.')) return 'custom';
    return 'custom'; // Default to custom for unknown fields
  }

  async batchEvaluateUsers(
    users: IUserProfile[], 
    segments: ISegment[]
  ): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>();
    
    // Process users in batches to avoid memory issues
    const batchSize = 100;
    const batches = this.chunkArray(users, batchSize);

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(user => this.evaluateUserSegments(user, segments))
      );

      batch.forEach((user, index) => {
        results.set(user.userId, batchResults[index]);
      });
    }

    return results;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async validateSegmentRules(segment: ISegment): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const rule of segment.rules) {
      const ruleErrors = this.validateRule(rule);
      if (ruleErrors.length > 0) {
        errors.push(`Rule ${rule.field} ${rule.operator}: ${ruleErrors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateRule(rule: SegmentRule): string[] {
    const errors: string[] = [];

    if (!rule.field || typeof rule.field !== 'string') {
      errors.push('Field is required');
    }

    if (!rule.operator) {
      errors.push('Operator is required');
    }

    // Validate value based on operator
    switch (rule.operator) {
      case 'between':
        if (!Array.isArray(rule.value) || rule.value.length !== 2) {
          errors.push('Between operator requires an array of two values');
        }
        break;
      case 'in':
      case 'not_in':
        if (!Array.isArray(rule.value)) {
          errors.push('In/not_in operator requires an array');
        }
        break;
      case 'regex':
      case 'not_regex':
        if (typeof rule.value !== 'string') {
          errors.push('Regex operator requires a string pattern');
        } else {
          try {
            new RegExp(rule.value);
          } catch {
            errors.push('Invalid regex pattern');
          }
        }
        break;
    }

    return errors;
  }

  clearUserSegmentCache(tenantId: string, userId: string): Promise<boolean> {
    const cacheKey = `user:segments:${tenantId}:${userId}`;
    return redisClient.deleteForTenant(tenantId, cacheKey);
  }

  clearTenantSegmentCache(tenantId: string): Promise<boolean> {
    return redisClient.clearTenantCache(tenantId);
  }
}

export const segmentEngineService = new SegmentEngineService();