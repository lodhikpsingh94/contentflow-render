import { Router } from 'express';
import { UserProfile } from '../models/user.model';
import { Segment } from '../models/segment.model';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all analytics routes
router.use(authenticateToken);

// Get segmentation analytics
router.get('/overview', requireRole(['admin', 'analyst']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;

    const [
      totalUsers,
      activeUsers,
      totalSegments,
      activeSegments,
      segmentDistribution,
      userGrowth
    ] = await Promise.all([
      UserProfile.countDocuments({ tenantId }),
      UserProfile.countDocuments({ tenantId, 'metadata.isActive': true }),
      Segment.countDocuments({ tenantId }),
      Segment.countDocuments({ tenantId, isActive: true }),
      analyticsHelpers.getSegmentDistribution(tenantId),
      analyticsHelpers.getUserGrowth(tenantId)
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          activeUsers,
          totalSegments,
          activeSegments,
          activeUserRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
        },
        segmentDistribution,
        userGrowth,
        metadata: { tenantId }
      }
    });

  } catch (error) {
    logger.error('Get analytics overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics overview'
    });
  }
});

// Get segment analytics
router.get('/segments/:segmentId', requireRole(['admin', 'analyst']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { segmentId } = req.params;

    const segment = await Segment.findOne({ _id: segmentId, tenantId });
    if (!segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    const [
      userCount,
      demographicBreakdown,
      behavioralStats,
      segmentGrowth
    ] = await Promise.all([
      UserProfile.countDocuments({ tenantId, segments: segmentId }),
      analyticsHelpers.getDemographicBreakdown(tenantId, segmentId),
      analyticsHelpers.getBehavioralStats(tenantId, segmentId),
      analyticsHelpers.getSegmentGrowth(tenantId, segmentId)
    ]);

    res.json({
      success: true,
      data: {
        segment: {
          id: segment._id,
          name: segment.name,
          type: segment.type,
          userCount: segment.userCount
        },
        analytics: {
          userCount,
          demographicBreakdown,
          behavioralStats,
          segmentGrowth
        }
      },
      metadata: { tenantId, segmentId }
    });

  } catch (error) {
    logger.error('Get segment analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get segment analytics'
    });
  }
});

// Get user engagement analytics
router.get('/engagement', requireRole(['admin', 'analyst']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;

    const engagementStats = await UserProfile.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: null,
          avgEngagement: { $avg: '$behavioral.engagementScore' },
          avgSessions: { $avg: '$behavioral.totalSessions' },
          avgSpent: { $avg: '$behavioral.totalSpent' },
          highValueUsers: {
            $sum: {
              $cond: [{ $gt: ['$behavioral.lifetimeValue', 1000] }, 1, 0]
            }
          },
          atRiskUsers: {
            $sum: {
              $cond: [{ $gt: ['$behavioral.churnRisk', 70] }, 1, 0]
            }
          }
        }
      }
    ]);

    const segmentEngagement = await analyticsHelpers.getSegmentEngagement(tenantId);

    res.json({
      success: true,
      data: {
        engagementStats: engagementStats[0] || {},
        segmentEngagement
      },
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Get engagement analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get engagement analytics'
    });
  }
});

// Helper methods for analytics
const analyticsHelpers = {
  async getSegmentDistribution(tenantId: string) {
    return Segment.aggregate([
      { $match: { tenantId, isActive: true } },
      {
        $project: {
          name: 1,
          type: 1,
          userCount: 1,
          percentage: {
            $multiply: [
              { $divide: ['$userCount', { $sum: '$userCount' }] },
              100
            ]
          }
        }
      },
      { $sort: { userCount: -1 } },
      { $limit: 10 }
    ]);
  },

  async getUserGrowth(tenantId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return UserProfile.aggregate([
      { $match: { tenantId, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  },

  async getDemographicBreakdown(tenantId: string, segmentId: string) {
    const [countryBreakdown, ageBreakdown, tierBreakdown] = await Promise.all([
      UserProfile.aggregate([
        { $match: { tenantId, segments: segmentId } },
        {
          $group: {
            _id: '$demographic.country',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      UserProfile.aggregate([
        { $match: { tenantId, segments: segmentId } },
        {
          $bucket: {
            groupBy: '$demographic.age',
            boundaries: [0, 18, 25, 35, 45, 55, 65, 100],
            default: 'Unknown',
            output: {
              count: { $sum: 1 }
            }
          }
        }
      ]),
      UserProfile.aggregate([
        { $match: { tenantId, segments: segmentId } },
        {
          $group: {
            _id: '$demographic.subscriptionTier',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    return { countryBreakdown, ageBreakdown, tierBreakdown };
  },

  async getBehavioralStats(tenantId: string, segmentId: string) {
    return UserProfile.aggregate([
      { $match: { tenantId, segments: segmentId } },
      {
        $group: {
          _id: null,
          avgEngagement: { $avg: '$behavioral.engagementScore' },
          avgSessions: { $avg: '$behavioral.totalSessions' },
          avgSpent: { $avg: '$behavioral.totalSpent' },
          avgPurchaseCount: { $avg: '$behavioral.purchaseCount' },
          totalSpent: { $sum: '$behavioral.totalSpent' }
        }
      }
    ]);
  },

  async getSegmentGrowth(tenantId: string, segmentId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return UserProfile.aggregate([
      { 
        $match: { 
          tenantId, 
          segments: segmentId,
          createdAt: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  },

  async getSegmentEngagement(tenantId: string) {
    return Segment.aggregate([
      { $match: { tenantId, isActive: true } },
      {
        $lookup: {
          from: 'userprofiles',
          let: { segmentId: '$_id' },
          pipeline: [
            { $match: { $expr: { $in: ['$$segmentId', '$segments'] } } },
            { $match: { tenantId } },
            {
              $group: {
                _id: null,
                avgEngagement: { $avg: '$behavioral.engagementScore' },
                avgSessions: { $avg: '$behavioral.totalSessions' }
              }
            }
          ],
          as: 'engagement'
        }
      },
      {
        $project: {
          name: 1,
          type: 1,
          userCount: 1,
          avgEngagement: { $arrayElemAt: ['$engagement.avgEngagement', 0] },
          avgSessions: { $arrayElemAt: ['$engagement.avgSessions', 0] }
        }
      },
      { $sort: { userCount: -1 } }
    ]);
  }
};

export { router as analyticsRoutes };