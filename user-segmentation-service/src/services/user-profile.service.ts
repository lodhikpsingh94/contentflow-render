import { FilterQuery, Types } from 'mongoose';
import { UserProfile, IUserProfile } from '../models/user.model';
import { Segment } from '../models/segment.model';
import { segmentEngineService } from './segment-engine.service';
import { redisClient } from '../cache/redis.client';
import { logger } from '../utils/logger';
import { addDays, differenceInDays } from 'date-fns';

export class UserProfileService {
  async getUserProfile(tenantId: string, userId: string): Promise<IUserProfile | null> {
    const cacheKey = `user:profile:${userId}`;
    
    const cachedProfile = await redisClient.getForTenant<IUserProfile>(tenantId, cacheKey);
    if (cachedProfile) {
      return cachedProfile;
    }

    const profile = await UserProfile.findOne({ tenantId, userId });
    if (profile) {
      await redisClient.setForTenant(tenantId, cacheKey, profile, 600); // Cache for 10 minutes
    }

    return profile;
  }

  async createOrUpdateUserProfile(
    tenantId: string, 
    userId: string, 
    updateData: Partial<IUserProfile>
  ): Promise<IUserProfile> {
    const existingProfile = await this.getUserProfile(tenantId, userId);
    
    let profile: IUserProfile;
    
    if (existingProfile) {
      profile = await UserProfile.findOneAndUpdate(
        { tenantId, userId },
        { 
          ...updateData, 
          lastUpdated: new Date(),
          'metadata.lastActivity': new Date(),
          'metadata.isNewUser': false 
        },
        { new: true, upsert: true, runValidators: true }
      ) as IUserProfile;
    } else {
      profile = new UserProfile({
        _id: new Types.ObjectId().toString(),
        tenantId,
        userId,
        ...updateData,
        'metadata.isNewUser': true,
        'metadata.lastActivity': new Date(),
        'demographic.accountAgeDays': 0
      });
      await profile.save();
    }

    // Update account age
    if (profile.createdAt) {
      profile.demographic.accountAgeDays = differenceInDays(new Date(), profile.createdAt);
      await profile.save();
    }

    // Clear cache
    await this.clearUserCache(tenantId, userId);

    // Recalculate segments if profile changed significantly
    if (this.isSignificantUpdate(updateData)) {
      await this.recalculateUserSegments(tenantId, userId);
    }

    logger.info('User profile updated', { tenantId, userId });
    return profile;
  }

  private isSignificantUpdate(updateData: Partial<IUserProfile>): boolean {
    const significantFields = [
      'demographic.country',
      'demographic.age',
      'behavioral.purchaseCount',
      'behavioral.engagementScore',
      'metadata.isPremium'
    ];

    return Object.keys(updateData).some(field => 
      significantFields.some(sigField => field.startsWith(sigField))
    );
  }

  async recalculateUserSegments(tenantId: string, userId: string): Promise<string[]> {
    const user = await this.getUserProfile(tenantId, userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const activeSegments = await Segment.find({ 
      tenantId, 
      isActive: true 
    });

    const newSegments = await segmentEngineService.evaluateUserSegments(user, activeSegments);
    
    // Update user segments
    const previousSegments = user.segments;
    user.segments = newSegments;
    user.lastUpdated = new Date();

    // Track segment changes
    const addedSegments = newSegments.filter(seg => !previousSegments.includes(seg));
    const removedSegments = previousSegments.filter(seg => !newSegments.includes(seg));

    // Add to history
    addedSegments.forEach(segmentId => {
      user.segmentHistory.push({
        segmentId,
        addedAt: new Date(),
        reason: 'automatic_recalculation'
      });
    });

    // Mark removed segments
    removedSegments.forEach(segmentId => {
      const historyEntry = user.segmentHistory.find(
        entry => entry.segmentId === segmentId && !entry.removedAt
      );
      if (historyEntry) {
        historyEntry.removedAt = new Date();
        historyEntry.reason = 'automatic_recalculation';
      }
    });

    await user.save();
    
    // Update segment user counts
    await this.updateSegmentUserCounts(tenantId, newSegments, previousSegments);

    // Clear caches
    await this.clearUserCache(tenantId, userId);
    await segmentEngineService.clearUserSegmentCache(tenantId, userId);

    logger.info('User segments recalculated', { 
      tenantId, 
      userId, 
      segmentCount: newSegments.length,
      added: addedSegments.length,
      removed: removedSegments.length
    });

    return newSegments;
  }

  private async updateSegmentUserCounts(
    tenantId: string, 
    newSegments: string[], 
    previousSegments: string[]
  ): Promise<void> {
    const segmentsToIncrement = newSegments.filter(seg => !previousSegments.includes(seg));
    const segmentsToDecrement = previousSegments.filter(seg => !newSegments.includes(seg));

    await Promise.all([
      ...segmentsToIncrement.map(segmentId =>
        Segment.findByIdAndUpdate(segmentId, { $inc: { userCount: 1 } })
      ),
      ...segmentsToDecrement.map(segmentId =>
        Segment.findByIdAndUpdate(segmentId, { $inc: { userCount: -1 } })
      )
    ]);
  }

  async getUsersBySegment(tenantId: string, segmentId: string, page: number = 1, limit: number = 50): Promise<{
    users: IUserProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserProfile.find({ tenantId, segments: segmentId })
        .select('userId demographic behavioral metadata')
        .skip(skip)
        .limit(limit)
        .lean(),
      UserProfile.countDocuments({ tenantId, segments: segmentId })
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async batchUpdateUserProfiles(
    tenantId: string, 
    updates: Array<{ userId: string; data: Partial<IUserProfile> }>
  ): Promise<void> {
    const batchSize = 100;
    const batches = this.chunkArray(updates, batchSize);

    for (const batch of batches) {
      await Promise.all(
        batch.map(update => 
          this.createOrUpdateUserProfile(tenantId, update.userId, update.data)
        )
      );
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async getUserSegmentHistory(tenantId: string, userId: string): Promise<any[]> {
    const user = await this.getUserProfile(tenantId, userId);
    if (!user) return [];

    return user.segmentHistory.map(entry => ({
      segmentId: entry.segmentId,
      addedAt: entry.addedAt,
      removedAt: entry.removedAt,
      reason: entry.reason,
      duration: entry.removedAt ? 
        differenceInDays(entry.removedAt, entry.addedAt) : 
        differenceInDays(new Date(), entry.addedAt)
    }));
  }

  private async clearUserCache(tenantId: string, userId: string): Promise<void> {
    const cacheKey = `user:profile:${userId}`;
    await redisClient.deleteForTenant(tenantId, cacheKey);
  }

  async deleteUserProfile(tenantId: string, userId: string): Promise<boolean> {
    const result = await UserProfile.findOneAndDelete({ tenantId, userId });
    
    if (result) {
      await this.clearUserCache(tenantId, userId);
      await segmentEngineService.clearUserSegmentCache(tenantId, userId);
      logger.info('User profile deleted', { tenantId, userId });
      return true;
    }

    return false;
  }
}

export const userProfileService = new UserProfileService();