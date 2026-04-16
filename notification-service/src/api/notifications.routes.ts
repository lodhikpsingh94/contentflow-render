import { Router } from 'express';
import { NotificationService } from '../services/notification.service';
import { TemplateService } from '../services/template.service';
import { QueueService } from '../services/queue.service';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schemas
const notificationSchema = Joi.object({
  type: Joi.string().valid('email', 'push', 'sms', 'in_app').required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  recipient: Joi.object({
    userId: Joi.string().required(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    deviceToken: Joi.string().optional(),
    segments: Joi.array().items(Joi.string()).optional(),
    preferences: Joi.object({
      email: Joi.boolean().default(true),
      push: Joi.boolean().default(true),
      sms: Joi.boolean().default(false),
      frequency: Joi.string().valid('realtime', 'daily', 'weekly').default('realtime'),
      timezone: Joi.string().default('UTC'),
      language: Joi.string().default('en')
    }).optional()
  }).required(),
  content: Joi.object({
    subject: Joi.string().required(),
    title: Joi.string().required(),
    body: Joi.string().required(),
    html: Joi.string().optional(),
    data: Joi.object().optional(),
    actions: Joi.array().items(Joi.object({
      type: Joi.string().valid('button', 'link').required(),
      text: Joi.string().required(),
      url: Joi.string().required(),
      actionId: Joi.string().required()
    })).optional(),
    imageUrl: Joi.string().uri().optional(),
    deepLink: Joi.string().uri().optional()
  }).required(),
  channel: Joi.object({
    provider: Joi.string().required(),
    providerId: Joi.string().optional(),
    configuration: Joi.object({
      templateId: Joi.string().optional(),
      from: Joi.string().optional(),
      replyTo: Joi.string().optional(),
      cc: Joi.array().items(Joi.string().email()).optional(),
      bcc: Joi.array().items(Joi.string().email()).optional()
    }).optional()
  }).optional(),
  metadata: Joi.object({
    campaignId: Joi.string().optional(),
    contentId: Joi.string().optional(),
    trigger: Joi.string().valid('system', 'user', 'campaign', 'api').required(),
    category: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).optional(),
    userAgent: Joi.string().optional(),
    ipAddress: Joi.string().optional()
  }).required(),
  scheduledAt: Joi.date().optional()
});

const batchNotificationSchema = Joi.array().items(notificationSchema).max(100);

const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  type: Joi.string().valid('email', 'push', 'sms', 'in_app').optional(),
  status: Joi.string().valid('pending', 'sent', 'delivered', 'failed', 'read').optional(),
  userId: Joi.string().optional(),
  campaignId: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional()
});

// Apply authentication to all notification routes
router.use(authenticateToken);

// Send single notification
router.post('/', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;

    // Validate request body
    const { error, value } = notificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`
      });
    }

    const notificationService = req.app.get('notificationService') as NotificationService;
    const notification = await notificationService.createNotification({
      ...value,
      tenantId
    });

    res.status(201).json({
      success: true,
      data: {
        notificationId: notification._id,
        status: notification.status,
        scheduledAt: notification.scheduledAt
      },
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
});

// Send batch notifications
router.post('/batch', requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;

    // Validate request body
    const { error, value } = batchNotificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`
      });
    }

    const notificationService = req.app.get('notificationService') as NotificationService;
    const results = await Promise.allSettled(
      value.map(notificationData => 
        notificationService.createNotification({
          ...notificationData,
          tenantId
        })
      )
    );

    const successful: any[] = [];
    const failed: any[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push({
          index,
          notificationId: result.value._id,
          status: result.value.status
        });
      } else {
        failed.push({
          index,
          error: result.reason.message
        });
      }
    });

    res.json({
      success: true,
      data: {
        total: value.length,
        successful: successful.length,
        failed: failed.length,
        successfulNotifications: successful,
        failedNotifications: failed
      },
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Batch notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch notifications'
    });
  }
});

// Get notification by ID
router.get('/:id', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { id } = req.params;

    const notificationService = req.app.get('notificationService') as NotificationService;
    const notification = await notificationService.getNotification(id, tenantId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification,
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification'
    });
  }
});

// Get notifications with filtering
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

    const { page, limit, ...filters } = value;
    const notificationService = req.app.get('notificationService') as NotificationService;
    
    const result = await notificationService.getNotifications(tenantId, filters, page, limit);

    res.json({
      success: true,
      data: result.notifications,
      metadata: {
        tenantId,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications'
    });
  }
});

// Track notification events (delivered, read, click, conversion)
router.post('/:id/track/:event', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { id, event } = req.params;

    if (!['delivered', 'read', 'click', 'conversion'].includes(event)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event type. Must be one of: delivered, read, click, conversion'
      });
    }

    const notificationService = req.app.get('notificationService') as NotificationService;
    await notificationService.trackEvent(id, event as any);

    res.json({
      success: true,
      data: { event, tracked: true },
      metadata: { tenantId, notificationId: id }
    });

  } catch (error) {
    logger.error('Track event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

// Get queue statistics
router.get('/queue/stats', requireRole(['admin']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;

    const queueService = req.app.get('queueService') as QueueService;
    const stats = await queueService.getQueueStats();

    res.json({
      success: true,
      data: stats,
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Get queue stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics'
    });
  }
});

// Retry failed notification
router.post('/:id/retry', requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { id } = req.params;

    const notificationService = req.app.get('notificationService') as NotificationService;
    const notification = await notificationService.getNotification(id, tenantId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    if (notification.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Can only retry failed notifications'
      });
    }

    const queueService = req.app.get('queueService') as QueueService;
    await queueService.retryNotification(notification);

    res.json({
      success: true,
      data: { retried: true },
      metadata: { tenantId, notificationId: id }
    });

  } catch (error) {
    logger.error('Retry notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry notification'
    });
  }
});

export { router as notificationRoutes };