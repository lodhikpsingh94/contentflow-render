import express from 'express';
import { ContentService } from '../services/content.service';
// We don't need auth middleware here if the api-service handles it
// import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { Asset } from '../models/asset.model'; // Import the new model

const router = express.Router();
// We no longer need multer here because the files are not coming to this server
// import multer from 'multer';
// const upload = multer({ storage: multer.memoryStorage() });

// This service instance will be used by all route handlers
const contentService = new ContentService();

/**
 * Endpoint to initiate an upload.
 * The client sends metadata (fileName, mimeType) and gets back a secure,
 * temporary URL to upload the file to directly.
 */
router.post('/generate-upload-url', async (req: any, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const { fileName, mimeType } = req.body;

        if (!tenantId || !fileName || !mimeType) {
            return res.status(400).json({ error: 'tenantId, fileName, and mimeType are required' });
        }

        const uploadData = await contentService.generateSignedUrl(tenantId, fileName, mimeType);

        res.status(200).json({
            success: true,
            data: uploadData
        });
    } catch (error: any) {
        logger.error('Failed to generate upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

/**
 * Endpoint to finalize an upload.
 * The client calls this *after* successfully uploading the file to the signed URL.
 * This triggers the backend to save the asset's metadata to MongoDB.
 */
router.post('/finalize-upload', async (req: any, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        const { contentId, name, mimeType, size, storageKey } = req.body;

        if (!tenantId || !contentId || !name || !mimeType || !size || !storageKey) {
            return res.status(400).json({ error: 'Missing required fields to finalize upload' });
        }

        const asset = await contentService.finalizeUpload(tenantId, contentId, name, mimeType, size, storageKey);

        res.status(201).json({
            success: true,
            data: asset
        });
    } catch (error: any) {
        logger.error('Failed to finalize upload:', error);
        res.status(500).json({ error: 'Failed to finalize upload' });
    }
});


// Get a single content asset by ID
router.get('/:contentId', async (req: any, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required' });

    const asset = await contentService.getContent(req.params.contentId, tenantId);

    if (!asset) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({ success: true, data: asset });
  } catch (error: any) {
    logger.error('Content fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// List content for a tenant (already implemented in a previous step)
router.get('/', async (req: any, res) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const result = await contentService.listContent(tenantId, parseInt(page as string), parseInt(limit as string));
    
    // Match the paginated response structure the frontend expects
    res.json({
      success: true,
      data: result.data,
      metadata: {
        pagination: result.pagination
      }
    });
  } catch (error: any) {
    logger.error('Content listing failed:', error);
    res.status(500).json({ error: 'Failed to list content' });
  }
});

export default router;