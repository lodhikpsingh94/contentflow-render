import { Router } from 'express';
import { TemplateService } from '../services/template.service';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schemas
const templateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).optional(),
  type: Joi.string().valid('email', 'push', 'sms', 'in_app').required(),
  category: Joi.string().required(),
  subject: Joi.string().required(),
  content: Joi.object({
    html: Joi.string().required(),
    text: Joi.string().required(),
    title: Joi.string().optional(),
    preheader: Joi.string().optional(),
    data: Joi.object().optional()
  }).required(),
  variables: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('string', 'number', 'boolean', 'date', 'array', 'object').required(),
    required: Joi.boolean().default(false),
    defaultValue: Joi.any().optional(),
    description: Joi.string().optional()
  })).optional(),
  isActive: Joi.boolean().default(true)
});

const renderTemplateSchema = Joi.object({
  variables: Joi.object().required()
});

// Apply authentication to all template routes
router.use(authenticateToken);

// Create template
router.post('/', requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId, userId } = tenantContext;

    // Validate request body
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`
      });
    }

    const templateService = req.app.get('templateService') as TemplateService;
    const template = await templateService.createTemplate({
      ...value,
      tenantId,
      createdBy: userId,
      updatedBy: userId
    });

    res.status(201).json({
      success: true,
      data: template,
      metadata: { tenantId, templateId: template._id }
    });

  } catch (error) {
    logger.error('Create template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

// Get template by ID
router.get('/:id', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { id } = req.params;

    const templateService = req.app.get('templateService') as TemplateService;
    const template = await templateService.getTemplate(tenantId, id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template,
      metadata: { tenantId }
    });

  } catch (error) {
    logger.error('Get template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template'
    });
  }
});

// Get templates by type
router.get('/type/:type', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { type } = req.params;

    if (!['email', 'push', 'sms', 'in_app'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template type'
      });
    }

    const templateService = req.app.get('templateService') as TemplateService;
    const templates = await templateService.getTemplatesByType(tenantId, type);

    res.json({
      success: true,
      data: templates,
      metadata: { tenantId, type, count: templates.length }
    });

  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
});

// Render template with data
router.post('/:id/render', async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { id } = req.params;

    // Validate request body
    const { error, value } = renderTemplateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`
      });
    }

    const templateService = req.app.get('templateService') as TemplateService;
    const template = await templateService.getTemplate(tenantId, id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const renderedContent = templateService.renderTemplate(template, value.variables);

    res.json({
      success: true,
      data: renderedContent,
      metadata: { tenantId, templateId: id }
    });

  } catch (error) {
    logger.error('Render template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to render template'
    });
  }
});

// Update template
router.put('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId, userId } = tenantContext;
    const { id } = req.params;

    // Validate request body
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${error.details.map(d => d.message).join(', ')}`
      });
    }

    const templateService = req.app.get('templateService') as TemplateService;
    const template = await templateService.updateTemplate(id, tenantId, {
      ...value,
      updatedBy: userId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template,
      metadata: { tenantId, templateId: template._id }
    });

  } catch (error) {
    logger.error('Update template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

// Delete template
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { id } = req.params;

    const templateService = req.app.get('templateService') as TemplateService;
    const deleted = await templateService.deleteTemplate(id, tenantId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: { deleted: true },
      metadata: { tenantId, templateId: id }
    });

  } catch (error) {
    logger.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

export { router as templateRoutes };