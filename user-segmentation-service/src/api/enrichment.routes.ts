import { Router } from 'express';
import { UserEnrichment } from '../models/user-enrichment.model';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticateToken);

/**
 * POST /api/v1/enrichment/upload
 * Bulk-load user enrichment attributes from a parsed CSV payload.
 *
 * Body: {
 *   source: 'csv_upload' | 'manual_api',
 *   sourceRef: string,           // e.g. 'customers_2026-04-19.csv'
 *   attributeTypes: Record<string, 'string' | 'number' | 'boolean' | 'date'>,
 *   expiresAt?: string,          // ISO date — applied to all attributes
 *   records: Array<{
 *     userId: string,
 *     attributes: Record<string, any>
 *   }>
 * }
 */
router.post('/upload', requireRole(['admin', 'analyst']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId, userId: uploadedBy } = tenantContext;

    const { source = 'csv_upload', sourceRef, attributeTypes = {}, expiresAt, records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'records array is required and must be non-empty' });
    }
    if (!sourceRef) {
      return res.status(400).json({ success: false, error: 'sourceRef is required' });
    }

    const expiresDate = expiresAt ? new Date(expiresAt) : undefined;
    const uploadedAt = new Date();
    const jobRef = `${sourceRef}_${Date.now()}`;

    let successCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    // Process in batches of 200 to avoid oversized inserts
    const BATCH = 200;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);

      const docs = batch.map((record: any) => {
        const attrMap: Record<string, any> = {};

        for (const [key, value] of Object.entries(record.attributes || {})) {
          const attrType = attributeTypes[key] ?? 'string';
          attrMap[key] = { value, type: attrType, ...(expiresDate ? { expiresAt: expiresDate } : {}) };
        }

        return {
          _id: uuidv4(),
          tenantId,
          userId: record.userId,
          source,
          sourceRef: jobRef,
          uploadedAt,
          uploadedBy: uploadedBy ?? 'system',
          attributes: attrMap,
        };
      });

      try {
        await UserEnrichment.insertMany(docs, { ordered: false });
        successCount += docs.length;
      } catch (bulkErr: any) {
        // ordered:false — insertMany throws but partial results are committed
        const inserted = bulkErr.insertedDocs?.length ?? 0;
        successCount += inserted;
        const writeErrors: any[] = bulkErr.writeErrors ?? [];
        writeErrors.forEach((we: any) => {
          errors.push({ userId: batch[we.index]?.userId ?? '?', error: we.errmsg });
        });
      }
    }

    logger.info(`[enrichment] upload job="${jobRef}" tenant=${tenantId} success=${successCount} errors=${errors.length}`);

    res.status(201).json({
      success: true,
      data: {
        jobRef,
        totalRecords: records.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 50), // cap error list returned to client
        uploadedAt,
      },
    });
  } catch (error: any) {
    logger.error('Enrichment upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to process enrichment upload' });
  }
});

/**
 * GET /api/v1/enrichment/uploads
 * Return upload job history for this tenant, aggregated by sourceRef.
 */
router.get('/uploads', requireRole(['admin', 'analyst']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;

    const history = await UserEnrichment.aggregate([
      { $match: { tenantId, source: 'csv_upload' } },
      {
        $group: {
          _id: '$sourceRef',
          source:      { $first: '$source' },
          uploadedAt:  { $first: '$uploadedAt' },
          uploadedBy:  { $first: '$uploadedBy' },
          recordCount: { $sum: 1 },
          attributeCount: {
            $sum: {
              $cond: [
                { $isArray: { $objectToArray: '$attributes' } },
                { $size: { $objectToArray: '$attributes' } },
                0,
              ],
            },
          },
        },
      },
      { $sort: { uploadedAt: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 0,
          sourceRef:    '$_id',
          source:       1,
          uploadedAt:   1,
          uploadedBy:   1,
          recordCount:  1,
          attributeCount: 1,
        },
      },
    ]);

    res.json({ success: true, data: history });
  } catch (error: any) {
    logger.error('Enrichment uploads history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch upload history' });
  }
});

/**
 * GET /api/v1/enrichment/user/:userId
 * Return all enrichment attributes for a specific user (admin/debug use).
 */
router.get('/user/:userId', requireRole(['admin']), async (req, res) => {
  try {
    const tenantContext = req.tenantContext!;
    const { tenantId } = tenantContext;
    const { userId } = req.params;

    const docs = await UserEnrichment.find({ tenantId, userId })
      .sort({ uploadedAt: -1 })
      .lean();

    // Flatten: latest non-expired value per attribute wins
    const now = new Date();
    const resolved: Record<string, any> = {};
    const seen = new Set<string>();

    for (const doc of docs) {
      const attrMap: Record<string, any> =
        doc.attributes instanceof Map
          ? Object.fromEntries(doc.attributes as any)
          : (doc.attributes as any) ?? {};

      for (const [key, attr] of Object.entries(attrMap)) {
        if (seen.has(key)) continue;
        if ((attr as any).expiresAt && new Date((attr as any).expiresAt) < now) continue;
        resolved[key] = { value: (attr as any).value, type: (attr as any).type, source: doc.sourceRef, uploadedAt: doc.uploadedAt };
        seen.add(key);
      }
    }

    res.json({ success: true, data: { userId, tenantId, attributes: resolved } });
  } catch (error: any) {
    logger.error('Enrichment user lookup error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user enrichment data' });
  }
});

export { router as enrichmentRoutes };
