import { Router, Request, Response } from 'express';
import { Journey } from '../models/journey.model';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticateToken);

// GET /journeys — list all journeys for a tenant (paginated)
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip  = (page - 1) * limit;

    const [journeys, total] = await Promise.all([
      Journey.find({ tenantId }).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Journey.countDocuments({ tenantId }),
    ]);

    res.json({
      success: true,
      data: journeys,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    logger.error('GET /journeys error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /journeys/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const journey  = await Journey.findOne({ _id: req.params.id, tenantId }).lean();
    if (!journey) return res.status(404).json({ success: false, error: 'Journey not found' });
    res.json({ success: true, data: journey });
  } catch (err: any) {
    logger.error('GET /journeys/:id error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /journeys — create
router.post('/', requireRole(['admin', 'editor']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId   = (req as any).userId || 'system';
    const { name, description, status, nodes, edges } = req.body;

    if (!name) return res.status(400).json({ success: false, error: 'name is required' });

    const journey = new Journey({
      tenantId,
      name,
      description,
      status: status || 'draft',
      nodes:  nodes  || [],
      edges:  edges  || [],
      createdBy: userId,
      updatedBy: userId,
    });

    await journey.save();
    logger.info('Journey created', { journeyId: journey._id, tenantId });
    res.status(201).json({ success: true, data: journey });
  } catch (err: any) {
    logger.error('POST /journeys error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /journeys/:id — full update
router.put('/:id', requireRole(['admin', 'editor']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId   = (req as any).userId || 'system';
    const { name, description, status, nodes, edges } = req.body;

    const journey = await Journey.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { name, description, status, nodes, edges, updatedBy: userId, updatedAt: new Date() },
      { new: true, runValidators: true },
    );
    if (!journey) return res.status(404).json({ success: false, error: 'Journey not found' });

    logger.info('Journey updated', { journeyId: journey._id, tenantId });
    res.json({ success: true, data: journey });
  } catch (err: any) {
    logger.error('PUT /journeys/:id error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /journeys/:id/status — change status only
router.patch('/:id/status', requireRole(['admin', 'editor']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId   = (req as any).userId || 'system';
    const { status } = req.body;

    const journey = await Journey.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: { status, updatedBy: userId, updatedAt: new Date() } },
      { new: true },
    );
    if (!journey) return res.status(404).json({ success: false, error: 'Journey not found' });
    res.json({ success: true, data: journey });
  } catch (err: any) {
    logger.error('PATCH /journeys/:id/status error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /journeys/:id
router.delete('/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const result   = await Journey.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!result) return res.status(404).json({ success: false, error: 'Journey not found' });
    res.json({ success: true, data: { deleted: true } });
  } catch (err: any) {
    logger.error('DELETE /journeys/:id error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export { router as journeyRoutes };
