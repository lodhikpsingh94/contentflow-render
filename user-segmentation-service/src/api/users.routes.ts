import { Router } from 'express';
import { userProfileService } from '../services/user-profile.service';
import { segmentEngineService } from '../services/segment-engine.service';
import { realTimeService } from '../services/real-time.service';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schemas
const userProfileSchema = Joi.object({
  demographic: Joi.object({
    age: Joi.number().min(0).max(120).optional(),
    gender: Joi.string().optional(),
    country: Joi.string().length(2).optional(),
    city: Joi.string().optional(),
    region: Joi.string().optional(),
    language: Joi.string().default('en'),
    timezone: Joi.string().default('UTC'),
    subscriptionTier: Joi.string().optional()
  }).optional(),
  behavioral: Joi.object({
    totalSessions: Joi.number().min(0).optional(),
    lastSession: Joi.date().optional(),
    sessionDuration: Joi.number().min(0).optional(),
    pagesViewed: Joi.number().min(0).optional(),
    purchaseCount: Joi.number().min(0).optional(),
    totalSpent: Joi.number().min(0).optional(),
    averageOrderValue: Joi.number().min(0).optional(),
    lastPurchaseDate: Joi.date().optional(),
    favoriteCategories: Joi.array().items(Joi.string()).optional(),
    engagementScore: Joi.number().min(0).max(100).optional(),
    churnRisk: Joi.number().min(0).max(100).optional(),
    lifetimeValue: Joi.number().min(0).optional()
  }).optional(),
  customAttributes: Joi.object().optional(),
  metadata: Joi.object({
    isActive: Joi.boolean().optional(),
    isPremium: Joi.boolean().optional(),
    acquisitionSource: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional()
  }).optional()
});

const batchUpdateSchema = Joi.array().items(
  Joi.object({
    userId: Joi.string().required(),
    data: userProfileSchema.required()
  })
).max(1000); // Limit batch size

// Apply authentication to all user routes
router.use(authenticateToken);

// Get user profile and segments
// Get user profile and segments
router.get('/:userId', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { userId } = req.params;

    const user = await userProfileService.getUserProfile(tenantId, userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        userId: user.userId,
        demographic: user.demographic,
        behavioral: user.behavioral,
        // --- THIS IS THE CORRECTED LINE ---
        customAttributes: Object.fromEntries(user.customAttributes),
        segments: user.segments,
        metadata: user.metadata,
        lastUpdated: user.lastUpdated
      },
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// Create or update user profile
router.post('/:userId', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { userId } = req.params;

    // Validate request body
    const { error, value } = userProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`
      });
    }

    const user = await userProfileService.createOrUpdateUserProfile(tenantId, userId, value);

    res.json({
      success: true,
      data: {
        userId: user.userId,
        segments: user.segments,
        lastUpdated: user.lastUpdated
      },
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

// Get user segments
router.get('/:userId/segments', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { userId } = req.params;

    const user = await userProfileService.getUserProfile(tenantId, userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        userId: user.userId,
        segments: user.segments,
        segmentCount: user.segments.length
      },
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Get user segments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user segments'
    });
  }
});

// Recalculate user segments
router.post('/:userId/segments/recalculate', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { userId } = req.params;

    const segments = await userProfileService.recalculateUserSegments(tenantId, userId);

    // Notify real-time clients
    await realTimeService.notifyUserSegmentChange(tenantId, userId, segments);

    res.json({
      success: true,
      data: {
        userId,
        segments,
        segmentCount: segments.length
      },
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Recalculate segments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate user segments'
    });
  }
});

// Get user segment history
router.get('/:userId/segments/history', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { userId } = req.params;

    const history = await userProfileService.getUserSegmentHistory(tenantId, userId);

    res.json({
      success: true,
      data: history,
      metadata: { tenantId, userId }
    });

  } catch (error) {
    logger.error('Get segment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get segment history'
    });
  }
});

// Evaluate user against all segments
router.post('/:userId/evaluate', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { userId } = req.params;

    const user = await userProfileService.getUserProfile(tenantId, userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const segments = await userProfileService.recalculateUserSegments(tenantId, userId);

    res.json({
      success: true,
      data: {
        userId,
        segments,
        segmentCount: segments.length,
        userProfile: {
          demographic: user.demographic,
          behavioral: user.behavioral,
          metadata: user.metadata
        }
      },
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Evaluate user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate user'
    });
  }
});

// Batch update user profiles
router.post('/batch/update', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;

    // Validate request body
    const { error, value } = batchUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`
      });
    }

    await userProfileService.batchUpdateUserProfiles(tenantId, value);

    res.json({
      success: true,
      data: {
        processed: value.length,
        users: value.map(u => u.userId)
      },
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Batch update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch update users'
    });
  }
});

// Delete user profile
router.delete('/:userId', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { userId } = req.params;

    const deleted = await userProfileService.deleteUserProfile(tenantId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { deleted: true },
      metadata: { tenantId, userId }
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user profile'
    });
  }
});

// Real-time segment updates via WebSocket
router.post('/:userId/segments/subscribe', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { userId } = req.params;

    // This endpoint would typically handle WebSocket connection setup
    // For now, just acknowledge the subscription request

    res.json({
      success: true,
      data: {
        message: 'WebSocket subscription endpoint',
        websocketUrl: `/ws?tenantId=${tenantId}&userId=${userId}`
      },
      metadata: { tenantId, userId }
    });

  } catch (error) {
    logger.error('Subscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to segment updates'
    });
  }
});

export { router as userRoutes };