import { Router } from 'express';
import { Segment, ISegment } from '../models/segment.model';
import { UserProfile } from '../models/user.model'; // <--- ADD THIS IMPORT
import { segmentEngineService } from '../services/segment-engine.service';
import { userProfileService } from '../services/user-profile.service';
import { realTimeService } from '../services/real-time.service';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schemas
const segmentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).optional(),
  type: Joi.string().valid('system', 'custom', 'dynamic').default('custom'),
  rules: Joi.array().items(Joi.object({
    field: Joi.string().required(),
    operator: Joi.string().valid(
      'equals', 'not_equals', 'greater_than', 'less_than', 'between',
      'contains', 'not_contains', 'in', 'not_in', 'exists', 'not_exists',
      'regex', 'not_regex', 'starts_with', 'ends_with'
    ).required(),
    value: Joi.any().required(),
    weight: Joi.number().min(0).max(1).default(1),
    conditions: Joi.array().items(Joi.object()),
    logicalOperator: Joi.string().valid('AND', 'OR').default('AND')
  })).min(1).required(),
  isActive: Joi.boolean().default(true),
  autoUpdate: Joi.boolean().default(false),
  updateFrequency: Joi.string().valid('realtime', 'hourly', 'daily', 'weekly').default('realtime')
});

const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  type: Joi.string().valid('system', 'custom', 'dynamic').optional(),
  isActive: Joi.boolean().optional()
});

// Apply authentication to all segment routes
router.use(authenticateToken);

// Create segment
router.post('/', requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId, userId } = tenantContext;

    // Validate request body
    const { error, value } = segmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`
      });
    }

    // Check if segment name is unique
    const existingSegment = await Segment.findOne({
      tenantId,
      name: value.name
    });

    if (existingSegment) {
      return res.status(409).json({
        success: false,
        error: 'Segment name must be unique within the tenant'
      });
    }

    // Validate segment rules
    const validation = await segmentEngineService.validateSegmentRules(value);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid segment rules: ${validation.errors.join(', ')}`
      });
    }

    const segment = new Segment({
      ...value,
      tenantId,
      createdBy: userId,
      updatedBy: userId
    });

    await segment.save();

    // If auto-update is enabled, trigger initial user evaluation
    if (value.autoUpdate) {
      // This would be done in background job in production
      logger.info('Auto-update enabled for segment, would trigger background job');
    }

    // Clear cache
    await segmentEngineService.clearTenantSegmentCache(tenantId);

    res.status(201).json({
      success: true,
      data: segment,
      metadata: { tenantId, segmentId: segment._id }
    });

  } catch (error) {
    logger.error('Create segment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create segment'
    });
  }
});

// Get all segments
router.get('/', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;

    // Validate query parameters
    const { error, value } = paginationSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Invalid query parameters: ${error.details.map(d => d.message).join(', ')}`
      });
    }

    const { page, limit, type, isActive } = value;
    const skip = (page - 1) * limit;

    const filter: any = { tenantId };
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive;

    const [segments, total] = await Promise.all([
      Segment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        // .select('-rules') // Exclude rules for list view
        .lean(),
      Segment.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: segments,
      metadata: {
        tenantId,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get segments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get segments'
    });
  }
});

// --- ADD THIS NEW ROUTE HERE (Before /:id routes) ---
router.post('/evaluate', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { userId, deviceInfo, location, context } = req.body;

    // 1. Get existing profile or create a temporary one
    let user = await userProfileService.getUserProfile(tenantId, userId);
    
    if (!user) {
        // Create temporary in-memory profile for evaluation
        user = new UserProfile({
            tenantId,
            userId,
            demographic: {},
            behavioral: {},
            customAttributes: {},
            metadata: {}
        });
    }

    // 2. Overlay incoming real-time context
    if (location) {
        user.demographic = { ...user.demographic, ...location };
    }
    
    // Map deviceInfo to customAttributes for rule evaluation
    if (deviceInfo) {
        if (!user.customAttributes) user.customAttributes = new Map();
        // Flatten device info: replace '.' with '_' to satisfy Mongoose
        for (const [key, value] of Object.entries(deviceInfo)) {
            // FIX: Use underscore instead of dot
            user.customAttributes.set(`device_${key}`, value); 
        }
    }

    if (context) {
         if (!user.customAttributes) user.customAttributes = new Map();
         for (const [key, value] of Object.entries(context)) {
            // FIX: Sanitize context keys just in case
            const safeKey = key.replace(/\./g, '_');
            user.customAttributes.set(safeKey, value);
        }
    }

    // 3. Get All Active Segments for Tenant
    const activeSegments = await Segment.find({ tenantId, isActive: true });

    // 4. Evaluate Rules
    const matchedSegmentIds = await segmentEngineService.evaluateUserSegments(user, activeSegments);

    res.json({
        success: true,
        data: matchedSegmentIds,
        metadata: { tenantId, userId, count: matchedSegmentIds.length }
    });

  } catch (error: any) {
    logger.error('Evaluate context error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to evaluate segments: ${error.message}`
    });
  }
});
// Get segment by ID
router.get('/:id', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { id } = req.params;

    const segment = await Segment.findOne({ _id: id, tenantId });

    if (!segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    res.json({
      success: true,
      data: segment,
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Get segment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get segment'
    });
  }
});

// Update segment
router.put('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId, userId } = tenantContext;
    const { id } = req.params;

    // Validate request body
    const { error, value } = segmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`
      });
    }

    // Validate segment rules
    const validation = await segmentEngineService.validateSegmentRules(value);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid segment rules: ${validation.errors.join(', ')}`
      });
    }

    const segment = await Segment.findOneAndUpdate(
      { _id: id, tenantId },
      {
        ...value,
        updatedBy: userId,
        lastUpdated: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    // If rules changed, recalculate affected users
    if (value.rules) {
      // This would trigger a background job in production
      logger.info('Segment rules updated, would trigger user recalculation');
      
      // Notify real-time clients
      await realTimeService.notifySegmentUpdate(tenantId, segment._id);
    }

    // Clear cache
    await segmentEngineService.clearTenantSegmentCache(tenantId);

    res.json({
      success: true,
      data: segment,
      metadata: { tenantId, segmentId: segment._id }
    });

  } catch (error) {
    logger.error('Update segment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update segment'
    });
  }
});

// Delete segment
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId, userId } = tenantContext;
    const { id } = req.params;

    const segment = await Segment.findOne({ _id: id, tenantId });
    if (!segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    // Remove segment from all user profiles
    await userProfileService.batchUpdateUserProfiles(tenantId, [
      // This would be a proper batch update in production
    ]);

    await Segment.findOneAndDelete({ _id: id, tenantId });

    // Clear cache
    await segmentEngineService.clearTenantSegmentCache(tenantId);

    // Notify real-time clients
    await realTimeService.notifySegmentUpdate(tenantId, id);

    res.json({
      success: true,
      data: { deleted: true },
      metadata: { tenantId, segmentId: id }
    });

  } catch (error) {
    logger.error('Delete segment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete segment'
    });
  }
});

// Get users in segment
router.get('/:id/users', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const segment = await Segment.findOne({ _id: id, tenantId });
    if (!segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    const result = await userProfileService.getUsersBySegment(tenantId, id, page, limit);

    res.json({
      success: true,
      data: result.users,
      metadata: {
        tenantId,
        segmentId: id,
        segmentName: segment.name,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages
        }
      }
    });

  } catch (error) {
    logger.error('Get segment users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get segment users'
    });
  }
});

// Evaluate segment against user
router.post('/:id/evaluate', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const [segment, user] = await Promise.all([
      Segment.findOne({ _id: id, tenantId }),
      userProfileService.getUserProfile(tenantId, userId)
    ]);

    if (!segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const isMatch = await segmentEngineService.evaluateSegment(user, segment);

    res.json({
      success: true,
      data: {
        matches: isMatch,
        segment: {
          id: segment._id,
          name: segment.name,
          type: segment.type
        },
        user: {
          id: user.userId,
          segments: user.segments
        }
      },
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Evaluate segment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate segment'
    });
  }
});

// Validate segment rules
router.post('/:id/validate', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { id } = req.params;

    const segment = await Segment.findOne({ _id: id, tenantId });
    if (!segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
    }

    const validation = await segmentEngineService.validateSegmentRules(segment);

    res.json({
      success: true,
      data: validation,
      metadata: { tenantId, segmentId: id }
    });

  } catch (error) {
    logger.error('Validate segment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate segment'
    });
  }
});

export { router as segmentRoutes };