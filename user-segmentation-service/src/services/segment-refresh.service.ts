/**
 * SegmentRefreshService
 * ─────────────────────
 * Background job that re-evaluates all active segments for a tenant and
 * materialises the result into UserProfile.segments[].
 *
 * This replaces the live-scan approach for production loads:
 * SDK delivery reads from UserProfile.segments (index lookup, sub-ms)
 * instead of re-running the rule engine on every request.
 *
 * Usage:
 *   POST /api/v1/segments/refresh           — refresh all segments for tenant
 *   POST /api/v1/segments/:id/refresh       — refresh a single segment
 */

import { Segment, ISegment } from '../models/segment.model';
import { UserProfile, IUserProfile } from '../models/user.model';
import { segmentEngineService } from './segment-engine.service';
import { redisClient } from '../cache/redis.client';
import { logger } from '../utils/logger';

export interface RefreshResult {
  segmentId: string;
  segmentName: string;
  usersEvaluated: number;
  usersAdded: number;
  usersRemoved: number;
  durationMs: number;
}

export interface TenantRefreshResult {
  tenantId: string;
  segmentsRefreshed: number;
  totalUsersProcessed: number;
  results: RefreshResult[];
  durationMs: number;
  completedAt: Date;
}

const LOCK_TTL_SECONDS = 300; // 5 minutes — prevents concurrent refresh for same tenant
const USER_BATCH_SIZE  = 200;

export class SegmentRefreshService {

  /**
   * Refresh all active segments for a tenant.
   * Acquires a Redis lock so only one refresh runs at a time per tenant.
   */
  async refreshAllSegments(tenantId: string): Promise<TenantRefreshResult> {
    const lockKey = `segment:refresh:lock:${tenantId}`;
    const startTime = Date.now();

    // Try to acquire lock (SETNX pattern via Redis SET NX EX)
    const locked = await redisClient.setForTenant(tenantId, lockKey, '1', LOCK_TTL_SECONDS);
    // Note: some Redis wrappers return null if key already exists;
    // treat falsy as "lock already held"
    if (!locked) {
      logger.warn(`[SegmentRefresh] Refresh already in progress for tenant ${tenantId} — skipping`);
      throw new Error('Segment refresh already in progress for this tenant');
    }

    try {
      const activeSegments = await Segment.find({ tenantId, isActive: true }).lean();
      logger.info(`[SegmentRefresh] Refreshing ${activeSegments.length} segments for tenant ${tenantId}`);

      const results: RefreshResult[] = [];
      for (const segment of activeSegments) {
        const result = await this.refreshSegment(tenantId, segment as ISegment);
        results.push(result);
      }

      // Clear all segment/user caches for this tenant so next reads are fresh
      await segmentEngineService.clearTenantSegmentCache(tenantId);

      const summary: TenantRefreshResult = {
        tenantId,
        segmentsRefreshed: results.length,
        totalUsersProcessed: results.reduce((s, r) => s + r.usersEvaluated, 0),
        results,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      };

      logger.info(`[SegmentRefresh] Completed for tenant ${tenantId} in ${summary.durationMs}ms`);
      return summary;

    } finally {
      // Release lock
      await redisClient.deleteForTenant(tenantId, lockKey);
    }
  }

  /**
   * Refresh a single segment — evaluates every user in the tenant against
   * the segment rules and updates UserProfile.segments[] accordingly.
   */
  async refreshSegment(tenantId: string, segment: ISegment): Promise<RefreshResult> {
    const start = Date.now();
    let usersEvaluated = 0;
    let usersAdded = 0;
    let usersRemoved = 0;

    const totalUsers = await UserProfile.countDocuments({ tenantId });
    let skip = 0;

    while (skip < totalUsers) {
      const users = await UserProfile.find({ tenantId })
        .skip(skip)
        .limit(USER_BATCH_SIZE)
        .select('_id userId segments behavioral demographic device consent metadata');

      const bulkOps: any[] = [];

      for (const user of users) {
        usersEvaluated++;
        let matches = false;

        try {
          matches = await segmentEngineService.evaluateSegment(user as IUserProfile, segment);
        } catch (err) {
          logger.error(`[SegmentRefresh] Error evaluating user ${user.userId}: ${err}`);
        }

        const alreadyInSegment = (user.segments ?? []).includes(segment._id.toString());

        if (matches && !alreadyInSegment) {
          // Add user to segment
          bulkOps.push({
            updateOne: {
              filter: { _id: user._id },
              update: {
                $addToSet: { segments: segment._id },
                $push: {
                  segmentHistory: {
                    segmentId: segment._id,
                    addedAt: new Date(),
                    reason: 'batch_refresh',
                  },
                },
                $set: { lastUpdated: new Date() },
              },
            },
          });
          usersAdded++;
        } else if (!matches && alreadyInSegment) {
          // Remove user from segment
          bulkOps.push({
            updateOne: {
              filter: { _id: user._id },
              update: {
                $pull: { segments: segment._id },
                $set: {
                  lastUpdated: new Date(),
                  // Mark removal in history
                },
              },
            },
          });
          usersRemoved++;
        }
      }

      if (bulkOps.length > 0) {
        await UserProfile.bulkWrite(bulkOps, { ordered: false });
      }

      skip += USER_BATCH_SIZE;
    }

    // Update segment.userCount
    const newCount = await UserProfile.countDocuments({ tenantId, segments: segment._id });
    await Segment.findByIdAndUpdate(segment._id, {
      userCount: newCount,
      lastUpdated: new Date(),
    });

    logger.info(
      `[SegmentRefresh] Segment "${segment.name}" — ` +
      `evaluated: ${usersEvaluated}, added: ${usersAdded}, removed: ${usersRemoved}`
    );

    return {
      segmentId: segment._id.toString(),
      segmentName: segment.name,
      usersEvaluated,
      usersAdded,
      usersRemoved,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Refresh a single segment by ID (for on-demand refresh after rule update).
   */
  async refreshSegmentById(tenantId: string, segmentId: string): Promise<RefreshResult> {
    const segment = await Segment.findOne({ _id: segmentId, tenantId });
    if (!segment) throw new Error(`Segment ${segmentId} not found`);
    return this.refreshSegment(tenantId, segment);
  }
}

export const segmentRefreshService = new SegmentRefreshService();
